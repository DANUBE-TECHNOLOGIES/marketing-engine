import { getSectionContent, getSectionTitle, getSectionType } from "./helpers";
import { getCommonPartners } from "../../page-builder/shared/commonPartners";
import { resolveAgencyPartnerCandidates } from "../../page-builder/shared/agencyPartnerCatalog";
import { safePartnerAssetUrl, selectAgencyPartners } from "../../page-builder/shared/partnerSelection";
import PartnerDirectoryRenderer from "./PartnerDirectoryRenderer";
import styles from "./PartnersRenderer.module.css";

const DIRECTORY_TYPES = new Set([
  "partner-directory",
  "partners-directory",
  "partner-categories",
]);

function pageIsHome(page) {
  const slug = String(page?.slug || "").trim().toLowerCase();
  return !slug || ["home", "accueil", "index"].includes(slug);
}

function pageHasExplicitDirectory(page) {
  const sections = Array.isArray(page?.sections)
    ? page.sections
    : Array.isArray(page?.blocks)
      ? page.blocks
      : [];

  return sections.some((candidate) =>
    DIRECTORY_TYPES.has(getSectionType(candidate))
  );
}

function NetworkPartnerGrid({ items }) {
  return (
    <div
      className={`${styles.networkGrid} public-site-partners-grid public-site-partners-grid--network`}
    >
      {items.map((item, index) => {
        const logo = safePartnerAssetUrl(
          item.logoUrl || item.logo || item.imageUrl
        );
        const name = item.name || item.title || "Partenaire voyage";
        const isTui = item.group === "tui";

        return (
          <div
            key={item.id || name || index}
            className={`${styles.networkCard} ${isTui ? styles.tuiCard : ""} public-site-partner-card`}
            data-partner-id={item.id || undefined}
          >
            {isTui ? (
              <>
                <img
                  src={safePartnerAssetUrl(item.logoUrl)}
                  alt={item.alt || "Logo TUI"}
                  loading="lazy"
                  decoding="async"
                  className={styles.tuiMainLogo}
                />
                <div className={styles.tuiChildren}>
                  {(item.children || []).map((child) => (
                    <div key={child.id} className={styles.tuiChild}>
                      <img
                        src={safePartnerAssetUrl(child.logoUrl)}
                        alt={`Logo ${child.name}`}
                        loading="lazy"
                        decoding="async"
                        className={styles.tuiChildLogo}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : logo ? (
              <img
                src={logo}
                alt={item.alt || `Logo ${name}`}
                loading="lazy"
                decoding="async"
                className={styles.networkLogo}
              />
            ) : (
              <strong>{name}</strong>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgencyPartnerGrid({ items }) {
  if (!items.length) return null;

  return (
    <div className={`public-site-agency-partners ${styles.agencyWrap}`}>
      <p className={styles.agencyLabel}>Également sélectionnés par votre agence</p>
      <div className={`public-site-agency-partners-grid ${styles.agencyGrid}`}>
        {items.map((item, index) => {
          const name = item.name || "Partenaire voyage";
          const mark = item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={item.alt || `Logo ${name}`}
              loading="lazy"
              decoding="async"
              className={styles.agencyLogo}
            />
          ) : (
            <strong>{name}</strong>
          );

          return (
            <div key={item.id || name || index} className={styles.agencyCard}>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {mark}
                </a>
              ) : (
                mark
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PartnersRenderer({ section, site, page }) {
  /*
   * The compact partner strip belongs on the Home only. Existing Designer V2
   * partner pages may still contain that legacy `partners` block instead of a
   * `partner-directory` block. On a secondary page, promote it in memory to
   * the complete catalogue experience. If an explicit directory already
   * exists, suppress the compact block to avoid rendering the catalogue twice.
   */
  if (!pageIsHome(page)) {
    if (pageHasExplicitDirectory(page)) return null;
    return <PartnerDirectoryRenderer section={section} site={site} page={page} />;
  }

  const content = getSectionContent(section);
  const networkItems = getCommonPartners();
  const candidates = resolveAgencyPartnerCandidates(content.agencyPartners);
  const agencyItems = selectAgencyPartners(candidates, {
    networkItems,
    max: Number(content.maxAgencyPartners) || 3,
  });

  return (
    <section className={`public-site-section public-site-partners ${styles.section}`}>
      <div className="public-site-container">
        <header className={styles.heading}>
          <p className={styles.kicker}>Nos partenaires</p>
          <h2>{getSectionTitle(section, "Des partenaires de confiance")}</h2>
          <p>
            {content.text ||
              "Des marques reconnues et des spécialistes sélectionnés pour construire votre voyage avec le bon niveau d’accompagnement."}
          </p>
        </header>
        <div className={styles.networkPanel}>
          <p className={styles.networkLabel}>Notre sélection principale</p>
          <NetworkPartnerGrid items={networkItems} />
          <AgencyPartnerGrid items={agencyItems} />
        </div>
      </div>
    </section>
  );
}

export { pageHasExplicitDirectory, pageIsHome };
