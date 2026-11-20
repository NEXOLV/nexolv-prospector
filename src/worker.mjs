// NEXOLV Prospector — point d'entrée Cloudflare Workers
// - /api/*  : API de l'appli (mot de passe)          → netlify/functions/api.mjs
// - /demo/* : sites de démonstration publics          → netlify/functions/demo.mjs
// - le reste : fichiers statiques du dossier public/  (binding ASSETS)
// - tâche planifiée (cron) : mode automatique         → netlify/functions/auto.mjs
// Les données sont stockées dans Cloudflare D1 (binding DB), découpées en morceaux.
import * as C from "../netlify/lib/core.mjs";
import api from "../netlify/functions/api.mjs";
import demo from "../netlify/functions/demo.mjs";
import auto from "../netlify/functions/auto.mjs";

const CHUNK = 400_000; // caractères par ligne (D1 : 2 Mo max par ligne)
let tablePrete = false;

function d1Store(db) {
  const prepare = async () => {
    if (tablePrete) return;
    await db.exec("CREATE TABLE IF NOT EXISTS store (k TEXT NOT NULL, i INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, i))");
    tablePrete = true;
  };
  return {
    async get(key) {
      await prepare();
      const { results } = await db.prepare("SELECT v FROM store WHERE k = ? ORDER BY i").bind(key).all();
      if (!results.length) return null;
      return JSON.parse(results.map((r) => r.v).join(""));
    },
    async setJSON(key, obj) {
      await prepare();
      const s = JSON.stringify(obj);
      const parts = [];
      for (let i = 0; i < s.length || i === 0; i += CHUNK) parts.push(s.slice(i, i + CHUNK));
      await db.batch([
        db.prepare("DELETE FROM store WHERE k = ?").bind(key),
        ...parts.map((v, i) => db.prepare("INSERT INTO store (k, i, v) VALUES (?, ?, ?)").bind(key, i, v)),
      ]);
    },
  };
}

function init(env) {
  // Les variables et secrets Cloudflare sont lus par le code via process.env
  globalThis.process ||= { env: {} };
  process.env ||= {};
  for (const [k, v] of Object.entries(env)) if (typeof v === "string") process.env[k] = v;
  C.__setStore(d1Store(env.DB));
}

// En-têtes de sécurité ajoutés à toutes les réponses
function securiser(res, demoPage) {
  const r = new Response(res.body, res);
  r.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  r.headers.set("x-content-type-options", "nosniff");
  r.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  r.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (!demoPage) r.headers.set("x-frame-options", "DENY");
  return r;
}

export default {
  async fetch(req, env) {
    init(env);
    const { pathname } = new URL(req.url);
    let res;
    if (pathname === "/api/import" && req.method === "POST") res = await importer(req);
    else if (pathname.startsWith("/api/")) res = await api(req);
    else if (pathname.startsWith("/demo/")) res = await demo(req);
    else if (pathname === "/abonnement") res = abonnement();
    else if (pathname === "/bienvenue") res = await bienvenue(req);
    else res = await env.ASSETS.fetch(req);
    return securiser(res, pathname.startsWith("/demo/"));
  },
  async scheduled(event, env, ctx) {
    init(env);
    ctx.waitUntil(auto());
  },
};

// Reprise des données depuis l'ancienne version (Netlify) : réservé à l'appli connectée
async function importer(req) {
  if (!C.isAuthed(req)) return C.json({ error: "Session expirée, reconnectez-vous." }, 401);
  let d = await req.json().catch(() => null);
  // { source: "https://ancienne-adresse" } : on va chercher les données sur l'ancienne version (même mot de passe)
  if (d && typeof d.source === "string" && /^https:\/\//.test(d.source)) {
    const r = await fetch(d.source.replace(/\/$/, "") + "/api/state", { headers: { authorization: "Bearer " + C.sessionToken() } });
    if (!r.ok) return C.json({ error: "Ancienne version injoignable (" + r.status + ")" }, 502);
    d = await r.json();
  }
  if (!d || typeof d.prospects !== "object") return C.json({ error: "Données invalides" }, 400);
  const db = await C.loadDB();
  const prospects = Array.isArray(d.prospects) ? Object.fromEntries(d.prospects.map((p) => [p.id, p])) : d.prospects;
  Object.assign(db.prospects, prospects);
  db.blacklist = [...new Set([...(db.blacklist || []), ...(d.blacklist || [])])];
  if (Array.isArray(d.envois)) db.envois = [...d.envois].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (d.config) db.config = { ...db.config, ...d.config };
  if (d.auto) db.auto = { ...db.auto, ...d.auto };
  await C.saveDB(db);
  return C.json({ ok: true, prospects: Object.keys(db.prospects).length });
}

