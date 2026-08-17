import { getSectionContent } from "../shared/blockUtils";
import { FULL_PARTNERS, PARTNER_DIRECTORY_CATEGORIES } from "../shared/fullPartners";
import { isPartnerPublicationConfirmed } from "../shared/partnerVerification";
import { getCruisePartnerDetails } from "../shared/partnerCruiseDetails";
import { getCircuitPartnerDetails } from "../shared/partnerCircuitDetails";
import { getStayPartnerDetails } from "../shared/partnerStayDetails";
import { getLongHaulPartnerDetails } from "../shared/partnerLongHaulDetails";
import { getFranceEuropePartnerDetails } from "../shared/partnerFranceEuropeDetails";

const DETAIL_RESOLVERS = Object.freeze({
  croisieres: getCruisePartnerDetails,
  circuits: getCircuitPartnerDetails,
  sejours: getStayPartnerDetails,
  "sur-mesure": getLongHaulPartnerDetails,
  "france-europe": getFranceEuropePartnerDetails,
});

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MV";
}

function PartnerLogo({ partner }) {
  if (partner.logoUrl) {
    return (
      <span className="as-partner-logo" aria-hidden="true">
        <img src={partner.logoUrl} alt="" loading="lazy" />
      </span>
    );
  }
  return <span className="as-partner-logo as-partner-logo-fallback" aria-hidden="true">{initials(partner.name)}</span>;
}

function DetailList({ label, values }) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return (
    <div className="as-partner-detail-group">
      <strong>{label}</strong>
      <div className="as-partner-pills">
        {values.map((value) => <span className="as-partner-pill" key={value}>{value}</span>)}
      </div>
    </div>
  );
}

export default function PartnerCategoriesBlock({ section }) {
  const content = getSectionContent(section);
  const published = FULL_PARTNERS.filter((partner) => isPartnerPublicationConfirmed(partner.id));
  const categories = PARTNER_DIRECTORY_CATEGORIES.map((category) => ({
    ...category,
    partners: published.filter((partner) => partner.category === category.id),
  })).filter((category) => category.partners.length > 0);

  return (
    <section className="as-section as-partners-directory" data-block-type="partner-categories">
      <div className="as-shell">
        <div className="as-section-heading">
          <div>
            <span className="as-eyebrow">Nos partenaires</span>
            <h2>{content.title || "Des spécialistes pour chaque façon de voyager"}</h2>
          </div>
          <p className="as-intro">{content.text || "Retrouvez nos partenaires classés par grandes familles. Ouvrez une fiche pour voir rapidement les destinations et les types de voyages qu'ils proposent."}</p>
        </div>

        <nav className="as-partner-category-nav" aria-label="Catégories de partenaires">
          {categories.map((category) => (
            <a href={`#partenaires-${category.id}`} key={category.id}>
              {category.label}<span>{category.partners.length}</span>
            </a>
          ))}
        </nav>

        <div className="as-partner-sections">
          {categories.map((category) => (
            <section className="as-partner-category" id={`partenaires-${category.id}`} key={category.id}>
              <div className="as-partner-category-heading">
                <div>
                  <span className="as-eyebrow">{category.eyebrow}</span>
                  <h3>{category.label}</h3>
                </div>
                <span className="as-partner-count">{category.partners.length} partenaire{category.partners.length > 1 ? "s" : ""}</span>
              </div>

              <div className="as-partner-grid">
                {category.partners.map((partner) => {
                  const details = DETAIL_RESOLVERS[category.id]?.(partner.id) || null;
                  return (
                    <article className="as-card as-partner-card" key={partner.id}>
                      <div className="as-partner-card-head">
                        <PartnerLogo partner={partner} />
                        <div>
                          <h4>{partner.name}</h4>
                          {partner.tags?.length > 0 && <p className="as-partner-tags">{partner.tags.slice(0, 3).join(" · ")}</p>}
                        </div>
                      </div>
                      <p>{partner.summary}</p>

                      {details && (
                        <details className="as-partner-details">
                          <summary>Destinations et types de voyages</summary>
                          <div className="as-partner-details-body">
                            <DetailList label="Destinations" values={details.destinations} />
                            <DetailList label="Types de voyages" values={details.travelTypes} />
                            {Array.isArray(details.brands) && details.brands.length > 0 && <DetailList label="Marques" values={details.brands} />}
                            {details.note && <p className="as-partner-note">{details.note}</p>}
                            {details.website && (
                              <a className="as-partner-website" href={details.website} target="_blank" rel="noreferrer">
                                Site du partenaire
                              </a>
                            )}
                          </div>
                        </details>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
