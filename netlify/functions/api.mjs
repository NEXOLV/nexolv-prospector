// API de l'application : /api/<action>
import * as C from "../lib/core.mjs";

export const config = { path: "/api/*" };

const PUBLIC_FIELDS = ["email", "statut", "notes", "dirigeant", "telephone", "nom", "activite", "ville", "adresse", "secteur"];

export default async (req) => {
  const route = new URL(req.url).pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  try {
    // ---------- routes publiques ----------
    if (route === "login") {
      const { password, email, code } = await req.json().catch(() => ({}));
      if (!C.env("APP_PASSWORD")) return C.json({ error: "APP_PASSWORD n'est pas défini dans les secrets Cloudflare." }, 500);
      const ip = req.headers.get("cf-connecting-ip") || "?";
      if (await C.tropDEssais(ip)) return C.json({ error: "Trop d'essais. Réessayez dans 15 minutes." }, 429);
      const mail = String(email || "").trim().toLowerCase();
      if (mail) { // client abonné : e-mail + code d'accès
        const a = Object.values(await C.loadAccounts()).find((x) => x.email === mail);
        if (a && a.code_hash === C.codeHash(code || password || "")) {
          if (!a.actif) return C.json({ error: "Votre abonnement n'est plus actif. Réabonnez-vous pour retrouver l'accès." }, 403);
          return C.json({ token: C.clientToken(a) });
        }
        await C.essaiRate(ip);
        return C.json({ error: "E-mail ou code d'accès incorrect" }, 401);
      }
      if (!C.checkPassword(password || code)) { await C.essaiRate(ip); return C.json({ error: "Mot de passe incorrect" }, 401); }
      return C.json({ token: C.sessionToken() });
    }
    if (route === "stop") {
      const u = new URL(req.url);
      const e = (u.searchParams.get("e") || "").trim().toLowerCase();
      const a = (u.searchParams.get("a") || "admin").replace(/[^a-z0-9]/g, "") || "admin";
      if (!e || u.searchParams.get("s") !== C.stopSig(e, a)) return C.page("<p>Lien invalide.</p>", 400);
      return C.runAs({ id: a }, () => stop(e));
    }

    const acct = await C.authentifier(req);
    if (!acct) return C.json({ error: "Session expirée, reconnectez-vous." }, 401);
    return await C.runAs(acct, () => prive(req, route));
  } catch (e) {
    return C.json({ error: e.message || String(e) }, 500);
  }
};

async function stop(e) {
      const db = await C.loadDB();
      if (!db.blacklist.includes(e)) db.blacklist.push(e);
      for (const p of Object.values(db.prospects)) if ((p.email || "").toLowerCase() === e) { p.statut = "stop"; p.opposition = 1; }
      await C.saveDB(db);
      return C.page(`<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Désinscription</title>
<body style="font-family:sans-serif;text-align:center;padding:60px"><h2>C'est noté.</h2><p>${e.replace(/[<>&"]/g, "")} ne recevra plus aucun message de notre part.</p></body>`);
}

