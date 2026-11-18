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

export default {
  async fetch(req, env) {
    init(env);
    const { pathname } = new URL(req.url);
    if (pathname === "/api/import" && req.method === "POST") return importer(req);
    if (pathname.startsWith("/api/")) return api(req);
    if (pathname.startsWith("/demo/")) return demo(req);
    return env.ASSETS.fetch(req);
  },
  async scheduled(event, env, ctx) {
    init(env);
    ctx.waitUntil(auto());
  },
};

// Reprise des données depuis l'ancienne version (Netlify) : réservé à l'appli connectée
async function importer(req) {
  if (!C.isAuthed(req)) return C.json({ error: "Session expirée, reconnectez-vous." }, 401);
  const d = await req.json().catch(() => null);
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
