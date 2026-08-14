import Link from "next/link";

import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import { resolvedTargetCities } from "../../../lib/seo/local-area-config";

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

function destinationHref(site, item) {
  if (item?.href) return item.href;
  if (item?.url) return item.url;
  if (!site?.slug || !item?.slug) return null;
  return `/agence/${encodeURIComponent(site.slug)}/destination/${encodeURIComponent(item.slug)}`;
}

function destinationImage(item) {
  if (!item || typeof item !== "object") return null;

  const candidates = [
    item.image,
    item.imageUrl,
    item.backgroundImage,
    item.coverImage,
    item.heroImage,
    item.thumbnail,
    item.photo,
    item.media?.url,
    item.image?.url,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function defaultDestinationsTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Idées de voyages depuis ${city}`
    : "Nos destinations du moment";
}

function defaultDestinationsIntro(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  const nearby = resolvedTargetCities(site, { limit: 3 });

  if (!city) {
    return "Découvrez une sélection de destinations et préparez votre prochain départ avec les conseils de votre agence.";
  }

  const area = nearby.length
    ? ` Nous accompagnons aussi les voyageurs de ${joinCities(nearby)}.`
    : "";

  return `Découvrez une sélection de destinations et préparez votre prochain départ avec les conseils de votre agence de voyages à ${city}.${area}`;
}

function DestinationCard({ item, site }) {
  const href = destinationHref(site, item);
  const image = destinationImage(item);
  const card = (
    <article
      className="public-site-destination-card"
      style={
        image
          ? {
              backgroundImage: `linear-gradient(rgba(8,31,52,.12),rgba(8,31,52,.78)),url("${image}")`,
            }
          : undefined
      }
    >
      <div>
        {item.eyebrow ? <span>{item.eyebrow}</span> : null}
        <h3>{item.title || item.name || "Destination"}</h3>
        {item.description ? <p>{item.description}</p> : null}
      </div>
    </article>
  );

  return href ? (
    <Link href={href} aria-label={`Découvrir ${item.title || item.name || "cette destination"}`} style={{ color: "inherit", textDecoration: "none" }}>
      {card}
    </Link>
  ) : card;
}

export default function DestinationsRenderer({ section, site }) {
  const content = getSectionContent(section);
  const source = String(
    content.__dataSource ||
      content.source ||
      (Array.isArray(content.destinationIds) && content.destinationIds.length
        ? "travel-core"
        : "automatic")
  ).toLowerCase();

  const dynamicSource = ["travel-core", "catalog", "automatic", "auto"].includes(source);
  const items = getItems(section, dynamicSource ? ["destinations", "items"] : ["items"]);
  const introduction = content.text || content.description || defaultDestinationsIntro(site);
  const root = siteRoot(site);

  if (!items.length && content.showWhenEmpty !== true) {
    return null;
  }

  return (
    <section className="public-site-section public-site-destinations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Inspirations</p>
        <h2>{getSectionTitle(section, defaultDestinationsTitle(site))}</h2>
        {introduction ? <p className="public-site-section-intro">{introduction}</p> : null}
        {items.length ? (
          <div className="public-site-destination-grid">
            {items.map((item, index) => (
              <DestinationCard key={item.id || item.slug || item.title || index} item={item} site={site} />
            ))}
          </div>
        ) : null}

        <div className="public-site-related-links" aria-label="Conseils pour choisir votre voyage">
          <Link href={`${root}/inspiration`}>Découvrir nos inspirations voyage</Link>
          <Link href={`${root}/services`}>Voir comment l’agence vous accompagne</Link>
          <Link href={`${root}/contact`}>Construire votre voyage avec un conseiller</Link>
        </div>
      </div>
    </section>
  );
}

export {
  defaultDestinationsIntro,
  defaultDestinationsTitle,
  destinationHref,
  destinationImage,
  joinCities,
  siteRoot,
};
