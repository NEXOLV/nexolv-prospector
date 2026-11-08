// NEXOLV Prospector SaaS — logique partagée (stockage, recherche, enrichissement, sites, e-mails)
import crypto from "node:crypto";
import dns from "node:dns/promises";
import { getStore } from "@netlify/blobs";

export const env = (k) => process.env[k] || "";

// ---------------------------------------------------------------------------
// Stockage (Netlify Blobs) : un seul document "db"
// ---------------------------------------------------------------------------
let _store = null;
const store = () => (_store ||= getStore({ name: "nexolv-crm", consistency: "strong" }));
export const __setStore = (s) => { _store = s; };

export async function loadDB() {
  const d = (await store().get("db", { type: "json" })) || {};
  return { prospects: {}, blacklist: [], envois: [], config: {}, auto: { idx: 0, lastSearchDay: "" }, ...d };
}
export async function saveDB(db) {
  if (db.envois.length > 5000) db.envois = db.envois.slice(-5000);
  await store().setJSON("db", db);
}

// ---------------------------------------------------------------------------
// Réglages par défaut (modifiables dans l'appli). Les clés secrètes restent dans les variables Netlify.
// ---------------------------------------------------------------------------
export const DEFAULT_SUJET = "{nom} : je vous ai préparé un site internet (aperçu gratuit)";
export const DEFAULT_CORPS = `{bonjour}

En cherchant « {activite} à {ville} » sur Google, je suis tombé sur {nom}{phrase_note}, mais je n'ai pas trouvé de site internet à votre nom.

Aujourd'hui, la majorité des clients cherchent un professionnel en ligne avant d'appeler. Sans site, une partie d'entre eux part chez un concurrent.

J'ai donc pris l'initiative de vous préparer une maquette gratuite, déjà personnalisée pour vous :
👉 {lien}

Si elle vous plaît, je la mets en ligne à votre nom : nom de domaine, vos photos et textes, référencement local Google, formulaire de contact.{phrase_prix}

Il suffit de répondre à ce mail ou de m'appeler au {tel_agence}.

Bonne journée,

{signature}`;

export const DEFAULT_CONFIG = {
  agence_nom: "NEXOLV",
  expediteur_nom: "Hakim GAMANE – NEXOLV",
  expediteur_email: "nexolv@outlook.fr",
  reply_to: "nexolv@outlook.fr",
  signature_tel: "07 49 28 47 58",
  signature_site: "https://nexolv.fr",
  signature: "Hakim GAMANE\nNEXOLV — Vos défis. Nos solutions.\n07 49 28 47 58 · nexolv.fr",
  offre_prix: "",
  quota_jour: 30,
  delai_min_s: 90,
  delai_max_s: 240,
  email_sujet: DEFAULT_SUJET,
  email_corps: DEFAULT_CORPS,
  auto_metiers: "plombier\nélectricien\ncoiffeur\nbarbier",
  auto_villes: "Reims",
  auto_recherche: false,
  auto_envoi: false,
  auto_envois_par_heure: 3,
};
export const cfgOf = (db) => ({ ...DEFAULT_CONFIG, ...(db.config || {}) });

export const STATUTS = ["nouveau", "en_ligne", "envoye", "repondu", "client", "pas_interesse", "stop"];

// ---------------------------------------------------------------------------
// Authentification (mot de passe unique défini dans APP_PASSWORD)
// ---------------------------------------------------------------------------
const secret = () => env("APP_PASSWORD") || crypto.randomBytes(16).toString("hex");
export const sessionToken = () => crypto.createHmac("sha256", secret()).update("nexolv-session-v1").digest("hex");
export const isAuthed = (req) =>
  !!env("APP_PASSWORD") && (req.headers.get("authorization") || "") === "Bearer " + sessionToken();
export const checkPassword = (pw) => {
  const a = Buffer.from(String(pw || "")), b = Buffer.from(env("APP_PASSWORD"));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};
