function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderContent(content = {}) {
  const parts = [];
  if (content.hero) {
    parts.push(`<section class="hero"><p>${escapeHtml(content.hero.eyebrow || "")}</p><h1>${escapeHtml(content.hero.title)}</h1><p>${escapeHtml(content.hero.subtitle || "")}</p><a href="${escapeHtml(content.hero.cta?.href || "/contact")}">${escapeHtml(content.hero.cta?.label || "Nous contacter")}</a></section>`);
  }
  if (content.introduction) parts.push(`<p class="intro">${escapeHtml(content.introduction)}</p>`);
  for (const section of content.sections || []) {
    parts.push(`<section><h2>${escapeHtml(section.title || "")}</h2><p>${escapeHtml(section.body || "")}</p>${section.href ? `<a href="${escapeHtml(section.href)}">En savoir plus</a>` : ""}</section>`);
  }
  if (Array.isArray(content.questions)) {
    parts.push(`<section><h2>Questions fréquentes</h2>${content.questions.map(q => `<details><summary>${escapeHtml(q.question)}</summary><p>${escapeHtml(q.answer)}</p></details>`).join("")}</section>`);
  }
  if (content.agency) {
    parts.push(`<section><h2>${escapeHtml(content.agency.name)}</h2><p>${escapeHtml(content.agency.address)}</p><p><a href="tel:${escapeHtml(content.agency.phone)}">${escapeHtml(content.agency.phone)}</a> · <a href="mailto:${escapeHtml(content.agency.email)}">${escapeHtml(content.agency.email)}</a></p></section>`);
  }
  return parts.join("\n");
}

class HtmlRenderer {
  render({ plan, page, schema, baseUrl, links }) {
    const canonical = page.slug ? `${baseUrl}/${page.slug}` : baseUrl;
    const nav = plan.pages.map(p => `<a href="/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a>`).join("");
    const related = links.filter(l => l.from === page.slug).map(l => `<li><a href="/${escapeHtml(l.to)}">${escapeHtml(l.anchor)}</a></li>`).join("");

    return `<!doctype html>
<html lang="${escapeHtml(plan.topic.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(page.seoTitle)}</title>
<meta name="description" content="${escapeHtml(page.seoDesc)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(page.seoTitle)}">
<meta property="og:description" content="${escapeHtml(page.seoDesc)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<style>
body{font-family:system-ui,sans-serif;max-width:1120px;margin:auto;padding:24px;line-height:1.6;color:#17202a}
header,footer{padding:20px 0}nav{display:flex;gap:14px;flex-wrap:wrap}.hero{padding:64px 0}.hero h1{font-size:clamp(2.2rem,7vw,4.8rem);line-height:1.05}
a{color:inherit}.intro{font-size:1.2rem}section{margin:42px 0}details{padding:12px 0;border-bottom:1px solid #ddd}
</style>
</head>
<body>
<header><strong>${escapeHtml(plan.agency.name)}</strong><nav>${nav}</nav></header>
<main>${renderContent(page.content)}${related ? `<aside><h2>À découvrir aussi</h2><ul>${related}</ul></aside>` : ""}</main>
<footer>${escapeHtml(plan.agency.name)} — ${escapeHtml(plan.agency.city)}</footer>
</body>
</html>`;
  }
}

module.exports = HtmlRenderer;