// ---------------------------------------------------------------------------
// Abonnement à l'outil
// /abonnement : redirige vers le lien de paiement Stripe (adresse stable pour les QR codes et la pub)
// /bienvenue?session_id=… : retour de Stripe après paiement → création du compte et du code d'accès
// ---------------------------------------------------------------------------
function abonnement() {
  const lien = C.env("PAY_ABONNEMENT");
  if (!/^https:\/\/(buy|checkout)\.stripe\.com\//.test(lien)) return pageAbo("Bientôt disponible", "<p>L'abonnement n'est pas encore ouvert. Écrivez-nous à contact@nexolv.fr.</p>", 503);
  return Response.redirect(lien, 302);
}

const escH = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function pageAbo(titre, corps, status = 200) {
  return C.page(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escH(titre)} · NEXOLV Prospector</title><meta name="robots" content="noindex">
<style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#14162b;color:#1d1f33;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}
.box{background:#fff;border-radius:18px;padding:34px;max-width:480px;width:100%;box-shadow:0 20px 60px #0006}h1{margin:0 0 10px;font-size:24px}
.code{font:700 30px/1.2 ui-monospace,Menlo,monospace;letter-spacing:3px;background:#f1f3ff;border:2px dashed #5b5bd6;border-radius:12px;padding:16px;text-align:center;margin:18px 0}
.btn{display:block;text-align:center;background:#5b5bd6;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:700;margin-top:18px}
.note{color:#666;font-size:14px;line-height:1.5}</style></head><body><div class="box">
<h1>${escH(titre)}</h1>${corps}</div></body></html>`, status);
}

async function bienvenue(req) {
  const sid = new URL(req.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return pageAbo("Lien invalide", "<p class=note>Ce lien de confirmation n'est pas valide.</p>", 400);
  let s;
  try { s = await C.stripeGet("checkout/sessions/" + sid); }
  catch (e) { return pageAbo("Vérification impossible", `<p class=note>${escH(e.message)}</p><p class=note>Votre paiement n'est pas perdu : écrivez à contact@nexolv.fr.</p>`, 502); }
  const lien = C.env("PAY_ABONNEMENT_ID");
  if (s.status !== "complete" || !s.subscription || (lien && s.payment_link !== lien))
    return pageAbo("Paiement non finalisé", "<p class=note>Nous n'avons pas trouvé d'abonnement validé pour ce paiement.</p>", 402);
  const email = String(s.customer_details?.email || s.customer_email || "").trim().toLowerCase();
  const accts = await C.loadAccounts();
  let a = Object.values(accts).find((x) => x.stripe_sub === s.subscription);
  const url = C.env("URL") || new URL(req.url).origin;
  if (a && a.code_vu) {
    return pageAbo("Votre compte est prêt", `<p class=note>Votre code d'accès a déjà été affiché et envoyé à <b>${escH(a.email)}</b>.</p><a class=btn href="${escH(url)}">Ouvrir NEXOLV Prospector</a>`);
  }
  const code = C.nouveauCode();
  if (!a) {
    a = Object.values(accts).find((x) => x.email === email); // réabonnement
    if (!a) { const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12); a = accts[id] = { id, email, cree: new Date().toISOString(), gen: 0 }; }
  }
  Object.assign(a, { stripe_sub: s.subscription, stripe_customer: s.customer || "", actif: true, statut_stripe: "active", manuel: "", code_hash: C.codeHash(code), code_vu: true, gen: (a.gen || 0) + 1 });
  await C.saveAccounts(accts);
  let envoye = true;
  try {
    await C.mailSysteme(email, {
      sujet: "Votre accès à NEXOLV Prospector",
      texte: `Bonjour,\n\nMerci pour votre abonnement à NEXOLV Prospector.\n\nAdresse : ${url}\nE-mail : ${email}\nCode d'accès : ${code}\n\nGardez ce code précieusement. Pour toute question : contact@nexolv.fr\n\nL'équipe NEXOLV`,
      html: `<p>Bonjour,</p><p>Merci pour votre abonnement à <b>NEXOLV Prospector</b>.</p><p>Adresse : <a href="${escH(url)}">${escH(url)}</a><br>E-mail : <b>${escH(email)}</b><br>Code d'accès : <b style="font-size:20px;letter-spacing:2px">${code}</b></p><p>Gardez ce code précieusement. Pour toute question : contact@nexolv.fr</p><p>L'équipe NEXOLV</p>`,
      stop: "",
    });
  } catch { envoye = false; }
  return pageAbo("Bienvenue ! 🎉", `<p class=note>Votre abonnement est actif. Voici votre code d'accès personnel :</p>
<div class=code>${code}</div>
<p class=note>Connectez-vous avec votre e-mail <b>${escH(email)}</b> et ce code. ${envoye ? "Nous vous l'avons aussi envoyé par e-mail." : "<b>Notez-le bien</b> : l'e-mail de confirmation n'a pas pu partir."}</p>
<a class=btn href="${escH(url)}">Ouvrir NEXOLV Prospector</a>`);
}
