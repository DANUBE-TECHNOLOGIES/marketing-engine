import Link from "next/link";
import { getSectionContent } from "../shared/blockUtils";

export default function BreadcrumbBlock({ section }) {
  const content = getSectionContent(section);
  const items = Array.isArray(content.items) ? content.items.filter((item) => item?.name || item?.label) : [];
  if (items.length < 2) return null;

  return (
    <nav className="as-breadcrumb" aria-label="Fil d’Ariane">
      <ol className="as-shell">
        {items.map((item, index) => {
          const label = item.name || item.label;
          const href = item.path || item.href;
          const current = index === items.length - 1;
          return (
            <li key={`${label}-${index}`} aria-current={current ? "page" : undefined}>
              {!current && href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
