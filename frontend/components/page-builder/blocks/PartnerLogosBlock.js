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

export default function PartnerLogosBlock({ section }) {
  const content = getSectionContent(section);
  const contextual = normalizeItems(content.items)
    .map(normalizePartner)
    .filter(Boolean)
    .slice(0, 3);
  const partners = [...getCommonPartners(), ...contextual];

  return (
    <section className="as-section as-partners" aria-labelledby={`partners-${section?.id || "common"}`}>
      <div className="as-shell">
        <div className="as-section-heading as-partners-heading">
          <div>
            <p className="as-eyebrow as-partners-eyebrow">Nos partenaires voyagistes</p>
            <h2 id={`partners-${section?.id || "common"}`}>
              {content.title || "Les plus grands voyagistes, un seul conseiller"}
            </h2>
          </div>
          <p className="as-intro">
            {content.text || "Nous comparons les offres de partenaires reconnus pour construire le voyage qui correspond vraiment à vos envies."}
          </p>
        </div>

        <div className="as-partner-grid" role="list" aria-label="Partenaires voyagistes Mondescale">
          {partners.map((partner) => (
            <div className="as-partner-logo" role="listitem" key={partner.id} title={partner.name}>
              <img
                src={partner.logo}
                alt={partner.alt}
                loading="lazy"
                decoding="async"
                width="600"
                height="240"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
