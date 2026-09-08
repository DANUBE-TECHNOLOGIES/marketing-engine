import { absoluteUrl } from "./site-url";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildDestinationFaqSchema(data) {
  const faqs = Array.isArray(data?.destination?.faqs) ? data.destination.faqs : [];
  const items = faqs
    .map((faq) => ({
      question: clean(faq?.question),
      answer: clean(faq?.answer),
    }))
    .filter((faq) => faq.question && faq.answer);

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
