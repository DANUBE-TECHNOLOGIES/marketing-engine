import Link from "next/link";
import { pageHref, pageSlug, uniquePublishedNavigation } from "./PublicSiteHeader";

const PRIORITY_BY_CONTEXT = Object.freeze({
  agence: ["equipe", "services", "destinations", "contact"],
  equipe: ["agence", "services", "destinations", "contact"],
  partenaires: ["services", "destinations", "inspiration", "contact"],
  services: ["destinations", "inspiration", "equipe", "contact"],
  destinations: ["inspiration", "services", "equipe", "contact"],
  inspiration: ["destinations", "services", "equipe", "contact"],
  contact: ["services", "destinations", "equipe", "agence"],
});

const DEFAULT_PRIORITY = Object.freeze(["services", "destinations", "inspiration", "equipe", "agence", "contact"]);

function normalizeContextSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function candidatePriority(currentSlug) {
  return PRIORITY_BY_CONTEXT[normalizeContextSlug(currentSlug)] || DEFAULT_PRIORITY;
}

function contextualJourneyItems(site, currentSlug, maxItems = 3) {
  const current = normalizeContextSlug(currentSlug);
  const navigation = uniquePublishedNavigation(site)
    .map((page) => ({ page, slug: pageSlug(page) }))
    .filter(({ slug }) => slug && slug !== current);
  const bySlug = new Map(navigation.map((item) => [item.slug, item]));
  const selected = [];
  const seen = new Set();

  for (const slug of candidatePriority(current)) {
    const item = bySlug.get(slug);
    if (!item || seen.has(item.slug)) continue;
    selected.push(item);
    seen.add(item.slug);
    if (selected.length >= maxItems) break;
  }
  for (const item of navigation) {
    if (selected.length >= maxItems) break;
    if (seen.has(item.slug)) continue;
    selected.push(item);
    seen.add(item.slug);
  }

  return selected.map(({ page, slug }) => ({ slug, title: page.title, href: pageHref(site.slug, page) }));
}

export default function PublicContextualJourney({ site, currentSlug }) {
  const items = contextualJourneyItems(site, currentSlug, 3);
  if (!items.length) return null;
  const city = String(site?.agency?.city || site?.city || "").trim();

  return (
    <section className="public-contextual-journey" data-contextual-journey="content" aria-labelledby="public-contextual-journey-title">
      <div className="public-site-container">
        <div className="public-contextual-journey__heading">
          <p className="public-site-eyebrow">Pour aller plus loin</p>
          <h2 id="public-contextual-journey-title">Continuez à préparer votre voyage</h2>
          <p>{city ? `Retrouvez les contenus utiles de votre agence de voyages de ${city}.` : "Retrouvez les contenus utiles de votre agence de voyages."}</p>
        </div>
        <nav className="public-contextual-journey__links" aria-label="Poursuivre la découverte de votre agence">
          {items.map((item) => (
            <Link key={item.slug} href={item.href}><span>{item.title}</span><span aria-hidden="true">→</span></Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

export { DEFAULT_PRIORITY, PRIORITY_BY_CONTEXT, candidatePriority, contextualJourneyItems, normalizeContextSlug };
