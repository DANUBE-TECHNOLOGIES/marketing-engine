export function getSectionContent(section) {
  const content = section?.jsonContent || section?.content || {};

  return content && typeof content === "object" && !Array.isArray(content)
    ? content
    : {};
}

export function getSectionType(section) {
  const content = getSectionContent(section);

  return String(
    content.__builderType ||
      section?.sectionType ||
      section?.type ||
      section?.key ||
      "richText"
  )
    .trim()
    .toLowerCase();
}

export function isSectionVisible(section) {
  return String(section?.status || "visible").toLowerCase() !== "hidden";
}

export function sortSections(sections = []) {
  if (!Array.isArray(sections)) return [];

  return sections
    .filter(Boolean)
    .filter(isSectionVisible)
    .slice()
    .sort(
      (a, b) =>
        (a?.displayOrder ?? a?.order ?? 0) -
        (b?.displayOrder ?? b?.order ?? 0)
    );
}

export function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === "string" ? { title: item } : item))
    .filter(Boolean);
}

export function normalizePhone(phone) {
  return String(phone || "").replace(/[^+\d]/g, "");
}

export function isExternalHref(href) {
  return /^(https?:|tel:|mailto:|sms:|whatsapp:)/i.test(String(href || ""));
}
