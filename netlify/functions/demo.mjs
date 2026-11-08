// Sites de démonstration publics : /demo/<slug>
import * as C from "../lib/core.mjs";

export const config = { path: "/demo/*" };

export default async (req) => {
  const slug = decodeURIComponent(new URL(req.url).pathname.replace(/^\/demo\/?/, "").replace(/\/$/, ""));
  const db = await C.loadDB();
  const p = Object.values(db.prospects).find((x) => x.site_slug === slug);
  if (!p || p.statut === "stop") {
    return C.page(`<!DOCTYPE html><meta charset="utf-8"><title>Page introuvable</title>
<body style="font-family:sans-serif;text-align:center;padding:80px"><h1>Cette page n'existe plus</h1><p><a href="https://nexolv.fr">nexolv.fr</a></p></body>`, 404);
  }
  const res = C.page(C.renderSite(p, C.cfgOf(db)));
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
};
