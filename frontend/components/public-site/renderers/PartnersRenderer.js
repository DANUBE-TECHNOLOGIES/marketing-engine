import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  getCommonPartners,
} from "../../page-builder/shared/commonPartners";

const networkGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "16px",
  marginTop: "28px",
};

const networkCardStyle = {
  minHeight: "132px",
  padding: "22px 24px",
  border: "1px solid rgba(7, 29, 48, 0.07)",
  borderRadius: "22px",
  background: "#fff",
  boxShadow: "0 14px 34px rgba(7, 29, 48, 0.055)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const networkLogoStyle = {
  display: "block",
  width: "100%",
  maxWidth: "210px",
  height: "76px",
  objectFit: "contain",
};

const agencyWrapStyle = {
  marginTop: "30px",
  paddingTop: "22px",
  borderTop: "1px solid rgba(7, 29, 48, 0.08)",
};

const agencyLabelStyle = {
  margin: "0 0 14px",
  textAlign: "center",
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.58,
};

const agencyGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  maxWidth: "620px",
  margin: "0 auto",
};

const agencyCardStyle = {
  minHeight: "92px",
  padding: "16px 18px",
  border: "1px solid rgba(7, 29, 48, 0.08)",
  borderRadius: "18px",
  background: "rgba(255, 255, 255, 0.86)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const agencyLogoStyle = {
  display: "block",
  width: "100%",
  maxWidth: "150px",
  height: "52px",
  objectFit: "contain",
};

function normalizeName(value) {
  return String(value || "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveNetworkItems(sectionItems) {
  const common = getCommonPartners();
  const byId = new Map(common.map((item) => [item.id, item]));
  const byName = new Map(common.map((item) => [normalizeName(item.name), item]));

  const resolved = (sectionItems || [])
    .filter((item) => item?.scope !== "agency")
    .map((item) => {
      const match = byId.get(item.id) || byName.get(normalizeName(item.name || item.title));
      return match ? { ...match, ...item, logoUrl: match.logoUrl, alt: match.alt } : item;
    });

  return resolved.length ? resolved : common;
}

function NetworkPartnerGrid({ items }) {
  return (
    <div className="public-site-partners-grid public-site-partners-grid--network" style={networkGridStyle}>
      {items.map((item, index) => {
        const logo = item.logoUrl || item.logo || item.imageUrl || null;
        const name = item.name || item.title || "Partenaire voyage";

        return (
          <div key={item.id || name || index} className="public-site-partner-card" style={networkCardStyle}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={item.alt || `Logo ${name}`}
                loading="lazy"
                decoding="async"
                width="600"
                height="240"
                style={networkLogoStyle}
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
    <div className="public-site-agency-partners" style={agencyWrapStyle}>
      <p style={agencyLabelStyle}>Également sélectionnés par votre agence</p>
      <div className="public-site-agency-partners-grid" style={agencyGridStyle}>
        {items.map((item, index) => {
          const logo = item.logo || item.logoUrl || item.imageUrl || null;
          const name = item.name || item.title || "Partenaire voyage";

          return (
            <div key={item.id || name || index} style={agencyCardStyle}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={`Logo ${name}`}
                  loading="lazy"
                  decoding="async"
                  style={agencyLogoStyle}
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
  const networkItems = resolveNetworkItems(getItems(section, ["items", "partners"]));
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

        {content.text ? (
          <p className="public-site-section-intro">{content.text}</p>
        ) : null}

        <NetworkPartnerGrid items={networkItems} />
        <AgencyPartnerGrid items={agencyItems} />
      </div>
    </section>
  );
}
