import { getSectionContent, getSectionTitle, getSectionType } from "./helpers";
import { getPartnerDirectoryCategories } from "../../page-builder/shared/fullPartners";
import { getPartnerProfile, getPublishablePartnerProfiles } from "../../page-builder/shared/partnerProfile";
import { getCommonPartners } from "../../page-builder/shared/commonPartners";
import { resolveAgencyPartnerCandidates } from "../../page-builder/shared/agencyPartnerCatalog";
import { safePartnerAssetUrl, safePartnerHref, selectAgencyPartners } from "../../page-builder/shared/partnerSelection";
import styles from "./PartnerDirectoryRenderer.module.css";

const AGENCY_PARTNER_SECTION_TYPES = Object.freeze(new Set(["partner-logos", "partners", "logos"]));
const DIRECTORY_LOGO_WIDTH = 180;
const DIRECTORY_LOGO_HEIGHT = 90;

function MetadataGroup({ label, values }) {
  if (!Array.isArray(values) || !values.length) return null;
  return <div className={styles.metadataGroup}><strong>{label}</strong><span>{values.join(" · ")}</span></div>;
}

function PartnerCard({ partner }) {
  const profile = getPartnerProfile(partner);
  if (!profile) return null;
  const website = safePartnerHref(profile.details?.website, { allowInternal: false });
  const hasLogo = Boolean(profile.logoUrl);
  const visibleTags = profile.visibleTags.slice(0, 3);
  return (
    <article className={styles.card} data-partner-id={profile.id} data-partner-logo={hasLogo ? "asset" : "initials"}>
      <div className={styles.logoFrame}>
        {hasLogo ? <img src={profile.logoUrl} alt={`Logo ${profile.name}`} loading="lazy" decoding="async" width={DIRECTORY_LOGO_WIDTH} height={DIRECTORY_LOGO_HEIGHT} /> : <span aria-hidden="true">{profile.name.slice(0, 2).toUpperCase()}</span>}
      </div>
      <div className={styles.cardBody}>
        <h3>{profile.name}</h3><p>{profile.summary}</p>
        {visibleTags.length ? <div className={styles.tags} aria-label={`Spécialités de ${profile.name}`}>{visibleTags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
        {profile.details ? <details className={styles.details}><summary>Découvrir ses spécialités</summary><div className={styles.metadata}><MetadataGroup label="Destinations" values={profile.details.destinations} /><MetadataGroup label="Types de voyages" values={profile.details.travelTypes} /><MetadataGroup label="Marques" values={profile.details.brands} />{profile.details.note ? <p className={styles.note}>{profile.details.note}</p> : null}{website ? <a className={styles.website} href={website} target="_blank" rel="noopener noreferrer">Site du partenaire</a> : null}</div></details> : null}
      </div>
    </article>
  );
}

function findAgencyPartnerSelection(site) {
  const pages = Array.isArray(site?.pages) ? site.pages : [];
  for (const page of pages) {
    const sections = Array.isArray(page?.sections) && page.sections.length ? page.sections : Array.isArray(page?.blocks) ? page.blocks : [];
    for (const candidate of sections) {
      if (!AGENCY_PARTNER_SECTION_TYPES.has(getSectionType(candidate))) continue;
      const content = getSectionContent(candidate);
      if (Array.isArray(content.agencyPartners) && content.agencyPartners.length) return content.agencyPartners;
    }
  }
  return [];
}

function PreferredPartnerCard({ item, agency = false }) {
  const name = item?.name || item?.title || "Partenaire voyage";
  const logoUrl = safePartnerAssetUrl(item?.logoUrl || item?.logo || item?.imageUrl);
  const href = agency ? safePartnerHref(item?.href || item?.url || item?.link) : "";
  const visual = logoUrl ? <img src={logoUrl} alt={item?.alt || `Logo ${name}`} loading="lazy" decoding="async" width={DIRECTORY_LOGO_WIDTH} height={DIRECTORY_LOGO_HEIGHT} /> : <strong>{name}</strong>;
  return <article className={`${styles.preferredCard} ${agency ? styles.agencyPreferredCard : ""}`} data-preferred-partner-id={item?.id || undefined} data-preferred-partner-scope={agency ? "agency" : "network"}>{href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>{visual}</a> : visual}<span>{name}</span></article>;
}

function PreferredPartners({ site }) {
  const networkItems = getCommonPartners();
  const candidates = resolveAgencyPartnerCandidates(findAgencyPartnerSelection(site));
  const agencyItems = selectAgencyPartners(candidates, { networkItems, max: 3 });
  return <section className={styles.preferred} aria-labelledby="partenaires-selection-title"><div className={styles.preferredHeading}><span>La sélection Mondescale</span><h2 id="partenaires-selection-title">Nos partenaires de référence</h2><p>Les grandes marques que nous mobilisons régulièrement, complétées lorsque nécessaire par des spécialistes adaptés à votre projet.</p></div><div className={styles.networkPreferredGrid}>{networkItems.map((item) => <PreferredPartnerCard key={item.id} item={item} />)}</div>{agencyItems.length ? <div className={styles.agencyPreferred}><h3>Les spécialistes complémentaires de votre agence</h3><div className={styles.agencyPreferredGrid}>{agencyItems.map((item) => <PreferredPartnerCard key={item.id} item={item} agency />)}</div></div> : null}</section>;
}

function CategoryPanel({ category, index }) {
  return <details id={`partenaires-${category.id}`} className={styles.category} open={index === 0}><summary className={styles.categorySummary}><span className={styles.categoryIdentity}><small>{category.eyebrow}</small><strong>{category.label}</strong></span><span className={styles.categoryCount}>{category.partners.length} partenaire{category.partners.length > 1 ? "s" : ""}</span><span className={styles.categoryToggle} aria-hidden="true" /></summary><div className={styles.categoryContent}><div className={styles.grid}>{category.partners.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}</div></div></details>;
}

export default function PartnerDirectoryRenderer({ section, site }) {
  const content = getSectionContent(section);
  const categories = getPartnerDirectoryCategories().map((category) => ({ ...category, partners: getPublishablePartnerProfiles(category.partners) })).filter((category) => category.partners.length);
  const totalPartners = new Set(categories.flatMap((category) => category.partners.map((partner) => partner.id || partner.name))).size;
  return <section className={`public-site-section ${styles.section}`} data-partner-directory="full"><div className="public-site-container"><header className={styles.header}><div><span className={styles.eyebrow}>Catalogue partenaires</span><h2>{getSectionTitle(section, "Tous nos partenaires voyage")}</h2></div><div className={styles.headerAside}><strong>{totalPartners}</strong><span>références disponibles</span></div><p>{content.text || "Tour-opérateurs, croisiéristes, clubs, circuits et spécialistes : parcourez notre catalogue puis échangez avec votre conseiller pour identifier la solution la plus adaptée à votre projet."}</p></header><PreferredPartners site={site} /><div className={styles.directoryIntro}><div><span className={styles.eyebrow}>Explorer le catalogue</span><h2>Choisissez votre univers de voyage</h2></div><p>Ouvrez un univers pour découvrir les partenaires correspondants. Les détails restent accessibles à la demande pour conserver une lecture claire.</p></div><nav className={styles.categoryNav} aria-label="Univers de partenaires">{categories.map((category) => <a key={category.id} href={`#partenaires-${category.id}`}><span><small>{category.eyebrow}</small><strong>{category.label}</strong></span><b>{category.partners.length}</b></a>)}</nav><div className={styles.directory}>{categories.map((category, index) => <CategoryPanel key={category.id} category={category} index={index} />)}</div></div></section>;
}

export { DIRECTORY_LOGO_HEIGHT, DIRECTORY_LOGO_WIDTH };
