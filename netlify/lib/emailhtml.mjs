// Mise en page HTML « futuriste » de l'e-mail de prospection (compatible clients mail : tableaux + styles en ligne)
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const C = { bg: "#05060f", card: "#0b0d1d", line: "#1f2340", txt: "#c7cbe6", mut: "#7d82a8", cyan: "#00e5ff", violet: "#7c3aed", pink: "#ff2bd6" };
const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function para(t) {
  return `<p style="margin:0 0 16px;font:15px/1.65 ${FONT};color:${C.txt}">${esc(t).replace(/\n/g, "<br>")}</p>`;
}

function offre(l) {
  // « • Nom — prix : description »
  const s = l.replace(/^•\s*/, "");
  const m = s.match(/^(.+?)\s+[—-]\s+(.+?)\s*:\s*(.+)$/);
  const [nom, prix, desc] = m ? [m[1], m[2], m[3]] : [s, "", ""];
  return `<tr><td style="padding:0 0 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#10132a;border:1px solid ${C.line};border-radius:14px">
<tr><td style="padding:16px 18px">
<div style="font:700 12px ${FONT};letter-spacing:2px;text-transform:uppercase;color:${C.cyan}">${esc(nom)}</div>
${prix ? `<div style="font:800 20px/1.3 ${FONT};color:#ffffff;margin-top:4px">${esc(prix)}</div>` : ""}
${desc ? `<div style="font:14px/1.55 ${FONT};color:${C.mut};margin-top:6px">${esc(desc)}</div>` : ""}
</td></tr></table></td></tr>`;
}

export function emailHtml({ corps, v, cfg, stop }) {
  let body = String(corps || "");
  const sig = String(cfg.signature || "").trim();
  if (sig && body.trim().endsWith(sig)) body = body.trim().slice(0, -sig.length).trim();
  const blocs = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  let html = "";
  for (const b of blocs) {
    const lines = b.split("\n");
    if (v.lien && b.includes(v.lien)) {
      const avant = lines.filter((l) => !l.includes(v.lien)).join("\n").trim();
      if (avant) html += para(avant);
      html += `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 26px;background:#0e1124;border:1px solid ${C.line};border-radius:16px">
<tr><td style="padding:12px 16px;border-bottom:1px solid ${C.line}">
<span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:#ff5f57"></span>&nbsp;<span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:#febc2e"></span>&nbsp;<span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:#28c840"></span>
<span style="font:12px ${FONT};color:${C.mut};margin-left:10px">aperçu · ${esc(v.nom)}</span></td></tr>
<tr><td align="center" style="padding:26px 18px 28px;background:${C.card};background-image:linear-gradient(135deg,#101436 0%,#1a0f3a 60%,#0b0d1d 100%);border-radius:0 0 16px 16px">
<div style="font:700 11px ${FONT};letter-spacing:3px;text-transform:uppercase;color:${C.cyan}">Maquette personnalisée</div>
<div style="font:800 24px/1.25 ${FONT};color:#ffffff;margin:8px 0 18px">${esc(v.nom)}</div>
<a href="${esc(v.lien)}" style="display:inline-block;background:${C.cyan};background-image:linear-gradient(90deg,${C.cyan},${C.violet});color:#ffffff;font:700 16px ${FONT};text-decoration:none;padding:15px 30px;border-radius:40px">Découvrir mon site&nbsp;&nbsp;→</a>
<div style="font:12px ${FONT};color:${C.mut};margin-top:14px"><a href="${esc(v.lien)}" style="color:${C.mut}">${esc(v.lien)}</a></div>
</td></tr></table>`;
      continue;
    }
    if (lines.some((l) => l.trim().startsWith("•"))) {
      const intro = lines.filter((l) => !l.trim().startsWith("•") && !/^option/i.test(l.trim())).join("\n").trim();
      if (intro) html += para(intro);
      html += `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 6px">${lines.filter((l) => l.trim().startsWith("•")).map(offre).join("")}</table>`;
      const opt = lines.filter((l) => /^option/i.test(l.trim())).join(" ");
      if (opt) html += `<p style="margin:0 0 20px;font:13px ${FONT};color:${C.mut}">✦ ${esc(opt)}</p>`;
      continue;
    }
    if (b.startsWith("🎁")) {
      html += `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 22px;border-radius:14px;background:${C.violet};background-image:linear-gradient(90deg,${C.violet},${C.pink})">
<tr><td style="padding:16px 18px;font:700 15px/1.5 ${FONT};color:#ffffff">${esc(b)}</td></tr></table>`;
      continue;
    }
    // Paragraphe classique (y compris l'intro « Si elle vous plaît… » isolée)
    html += para(b);
  }

  const sigLines = sig.split("\n");
  const sigHtml = sig ? `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;border-top:1px solid ${C.line}">
<tr><td style="padding-top:18px">
<div style="font:800 16px ${FONT};color:#ffffff">${esc(sigLines[0])}</div>
${sigLines.slice(1).map((l) => `<div style="font:13px/1.6 ${FONT};color:${C.mut}">${esc(l)}</div>`).join("")}
</td></tr></table>` : "";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(v.nom)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden">
<tr><td style="height:4px;line-height:4px;font-size:0;background:${C.cyan};background-image:linear-gradient(90deg,${C.cyan},${C.violet},${C.pink})">&nbsp;</td></tr>
<tr><td style="padding:26px 30px 8px">
<div style="font:800 13px ${FONT};letter-spacing:4px;text-transform:uppercase;color:${C.cyan}">${esc(cfg.agence_nom || "NEXOLV")}</div>
<div style="font:12px ${FONT};color:${C.mut};margin-top:4px">Vos défis. Nos solutions.</div>
</td></tr>
<tr><td style="padding:14px 30px 6px">
<div style="font:800 28px/1.2 ${FONT};color:#ffffff">Votre site internet<br><span style="color:${C.cyan}">est prêt.</span></div>
</td></tr>
<tr><td style="padding:18px 30px 26px">${html}${sigHtml}</td></tr>
<tr><td style="padding:18px 30px 24px;background:#080a17;border-top:1px solid ${C.line};font:11px/1.6 ${FONT};color:#5d6288">
${esc(cfg.agence_nom)} · ${esc(cfg.expediteur_email)}<br>
Vos coordonnées professionnelles proviennent de sources publiques (fiche Google, registre des entreprises) et ne sont utilisées que pour cette proposition.<br>
${stop ? `<a href="${esc(stop)}" style="color:#5d6288">Ne plus recevoir de message</a>` : "Pour ne plus recevoir de message, répondez « STOP »."}
</td></tr>
</table></td></tr></table></body></html>`;
}
