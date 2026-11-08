// Mode automatique : tourne chaque heure du lundi au vendredi, de 9 h à 18 h (heure de Paris en hiver).
// - 1re exécution du jour : une recherche Google (rotation métier × ville), enrichissement et démos des nouveaux.
// - Chaque heure : envoie quelques e-mails (espacement naturel, quota du jour respecté).
import * as C from "../lib/core.mjs";

export const config = { schedule: "0 8-17 * * 1-5" };

export default async () => {
  const t0 = Date.now();
  const left = () => 25000 - (Date.now() - t0); // les tâches planifiées sont limitées à 30 s
  const db = await C.loadDB();
  const cfg = C.cfgOf(db);
  const base = C.env("URL");
  const today = new Date().toISOString().slice(0, 10);
  const log = [];

  if (cfg.auto_recherche && db.auto.lastSearchDay !== today && C.env("GOOGLE_API_KEY")) {
    const metiers = cfg.auto_metiers.split("\n").map((s) => s.trim()).filter(Boolean);
    const villes = cfg.auto_villes.split("\n").map((s) => s.trim()).filter(Boolean);
    const combos = villes.flatMap((v) => metiers.map((m) => [m, v]));
    if (combos.length) {
      const [m, v] = combos[db.auto.idx % combos.length];
      db.auto.idx = (db.auto.idx + 1) % combos.length;
      db.auto.lastSearchDay = today;
      const places = await C.placesSearch(`${m} ${v}`, 2);
      const nouveaux = [];
      for (const pl of places) {
        const p = C.placeToProspect(pl, m); const st = p._status; delete p._status;
        if ((st && st !== "OPERATIONAL") || p.site_existant.startsWith("site:")) continue;
        if (C.upsert(db, p)) nouveaux.push(p);
      }
      for (const p of nouveaux) {
        if (left() < 8000) break;
        Object.assign(p, await C.sireneEnrich(p.nom, p.code_postal)); p.enrichi = true;
        if (!p.opposition) C.publierDemo(db, p, base);
      }
      log.push(`recherche « ${m} ${v} » : ${places.length} fiches, ${nouveaux.length} nouveaux`);
    }
  }

  if (cfg.auto_envoi && C.env("BREVO_API_KEY")) {
    const reste = Math.max(0, Number(cfg.quota_jour) - C.envoisDuJour(db));
    const lot = C.envoyables(db).slice(0, Math.min(reste, Number(cfg.auto_envois_par_heure) || 3));
    for (const p of lot) {
      if (left() < 3000) break;
      const r = await C.envoyerProspect(db, p, cfg, base);
      log.push(`${p.nom} : ${r.ok ? "envoyé" : r.erreur}`);
    }
  }
  await C.saveDB(db);
  console.log(log.join("\n") || "rien à faire");
};