export const stopSig = (email) =>
  crypto.createHmac("sha256", secret()).update("stop:" + email.trim().toLowerCase()).digest("hex").slice(0, 20);

// ---------------------------------------------------------------------------
// Outils texte
// ---------------------------------------------------------------------------
export const norm = (s) =>
  String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "entreprise";
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const noteFr = (n) => (n == null || n === "" ? "" : Number(n).toFixed(1).replace(".", ","));

export function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 0.95;
  const bi = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = bi(a), B = bi(b); let inter = 0;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) || 0);
  return (2 * inter) / (Math.max(1, a.length - 1) + Math.max(1, b.length - 1));
}

// ---------------------------------------------------------------------------
// Secteurs et thèmes
// ---------------------------------------------------------------------------
export const SECTEURS = {
  btp: {
    mots: ["plomb", "electric", "macon", "couvr", "menuis", "peint", "carrel", "chauff", "batiment", "renov", "charpent",
      "serrur", "plaquiste", "facade", "terrass", "construction", "travaux", "contractor", "plumber", "roofing"],
    label: "Artisan du bâtiment", c1: "#1f3a5f", c2: "#f2a541",
    accroche: "Des travaux soignés, des délais tenus, un artisan de confiance à {ville}.",
    services: [["Devis gratuit", "Déplacement et estimation claire, sans engagement."],
      ["Travaux neufs & rénovation", "Du petit dépannage au chantier complet."],
      ["Intervention rapide", "Disponible sur {ville} et ses environs."],
      ["Travail garanti", "Matériaux de qualité et finitions propres."]],
    cta: "Demander un devis",
  },
  coiffure: {
    mots: ["coiff", "barb", "hair", "beaute", "beauty", "esthet", "ongl", "nail"],
    label: "Salon", c1: "#2b2b2b", c2: "#c9a96e",
    accroche: "Votre salon à {ville} : coupe, style et conseils personnalisés.",
    services: [["Coupe & coiffage", "Femme, homme, enfant — une coupe qui vous ressemble."],
      ["Barbe & soins", "Taille, rasage et soins réalisés avec précision."],
      ["Couleur", "Colorations, mèches et balayages."],
      ["Sur rendez-vous", "Réservez votre créneau par téléphone."]],
    cta: "Prendre rendez-vous",
  },
  restauration: {
    mots: ["restau", "pizz", "kebab", "burger", "snack", "boulang", "patiss", "traiteur", "cafe", "brasserie", "food",
      "tacos", "sushi", "creperie", "bakery"],
    label: "Restaurant", c1: "#7a1f1f", c2: "#f4c95d",
    accroche: "Une cuisine généreuse au cœur de {ville}. Sur place ou à emporter.",
    services: [["Sur place", "Un accueil chaleureux pour vos repas."],
      ["À emporter", "Commandez par téléphone, récupérez sans attendre."],
      ["Produits frais", "Une carte préparée avec soin."],
      ["Groupes & événements", "Contactez-nous pour vos repas de groupe."]],
    cta: "Appeler pour commander",
  },
  transport: {
    mots: ["taxi", "vtc", "demenag", "transport", "livraison", "ambulan", "coursier", "moving", "auto-ecole", "garage",
      "mecani", "car repair"],
    label: "Transport & services auto", c1: "#0f4c5c", c2: "#e36414",
    accroche: "Ponctualité, sécurité et service sur-mesure à {ville} et alentours.",
    services: [["Réservation simple", "Un appel suffit pour réserver."],
      ["Disponibilité", "Interventions sur {ville} et la région."],
      ["Tarifs clairs", "Devis transparent avant toute prestation."],
      ["Professionnels", "Un service fiable, assuré et expérimenté."]],
    cta: "Réserver maintenant",
  },
  services: {
    mots: [], label: "Professionnel", c1: "#24345c", c2: "#4fb3bf",
    accroche: "Un professionnel de proximité à {ville}, à votre écoute.",
    services: [["Écoute & conseil", "Nous prenons le temps de comprendre votre besoin."],
      ["Réactivité", "Une réponse rapide à chaque demande."],
      ["Proximité", "Basé à {ville}, nous intervenons localement."],
      ["Qualité", "Un travail sérieux et suivi."]],
    cta: "Nous contacter",
  },
};
export function detectSecteur(...textes) {
  for (const t0 of textes) {
    const t = norm(t0);
    if (!t) continue;
    for (const [k, th] of Object.entries(SECTEURS)) if (th.mots.some((m) => t.includes(m))) return k;
  }
  return "services";
}

