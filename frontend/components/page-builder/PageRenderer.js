import { getBlock } from "./blockRegistry";
import { getSectionType } from "./shared/blockUtils";

export default function PageRenderer({ sections = [] }) {
  if (!Array.isArray(sections) || sections.length === 0) return null;

  return sections
    .slice()
    .sort((a, b) => (a.displayOrder ?? a.order ?? 0) - (b.displayOrder ?? b.order ?? 0))
    .map((section, index) => {
      const type = getSectionType(section);
      const Component = getBlock(type);
      return <Component key={section.id || `${type}-${index}`} section={section} />;
    });
}
