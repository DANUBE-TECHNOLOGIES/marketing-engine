import Link from "next/link";

import { getItems, getSectionContent, getSectionTitle } from "./helpers";
import { resolvedTargetCities } from "../../../lib/seo/local-area-config";

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}
function siteRoot(site) { return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`).replace(/\/$/, ""); }
function localCity(site) { return String(site?.agency?.city || site?.city || "").trim(); }
function destinationHref(site, item) {
  const root = siteRoot(site);
  const explicit = String(item?.href || item?.url || "").trim();

  if (explicit) {
    if (/^(https?:|mailto:|tel:|#)/i.test(explicit)) return explicit;

    const legacyDestination = explicit.match(/^\/destinations\/([^/?#]+)\/?(?:[?#].*)?$/i);
    if (legacyDestination) {
      return `${root}/destination/${encodeURIComponent(decodeURIComponent(legacyDestination[1]))}`;
    }

    if (explicit.startsWith("/agence/")) return explicit;

    if (explicit.startsWith("/")) {
      return `${root}/${explicit.replace(/^\/+/, "")}`;
    }

    return `${root}/${explicit.replace(/^\/+|\/+$/g, "")}`;
  }

  if (!item?.slug) return null;
  return `${root}/destination/${encodeURIComponent(item.slug)}`;
}
function destinationImage(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = [item.image, item.imageUrl, item.backgroundImage, item.coverImage, item.heroImage, item.thumbnail, item.photo, item.media?.url, item.image?.url];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}
function destinationImageAlt(item) {
  const explicit = String(item?.imageAlt || item?.alt || item?.media?.altText || item?.media?.alt || "").trim();
  if (explicit) return explicit;
  const name = String(item?.title || item?.name || "").trim();
  return name ? `Voyage ${name}` : "";
}
function defaultDestinationsTitle(site) { const city = localCity(site); return city ? `Idées de voyages depuis ${city}` : "Nos destinations du moment"; }
function defaultDestinationsIntro(site) {
  const city = localCity(site); const nearby = resolvedTargetCities(site, { limit: 3 });
  if (!city) return "Découvrez une sélection de destinations et préparez votre prochain départ avec les conseils de votre agence.";
  const area = nearby.length ? ` Nous accompagnons aussi les voyageurs de ${joinCities(nearby)}.` : "";
  return `Découvrez une sélection de destinations et préparez votre prochain départ avec les conseils de votre agence de voyages à ${city}.${area}`;
}
function DestinationCard({ item, site }) {
  const href = destinationHref(site, item); const image = destinationImage(item); const title = item.title || item.name || "Destination"; const city = localCity(site);
  const card = <article className="public-site-destination-card" data-has-image={image ? "true" : "false"}>
    {image ? <img className="public-site-destination-card-image" src={image} alt={destinationImageAlt(item)} loading="lazy" decoding="async" fetchPriority="low" width="960" height="640" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:0}}/> : null}
    {image ? <span aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(rgba(8,31,52,.12),rgba(8,31,52,.78))",zIndex:1}}/> : null}
    <div style={{position:"relative",zIndex:2}}>{item.eyebrow ? <span>{item.eyebrow}</span> : null}<h3>{title}</h3>{item.description ? <p>{item.description}</p> : null}</div>
  </article>;
  return href ? <Link href={href} aria-label={city ? `Découvrir ${title} avec notre agence de voyages à ${city}` : `Découvrir nos voyages vers ${title}`} style={{color:"inherit",textDecoration:"none"}}>{card}</Link> : card;
}
export default function DestinationsRenderer({ section, site }) {
  const content = getSectionContent(section);
  const source = String(content.__dataSource || content.source || (Array.isArray(content.destinationIds) && content.destinationIds.length ? "travel-core" : "automatic")).toLowerCase();
  const dynamicSource = ["travel-core","catalog","automatic","auto"].includes(source);
  const items = getItems(section, dynamicSource ? ["destinations","items"] : ["items"]);
  const introduction = content.text || content.description || defaultDestinationsIntro(site); const root = siteRoot(site); const city = localCity(site);
  if (!items.length && content.showWhenEmpty !== true) return null;
  return <section className="public-site-section public-site-destinations"><div className="public-site-container">
    <p className="public-site-section-kicker">Inspirations</p><h2>{getSectionTitle(section, defaultDestinationsTitle(site))}</h2>{introduction ? <p className="public-site-section-intro">{introduction}</p> : null}
    {items.length ? <div className="public-site-destination-grid">{items.map((item,index)=><DestinationCard key={item.id||item.slug||item.title||index} item={item} site={site}/>)}</div> : null}
    <div className="public-site-related-links" aria-label={city ? `Conseils voyage de notre agence à ${city}` : "Conseils pour choisir votre voyage"}>
      <Link href={`${root}/inspiration`}>{city ? `Conseils et inspirations voyage depuis ${city}` : "Conseils et idées pour préparer votre voyage"}</Link>
      <Link href={`${root}/services`}>{city ? `Services de notre agence de voyages à ${city}` : "Services de votre agence de voyages"}</Link>
      <Link href={`${root}/contact`}>{city ? `Demander conseil à notre agence de ${city}` : "Demander conseil à votre agence"}</Link>
    </div>
  </div></section>;
}
export { defaultDestinationsIntro, defaultDestinationsTitle, destinationHref, destinationImage, destinationImageAlt, joinCities, localCity, siteRoot };
