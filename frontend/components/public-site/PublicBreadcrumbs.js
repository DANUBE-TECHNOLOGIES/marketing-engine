import Link from "next/link";

export default function PublicBreadcrumbs({ items = [] }) {
  const visible = Array.isArray(items) ? items.filter((item) => item?.name && item?.href) : [];
  if (visible.length < 2) return null;

  return (
    <nav className="public-site-breadcrumbs" aria-label="Fil d’Ariane">
      <div className="public-site-container">
        <ol>
          {visible.map((item, index) => {
            const current = index === visible.length - 1;
            return (
              <li key={`${item.href}-${index}`}>
                {current ? (
                  <span aria-current="page">{item.name}</span>
                ) : (
                  <Link href={item.href}>{item.name}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
