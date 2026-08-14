import styles from "./PartnerLogosBlock.module.css";
import { getSectionContent, normalizeItems } from "../shared/blockUtils";
import { getCommonPartners } from "../shared/commonPartners";

function normalizePartner(item) {
  if (!item || typeof item !== "object") return null;
  const name = String(item.name || item.title || "").trim();
  const logo = String(item.logo || item.logoUrl || item.imageUrl || "").trim();
  if (!name || !logo) return null;
  return {
    id: String(item.id || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    logo,
    alt: String(item.alt || `${name}, partenaire de Mondescale Voyages`).trim(),
  };
}

function PartnerMark({ partner }) {
  if (Number.isInteger(partner.spriteIndex) && partner.sprite) {
    const x = partner.spriteIndex * 300;
    return (
      <span
        className={styles.sprite}
        role="img"
        aria-label={partner.alt}
        style={{
          backgroundImage: `url(${partner.sprite})`,
          backgroundPosition: `-${x}px 0px`,
        }}
      />
    );
  }

  return (
    <img
      src={partner.logo}
      alt={partner.alt}
      loading="lazy"
      decoding="async"
      width="600"
      height="240"
    />
  );
}

export default function PartnerLogosBlock({ section }) {
  const content = getSectionContent(section);
  const contextual = normalizeItems(content.items)
    .map(normalizePartner)
    .filter(Boolean)
    .slice(0, 3);
  const partners = [...getCommonPartners(), ...contextual];
  const headingId = `partners-${section?.id || "common"}`;

  return (
    <section className={`as-section ${styles.section}`} aria-labelledby={headingId}>
      <div className="as-shell">
        <div className={`as-section-heading ${styles.heading}`}>
          <div>
            <p className={`as-eyebrow ${styles.eyebrow}`}>Nos partenaires voyagistes</p>
            <h2 id={headingId}>
              {content.title || "Les plus grands voyagistes, un seul conseiller"}
            </h2>
          </div>
          <p className="as-intro">
            {content.text || "Nous comparons les offres de partenaires reconnus pour construire le voyage qui correspond vraiment à vos envies."}
          </p>
        </div>

        <div className={styles.grid} role="list" aria-label="Partenaires voyagistes Mondescale">
          {partners.map((partner) => (
            <div className={styles.logo} role="listitem" key={partner.id} title={partner.name}>
              <PartnerMark partner={partner} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
