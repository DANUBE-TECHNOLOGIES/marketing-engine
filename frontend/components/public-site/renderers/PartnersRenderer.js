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

function PartnerGrid({ items }) {
  if (!items.length) return null;

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
        .filter(Boolean)
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

        <PartnerGrid items={agencyItems} />
      </div>
    </section>
  );
}
