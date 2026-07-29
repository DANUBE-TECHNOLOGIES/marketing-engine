import { getBlock } from "./blockRegistry";

export default function PageRenderer({ sections = [] }) {
  return sections
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((section, index) => {
      const Component = getBlock(section.sectionType);
      return <Component key={section.id || `${section.sectionType}-${index}`} section={section} />;
    });
}
