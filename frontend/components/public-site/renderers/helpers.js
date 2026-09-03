export function getSectionContent(section) {
  const content =
    section?.jsonContent ||
    section?.content ||
    {};

  return content &&
    typeof content === "object" &&
    !Array.isArray(content)
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
    ""
  )
    .replace(/--\d+$/, "")
    .trim()
    .toLowerCase();
}

export function getSectionTitle(
  section,
  fallback = null
) {
  const content = getSectionContent(section);

  return (
    content.title ||
    content.heading ||
    section?.title ||
    fallback
  );
}

export function getSectionVariant(section) {
  const content = getSectionContent(section);

  return (
    content.__variant ||
    content.variant ||
    "default"
  );
}

export function getItems(section, keys = []) {
  const content = getSectionContent(section);

  for (const key of keys) {
    if (Array.isArray(content[key])) {
      return content[key];
    }
  }

  return [];
}
