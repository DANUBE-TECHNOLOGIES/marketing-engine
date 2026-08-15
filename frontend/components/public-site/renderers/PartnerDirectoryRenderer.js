import { getSectionContent, getSectionTitle } from "./helpers";
import { getPartnerDirectoryCategories } from "../../page-builder/shared/fullPartners";
import styles from "./PartnerDirectoryRenderer.module.css";

function PartnerCard({ partner }) {
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
        {partner.tags?.length ? (
          <div className={styles.tags} aria-label={`Spécialités de ${partner.name}`}>
            {partner.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
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
              "Nos conseillers s'appuient sur un large réseau de tour-opérateurs, croisiéristes et spécialistes pour comparer les solutions et construire le voyage le plus adapté à votre projet."}
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
