"use client";

import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  ["/", "Dashboard"],
  ["/actions", "Actions"],
  ["/campaigns", "Campagnes"],
  ["/website-builder", "Website Builder"],
  ["/brand-studio", "Brand Studio"],
  ["/agencies", "Agences"],
  ["/directories", "Annuaires"],
  ["/reviews", "Avis Google"],
  ["/review-requests", "Demandes avis"],
  ["/progress", "Progression"],
  ["/direction", "Direction"],
  ["/notifications", "Notifications"],
  ["/google-posts", "Google Posts"],
  ["/indexation", "Indexation"],
  ["/system", "Système"],
];

function isPublicSurface(pathname) {
  const path = String(pathname || "").trim();
  return path === "/agence" || path.startsWith("/agence/");
}

export default function AdminEngineNav() {
  const pathname = usePathname();

  if (isPublicSurface(pathname)) return null;

  return (
    <nav className="bg-gray-900 text-white shadow" data-engine-admin-nav="true">
      <div className="max-w-7xl mx-auto px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <a href="/" className="font-bold text-lg">
          Mondescale Local Engine
        </a>

        <div className="flex flex-wrap gap-4 text-sm">
          {ADMIN_LINKS.map(([href, label]) => (
            <a key={href} href={href} className="hover:underline">
              {label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

export { ADMIN_LINKS, isPublicSurface };
