import { faqItemsForPage } from "../public-faq";

function faqItems(page) {
  return faqItemsForPage(page);
}

export function buildPageFaqSchema(page) {
  const items = faqItems(page);
  if (!items.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
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

export { faqItems };