// ---------------------------------------------------------------------------
// Google Places API (New) — Text Search
// ---------------------------------------------------------------------------
const PLACES_FIELDS = ["places.id", "places.displayName", "places.formattedAddress", "places.addressComponents",
  "places.nationalPhoneNumber", "places.websiteUri", "places.googleMapsUri", "places.rating", "places.userRatingCount",
  "places.businessStatus", "places.primaryTypeDisplayName", "nextPageToken"].join(",");

export const FAUX_SITES = ["facebook.com", "instagram.com", "linktr.ee", "pagesjaunes.fr", "tiktok.com", "business.site",
  "solocal", "planity.com", "treatwell", "ubereats", "deliveroo", "justeat", "google.com", "sites.google"];

export async function placesSearch(query, maxPages = 2) {
  const key = env("GOOGLE_API_KEY");
  if (!key) throw new Error("Clé Google manquante (variable GOOGLE_API_KEY sur Netlify).");
  const out = []; let token = null;
  for (let i = 0; i < Math.min(3, Math.max(1, maxPages)); i++) {
    const body = { textQuery: query, languageCode: "fr", regionCode: "FR", pageSize: 20 };
    if (token) body.pageToken = token;
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST", body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": PLACES_FIELDS },
    });
    if (!r.ok) throw new Error(`Google Places ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const d = await r.json();
    out.push(...(d.places || []));
    token = d.nextPageToken;
    if (!token) break;
    await new Promise((res) => setTimeout(res, 1200));
  }
  return out;
}

const comp = (pl, t) => (pl.addressComponents || []).find((c) => (c.types || []).includes(t))?.longText || "";
export const classerSite = (u) => (!u ? "" : FAUX_SITES.some((f) => u.toLowerCase().includes(f)) ? "reseau:" + u : "site:" + u);

export function placeToProspect(pl, metier = "") {
  const activite = pl.primaryTypeDisplayName?.text || metier || "";
  const nom = pl.displayName?.text || "";
  return {
    id: "g_" + String(pl.id || "").replace(/[^A-Za-z0-9_-]/g, ""),
    source: "google", nom,
    activite: activite ? activite[0].toUpperCase() + activite.slice(1) : "",
    secteur: detectSecteur(activite, nom, metier),
    adresse: (pl.formattedAddress || "").replace(/, France$/, ""),
    code_postal: comp(pl, "postal_code"),
    ville: comp(pl, "locality") || comp(pl, "postal_town"),
    telephone: pl.nationalPhoneNumber || "",
    site_existant: classerSite(pl.websiteUri || ""),
    maps_url: pl.googleMapsUri || "",
    note: pl.rating ?? null,
    nb_avis: pl.userRatingCount || 0,
    _status: pl.businessStatus || "",
  };
}

// ---------------------------------------------------------------------------
// SIRENE (API officielle gratuite)
// ---------------------------------------------------------------------------
export async function sireneEnrich(nom, codePostal = "") {
  const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
  u.searchParams.set("q", nom); u.searchParams.set("per_page", "5"); u.searchParams.set("etat_administratif", "A");
  if (codePostal) u.searchParams.set("code_postal", codePostal);
  let r = await fetch(u);
  if (r.status === 429) { await new Promise((x) => setTimeout(x, 1500)); r = await fetch(u); }
  if (!r.ok) return {};
  let best = null, score = 0;
  for (const res of (await r.json()).results || []) {
    const noms = [res.nom_complet, res.nom_raison_sociale, ...(res.siege?.liste_enseignes || []),
      ...((res.matching_etablissements || []).flatMap((e) => e.liste_enseignes || []))].filter(Boolean);
    const s = Math.max(0, ...noms.map((n) => similarity(nom, n)));
    if (s > score) { best = res; score = s; }
  }
  if (!best || score < 0.6) return {};
  let dirigeant = "";
  for (const d of best.dirigeants || []) {
    const typ = String(d.type_dirigeant || d.type || "personne physique").toLowerCase();
    if (!typ.includes("morale") && d.nom) {
      const prenom = (d.prenoms || "").split(" ")[0];
      dirigeant = `${cap(prenom)} ${cap(d.nom)}`.trim();
      break;
    }
  }
  const diff = String(best.statut_diffusion || best.siege?.statut_diffusion_etablissement || "O").toUpperCase();
  return { siren: best.siren || "", forme_juridique: String(best.nature_juridique || ""), date_creation: best.date_creation || "",
    dirigeant, opposition: diff.startsWith("P") ? 1 : 0 };
}
const cap = (s) => String(s || "").toLowerCase().replace(/(^|[\s-])\S/g, (m) => m.toUpperCase());

// ---------------------------------------------------------------------------
// Pappers (optionnel)
// ---------------------------------------------------------------------------
export async function pappersPage({ departement, code_naf, date_creation_min, page = 1, par_page = 20 }) {
  const key = env("PAPPERS_API_KEY");
  if (!key) throw new Error("Clé Pappers manquante (variable PAPPERS_API_KEY sur Netlify).");
  const u = new URL("https://api.pappers.fr/v2/recherche");
  const p = { api_token: key, par_page, page, entreprise_cessee: "false", departement, code_naf, date_creation_min };
  for (const [k, v] of Object.entries(p)) if (v) u.searchParams.set(k, v);
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Pappers ${r.status} : ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).resultats || [];
}
export function pappersToProspect(e) {
  const s = e.siege || {};
  const nom0 = e.nom_entreprise || e.denomination || "";
  const nom = nom0 === nom0.toUpperCase() ? cap(nom0) : nom0;
  const activite = e.libelle_code_naf || e.domaine_activite || "";
  const rep = (e.representants || []).find((r) => r.personne_morale === false || r.prenom);
  const p = {
    id: "s_" + e.siren, source: "pappers", nom, activite, secteur: detectSecteur(activite, nom),
    adresse: [s.adresse_ligne_1, s.code_postal, s.ville].filter(Boolean).join(" "),
    code_postal: s.code_postal || "", ville: cap(s.ville || ""), siren: String(e.siren || ""),
    forme_juridique: e.forme_juridique || "", date_creation: e.date_creation || "",
    dirigeant: rep ? `${cap((rep.prenom_usuel || rep.prenom || "").split(" ")[0])} ${cap(rep.nom)}`.trim() : "",
    a_verifier: true,
  };
  if (e.email) { p.email = e.email; p.email_source = "pappers"; }
  if (e.telephone) p.telephone = e.telephone;
  if (e.site_internet) p.site_existant = classerSite(e.site_internet);
  return p;
}

// ---------------------------------------------------------------------------
// Base prospects
// ---------------------------------------------------------------------------
export function upsert(db, p) {
  const ex = db.prospects[p.id] || (p.siren && Object.values(db.prospects).find((x) => x.siren && x.siren === p.siren));
  if (!ex) {
    db.prospects[p.id] = { statut: "nouveau", date_ajout: new Date().toISOString(), ...p };
    return true;
  }
  for (const [k, v] of Object.entries(p)) if (v !== "" && v != null && (ex[k] === "" || ex[k] == null)) ex[k] = v;
  return false;
}

export function demoSlug(db, p) {
  if (p.site_slug) return p.site_slug;
  const base = `${slugify(p.nom)}-${slugify(p.ville || "")}`.replace(/-+$/, "");
  const used = new Set(Object.values(db.prospects).map((x) => x.site_slug).filter(Boolean));
  let s = base, i = 2;
  while (used.has(s)) s = `${base}-${i++}`;
  return s;
}
export const baseUrl = (req) => env("URL") || (req ? new URL(req.url).origin : "");

export function publierDemo(db, p, base) {
  p.site_slug = demoSlug(db, p);
  p.site_url = `${base}/demo/${p.site_slug}`;
  if (["nouveau", "", undefined].includes(p.statut)) p.statut = "en_ligne";
}

// ---------------------------------------------------------------------------
// E-mail
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
export async function emailValide(email) {
  email = String(email || "").trim();
  if (!EMAIL_RE.test(email)) return false;
  if (env("SKIP_MX_CHECK")) return true;
  try { return (await dns.resolveMx(email.split("@")[1])).length > 0; }
  catch (e) { return !["ENOTFOUND", "ENODATA", "NXDOMAIN"].includes(e.code); } // panne DNS : on ne bloque pas
}

export function envoyables(db) {
  const bl = new Set(db.blacklist.map((e) => e.toLowerCase()));
  return Object.values(db.prospects).filter((p) =>
    p.email && !bl.has(p.email.trim().toLowerCase()) && !p.opposition && p.statut === "en_ligne" && p.site_url);
}
export const envoisDuJour = (db) => {
  const d = new Date().toISOString().slice(0, 10);
  return db.envois.filter((e) => e.ok && !e.test && e.date.startsWith(d)).length;
};

function fill(tpl, v) { return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? "")); }

export function renderEmail(p, cfg, base) {
  const bonjour = p.dirigeant ? `Bonjour ${p.dirigeant},` : "Bonjour,";
  const phrase_note = p.note && (p.nb_avis || 0) >= 5 && Number(p.note) >= 4
    ? ` — avec une très belle note de ${noteFr(p.note)}/5 sur ${p.nb_avis} avis` : "";
  const prix = String(cfg.offre_prix || "").trim();
  const v = {
    nom: p.nom || "votre entreprise", ville: p.ville || "chez vous", activite: String(p.activite || "professionnel").toLowerCase(),
    lien: p.site_url || "[lien du site]", bonjour, phrase_note, phrase_prix: prix ? `\nTarif : ${prix}.` : "",
    tel_agence: cfg.signature_tel, signature: cfg.signature, agence: cfg.agence_nom,
  };
  const sujet = fill(cfg.email_sujet || DEFAULT_SUJET, v);
  const corps = fill(cfg.email_corps || DEFAULT_CORPS, v).trim();
  const stop = p.email ? `${base}/api/stop?e=${encodeURIComponent(p.email)}&s=${stopSig(p.email)}` : "";
  const mentions = `—\n${cfg.agence_nom} · ${cfg.expediteur_email}\nVos coordonnées professionnelles proviennent de sources publiques (fiche Google, registre des entreprises) et ne sont utilisées que pour cette proposition.\nPour ne plus recevoir de message : ${stop || "répondez « STOP »"}`;
  const texte = `${corps}\n\n${mentions}`;
  let h = esc(corps);
  if (v.lien.startsWith("http")) h = h.split(esc(v.lien)).join(`<a href="${esc(v.lien)}">${esc(v.lien)}</a>`);
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">${h.replace(/\n/g, "<br>")}`
    + `<p style="font-size:12px;color:#888;margin-top:24px">—<br>${esc(cfg.agence_nom)} · ${esc(cfg.expediteur_email)}<br>`
    + `Vos coordonnées professionnelles proviennent de sources publiques (fiche Google, registre des entreprises) et ne sont utilisées que pour cette proposition.<br>`
    + (stop ? `<a href="${esc(stop)}" style="color:#888">Ne plus recevoir de message</a>` : "Pour ne plus recevoir de message, répondez « STOP ».")
    + `</p></div>`;
  return { sujet, texte, html, stop };
}

