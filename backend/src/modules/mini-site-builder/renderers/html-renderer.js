"use strict";
function esc(value = "") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function url(value = "") { const v = String(value).trim(); return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(v) ? esc(v) : "#"; }
function list(items, render) { return Array.isArray(items) ? items.map(render).join("") : ""; }
const renderers = {
  hero: c => `<section data-block="hero"><h1>${esc(c.title)}</h1>${c.subtitle?`<p>${esc(c.subtitle)}</p>`:""}${c.imageUrl?`<img src="${url(c.imageUrl)}" alt="${esc(c.imageAlt||c.title)}">`:""}${c.ctaLabel?`<a href="${url(c.ctaUrl)}">${esc(c.ctaLabel)}</a>`:""}</section>`,
  "rich-text": c => `<section data-block="rich-text">${c.title?`<h2>${esc(c.title)}</h2>`:""}<div>${esc(c.body).replace(/\n/g,"<br>")}</div></section>`,
  cta: c => `<section data-block="cta"><h2>${esc(c.title)}</h2>${c.text?`<p>${esc(c.text)}</p>`:""}<a href="${url(c.url)}">${esc(c.label||"En savoir plus")}</a></section>`,
  faq: c => `<section data-block="faq">${c.title?`<h2>${esc(c.title)}</h2>`:""}${list(c.items, x=>`<details><summary>${esc(x.question)}</summary><p>${esc(x.answer)}</p></details>`)}</section>`,
  reviews: c => `<section data-block="reviews">${list(c.items, x=>`<blockquote><p>${esc(x.text)}</p><footer>${esc(x.author||"")}${x.rating?` — ${esc(x.rating)}/5`:""}</footer></blockquote>`)}</section>`,
  destinations: c => `<section data-block="destinations">${list(c.items, x=>`<article><h3>${esc(x.name)}</h3>${x.description?`<p>${esc(x.description)}</p>`:""}${x.url?`<a href="${url(x.url)}">Découvrir</a>`:""}</article>`)}</section>`,
  gallery: c => `<section data-block="gallery">${list(c.images, x=>`<figure><img src="${url(x.url)}" alt="${esc(x.alt||"")}">${x.caption?`<figcaption>${esc(x.caption)}</figcaption>`:""}</figure>`)}</section>`,
  video: c => `<section data-block="video"><a href="${url(c.url)}">${esc(c.title||"Voir la vidéo")}</a></section>`,
  map: c => `<section data-block="map"><p>${esc(c.address||"")}</p></section>`,
  form: c => `<section data-block="form"><h2>${esc(c.title||"Contactez-nous")}</h2><form method="post" action="${url(c.action||"#")}">${list(c.fields, x=>`<label>${esc(x.label)}<input name="${esc(x.name)}" type="${esc(x.type||"text")}"></label>`)}<button type="submit">${esc(c.submitLabel||"Envoyer")}</button></form></section>`,
  promotions: c => `<section data-block="promotions">${list(c.items, x=>`<article><h3>${esc(x.title)}</h3><p>${esc(x.description||"")}</p></article>`)}</section>`,
  partners: c => `<section data-block="partners">${list(c.items, x=>`<a href="${url(x.url||"#")}">${x.logoUrl?`<img src="${url(x.logoUrl)}" alt="${esc(x.name)}">`:esc(x.name)}</a>`)}</section>`,
};
function renderBlock(block) {
  const renderer = renderers[block.blockType];
  if (!renderer) return "";
  const visibility = [block.visibleDesktop===false?"is-hidden-desktop":"", block.visibleMobile===false?"is-hidden-mobile":""].filter(Boolean).join(" ");
  return `<div class="page-block ${visibility}" data-block-id="${esc(block.id)}" data-block-type="${esc(block.blockType)}">${renderer(block.content||{})}</div>`;
}
function renderPage(page, blocks, theme = {}) {
  const css = Object.entries(theme.cssVariables||{}).map(([k,v])=>`${k}:${String(v).replace(/[;{}]/g,"")}`).join(";");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.seoTitle||page.title)}</title><meta name="description" content="${esc(page.metaDescription||"")}"><style>:root{${css}}body{font-family:var(--brand-font-family,Arial,sans-serif);color:var(--brand-text,#102A43);background:var(--brand-background,#fff)}.is-hidden-desktop{display:none}@media(max-width:767px){.is-hidden-desktop{display:block}.is-hidden-mobile{display:none}}</style></head><body>${blocks.filter(b=>b.status==="published").sort((a,b)=>a.displayOrder-b.displayOrder).map(renderBlock).join("")}</body></html>`;
}
module.exports = { esc, renderBlock, renderPage };
