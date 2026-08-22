import { getSectionContent, getSectionTitle } from "./helpers";
import { getCommonPartners } from "../../page-builder/shared/commonPartners";
import { FULL_PARTNERS, PARTNER_DIRECTORY_CATEGORIES } from "../../page-builder/shared/fullPartners";
import { getPublishablePartnerProfiles } from "../../page-builder/shared/partnerProfile";
import { resolveAgencyPartnerCandidates } from "../../page-builder/shared/agencyPartnerCatalog";
import { partnerKey, safePartnerAssetUrl, selectAgencyPartners } from "../../page-builder/shared/partnerSelection";
import styles from "./PartnersRenderer.module.css";

function NetworkPartnerGrid({ items }) {
  return <div className={`${styles.networkGrid} public-site-partners-grid public-site-partners-grid--network`}>
    {items.map((item, index) => {
      const logo = safePartnerAssetUrl(item.logoUrl || item.logo || item.imageUrl);
      const name = item.name || item.title || "Partenaire voyage";
      const isTui = item.group === "tui";
      return <div key={item.id || name || index} className={`${styles.networkCard} ${isTui ? styles.tuiCard : ""} public-site-partner-card`} data-partner-id={item.id || undefined}>
        {isTui ? <><img src={safePartnerAssetUrl(item.logoUrl)} alt={item.alt || "Logo TUI"} loading="lazy" decoding="async" className={styles.tuiMainLogo}/><div className={styles.tuiChildren}>{(item.children || []).map((child) => <div key={child.id} className={styles.tuiChild}><img src={safePartnerAssetUrl(child.logoUrl)} alt={`Logo ${child.name}`} loading="lazy" decoding="async" className={styles.tuiChildLogo}/></div>)}</div></> : logo ? <img src={logo} alt={item.alt || `Logo ${name}`} loading="lazy" decoding="async" className={styles.networkLogo}/> : <strong>{name}</strong>}
      </div>;
    })}
  </div>;
}

function AgencyPartnerGrid({ items }) {
  if (!items.length) return null;
  return <div className={`public-site-agency-partners ${styles.agencyWrap}`}><p className={styles.agencyLabel}>Également sélectionnés par votre agence</p><div className={`public-site-agency-partners-grid ${styles.agencyGrid}`}>{items.map((item, index) => {
    const name = item.name || "Partenaire voyage";
    const mark = item.logoUrl ? <img src={item.logoUrl} alt={item.alt || `Logo ${name}`} loading="lazy" decoding="async" className={styles.agencyLogo}/> : <strong>{name}</strong>;
    return <div key={item.id || name || index} className={styles.agencyCard}>{item.href ? <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}>{mark}</a> : mark}</div>;
  })}</div></div>;
}

function DirectoryCard({ partner }) {
  const logo = safePartnerAssetUrl(partner.logoUrl);
  const details = partner.details || {};
  const tags = [...(details.travelTypes || []), ...(details.destinations || [])].filter(Boolean).slice(0, 4);
  return <article className={styles.directoryCard} data-catalog-partner-id={partner.id}>
    <div className={styles.directoryMark}>{logo ? <img src={logo} alt={`Logo ${partner.name}`} loading="lazy" decoding="async"/> : <span>{partner.name}</span>}</div>
    <div className={styles.directoryCopy}><h4>{partner.name}</h4><p>{partner.summary}</p>{tags.length ? <div className={styles.directoryTags}>{tags.map((tag) => <span key={`${partner.id}-${tag}`}>{tag}</span>)}</div> : null}</div>
  </article>;
}

function PartnerDirectory({ networkItems }) {
  const reserved = new Set();
  networkItems.forEach((item) => [item?.id, item?.name, ...(item?.children || []).flatMap((child) => [child?.id, child?.name])].forEach((value) => { const key = partnerKey(value); if (key) reserved.add(key); }));
  const profiles = getPublishablePartnerProfiles(FULL_PARTNERS).filter((partner) => !reserved.has(partnerKey(partner.id)) && !reserved.has(partnerKey(partner.name)));
  const groups = PARTNER_DIRECTORY_CATEGORIES.map((category) => ({ ...category, items: profiles.filter((partner) => partner.category === category.id) })).filter((group) => group.items.length);
  return <div className={styles.directory}><header className={styles.directoryHeading}><p className={styles.directoryKicker}>Le catalogue Mondescale</p><h3>Des spécialistes pour chaque façon de voyager</h3><p>Votre agence s’appuie aussi sur un catalogue de partenaires spécialisés pour rechercher la solution la plus adaptée à votre projet.</p></header><div className={styles.directoryGroups}>{groups.map((group) => <section key={group.id} className={styles.directoryGroup}><div className={styles.groupHeading}><span>{group.eyebrow}</span><h3>{group.label}</h3><p>{group.items.length} partenaire{group.items.length > 1 ? "s" : ""}</p></div><div className={styles.directoryGrid}>{group.items.map((partner) => <DirectoryCard key={partner.id} partner={partner}/>)}</div></section>)}</div></div>;
}

export default function PartnersRenderer({ section }) {
  const content = getSectionContent(section);
  const networkItems = getCommonPartners();
  const candidates = resolveAgencyPartnerCandidates(content.agencyPartners);
  const agencyItems = selectAgencyPartners(candidates, { networkItems, max: Number(content.maxAgencyPartners) || 3 });
  return <section className={`public-site-section public-site-partners ${styles.section}`}><div className="public-site-container"><header className={styles.heading}><p className={styles.kicker}>Nos partenaires</p><h2>{getSectionTitle(section, "Des partenaires de confiance")}</h2><p>{content.text || "Des marques reconnues et des spécialistes sélectionnés pour construire votre voyage avec le bon niveau d’accompagnement."}</p></header><div className={styles.networkPanel}><p className={styles.networkLabel}>Notre sélection principale</p><NetworkPartnerGrid items={networkItems}/><AgencyPartnerGrid items={agencyItems}/></div><PartnerDirectory networkItems={networkItems}/></div></section>;
}