export async function brevoSend(cfg, to, { sujet, texte, html, stop }) {
  const key = env("BREVO_API_KEY");
  if (!key) throw new Error("Clé Brevo manquante (variable BREVO_API_KEY sur Netlify).");
  const unsub = [stop && `<${stop}>`, `<mailto:${cfg.reply_to || cfg.expediteur_email}?subject=STOP>`].filter(Boolean).join(", ");
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: cfg.expediteur_nom, email: cfg.expediteur_email },
      to: [{ email: to }], replyTo: { email: cfg.reply_to || cfg.expediteur_email },
      subject: sujet, htmlContent: html, textContent: texte,
      headers: { "List-Unsubscribe": unsub },
    }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status} : ${(await r.text()).slice(0, 300)}`);
  return true;
}

export async function envoyerProspect(db, p, cfg, base) {
  const msg = renderEmail(p, cfg, base);
  const date = new Date().toISOString();
  try {
    await brevoSend(cfg, p.email.trim(), msg);
    db.envois.push({ id: p.id, date, to: p.email, sujet: msg.sujet, ok: true });
    p.statut = "envoye"; p.date_envoi = date;
    return { ok: true };
  } catch (e) {
    db.envois.push({ id: p.id, date, to: p.email, sujet: msg.sujet, ok: false, erreur: e.message });
    return { ok: false, erreur: e.message };
  }
}

// ---------------------------------------------------------------------------
// Site vitrine de démonstration
// ---------------------------------------------------------------------------
export function renderSite(p, cfg) {
  const th = SECTEURS[p.secteur] || SECTEURS.services;
  const ville = p.ville || "votre ville", nom = p.nom || "Votre entreprise", activite = p.activite || th.label;
  const tel = p.telephone || "", telL = tel.replace(/[^0-9+]/g, "");
  const adresse = p.adresse || ville;
  const q = encodeURIComponent(`${nom} ${adresse}`);
  const fv = (s) => s.replace(/\{ville\}/g, ville);
  const services = th.services.map(([t, d]) => `<div class="card"><h3>${esc(t)}</h3><p>${esc(fv(d))}</p></div>`).join("");
  const avis = p.note && (p.nb_avis || 0) >= 3 ? `<div class="badge">★ ${noteFr(p.note)}/5 · ${p.nb_avis} avis clients sur Google</div>` : "";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(nom)} – ${esc(activite)} à ${esc(ville)}</title>
<style>
:root{--c1:${th.c1};--c2:${th.c2}}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;line-height:1.55}
.demo{background:#111;color:#fff;font-size:13px;text-align:center;padding:8px 12px}.demo a{color:var(--c2)}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 6vw;position:absolute;width:100%;z-index:2;color:#fff}
.logo{font-weight:800;font-size:20px}header nav a{color:#fff;text-decoration:none;margin-left:22px;opacity:.9}
.hero{position:relative;min-height:78vh;display:flex;align-items:center;padding:120px 6vw 80px;color:#fff;background:radial-gradient(circle at 80% 20%,var(--c2) 0,transparent 40%),linear-gradient(135deg,var(--c1),#0b0b14);overflow:hidden}
.hero:after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px);background-size:22px 22px}
.hero .in{position:relative;z-index:1;max-width:720px}.kicker{text-transform:uppercase;letter-spacing:2px;font-size:13px;color:var(--c2);font-weight:700}
h1{font-size:clamp(34px,6vw,64px);line-height:1.05;margin:12px 0 18px}.hero p{font-size:clamp(17px,2vw,21px);opacity:.9;margin-bottom:28px}
.btn{display:inline-block;background:var(--c2);color:#111;padding:14px 26px;border-radius:40px;font-weight:700;text-decoration:none;margin:0 10px 10px 0}
.btn.ghost{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.6)}
.badge{display:inline-block;margin-top:14px;background:rgba(255,255,255,.12);padding:8px 14px;border-radius:30px;font-size:14px}
section{padding:80px 6vw}h2{font-size:clamp(26px,3.5vw,38px);margin-bottom:10px;color:var(--c1)}.sub{color:#555;margin-bottom:36px;max-width:640px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}
.card{border:1px solid #eee;border-radius:16px;padding:26px;box-shadow:0 6px 24px rgba(0,0,0,.05)}.card h3{margin-bottom:8px;color:var(--c1)}
.card:before{content:"";display:block;width:38px;height:4px;background:var(--c2);border-radius:4px;margin-bottom:16px}
.alt{background:#f6f7fb}.contact{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px}
.info p{margin-bottom:12px;font-size:17px}iframe{width:100%;height:320px;border:0;border-radius:16px}
footer{background:#0b0b14;color:#aaa;padding:30px 6vw;font-size:14px;text-align:center}footer a{color:var(--c2)}
.sticky{position:fixed;bottom:16px;right:16px;z-index:5}@media(max-width:640px){header nav{display:none}}
</style></head><body>
<div class="demo">Aperçu gratuit réalisé par <b>${esc(cfg.agence_nom)}</b> pour ${esc(nom)} — maquette de démonstration, non officielle. <a href="#agence">Le mettre en ligne →</a></div>
<header><div class="logo">${esc(nom)}</div><nav><a href="#services">Services</a><a href="#contact">Contact</a></nav></header>
<div class="hero"><div class="in"><div class="kicker">${esc(activite)} · ${esc(ville)}</div><h1>${esc(nom)}</h1>
<p>${esc(fv(th.accroche))}</p>${tel ? `<a class="btn" href="tel:${esc(telL)}">📞 ${esc(tel)}</a>` : ""}<a class="btn ghost" href="#contact">${esc(th.cta)}</a>${avis}</div></div>
<section id="services"><h2>Nos services</h2><p class="sub">${esc(nom)} vous accompagne avec sérieux et proximité.</p><div class="grid">${services}</div></section>
<section class="alt"><h2>Pourquoi nous choisir ?</h2><p class="sub">Basés à ${esc(ville)}, nous privilégions la qualité, l'écoute et la transparence. Chaque client est unique : nous prenons le temps de vous conseiller.</p></section>
<section id="contact"><h2>Contact</h2><p class="sub">Une question, un devis, un rendez-vous ? Contactez-nous.</p>
<div class="contact"><div class="info"><p>📍 ${esc(adresse)}</p>${tel ? `<p>📞 <a href="tel:${esc(telL)}">${esc(tel)}</a></p>` : ""}
<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Itinéraire</a></div>
<iframe loading="lazy" src="https://www.google.com/maps?q=${q}&output=embed" title="Plan"></iframe></div></section>
<footer id="agence"><p>Ce site est une proposition de <b>${esc(cfg.agence_nom)}</b>. Il peut être mis en ligne à votre nom, avec votre nom de domaine, vos photos et vos textes.</p>
<p style="margin-top:8px">📞 ${esc(cfg.signature_tel)} · ✉️ <a href="mailto:${esc(cfg.reply_to)}">${esc(cfg.reply_to)}</a> · <a href="${esc(cfg.signature_site)}">${esc(cfg.signature_site)}</a></p></footer>
${tel ? `<a class="btn sticky" href="tel:${esc(telL)}">📞 Appeler</a>` : ""}</body></html>`;
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const page = (html, status = 200) =>
  new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
