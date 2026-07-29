import Link from "next/link";
import PageRenderer from "../page-builder/PageRenderer";

export default function AgencySiteShell({ site, page }) {
  const nav = site.navigation?.main || [];
  return <div className="agency-site">
    <header className="as-header"><div className="as-shell as-header-inner"><Link className="as-brand" href={site.basePath}>{site.name}</Link><nav aria-label="Navigation principale">{nav.map(item=><Link key={item.path} href={item.path}>{item.title || item.menuTitle}</Link>)}</nav><Link className="as-btn as-header-cta" href={`${site.basePath}/contact`}>Demander un devis</Link></div></header>
    <main><PageRenderer sections={page.sections || []}/></main>
    <footer className="as-footer"><div className="as-shell as-footer-grid"><div><strong>{site.name}</strong><p>Votre agence de voyages de proximité.</p></div><nav aria-label="Navigation de pied de page">{(site.navigation?.footer || []).map(item=><Link key={item.path} href={item.path}>{item.title || item.menuTitle}</Link>)}</nav></div><div className="as-shell as-copyright">© {new Date().getFullYear()} {site.name}</div></footer>
  </div>;
}