async function prive(req, route) {
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const db = await C.loadDB();
    const cfg = C.cfgOf(db);
    const base = C.baseUrl(req);

    switch (route) {
      case "state":
        return C.json({
          prospects: Object.values(db.prospects).sort((a, b) => (b.date_ajout || "").localeCompare(a.date_ajout || "")),
          config: cfg, blacklist: db.blacklist, envoisDuJour: C.envoisDuJour(db),
          envois: db.envois.slice(-200).reverse(),
          cles: { google: !!C.env("GOOGLE_API_KEY"), pappers: !!C.env("PAPPERS_API_KEY"), brevo: C.envoiPret(), smtp: C.smtpPret() },
          statuts: C.STATUTS, base,
          compte: C.isAdmin() ? { role: "admin" } : { role: "client", email: C.compte().email },
          usage: C.usageOf(db), quotas: C.isAdmin() ? null : C.QUOTAS,
          smtp: { host: db.smtp.host || "", port: db.smtp.port || 465, user: db.smtp.user || "", pass: !!db.smtp.pass },
          clients: C.isAdmin() ? Object.values(await C.loadAccounts()).map(({ code_hash, ...a }) => a) : undefined,
        });

      case "smtp": { // boîte d'envoi du client
        if (C.isAdmin()) return C.json({ error: "Le compte agence envoie via contact@nexolv.fr (secrets Cloudflare)." }, 400);
        const s = body.smtp || {};
        db.smtp = {
          host: String(s.host || "").trim().slice(0, 200), port: Number(s.port) || 465,
          user: String(s.user || "").trim().slice(0, 200), pass: s.pass ? C.chiffrer(String(s.pass)) : db.smtp.pass || "",
        };
        await C.saveDB(db);
        return C.json({ ok: true, smtp: { ...db.smtp, pass: !!db.smtp.pass } });
      }

      case "client": { // admin : couper / rétablir l'accès, renouveler le code
        if (!C.isAdmin()) return C.json({ error: "Réservé à l'agence" }, 403);
        const accts = await C.loadAccounts();
        const a = accts[body.id];
        if (!a) return C.json({ error: "Client introuvable" }, 404);
        let code = "";
        if (body.action === "couper") { a.actif = false; a.gen = (a.gen || 0) + 1; a.manuel = "coupe"; }
        if (body.action === "retablir") { a.actif = true; a.manuel = "retabli"; }
        if (body.action === "code") { code = C.nouveauCode(); a.code_hash = C.codeHash(code); a.gen = (a.gen || 0) + 1; }
        await C.saveAccounts(accts);
        return C.json({ ok: true, code });
      }

      case "search": { // une recherche "métier ville"
        const { metier, ville, pages = 2, reseaux = true, noteMin = 0 } = body;
        C.consommer(db, "google", Math.min(3, Number(pages) || 1));
        const places = await C.placesSearch(`${metier} ${ville}`, pages);
        let sansSite = 0; const nouveaux = [];
        for (const pl of places) {
          const p = C.placeToProspect(pl, metier);
          const st = p._status; delete p._status;
          if (st && st !== "OPERATIONAL") continue;
          if (p.site_existant.startsWith("site:")) continue;
          if (p.site_existant.startsWith("reseau:") && !reseaux) continue;
          if ((p.note || 0) < noteMin) continue;
          sansSite++;
          if (C.upsert(db, p)) nouveaux.push(p.id);
        }
        await C.saveDB(db);
        return C.json({ analysees: places.length, sansSite, nouveaux });
      }

      case "pappers": { // une page de 20 entreprises
        C.consommer(db, "pappers", 1);
        const res = await C.pappersPage(body);
        const nouveaux = [];
        for (const e of res) {
          const p = C.pappersToProspect(e);
          if (!body.avec_site && (p.site_existant || "").startsWith("site:")) continue;
          if (C.upsert(db, p)) nouveaux.push(p.id);
        }
        await C.saveDB(db);
        return C.json({ recus: res.length, nouveaux });
      }

      case "verify": { // prospect Pappers : a-t-il un site sur sa fiche Google ?
        const p = db.prospects[body.id];
        if (!p) return C.json({ error: "introuvable" }, 404);
        let supprime = false;
        if (C.env("GOOGLE_API_KEY")) {
          C.consommer(db, "google", 1);
          const res = await C.placesSearch(`${p.nom} ${p.ville || ""}`, 1);
          const g = res.map((pl) => C.placeToProspect(pl)).find((g) =>
            C.similarity(p.nom, g.nom) >= 0.7 && (!p.code_postal || g.code_postal === p.code_postal));
          if (g) {
            for (const k of ["telephone", "site_existant", "maps_url", "note", "nb_avis"]) if (g[k] && !p[k]) p[k] = g[k];
            if (g.site_existant.startsWith("site:")) { delete db.prospects[p.id]; supprime = true; }
          }
        }
        if (!supprime) delete p.a_verifier;
        await C.saveDB(db);
        return C.json({ supprime });
      }

      case "enrich": {
        const p = db.prospects[body.id];
        if (!p) return C.json({ error: "introuvable" }, 404);
        const e = await C.sireneEnrich(p.nom, p.code_postal);
        for (const [k, v] of Object.entries(e)) if (v !== "" && v != null && (p[k] === "" || p[k] == null || k === "opposition")) p[k] = v;
        p.enrichi = true;
        await C.saveDB(db);
        return C.json({ prospect: p });
      }

      case "update": {
        const p = db.prospects[body.id];
        if (!p) return C.json({ error: "introuvable" }, 404);
        const f = body.fields || {};
        if ("email" in f && f.email) {
          f.email = String(f.email).trim();
          if (!(await C.emailValide(f.email))) return C.json({ error: `E-mail invalide ou domaine inexistant : ${f.email}` }, 400);
          p.email_source = "manuel";
        }
        for (const k of PUBLIC_FIELDS) if (k in f) p[k] = f[k];
        if ("secteur" in f || "nom" in f) p.secteur = f.secteur || p.secteur;
        if (f.statut === "stop" && p.email && !db.blacklist.includes(p.email.toLowerCase())) db.blacklist.push(p.email.toLowerCase());
        await C.saveDB(db);
        return C.json({ prospect: p });
      }

      case "delete": {
        for (const id of body.ids || []) delete db.prospects[id];
        await C.saveDB(db);
        return C.json({ ok: true });
      }

      case "generate": {
        let n = 0;
        for (const id of body.ids || []) {
          const p = db.prospects[id];
          if (p && !p.opposition) { C.publierDemo(db, p, base); n++; }
        }
        await C.saveDB(db);
        return C.json({ n });
      }

      case "preview-email": {
        const p = db.prospects[body.id];
        if (!p) return C.json({ error: "introuvable" }, 404);
        return C.json(C.renderEmail(p, cfg, base));
      }

      case "send": { // un envoi ; le navigateur gère la pause entre deux envois
        const p = db.prospects[body.id];
        if (!p) return C.json({ error: "introuvable" }, 404);
        if (body.test) {
          const msg = C.renderEmail(p, cfg, base);
          await C.mailSend(cfg, body.test, { ...msg, sujet: "[TEST] " + msg.sujet });
          db.envois.push({ id: p.id, date: new Date().toISOString(), to: body.test, sujet: "[TEST] " + msg.sujet, ok: true, test: true });
          await C.saveDB(db);
          return C.json({ ok: true });
        }
        if (!C.envoyables(db).some((x) => x.id === p.id)) return C.json({ ok: false, erreur: "Prospect non envoyable (déjà contacté, opposé, sans e-mail ou sans démo)." });
        if (C.envoisDuJour(db) >= Number(cfg.quota_jour)) return C.json({ ok: false, erreur: "Quota du jour atteint." });
        const r = await C.envoyerProspect(db, p, cfg, base);
        await C.saveDB(db);
        return C.json(r);
      }

      case "blacklist": {
        const e = String(body.email || "").trim().toLowerCase();
        if (e && !db.blacklist.includes(e)) db.blacklist.push(e);
        for (const p of Object.values(db.prospects)) if ((p.email || "").toLowerCase() === e) { p.statut = "stop"; p.opposition = 1; }
        await C.saveDB(db);
        return C.json({ ok: true });
      }

      case "config": {
        const allowed = Object.keys(C.DEFAULT_CONFIG);
        db.config = { ...db.config };
        for (const k of allowed) if (k in (body.config || {})) db.config[k] = body.config[k];
        await C.saveDB(db);
        return C.json({ config: C.cfgOf(db) });
      }

      case "export": {
        const cols = ["nom", "activite", "adresse", "code_postal", "ville", "telephone", "email", "statut", "note", "nb_avis",
          "dirigeant", "siren", "site_existant", "site_url", "maps_url", "date_ajout", "date_envoi", "notes"];
        const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = "﻿" + [cols.join(";"), ...Object.values(db.prospects).map((p) => cols.map((c) => q(p[c])).join(";"))].join("\n");
        return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=prospects-nexolv.csv" } });
      }

      default:
        return C.json({ error: "Route inconnue" }, 404);
    }
  } catch (e) {
    return C.json({ error: e.message || String(e) }, 500);
  }
};
