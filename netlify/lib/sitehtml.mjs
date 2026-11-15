// Gabarit "futuriste" des sites de démonstration (/demo/<slug>)
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const noteFr = (n) => Number(n).toFixed(1).replace(".", ",");

// Couleurs néon par secteur : [accent principal, accent secondaire]
const NEON = {
  btp: ["#ffb020", "#00e5ff"],
  coiffure: ["#e8c27a", "#ff2bd6"],
  restauration: ["#ff6b35", "#ffd23f"],
  transport: ["#00e5ff", "#ff7a18"],
  services: ["#8b5cf6", "#00e5ff"],
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
  const [n1, n2] = NEON[secteur] || NEON.services;
  const ic = ICONES[secteur] || ICONES.services;
  const etapes = ETAPES[secteur] || ETAPES.services;
  const ville = p.ville || "votre ville", nom = p.nom || "Votre entreprise", activite = p.activite || th.label;
  const tel = p.telephone || "", telL = tel.replace(/[^0-9+]/g, "");
  const adresse = p.adresse || ville;
  const q = encodeURIComponent(`${nom} ${adresse}`);
  const fv = (s) => s.replace(/\{ville\}/g, ville);
  const initiales = nom.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";
  const aNote = p.note && (p.nb_avis || 0) >= 3;

  const services = th.services.map(([t, d], i) => `
<article class="card rv" style="--d:${i * 90}ms"><div class="ic">${svg(ic[i])}</div><span class="num">0${i + 1}</span>
<h3>${esc(t)}</h3><p>${esc(fv(d))}</p></article>`).join("");

  const steps = etapes.map(([t, d], i) => `
<div class="step rv" style="--d:${i * 120}ms"><div class="dot">${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("");

  const stats = [
    aNote ? [`${noteFr(p.note)}<small>/5</small>`, `${p.nb_avis} avis Google`] : null,
    [esc(ville), "Zone d'intervention"],
    ["Sur-mesure", "Service personnalisé"],
    tel ? ["1 appel", "Pour nous joindre"] : null,
  ].filter(Boolean).slice(0, 3).map(([v, l]) => `<div class="stat"><b>${v}</b><span>${esc(l)}</span></div>`).join("");

  const mots = [activite, ville, ...th.services.map((s) => s[0])];
  const marquee = [...mots, ...mots].map((m) => `<span>${esc(m)}</span><i>✦</i>`).join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#05060f">
<title>${esc(nom)} – ${esc(activite)} à ${esc(ville)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--n1:${n1};--n2:${n2};--bg:#05060f;--card:rgba(255,255,255,.04);--line:rgba(255,255,255,.09);--txt:#e9ecf5;--mut:#9aa3b8}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--txt);line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}
h1,h2,h3,.logo,.stat b{font-family:"Space Grotesk",Inter,sans-serif;letter-spacing:-.02em}
a{color:inherit}
.demo{position:relative;z-index:20;background:linear-gradient(90deg,var(--n1),var(--n2));color:#05060f;font-size:13px;font-weight:600;text-align:center;padding:8px 14px}
.demo a{color:#05060f}
/* fond animé */
.bg{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
.bg:before{content:"";position:absolute;inset:-50%;background:
 radial-gradient(closest-side,color-mix(in srgb,var(--n1) 38%,transparent),transparent) 20% 25%/45% 45% no-repeat,
 radial-gradient(closest-side,color-mix(in srgb,var(--n2) 30%,transparent),transparent) 80% 15%/50% 50% no-repeat,
 radial-gradient(closest-side,rgba(124,58,237,.28),transparent) 60% 80%/55% 55% no-repeat;
 filter:blur(40px);animation:drift 22s ease-in-out infinite alternate}
.bg:after{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
 background-size:64px 64px;mask-image:radial-gradient(ellipse at 50% 0%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse at 50% 0%,#000 30%,transparent 75%)}
@keyframes drift{to{transform:translate3d(6%,4%,0) rotate(8deg)}}
.glow{position:fixed;width:420px;height:420px;border-radius:50%;pointer-events:none;z-index:-1;background:radial-gradient(closest-side,color-mix(in srgb,var(--n1) 22%,transparent),transparent);transform:translate(-50%,-50%);transition:opacity .3s}
/* nav */
header{position:sticky;top:0;z-index:15;display:flex;justify-content:space-between;align-items:center;padding:16px 6vw;
 backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(5,6,15,.55);border-bottom:1px solid var(--line)}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px}
.mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:14px;color:#05060f;background:linear-gradient(135deg,var(--n1),var(--n2));box-shadow:0 0 20px color-mix(in srgb,var(--n1) 60%,transparent)}
header nav a{text-decoration:none;color:var(--mut);margin-left:26px;font-size:15px;transition:color .2s}header nav a:hover{color:#fff}
/* hero */
.hero{min-height:88vh;display:grid;grid-template-columns:1.2fr .8fr;gap:40px;align-items:center;padding:70px 6vw 60px}
.chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--card);padding:7px 14px;border-radius:40px;font-size:13px;color:var(--mut)}
.chip i{width:8px;height:8px;border-radius:50%;background:var(--n1);box-shadow:0 0 12px var(--n1);animation:pulse 1.8s infinite}
@keyframes pulse{50%{opacity:.35}}
h1{font-size:clamp(40px,7vw,84px);line-height:1;margin:22px 0;font-weight:700}
.grad{background:linear-gradient(100deg,#fff 10%,var(--n1) 45%,var(--n2) 90%);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% auto;animation:shine 6s linear infinite}
@keyframes shine{to{background-position:200% center}}
.lead{font-size:clamp(17px,2vw,21px);color:var(--mut);max-width:560px;margin-bottom:34px}
.ctas{display:flex;flex-wrap:wrap;gap:14px}
.btn{position:relative;display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:14px;font-weight:600;text-decoration:none;font-size:16px;transition:transform .2s,box-shadow .2s}
.btn.pri{color:#05060f;background:linear-gradient(135deg,var(--n1),var(--n2));box-shadow:0 10px 40px -10px var(--n1)}
.btn.pri:hover{transform:translateY(-2px);box-shadow:0 16px 50px -8px var(--n1)}
.btn.sec{border:1px solid var(--line);background:var(--card);color:#fff}.btn.sec:hover{border-color:var(--n1)}
.stats{display:flex;flex-wrap:wrap;gap:34px;margin-top:46px;padding-top:28px;border-top:1px solid var(--line)}
.stat b{display:block;font-size:28px;color:#fff}.stat b small{font-size:15px;color:var(--mut)}.stat span{font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:.08em}
/* orbe 3D */
.orb{position:relative;aspect-ratio:1;max-width:440px;width:100%;justify-self:center;perspective:900px}
.ring{position:absolute;inset:0;border-radius:50%;border:1px solid color-mix(in srgb,var(--n1) 55%,transparent);animation:spin 14s linear infinite;transform-style:preserve-3d}
.ring:nth-child(2){inset:9%;border-color:color-mix(in srgb,var(--n2) 55%,transparent);animation-duration:10s;animation-direction:reverse}
.ring:nth-child(3){inset:20%;border-style:dashed;border-color:rgba(255,255,255,.25);animation-duration:24s}
.ring:before{content:"";position:absolute;top:-6px;left:50%;width:12px;height:12px;border-radius:50%;background:var(--n1);box-shadow:0 0 18px 4px var(--n1)}
.ring:nth-child(2):before{background:var(--n2);box-shadow:0 0 18px 4px var(--n2)}
@keyframes spin{from{transform:rotateX(64deg) rotateZ(0)}to{transform:rotateX(64deg) rotateZ(360deg)}}
.core{position:absolute;inset:30%;border-radius:50%;display:grid;place-items:center;text-align:center;
 background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.35),transparent 40%),linear-gradient(135deg,var(--n1),var(--n2));
 box-shadow:0 0 80px -5px var(--n1),inset 0 0 40px rgba(0,0,0,.35);animation:float 6s ease-in-out infinite}
.core b{font-family:"Space Grotesk";font-size:clamp(34px,5vw,56px);color:#05060f}
@keyframes float{50%{transform:translateY(-14px)}}
/* bandeau défilant */
.marquee{border-block:1px solid var(--line);background:rgba(255,255,255,.02);overflow:hidden;white-space:nowrap;padding:18px 0}
.track{display:inline-flex;gap:28px;animation:scroll 32s linear infinite;font-family:"Space Grotesk";font-size:20px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
.track i{color:var(--n1);font-style:normal}
@keyframes scroll{to{transform:translateX(-50%)}}
/* sections */
section{padding:100px 6vw;position:relative}
.eyebrow{color:var(--n1);font-size:13px;text-transform:uppercase;letter-spacing:.18em;font-weight:600}
h2{font-size:clamp(30px,4.4vw,52px);line-height:1.08;margin:12px 0 16px;max-width:760px}
.sub{color:var(--mut);max-width:620px;margin-bottom:50px;font-size:17px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
.card{position:relative;padding:30px 26px;border-radius:20px;background:var(--card);border:1px solid var(--line);overflow:hidden;transition:transform .35s,border-color .35s;backdrop-filter:blur(8px)}
.card:before{content:"";position:absolute;inset:0;background:radial-gradient(400px circle at var(--mx,50%) var(--my,0%),color-mix(in srgb,var(--n1) 16%,transparent),transparent 45%);opacity:0;transition:opacity .3s}
.card:hover{transform:translateY(-6px);border-color:color-mix(in srgb,var(--n1) 55%,transparent)}.card:hover:before{opacity:1}
.ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;color:var(--n1);background:color-mix(in srgb,var(--n1) 12%,transparent);border:1px solid color-mix(in srgb,var(--n1) 35%,transparent);margin-bottom:22px}
.num{position:absolute;top:22px;right:24px;font-family:"Space Grotesk";color:rgba(255,255,255,.14);font-size:30px;font-weight:700}
.card h3{font-size:20px;margin-bottom:8px;color:#fff}.card p{color:var(--mut);font-size:15px}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:30px;position:relative}
.step{position:relative;padding-top:8px}
.dot{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-family:"Space Grotesk";font-weight:700;font-size:20px;color:#05060f;background:linear-gradient(135deg,var(--n1),var(--n2));box-shadow:0 0 30px -4px var(--n1);margin-bottom:20px}
.step h3{font-size:20px;margin-bottom:6px}.step p{color:var(--mut)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:stretch}
.panel{border-radius:24px;border:1px solid var(--line);background:var(--card);padding:36px}
.line{display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-bottom:1px solid var(--line)}.line:last-of-type{border:0}
.line .ic{width:42px;height:42px;margin:0;flex:none}.line small{display:block;color:var(--mut);font-size:13px;text-transform:uppercase;letter-spacing:.08em}
.line a,.line span{font-size:17px;text-decoration:none;color:#fff}
.map{border-radius:24px;overflow:hidden;border:1px solid var(--line);min-height:340px;filter:invert(.9) hue-rotate(180deg) saturate(.6) contrast(.9)}
.map iframe{width:100%;height:100%;min-height:340px;border:0;display:block}
.cta-band{margin:0 6vw 100px;border-radius:28px;padding:60px 6vw;text-align:center;position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--n1) 40%,transparent);
 background:radial-gradient(600px circle at 50% 0%,color-mix(in srgb,var(--n1) 25%,transparent),transparent 70%),var(--card)}
.cta-band h2{margin:0 auto 14px}.cta-band p{color:var(--mut);margin:0 auto 30px;max-width:520px}
footer{border-top:1px solid var(--line);padding:40px 6vw 90px;color:var(--mut);font-size:14px;text-align:center}
footer b{color:#fff}footer a{color:var(--n1)}
.sticky{position:fixed;right:18px;bottom:18px;z-index:30}
/* révélation au défilement */
.rv{opacity:0;transform:translateY(28px);transition:opacity .8s cubic-bezier(.2,.7,.2,1) var(--d,0ms),transform .8s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}
.rv.on{opacity:1;transform:none}
@media(max-width:900px){.hero{grid-template-columns:1fr;padding-top:50px}.orb{max-width:300px;order:-1}.split{grid-template-columns:1fr}header nav{display:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
</style></head><body>
<div class="bg"></div><div class="glow" id="glow"></div>
<div class="demo">✦ Aperçu gratuit conçu par ${esc(cfg.agence_nom)} pour ${esc(nom)} — maquette de démonstration. <a href="#agence">Le mettre en ligne →</a></div>
<header><div class="logo"><span class="mark">${esc(initiales)}</span>${esc(nom)}</div>
<nav><a href="#services">Services</a><a href="#methode">Méthode</a><a href="#contact">Contact</a></nav></header>

<main>
<div class="hero">
 <div class="rv on">
  <span class="chip"><i></i>${esc(activite)} · ${esc(ville)}</span>
  <h1><span class="grad">${esc(nom)}</span></h1>
  <p class="lead">${esc(fv(th.accroche))}</p>
  <div class="ctas">${tel ? `<a class="btn pri" href="tel:${esc(telL)}">${svg("phone", 18)} ${esc(tel)}</a>` : ""}
  <a class="btn ${tel ? "sec" : "pri"}" href="#contact">${esc(th.cta)} →</a></div>
  <div class="stats">${stats}</div>
 </div>
 <div class="orb" aria-hidden="true"><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="core"><b>${esc(initiales)}</b></div></div>
</div>

<div class="marquee" aria-hidden="true"><div class="track">${marquee}</div></div>

<section id="services">
 <div class="eyebrow rv">Services</div>
 <h2 class="rv">Ce que ${esc(nom)} fait pour vous.</h2>
 <p class="sub rv">Un savoir-faire local à ${esc(ville)}, une vraie écoute et un travail soigné, du premier appel jusqu'au résultat.</p>
 <div class="grid">${services}</div>
</section>

<section id="methode">
 <div class="eyebrow rv">Méthode</div>
 <h2 class="rv">Simple, rapide, sans surprise.</h2>
 <p class="sub rv">Trois étapes, et vous êtes entre de bonnes mains.</p>
 <div class="steps">${steps}</div>
</section>

<section id="contact">
 <div class="eyebrow rv">Contact</div>
 <h2 class="rv">Parlons de votre besoin.</h2>
 <p class="sub rv">Une question, un devis, un rendez-vous ? Nous vous répondons rapidement.</p>
 <div class="split">
  <div class="panel rv">
   <div class="line"><div class="ic">${svg("pin", 20)}</div><div><small>Adresse</small><span>${esc(adresse)}</span></div></div>
   ${tel ? `<div class="line"><div class="ic">${svg("phone", 20)}</div><div><small>Téléphone</small><a href="tel:${esc(telL)}">${esc(tel)}</a></div></div>` : ""}
   ${aNote ? `<div class="line"><div class="ic">${svg("star", 20)}</div><div><small>Avis Google</small><span>${noteFr(p.note)}/5 · ${esc(p.nb_avis)} avis</span></div></div>` : ""}
   <div style="margin-top:22px"><a class="btn pri" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${svg("pin", 18)} Itinéraire</a></div>
  </div>
  <div class="map rv" style="--d:120ms"><iframe loading="lazy" src="https://www.google.com/maps?q=${q}&output=embed" title="Plan d'accès"></iframe></div>
 </div>
</section>
</main>

<div class="cta-band rv" id="agence">
 <div class="eyebrow">Proposition ${esc(cfg.agence_nom)}</div>
 <h2>Ce site peut être le vôtre, en ligne cette semaine.</h2>
 <p>À votre nom, avec votre nom de domaine, vos photos et vos textes. Répondez simplement au mail ou appelez-nous.</p>
 <div class="ctas" style="justify-content:center">
  ${cfg.signature_tel ? `<a class="btn pri" href="tel:${esc(String(cfg.signature_tel).replace(/[^0-9+]/g, ""))}">${svg("phone", 18)} ${esc(cfg.signature_tel)}</a>` : ""}
  ${cfg.reply_to ? `<a class="btn sec" href="mailto:${esc(cfg.reply_to)}?subject=${encodeURIComponent("Site pour " + nom)}">${svg("chat", 18)} ${esc(cfg.reply_to)}</a>` : ""}
 </div>
</div>

<footer><p>Maquette réalisée par <b>${esc(cfg.agence_nom)}</b>${cfg.signature_site ? ` · <a href="${esc(cfg.signature_site)}">${esc(String(cfg.signature_site).replace(/^https?:\/\//, ""))}</a>` : ""}</p>
<p style="margin-top:6px">Démonstration non officielle — informations issues de la fiche publique de l'établissement.</p></footer>
${tel ? `<a class="btn pri sticky" href="tel:${esc(telL)}">${svg("phone", 18)} Appeler</a>` : ""}
<script>
(()=>{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("on");io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll(".rv:not(.on)").forEach(el=>io.observe(el));
const g=document.getElementById("glow");if(matchMedia("(pointer:fine)").matches){addEventListener("pointermove",e=>{g.style.left=e.clientX+"px";g.style.top=e.clientY+"px"})}else g.style.opacity=0;
document.querySelectorAll(".card").forEach(c=>c.addEventListener("pointermove",e=>{const r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")}));})();
</script>
</body></html>`;
}
