import { getSectionContent, getSectionTitle } from "./helpers";
import { getPartnerDirectoryCategories } from "../../page-builder/shared/fullPartners";
import { getPartnerDetails } from "../../page-builder/shared/partnerDetails";
import styles from "./PartnerDirectoryRenderer.module.css";

function MetadataGroup({ label, values }) {
  if (!Array.isArray(values) || !values.length) return null;

  return (
    <div className={styles.metadataGroup}>
      <strong>{label}</strong>
      <span>{values.join(" · ")}</span>
    </div>
  );
}

function PartnerCard({ partner }) {
  const details = getPartnerDetails(partner.id);
  const visibleTags = Array.isArray(partner.tags) ? partner.tags.slice(0, 2) : [];

  return (
    <article className={styles.card} data-partner-id={partner.id}>
      <div className={styles.logoFrame}>
        {partner.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logoUrl}
            alt={`Logo ${partner.name}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span aria-hidden="true">{partner.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className={styles.cardBody}>
        <h3>{partner.name}</h3>
        <p>{partner.summary}</p>

        {visibleTags.length ? (
          <div className={styles.tags} aria-label={`Spécialités de ${partner.name}`}>
            {visibleTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}

        {details ? (
          <details className={styles.details}>
            <summary>Découvrir ses spécialités</summary>
            <div className={styles.metadata}>
              <MetadataGroup label="Destinations" values={details.destinations} />
              <MetadataGroup label="Types de voyages" values={details.travelTypes} />
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export default function PartnerDirectoryRenderer({ section }) {
  const content = getSectionContent(section);
  const categories = getPartnerDirectoryCategories();

  return (
    <section className={`public-site-section ${styles.section}`}>
      <div className="public-site-container">
        <header className={styles.header}>
          <span className={styles.eyebrow}>Notre réseau de partenaires</span>
          <h2>{getSectionTitle(section, "Tous nos partenaires voyage")}</h2>
          <p>
            {content.text ||
              "Retrouvez les principaux tour-opérateurs, croisiéristes et spécialistes avec lesquels nos conseillers peuvent construire votre voyage. Choisissez simplement un univers pour parcourir les partenaires correspondants."}
          </p>
        </header>

        <nav className={styles.categoryNav} aria-label="Catégories de partenaires">
          {categories.map((category) => (
            <a key={category.id} href={`#partenaires-${category.id}`}>
              {category.label}
              <small>{category.partners.length}</small>
            </a>
          ))}
        </nav>

        <div className={styles.directory}>
          {categories.map((category) => (
            <section
              key={category.id}
              id={`partenaires-${category.id}`}
              className={styles.category}
              aria-labelledby={`partenaires-${category.id}-title`}
            >
              <div className={styles.categoryHeading}>
                <span>{category.eyebrow}</span>
                <h2 id={`partenaires-${category.id}-title`}>{category.label}</h2>
                <p>{category.partners.length} partenaire{category.partners.length > 1 ? "s" : ""}</p>
              </div>

              <div className={styles.grid}>
                {category.partners.map((partner) => (
                  <PartnerCard key={partner.id} partner={partner} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
