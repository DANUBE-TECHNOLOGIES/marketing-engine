import { getBlock } from "./blockRegistry";
import { getSectionType, sortSections } from "./shared/blockUtils";

export default function PageRenderer({ sections = [], site = null, page = null }) {
  const normalizedSections = sortSections(sections);

  if (normalizedSections.length === 0) return null;

  return normalizedSections.map((section, index) => {
    const type = getSectionType(section);
    const Component = getBlock(type);

    return (
      <Component
        key={section.id || `${type}-${index}`}
        section={section}
        site={site}
        page={page}
      />
    );
  });
}
