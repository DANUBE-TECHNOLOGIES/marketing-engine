const PAYMENT_METHODS = Object.freeze([
  {
    id: "cb",
    label: "Carte bancaire",
    logo: "https://d2csxpduxe849s.cloudfront.net/media/F44207E3-1DDE-4798-B0FCC94F6227FCB/8642409E-0CD7-4EB5-A36E36D5BA3E9BE7/webimage-0D45FA73-E241-49FC-9F4CCF6FD9747B83.jpg",
  },
  {
    id: "visa",
    label: "VISA",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Visa_2021.svg",
    fallback: "VISA",
  },
  {
    id: "mastercard",
    label: "Mastercard",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
  },
  {
    id: "amex",
    label: "American Express",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg",
  },
]);

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
  const trustReferences = resolvedTrustReferences(legalValues);

  return (
    <section
      className="public-reassurance"
      aria-label="Moyens de paiement et repères professionnels"
    >
      <div className="public-site-container public-reassurance-shell">
        <div className="public-reassurance-panel public-reassurance-panel--payments">
          <header className="public-reassurance-heading">
            <span className="public-reassurance-kicker">Paiement en agence</span>
            <div>
              <strong>Moyens de paiement acceptés</strong>
              <small>Selon les conditions de votre dossier</small>
            </div>
          </header>
          <BrandRow items={PAYMENT_METHODS} kind="payment" />
        </div>

        <div className="public-reassurance-divider" aria-hidden="true" />

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
      </div>
    </section>
  );
}

export {
  LOGO_INTRINSIC_HEIGHT,
  LOGO_INTRINSIC_WIDTH,
  PAYMENT_METHODS,
  TRUST_REFERENCES,
  legalTrustReferences,
  resolvedTrustReferences,
};
