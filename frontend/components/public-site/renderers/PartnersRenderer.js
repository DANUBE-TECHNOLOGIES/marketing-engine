import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  getCommonPartners,
} from "../../page-builder/shared/commonPartners";
import styles from "./PartnersRenderer.module.css";

function NetworkPartnerGrid() {
  const items = getCommonPartners();

  return (
    <div className={`${styles.networkGrid} public-site-partners-grid public-site-partners-grid--network`}>
      {items.map((item, index) => {
        const logo = item.logoUrl || item.logo || item.imageUrl || null;
        const name = item.name || item.title || "Partenaire voyage";
        const isTui = item.group === "tui";

        return (
          <div
            key={item.id || name || index}
            className={`${styles.networkCard} ${isTui ? styles.tuiCard : ""} public-site-partner-card public-site-partner-card--${item.id || index}`}
            data-partner-id={item.id || undefined}
          >
            {isTui ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.logoUrl}
                  alt={item.alt || "Logo TUI"}
                  loading="lazy"
                  decoding="async"
                  className={styles.tuiMainLogo}
                />

                <div className={styles.tuiChildren}>
                  {(item.children || []).map((child) => (
                    <div key={child.id} className={styles.tuiChild}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={child.logoUrl}
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
              // eslint-disable-next-line @next/next/no-img-element
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
          const logo = item.logo || item.logoUrl || item.imageUrl || null;
          const name = item.name || item.title || "Partenaire voyage";

          return (
            <div key={item.id || name || index} className={styles.agencyCard}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={`Logo ${name}`}
                  loading="lazy"
                  decoding="async"
                  className={styles.agencyLogo}
                />
              ) : (
                <strong>{name}</strong>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PartnersRenderer({ section }) {
  const content = getSectionContent(section);
  const agencyItems = Array.isArray(content.agencyPartners)
    ? content.agencyPartners
        .filter((item) => item && (item.name || item.title || item.logo || item.logoUrl || item.imageUrl))
        .slice(0, Number(content.maxAgencyPartners) || 3)
        .map((item) => ({ ...item, scope: "agency" }))
    : [];

  return (
    <section className="public-site-section public-site-partners">
      <div className="public-site-container">
        <h2>{getSectionTitle(section, "Des partenaires de confiance")}</h2>
        {content.text ? <p className="public-site-section-intro">{content.text}</p> : null}
        <NetworkPartnerGrid />
        <AgencyPartnerGrid items={agencyItems} />
      </div>
    </section>
  );
}
