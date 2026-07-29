"use strict";
const { absoluteUrl } = require("./url");

function compact(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (item === undefined || item === null || item === "") return undefined;
    if (Array.isArray(item) && item.length === 0) return undefined;
    return item;
  }));
}

function faqItems(blocks = []) {
  return blocks.flatMap((block) => block.type === "faq" ? (block.content?.items || []) : [])
    .filter((item) => item?.question && item?.answer);
}

function buildStructuredData({ site, page, blocks = [], breadcrumbs = [], baseUrl }) {
  const graph = [];
  if (site) graph.push(compact({
    "@type": "TravelAgency",
    "@id": `${absoluteUrl(site.basePath, baseUrl)}#travel-agency`,
    name: site.name,
    url: absoluteUrl(site.basePath, baseUrl),
    telephone: site.phone || site.agency?.phone,
    email: site.email || site.agency?.email,
    image: site.logoUrl || site.heroImageUrl,
  }));

  if (breadcrumbs.length >= 2) graph.push(compact({
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path, baseUrl),
    })),
  }));

  const faq = faqItems(blocks);
  if (faq.length) graph.push(compact({
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  }));

  if (page?.pageType === "destination") graph.push(compact({
    "@type": "TouristDestination",
    "@id": `${absoluteUrl(page.path, baseUrl)}#destination`,
    name: page.h1 || page.title,
    description: page.metaDescription,
    url: absoluteUrl(page.path, baseUrl),
    provider: site ? { "@id": `${absoluteUrl(site.basePath, baseUrl)}#travel-agency` } : undefined,
  }));

  return graph.length ? { "@context": "https://schema.org", "@graph": graph } : null;
}

module.exports = { faqItems, buildStructuredData };
