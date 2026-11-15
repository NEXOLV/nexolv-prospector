// Gabarit "futuriste" des sites de démonstration (/demo/<slug>)
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const noteFr = (n) => Number(n).toFixed(1).replace(".", ",");

// Palette par secteur : [couleur principale, accent, fond clair teinté]
const PALETTE = {
  btp: ["#1c2b40", "#b07d3c", "#f6f3ee"],
  coiffure: ["#161616", "#b08d57", "#f7f4ef"],
  restauration: ["#5a1a1f", "#b8892d", "#f8f3ee"],
  transport: ["#103f4c", "#c26a35", "#f2f5f5"],
  services: ["#1e2a44", "#5f7fa6", "#f4f5f8"],
};

// Icônes (traits SVG) — 4 par secteur, dans l'ordre des services
const P = {
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.6 20 20M8.6 16.4 20 4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5a5 5 0 0 1 4.5 5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  euro: '<path d="M18 6.5A7 7 0 1 0 18 17.5M4 10h9M4 14h9"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z"/>',
};
const ICONES = {
  btp: ["doc", "tools", "bolt", "shield"],
  coiffure: ["scissors", "spark", "drop", "cal"],
  restauration: ["plate", "bag", "leaf", "users"],
  transport: ["phone", "pin", "euro", "check"],
  services: ["chat", "bolt", "pin", "star"],
};
const svg = (k, s = 26) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.star}</svg>`;

const ETAPES = {
  btp: [["Vous nous appelez", "Expliquez votre projet en quelques minutes."], ["Devis clair", "Visite, estimation précise et sans surprise."], ["Chantier réalisé", "Travail propre, délais respectés."]],
  coiffure: [["Vous réservez", "Un appel suffit pour choisir votre créneau."], ["Conseil sur-mesure", "On définit ensemble le style qui vous va."], ["Vous repartez", "Une coupe nette et un vrai moment pour vous."]],
  restauration: [["Vous appelez", "Commande ou réservation en un instant."], ["On prépare", "Des produits frais, cuisinés à la minute."], ["Vous savourez", "Sur place ou à emporter, comme vous voulez."]],
  transport: [["Vous réservez", "Par téléphone, simplement et rapidement."], ["On confirme", "Horaire, trajet et tarif annoncés à l'avance."], ["On s'occupe de tout", "Ponctualité et service professionnel."]],
  services: [["Premier contact", "Vous nous exposez votre besoin."], ["Proposition claire", "Une solution adaptée et un tarif transparent."], ["Suivi", "Nous restons disponibles après la prestation."]],
};

export function siteHtml(p, cfg, th, secteur) {
  const [c1, c2, tint] = PALETTE[secteur] || PALETTE.services;
  const ic = ICONES[secteur] || ICONES.services;
  const etapes = ETAPES[secteur] || ETAPES.services;
  const ville = p.ville || "votre ville", nom = p.nom || "Votre entreprise", activite = p.activite || th.label;
  const tel = p.telephone || "", telL = tel.replace(/[^0-9+]/g, "");
  const adresse = p.adresse || ville;
  const q = encodeURIComponent(`${nom} ${adresse}`);
  const fv = (s) => s.replace(/\{ville\}/g, ville);
  const mots = nom.split(/\s+/).filter(Boolean);
  const initiales = (mots.length > 1 ? mots.slice(0, 2).map((w) => w[0]).join("") : nom.slice(0, 2)).toUpperCase() || "•";
  const aNote = p.note && (p.nb_avis || 0) >= 3;
  const etoiles = aNote ? "★★★★★".slice(0, Math.round(p.note)) + "☆☆☆☆☆".slice(0, 5 - Math.round(p.note)) : "";

  const services = th.services.map(([t, d], i) => `
<article class="svc rv" style="--d:${i * 80}ms"><div class="svc-top"><span class="ic">${svg(ic[i], 22)}</span><span class="idx">0${i + 1}</span></div>
<h3>${esc(t)}</h3><p>${esc(fv(d))}</p></article>`).join("");

  const steps = etapes.map(([t, d], i) => `
