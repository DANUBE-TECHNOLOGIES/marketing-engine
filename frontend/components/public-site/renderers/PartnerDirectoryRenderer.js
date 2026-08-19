import { getSectionContent, getSectionTitle } from "./helpers";
import { getPartnerDirectoryCategories } from "../../page-builder/shared/fullPartners";
import { getPartnerProfile, getPublishablePartnerProfiles } from "../../page-builder/shared/partnerProfile";
import { safePartnerHref } from "../../page-builder/shared/partnerSelection";
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
  const profile = getPartnerProfile(partner);
  if (!profile) return null;
  const website = safePartnerHref(profile.details?.website, { allowInternal: false });

  return (
    <article className={styles.card} data-partner-id={profile.id}>
      <div className={styles.logoFrame}>
        {profile.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.logoUrl}
            alt={`Logo ${profile.name}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span aria-hidden="true">{profile.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className={styles.cardBody}>
        <h3>{profile.name}</h3>
        <p>{profile.summary}</p>

        {profile.visibleTags.length ? (
          <div className={styles.tags} aria-label={`Spécialités de ${profile.name}`}>
            {profile.visibleTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}

        {profile.details ? (
          <details className={styles.details}>
            <summary>Découvrir ses spécialités</summary>
            <div className={styles.metadata}>
              <MetadataGroup label="Destinations" values={profile.details.destinations} />
              <MetadataGroup label="Types de voyages" values={profile.details.travelTypes} />
              <MetadataGroup label="Marques" values={profile.details.brands} />
              {profile.details.note ? <p className={styles.note}>{profile.details.note}</p> : null}
              {website ? (
                <a className={styles.website} href={website} target="_blank" rel="noopener noreferrer">
                  Site du partenaire
                </a>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export default function PartnerDirectoryRenderer({ section }) {
  const content = getSectionContent(section);
  const categories = getPartnerDirectoryCategories()
    .map((category) => ({
      ...category,
      partners: getPublishablePartnerProfiles(category.partners),
    }))
    .filter((category) => category.partners.length);

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