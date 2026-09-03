import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import { resolvedTargetCities } from "../../../lib/seo/local-area-config";

const BUSINESS_TRAVEL_MARKERS = ["business travel", "voyage d'affaire", "voyages d'affaire", "voyage d’affaires", "voyages d’affaires"];
const GROUP_TRAVEL_MARKERS = ["groupe", "groupes", "voyage en groupe", "voyages en groupe"];

function normalizeColumns(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(4, Math.trunc(parsed)));
}

function minimumCardWidth(columns) {
  if (columns >= 4) return 200;
  if (columns === 3) return 250;
  if (columns === 2) return 340;
  return 520;
}

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
}

function localCity(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function featureHref(root, value) {
  const href = String(value || "").trim();
  if (!href) return null;
  if (/^(https?:|mailto:|tel:|\/)/i.test(href)) return href;
  return `${root}/${href.replace(/^\/+|\/+$/g, "")}`;
}

function hasBusinessTravel(items) {
  return items.some((item) => {
    const value = `${item?.id || ""} ${item?.title || ""} ${item?.label || ""} ${item?.text || ""} ${item?.description || ""}`.toLowerCase();
    return BUSINESS_TRAVEL_MARKERS.some((marker) => value.includes(marker));
  });
}

function isGroupTravelItem(item) {
  const value = `${item?.id || ""} ${item?.title || ""} ${item?.label || ""}`.toLowerCase();
  return GROUP_TRAVEL_MARKERS.some((marker) => value.includes(marker));
}

function businessTravelItem(site) {
  const city = localCity(site);
  return {
    id: "business-travel",
    title: "Business Travel",
    text: city
      ? `Voyages d’affaires : organisation et suivi de vos déplacements professionnels depuis ${city}.`
      : "Voyages d’affaires : organisation et suivi de vos déplacements professionnels.",
    href: "business-travel",
  };
}

function serviceItems(site, sourceItems) {
  const source = Array.isArray(sourceItems) ? sourceItems : [];
  const items = source.map((item) => isGroupTravelItem(item) ? { ...item, href: "voyages-en-groupe" } : item);
  if (hasBusinessTravel(items)) return items;
  return [...items, businessTravelItem(site)];
}

function defaultFeaturesTitle(site) {
  const city = localCity(site);
  return city ? `Nos services voyage à ${city}` : "Nos services voyage";
}

function defaultFeaturesIntroduction(site) {
  const city = localCity(site);
  const nearby = resolvedTargetCities(site, { limit: 3 });

  if (!city) {
    return "Notre équipe vous conseille selon votre projet, votre budget et votre façon de voyager.";
  }

  const area = nearby.length
    ? ` Nous accompagnons également les voyageurs de ${joinCities(nearby)}.`
    : "";

  return `Notre équipe à ${city} vous conseille selon votre projet, votre budget et votre façon de voyager.${area}`;
}

export default function FeaturesV2Renderer({ section, site }) {
  const content = getSectionContent(section);
  const items = serviceItems(site, content.items);
  const introduction = content.introduction || content.text || content.description || defaultFeaturesIntroduction(site);
  const columns = normalizeColumns(content.columns);
  const minimum = minimumCardWidth(columns);
  const root = siteRoot(site);
  const city = localCity(site);

  return (
    <section className="public-site-section public-site-features">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Votre projet</p>
        <h2>{getSectionTitle(section, defaultFeaturesTitle(site))}</h2>
        {introduction ? <p className="public-site-section-intro">{introduction}</p> : null}
        {items.length ? (
          <div className="public-site-card-grid" data-columns={columns} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minimum}px), 1fr))` }}>
            {items.map((item, index) => {
              const href = featureHref(root, item.href);
              const heading = item.title || item.label;
              return <article className="public-site-card public-site-feature-card" key={item.id || item.title || index}>
                {item.icon ? <span className="public-site-feature-icon" aria-hidden="true">{item.icon}</span> : null}
                <h3>{href ? <Link href={href}>{heading}</Link> : heading}</h3>
                {item.text ? <p>{item.text}</p> : null}
                {item.description ? <p>{item.description}</p> : null}
              </article>;
            })}
          </div>
        ) : null}
        <div className="public-site-related-links" aria-label={city ? `Poursuivre votre projet avec l’agence de ${city}` : "Préparer votre voyage avec l’agence"}>
          <Link href={`${root}/destinations`}>{city ? `Destinations conseillées par notre agence à ${city}` : "Explorer nos destinations"}</Link>
          <Link href={`${root}/inspiration`}>{city ? `Conseils voyage de notre équipe à ${city}` : "Lire nos conseils voyage"}</Link>
          <Link href={`${root}/contact`}>{city ? `Demander conseil à notre agence de voyages à ${city}` : "Demander un conseil personnalisé"}</Link>
        </div>
      </div>
    </section>
  );
}

export {
  BUSINESS_TRAVEL_MARKERS,
  GROUP_TRAVEL_MARKERS,
  businessTravelItem,
  defaultFeaturesIntroduction,
  defaultFeaturesTitle,
  featureHref,
  hasBusinessTravel,
  isGroupTravelItem,
  joinCities,
  localCity,
  serviceItems,
  siteRoot,
};
