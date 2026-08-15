import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

const spriteWrapStyle = {
  marginTop: "28px",
  padding: "24px 28px",
  borderRadius: "24px",
  background: "#fff",
  boxShadow: "0 18px 46px rgba(7, 29, 48, 0.07)",
};

const spriteImageStyle = {
  width: "100%",
  maxWidth: "1040px",
  height: "auto",
  display: "block",
  margin: "0 auto",
  objectFit: "contain",
};

const agencyWrapStyle = {
  marginTop: "22px",
};

const agencyLabelStyle = {
  margin: "0 0 12px",
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

function PartnerGrid({ items, agency = false }) {
  if (!items.length) return null;

  if (agency) {
    return (
      <div className="public-site-agency-partners" style={agencyWrapStyle}>
        <p style={agencyLabelStyle}>Également sélectionnés par votre agence</p>
        <div className="public-site-agency-partners-grid" style={agencyGridStyle}>
          {items.map((item, index) => {
            const logo = item.logo || item.logoUrl || item.imageUrl || null;
            const name = item.name || item.title || "Partenaire voyage";

            return (
              <div key={item.id || item.name || index} style={agencyCardStyle}>
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

  return (
    <div className="public-site-partners-grid">
      {items.map((item, index) => {
        const logo = item.logo || item.logoUrl || item.imageUrl || null;

        return (
          <div key={item.id || item.name || index}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={item.name || item.title || ""}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <strong>{item.name || item.title}</strong>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PartnersRenderer({ section }) {
  const content = getSectionContent(section);
  const networkItems = getItems(section, ["items", "partners"])
    .filter((item) => item?.scope !== "agency");
  const agencyItems = Array.isArray(content.agencyPartners)
    ? content.agencyPartners
        .filter((item) => item && (item.name || item.title || item.logo || item.logoUrl || item.imageUrl))
        .slice(0, Number(content.maxAgencyPartners) || 3)
        .map((item) => ({ ...item, scope: "agency" }))
    : [];

  const sprite = content.sprite || content.spriteUrl || null;

  return (
    <section className="public-site-section public-site-partners">
      <div className="public-site-container">
        <h2>{getSectionTitle(section, "Des partenaires de confiance")}</h2>

        {content.text ? (
          <p className="public-site-section-intro">{content.text}</p>
        ) : null}

        {sprite ? (
          <div className="public-site-partners-sprite" style={spriteWrapStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sprite}
              alt={
                content.spriteAlt ||
                networkItems
                  .map((item) => item.name || item.title)
                  .filter(Boolean)
                  .join(", ")
              }
              loading="lazy"
              decoding="async"
              style={spriteImageStyle}
            />
          </div>
        ) : (
          <PartnerGrid items={networkItems} />
        )}

        <PartnerGrid items={agencyItems} agency />
      </div>
    </section>
  );
}
