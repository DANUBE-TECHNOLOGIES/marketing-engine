const TRUST_REFERENCES = Object.freeze([
  {
    id: "cediv",
    label: "CEDIV Travel",
    detail: "Réseau professionnel",
    logo: "https://www.sport-et-tourisme.fr/wp-content/uploads/2021/10/Logo-Cediv-Travel.jpg",
  },
  {
    id: "edv",
    label: "Les Entreprises du Voyage",
    detail: "Organisation professionnelle",
    logo: "https://www.depart-de-deauville.fr/assets/img/site/136/uploads/LOGOS/les_entreprises_du_voyage_logo.png",
  },
]);

const LOGO_INTRINSIC_WIDTH = 160;
const LOGO_INTRINSIC_HEIGHT = 64;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function paymentSettings(legalValues) {
  const settings = legalValues?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return [];
  return Array.isArray(settings.paymentMethods) ? settings.paymentMethods : [];
}

function normalizedPaymentMethods(legalValues) {
  const result = [];
  const seen = new Set();

  for (const [index, value] of paymentSettings(legalValues).entries()) {
    const item = typeof value === "string" ? { label: value } : value;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;

    const label = clean(item.label || item.name || item.title);
    if (!label) continue;

    const id = clean(item.id || label.toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "")) || `payment-${index + 1}`;
    const dedupeKey = id.toLocaleLowerCase("fr-FR");
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    result.push({
      id,
      label,
      detail: clean(item.detail || item.description) || undefined,
      logo: clean(item.logo || item.logoUrl || item.image) || undefined,
      fallback: clean(item.fallback) || undefined,
    });
  }

  return result;
}

function legalTrustReferences(legalValues) {
  const values = legalValues && typeof legalValues === "object" ? legalValues : {};
  const result = [];

  const travelRegistration = clean(values.travelRegistration);
  if (travelRegistration) {
    result.push({
      id: "travel-registration",
      label: "Immatriculation tourisme",
      detail: travelRegistration,
    });
  }

  const financialGuarantee = clean(values.financialGuarantee);
  if (financialGuarantee) {
    result.push({
      id: "financial-guarantee",
      label: "Garantie financière",
      detail: financialGuarantee,
    });
  }

  const professionalInsurance = clean(values.professionalInsurance);
  if (professionalInsurance) {
    result.push({
      id: "professional-insurance",
      label: "Assurance professionnelle",
      detail: professionalInsurance,
    });
  }

  return result;
}

function resolvedTrustReferences(legalValues) {
  return [...TRUST_REFERENCES, ...legalTrustReferences(legalValues)];
}

function BrandMark({ item, kind }) {
  return (
    <div
      className={`public-reassurance-mark public-reassurance-mark--${kind}`}
      data-reassurance-id={item.id}
      title={item.label}
    >
      <div className="public-reassurance-logo-slot">
        {item.fallback ? <span className="public-reassurance-logo-fallback">{item.fallback}</span> : null}
        {item.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="public-reassurance-logo"
            src={item.logo}
            alt={`Logo ${item.label}`}
            width={LOGO_INTRINSIC_WIDTH}
            height={LOGO_INTRINSIC_HEIGHT}
            loading="lazy"
            decoding="async"
          />
        ) : <span className="public-reassurance-logo-fallback" aria-hidden="true">✓</span>}
      </div>
      <span className="public-reassurance-mark-label">{item.label}</span>
      {item.detail ? <small>{item.detail}</small> : null}
    </div>
  );
}

function BrandRow({ items, kind }) {
  return (
    <div className={`public-reassurance-marks public-reassurance-marks--${kind}`}>
      {items.map((item) => (
        <BrandMark key={item.id} item={item} kind={kind} />
      ))}
    </div>
  );
}

export default function PublicReassuranceBand({ legalValues = null }) {
  const paymentMethods = normalizedPaymentMethods(legalValues);
  const trustReferences = resolvedTrustReferences(legalValues);
  const hasPayments = paymentMethods.length > 0;
  const hasTrust = trustReferences.length > 0;

  if (!hasPayments && !hasTrust) return null;

  return (
    <section
      className="public-reassurance"
      aria-label={hasPayments ? "Moyens de paiement publiés et repères professionnels" : "Repères professionnels"}
    >
      <div className="public-site-container public-reassurance-shell">
        {hasPayments ? (
          <div className="public-reassurance-panel public-reassurance-panel--payments">
            <header className="public-reassurance-heading">
              <span className="public-reassurance-kicker">Paiement en agence</span>
              <div>
                <strong>Moyens de paiement publiés</strong>
                <small>Informations issues du profil public Mondescale</small>
              </div>
            </header>
            <BrandRow items={paymentMethods} kind="payment" />
          </div>
        ) : null}

        {hasPayments && hasTrust ? <div className="public-reassurance-divider" aria-hidden="true" /> : null}

        {hasTrust ? (
          <div className="public-reassurance-panel public-reassurance-panel--trust">
            <header className="public-reassurance-heading">
              <span className="public-reassurance-kicker">Repères professionnels</span>
              <div>
                <strong>Affiliations et informations légales publiées</strong>
                <small>Les données légales sont affichées uniquement lorsqu’elles sont présentes dans le profil public Mondescale</small>
              </div>
            </header>
            <BrandRow items={trustReferences} kind="trust" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  LOGO_INTRINSIC_HEIGHT,
  LOGO_INTRINSIC_WIDTH,
  TRUST_REFERENCES,
  legalTrustReferences,
  normalizedPaymentMethods,
  paymentSettings,
  resolvedTrustReferences,
};
