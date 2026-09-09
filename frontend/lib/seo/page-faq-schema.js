import { faqItemsForPage } from "../public-faq";

function faqItems(page) {
  return faqItemsForPage(page);
}

function faqReference(faqSchema) {
  if (!faqSchema?.["@id"]) return null;
  return {
    "@type": "FAQPage",
    "@id": faqSchema["@id"],
    url: faqSchema.url,
  };
}

export function buildPageFaqSchema(page, url) {
  const items = faqItems(page);
  if (!items.length) return null;

  const canonicalUrl = String(url || "").trim();
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(canonicalUrl ? {
      "@id": `${canonicalUrl}#faq`,
      url: canonicalUrl,
      isPartOf: {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
      },
    } : {}),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function linkFaqToWebPage(webPage, faqSchema) {
  const faq = faqReference(faqSchema);
  if (!webPage || !faq) return webPage;

  const existingParts = Array.isArray(webPage.hasPart)
    ? webPage.hasPart
    : webPage.hasPart
      ? [webPage.hasPart]
      : [];

  const hasSameFaq = existingParts.some((part) => part?.["@id"] === faq["@id"]);
  return {
    ...webPage,
    hasPart: hasSameFaq ? existingParts : [...existingParts, faq],
  };
}

export { faqItems, faqReference };