<li class="rv" style="--d:${i * 110}ms"><span class="n">0${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join("");

  const faits = [
    aNote ? [`${noteFr(p.note)} / 5`, `${p.nb_avis} avis Google`] : null,
    [esc(ville), "et ses environs"],
    ["Sur mesure", "Chaque demande est unique"],
    tel ? ["Contact direct", "Un seul interlocuteur"] : null,
  ].filter(Boolean).slice(0, 3).map(([v, l]) => `<div><b>${v}</b><span>${esc(l)}</span></div>`).join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="${c1}">
<title>${esc(nom)} – ${esc(activite)} à ${esc(ville)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--c1:${c1};--c2:${c2};--tint:${tint};--ink:#15171c;--mut:#5d6370;--line:#e6e2da;--bg:#fcfbf8}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.65;-webkit-font-smoothing:antialiased}
h1,h2,h3,.brand,.facts b,.n{font-family:Fraunces,Georgia,serif;font-weight:500;letter-spacing:-.01em}
a{color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}
.demo{background:var(--ink);color:#d9dbe0;font-size:12.5px;text-align:center;padding:8px 16px;letter-spacing:.01em}
.demo a{color:#fff;font-weight:600}
/* en-tête */
header{position:sticky;top:0;z-index:10;background:rgba(252,251,248,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.nav{display:flex;align-items:center;justify-content:space-between;height:72px}
.brand{display:flex;align-items:center;gap:12px;font-size:21px;text-decoration:none}
.mono{width:38px;height:38px;border:1px solid var(--c1);display:grid;place-items:center;font-size:15px;color:var(--c1);letter-spacing:.04em}
.links{display:flex;align-items:center;gap:30px;font-size:14.5px}.links a{text-decoration:none;color:var(--mut)}.links a:hover{color:var(--ink)}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 24px;font-size:15px;font-weight:500;text-decoration:none;border:1px solid var(--c1);transition:background .25s,color .25s,transform .25s}
.btn.solid{background:var(--c1);color:#fff}.btn.solid:hover{background:transparent;color:var(--c1)}
.btn.ghost{color:var(--c1)}.btn.ghost:hover{background:var(--c1);color:#fff}
.links .btn{padding:10px 18px;font-size:14px;color:var(--c1)}
/* hero */
.hero{padding:96px 0 88px;background:linear-gradient(180deg,var(--tint),var(--bg))}
.hero .wrap{display:grid;grid-template-columns:1.15fr .85fr;gap:70px;align-items:center}
.kicker{display:flex;align-items:center;gap:14px;font-size:13px;text-transform:uppercase;letter-spacing:.2em;color:var(--c2);font-weight:600}
.kicker:before{content:"";width:36px;height:1px;background:var(--c2)}
h1{font-size:clamp(44px,6.4vw,82px);line-height:1.02;margin:24px 0 26px;color:var(--c1)}
.lead{font-size:clamp(17px,1.6vw,20px);color:var(--mut);max-width:520px;margin-bottom:38px}
.ctas{display:flex;flex-wrap:wrap;gap:14px}
/* carte 3D */
.scene{perspective:1100px;display:flex;justify-content:center}
.card3d{position:relative;width:100%;max-width:400px;aspect-ratio:1.58;transform-style:preserve-3d;transform:rotateX(10deg) rotateY(-16deg);transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.face{position:absolute;inset:0;padding:30px 32px;display:flex;flex-direction:column;justify-content:space-between;background:var(--c1);color:#fff;
 box-shadow:0 40px 80px -30px rgba(0,0,0,.45),0 18px 30px -18px rgba(0,0,0,.35);overflow:hidden}
.face:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,.14),transparent 40%,transparent 60%,rgba(255,255,255,.06))}
.face:after{content:"";position:absolute;right:-60px;bottom:-60px;width:220px;height:220px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 30px rgba(255,255,255,.03),0 0 0 60px rgba(255,255,255,.02)}
.back{position:absolute;inset:0;background:var(--c2);transform:translateZ(-40px) translate(26px,26px);opacity:.9}
.face .top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
.face .mono{border-color:rgba(255,255,255,.5);color:#fff;width:46px;height:46px;font-family:Fraunces,serif;font-size:18px}
.face .act{font-size:11px;text-transform:uppercase;letter-spacing:.2em;opacity:.75;text-align:right;max-width:60%}
.face .bottom{position:relative;z-index:1}.face .nm{font-family:Fraunces,serif;font-size:26px;line-height:1.15;margin-bottom:8px}
.face .meta{font-size:13px;opacity:.8;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.stars{color:var(--c2);letter-spacing:2px}
/* faits */
.facts{border-block:1px solid var(--line);background:#fff}
.facts .wrap{display:grid;grid-template-columns:repeat(3,1fr)}
.facts .wrap>div{padding:30px 28px;border-left:1px solid var(--line)}.facts .wrap>div:first-child{border-left:0;padding-left:0}
.facts b{display:block;font-size:26px;color:var(--c1)}.facts span{font-size:13.5px;color:var(--mut)}
/* sections */
section{padding:110px 0}
.head{display:grid;grid-template-columns:.9fr 1.1fr;gap:60px;align-items:end;margin-bottom:56px}
.eyebrow{font-size:12.5px;text-transform:uppercase;letter-spacing:.22em;color:var(--c2);font-weight:600;margin-bottom:16px}
h2{font-size:clamp(32px,4vw,50px);line-height:1.1;color:var(--c1)}
.head p{color:var(--mut);font-size:17px}
.svcs{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line)}
.svc{padding:34px 28px 38px;border-right:1px solid var(--line);transition:background .3s}
.svc:last-child{border-right:0}.svc:hover{background:#fff}
.svc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:34px}
.ic{color:var(--c2)}.idx{font-size:13px;color:var(--mut);letter-spacing:.1em}
.svc h3{font-size:22px;margin-bottom:10px;color:var(--ink)}.svc p{color:var(--mut);font-size:15px}
.alt{background:var(--tint)}
.steps{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:40px;position:relative}
.steps:before{content:"";position:absolute;top:22px;left:0;right:0;height:1px;background:var(--line)}
.steps li{position:relative}.n{display:inline-grid;place-items:center;width:46px;height:46px;background:var(--bg);border:1px solid var(--c1);color:var(--c1);font-size:16px;margin-bottom:24px;position:relative}
.alt .n{background:var(--tint)}
.steps h3{font-size:22px;margin-bottom:8px}.steps p{color:var(--mut)}
.contact{display:grid;grid-template-columns:.9fr 1.1fr;gap:0;border:1px solid var(--line);background:#fff}
.info{padding:48px}.info h2{margin-bottom:14px}.info>p{color:var(--mut);margin-bottom:30px}
.row{display:flex;gap:16px;padding:18px 0;border-top:1px solid var(--line)}
.row .ic{flex:none;margin-top:3px}.row small{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:var(--mut)}
.row a,.row span{font-size:17px;text-decoration:none;color:var(--ink)}
.map{min-height:420px;filter:grayscale(1) contrast(1.05);border-left:1px solid var(--line)}.map iframe{width:100%;height:100%;min-height:420px;border:0;display:block}
.final{background:var(--c1);color:#fff;padding:96px 0;text-align:center}
.final .eyebrow{color:var(--c2)}.final h2{color:#fff;max-width:760px;margin:0 auto 18px}
.final p{color:rgba(255,255,255,.72);max-width:540px;margin:0 auto 36px}
.final .btn.solid{background:#fff;color:var(--c1);border-color:#fff}.final .btn.solid:hover{background:transparent;color:#fff}
.final .btn.ghost{color:#fff;border-color:rgba(255,255,255,.4)}.final .btn.ghost:hover{background:#fff;color:var(--c1)}
footer{padding:34px 0 90px;font-size:13.5px;color:var(--mut);text-align:center;border-top:1px solid var(--line)}footer a{color:var(--c1)}
.sticky{position:fixed;right:18px;bottom:18px;z-index:20;box-shadow:0 12px 30px -10px rgba(0,0,0,.4)}
.rv{opacity:0;transform:translateY(22px);transition:opacity .9s ease var(--d,0ms),transform .9s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}.rv.on{opacity:1;transform:none}
@media(max-width:980px){.hero .wrap,.head,.contact{grid-template-columns:1fr}.hero{padding:60px 0}.scene{order:-1}.card3d{max-width:340px}
.svcs{grid-template-columns:1fr 1fr}.svc:nth-child(2){border-right:0}.svc:nth-child(-n+2){border-bottom:1px solid var(--line)}
.links a:not(.btn){display:none}.map{border-left:0;border-top:1px solid var(--line)}}
@media(max-width:640px){.facts .wrap,.steps,.svcs{grid-template-columns:1fr}.facts .wrap>div{border-left:0;border-top:1px solid var(--line);padding-left:0}.facts .wrap>div:first-child{border-top:0}
.svc{border-right:0;border-bottom:1px solid var(--line)}.steps:before{display:none}.info{padding:32px 24px}section{padding:80px 0}.links .btn{display:none}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}.rv{opacity:1;transform:none}}
</style></head><body>
<div class="demo">Aperçu personnalisé conçu par ${esc(cfg.agence_nom)} pour ${esc(nom)} — maquette de démonstration. <a href="#agence">Le mettre en ligne</a></div>
<header><div class="wrap nav"><a class="brand" href="#"><span class="mono">${esc(initiales)}</span>${esc(nom)}</a>
<nav class="links"><a href="#services">Services</a><a href="#methode">Méthode</a><a href="#contact">Contact</a>${tel ? `<a class="btn" href="tel:${esc(telL)}">${esc(tel)}</a>` : ""}</nav></div></header>

<main>
<div class="hero"><div class="wrap">
 <div class="rv on">
  <div class="kicker">${esc(activite)} · ${esc(ville)}</div>
  <h1>${esc(nom)}</h1>
  <p class="lead">${esc(fv(th.accroche))}</p>
  <div class="ctas">${tel ? `<a class="btn solid" href="tel:${esc(telL)}">${svg("phone", 17)} Appeler</a>` : ""}<a class="btn ${tel ? "ghost" : "solid"}" href="#contact">${esc(th.cta)}</a></div>
 </div>
 <div class="scene" aria-hidden="true"><div class="card3d" id="c3d"><div class="back"></div><div class="face">
  <div class="top"><span class="mono">${esc(initiales)}</span><span class="act">${esc(activite)}</span></div>
  <div class="bottom"><div class="nm">${esc(nom)}</div><div class="meta"><span>${esc(ville)}</span>${aNote ? `<span class="stars">${etoiles}</span>` : tel ? `<span>${esc(tel)}</span>` : ""}</div></div>
 </div></div></div>
</div></div>

<div class="facts"><div class="wrap">${faits}</div></div>

<section id="services"><div class="wrap">
 <div class="head"><div><div class="eyebrow rv">Nos services</div><h2 class="rv">Un savoir-faire au service de vos projets.</h2></div>
 <p class="rv">${esc(nom)} accompagne particuliers et professionnels à ${esc(ville)}, avec exigence et sens du détail.</p></div>
 <div class="svcs">${services}</div>
</div></section>

<section id="methode" class="alt"><div class="wrap">
 <div class="head"><div><div class="eyebrow rv">Notre méthode</div><h2 class="rv">Une démarche simple et transparente.</h2></div>
 <p class="rv">De la première prise de contact au résultat final, vous savez toujours où vous en êtes.</p></div>
 <ol class="steps">${steps}</ol>
</div></section>

<section id="contact"><div class="wrap"><div class="contact">
 <div class="info rv"><div class="eyebrow">Contact</div><h2>Parlons de votre projet.</h2><p>Une question, un devis, un rendez-vous : nous vous répondons rapidement.</p>
  <div class="row"><span class="ic">${svg("pin", 20)}</span><div><small>Adresse</small><span>${esc(adresse)}</span></div></div>
  ${tel ? `<div class="row"><span class="ic">${svg("phone", 20)}</span><div><small>Téléphone</small><a href="tel:${esc(telL)}">${esc(tel)}</a></div></div>` : ""}
  ${aNote ? `<div class="row"><span class="ic">${svg("star", 20)}</span><div><small>Avis Google</small><span>${noteFr(p.note)} / 5 · ${esc(p.nb_avis)} avis</span></div></div>` : ""}
  <div style="margin-top:26px"><a class="btn ghost" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Obtenir l'itinéraire</a></div>
 </div>
 <div class="map"><iframe loading="lazy" src="https://www.google.com/maps?q=${q}&output=embed" title="Plan d'accès"></iframe></div>
</div></div></section>
</main>

<div class="final" id="agence"><div class="wrap">
 <div class="eyebrow">Proposition ${esc(cfg.agence_nom)}</div>
 <h2>Ce site peut être le vôtre, en ligne en quelques jours.</h2>
 <p>À votre nom, avec votre nom de domaine, vos photos et vos textes. Répondez simplement au mail ou appelez-nous.</p>
 <div class="ctas" style="justify-content:center">
  ${cfg.signature_tel ? `<a class="btn solid" href="tel:${esc(String(cfg.signature_tel).replace(/[^0-9+]/g, ""))}">${svg("phone", 17)} ${esc(cfg.signature_tel)}</a>` : ""}
  ${cfg.reply_to ? `<a class="btn ghost" href="mailto:${esc(cfg.reply_to)}?subject=${encodeURIComponent("Site pour " + nom)}">${esc(cfg.reply_to)}</a>` : ""}
 </div>
</div></div>

<footer><div class="wrap"><p>Maquette réalisée par ${esc(cfg.agence_nom)}${cfg.signature_site ? ` · <a href="${esc(cfg.signature_site)}">${esc(String(cfg.signature_site).replace(/^https?:\/\//, ""))}</a>` : ""} — démonstration non officielle, informations issues de la fiche publique de l'établissement.</p></div></footer>
${tel ? `<a class="btn solid sticky" href="tel:${esc(telL)}">${svg("phone", 17)} Appeler</a>` : ""}
<script>
(()=>{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("on");io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll(".rv:not(.on)").forEach(el=>io.observe(el));
const c=document.getElementById("c3d");if(c&&matchMedia("(pointer:fine)").matches){addEventListener("pointermove",e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;c.style.transform="rotateX("+(10-y*12)+"deg) rotateY("+(-16+x*18)+"deg)"})}})();
</script>
</body></html>`;
}
