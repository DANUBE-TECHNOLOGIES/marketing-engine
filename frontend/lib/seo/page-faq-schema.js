function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function sectionType(section) {
  return String(section?.type || section?.blockType || "").trim().toLowerCase();
}

function sectionContent(section) {
  return asObject(
    section?.content ||
    section?.jsonContent ||
    section?.props ||
    section?.data
  );
}

function faqItems(page) {
  const sections = Array.isArray(page?.blocks)
    ? page.blocks
    : Array.isArray(page?.sections)
      ? page.sections
      : [];
  const result = [];
  const seen = new Set();

  for (const section of sections) {
    if (!sectionType(section).includes("faq")) continue;
    if (["draft", "hidden"].includes(String(section?.status || "").toLowerCase())) continue;

    const content = sectionContent(section);
    const items = content.items || content.questions || content.faqs || [];
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const question = String(item?.question || item?.title || "").replace(/\s+/g, " ").trim();
      const answer = String(item?.answer || item?.text || item?.content || "").replace(/\s+/g, " ").trim();
      if (!question || !answer) continue;

      const key = question.toLocaleLowerCase("fr-FR");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ question, answer });
    }
  }

  return result.slice(0, 20);
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

export { faqItems, sectionContent, sectionType };
