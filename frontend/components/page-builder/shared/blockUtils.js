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
      section?.blockType ||
      section?.sectionType ||
      section?.type ||
      section?.key ||
      "richText"
  )
    .trim()
    .toLowerCase();
}

export function isSectionVisible(section) {
  const status = String(section?.status || "visible").trim().toLowerCase();

  if (status === "hidden") return false;

  /*
   * Website Designer V2 exposes PageBlock rows through the public contract
   * even when their editorial status is draft. Runtime visibility is therefore
   * controlled by the explicit desktop/mobile flags, not by draft/published.
   * A block is public when at least one viewport remains enabled. Missing flags
   * preserve the legacy behaviour and remain visible.
   */
  if (section?.visibleDesktop === false && section?.visibleMobile === false) {
    return false;
  }

  return true;
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
