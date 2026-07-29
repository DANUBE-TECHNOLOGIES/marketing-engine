export function getSectionContent(section) {
  return section?.jsonContent || section?.content || {};
}

export function getSectionType(section) {
  return section?.sectionType || section?.type || "richText";
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
