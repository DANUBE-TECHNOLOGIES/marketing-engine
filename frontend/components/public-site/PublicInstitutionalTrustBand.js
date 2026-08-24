const MONDESCALE_TRUST_DEFAULTS = Object.freeze({
  financialGuaranteeProvider: "GROUPAMA Assurance & Caution",
  professionalInsuranceProvider: "GROUPAMA Assurance & Caution",
});

const TRUST_LOGOS = Object.freeze({
  cediv: "https://www.sport-et-tourisme.fr/wp-content/uploads/2021/10/Logo-Cediv-Travel.jpg",
  edv: "https://www.depart-de-deauville.fr/assets/img/site/136/uploads/LOGOS/les_entreprises_du_voyage_logo.png",
  atoutFrance: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Atout_France.jpg",
  groupama: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Groupama_logo.svg",
});

function compactLegalValue(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || null;
}

function registrationDetail(legal) {
  return compactLegalValue(legal?.travelRegistration);
}

function guaranteeDetail(legal) {
  return compactLegalValue(legal?.financialGuarantee);
}

function insuranceDetail(legal) {
  return compactLegalValue(legal?.professionalInsurance);
}

function InstitutionalMark({ reference }) {
  if (!reference.logoSrc) {
    return (
      <span className="public-institutional-mark" aria-hidden="true">
        {reference.mark}
      </span>
    );
  }

  return (
    <span
      className={`public-institutional-mark public-institutional-logo-wrap public-institutional-logo-${reference.key}`}
      aria-hidden="true"
    >
      <img
        className="public-institutional-logo"
        src={reference.logoSrc}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

export default function PublicInstitutionalTrustBand({ runtime }) {
  const legal = runtime?.runtime?.legal?.values || {};
  const travelRegistration = registrationDetail(legal);
  const financialGuarantee = guaranteeDetail(legal);
  const professionalInsurance = insuranceDetail(legal);

  const guaranteeProvider =
    financialGuarantee || MONDESCALE_TRUST_DEFAULTS.financialGuaranteeProvider;
  const insuranceProvider =
    professionalInsurance || MONDESCALE_TRUST_DEFAULTS.professionalInsuranceProvider;

  const groupamaDetail =
    guaranteeProvider === insuranceProvider
      ? `Garantie financière et RCP · ${guaranteeProvider}`
      : `Garantie financière · ${guaranteeProvider} · RCP · ${insuranceProvider}`;

  const references = [
    {
      key: "cediv",
      mark: "CEDIV",
      logoSrc: TRUST_LOGOS.cediv,
      title: "CEDIV Travel",
      detail: "Réseau professionnel d’agences de voyages indépendantes",
    },
    {
      key: "edv",
      mark: "EDV",
      logoSrc: TRUST_LOGOS.edv,
      title: "Les Entreprises du Voyage",
      detail: "Organisation professionnelle du secteur du voyage",
    },
    {
      key: "atout-france",
      mark: "AF",
      logoSrc: TRUST_LOGOS.atoutFrance,
      title: "Atout France",
      detail: travelRegistration || "Immatriculation opérateur de voyages",
    },
    {
      key: "groupama",
      mark: "GROUPAMA",
      logoSrc: TRUST_LOGOS.groupama,
      title: "Garantie financière & responsabilité civile professionnelle",
      detail: groupamaDetail,
      className: "public-institutional-item-groupama",
    },
  ];

  return (
    <aside className="public-institutional-band" aria-label="Garanties et références professionnelles">
      <div className="public-site-container public-institutional-band-inner">
        <div className="public-institutional-band-heading">
          <span className="public-institutional-band-eyebrow">Voyagez en confiance</span>
          <strong>Un professionnel encadré et accompagné</strong>
        </div>

        <div className="public-institutional-band-items">
          {references.map((reference) => (
            <div
              className={`public-institutional-item ${reference.className || ""}`.trim()}
              key={reference.key}
            >
              <InstitutionalMark reference={reference} />
              <span className="public-institutional-copy">
                <strong>{reference.title}</strong>
                <small>{reference.detail}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export {
  MONDESCALE_TRUST_DEFAULTS,
  TRUST_LOGOS,
  compactLegalValue,
  guaranteeDetail,
  insuranceDetail,
  registrationDetail,
};
