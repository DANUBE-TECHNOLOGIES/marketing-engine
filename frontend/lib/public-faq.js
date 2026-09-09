import {
  getSectionContent,
  getSectionType,
  isSectionVisible,
  sortSections,
} from "../components/page-builder/shared/blockUtils";

function cleanFaqText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function rawFaqItems(section) {
  const content = getSectionContent(section);
  for (const key of ["items", "questions", "faqs"]) {
    if (Array.isArray(content[key])) return content[key];
  }
  return [];
}

export function faqItemsForSection(section) {
  return rawFaqItems(section)
    .map((item) => ({
      ...item,
      question: cleanFaqText(item?.question || item?.title),
      answer: cleanFaqText(item?.answer || item?.text || item?.description || item?.content),
    }))
    .filter((item) => item.question && item.answer);
}

export function faqSectionsForPage(page) {
  return sortSections(page?.sections || page?.blocks)
    .filter(isSectionVisible)
    .filter((section) => getSectionType(section).includes("faq"));
}

export function faqItemsForPage(page) {
  return faqSectionsForPage(page).flatMap(faqItemsForSection);
}

export { cleanFaqText, rawFaqItems };
