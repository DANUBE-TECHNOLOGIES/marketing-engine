import { absoluteUrl } from "./site-url";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function destinationFaqItems(data) {
  const faqs = Array.isArray(data?.destination?.faqs) ? data.destination.faqs : [];

  return faqs
    .map((faq) => ({
      id: faq?.id || null,
      question: clean(faq?.question),
      answer: clean(faq?.answer),
    }))
    .filter((faq) => faq.question && faq.answer);
}

export function buildDestinationFaqSchema(data) {
  const items = destinationFaqItems(data);
  if (!items.length) return null;

  const pageUrl = absoluteUrl(data?.canonicalPath);
  const destinationName = clean(data?.destination?.name);

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    name: destinationName ? `Questions fréquentes sur ${destinationName}` : undefined,
    inLanguage: "fr-FR",
    isPartOf: {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
    },
    about: {
      "@type": "TouristDestination",
      "@id": `${pageUrl}#destination`,
      name: destinationName || undefined,
      url: pageUrl,
    },
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

export function linkDestinationFaqToWebPage(webPageSchema, faqSchema) {
  if (!webPageSchema || !faqSchema?.["@id"]) return webPageSchema;

  return {
    ...webPageSchema,
    hasPart: [
      ...(Array.isArray(webPageSchema.hasPart)
        ? webPageSchema.hasPart
        : webPageSchema.hasPart
          ? [webPageSchema.hasPart]
          : []),
      {
        "@type": "FAQPage",
        "@id": faqSchema["@id"],
      },
    ],
  };
}

export { clean };
