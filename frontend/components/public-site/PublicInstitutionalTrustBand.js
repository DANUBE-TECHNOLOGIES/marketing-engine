const MONDESCALE_TRUST_DEFAULTS = Object.freeze({
  financialGuaranteeProvider: "GROUPAMA Assurance & Caution",
  professionalInsuranceProvider: "GROUPAMA Assurance & Caution",
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

export default function PublicInstitutionalTrustBand({ runtime }) {
  const legal = runtime?.runtime?.legal?.values || {};
  const travelRegistration = registrationDetail(legal);
  const financialGuarantee = guaranteeDetail(legal);
  const professionalInsurance = insuranceDetail(legal);

  const guaranteeProvider =
    financialGuarantee || MONDESCALE_TRUST_DEFAULTS.financialGuaranteeProvider;
  const insuranceProvider =
    professionalInsurance || MONDESCALE_TRUST_DEFAULTS.professionalInsuranceProvider;

  const references = [
    {
      key: "cediv",
      mark: "CEDIV",
      title: "CEDIV Travel",
      detail: "Réseau professionnel d’agences de voyages indépendantes",
    },
    {
      key: "edv",
      mark: "EDV",
      title: "Les Entreprises du Voyage",
      detail: "Organisation professionnelle du secteur du voyage",
    },
    {
      key: "atout-france",
      mark: "AF",
      title: "Atout France",
      detail: travelRegistration || "Immatriculation opérateur de voyages",
    },
    {
      key: "guarantee",
      mark: "GROUPAMA",
      title: "Garantie financière",
      detail: guaranteeProvider,
    },
    {
      key: "insurance",
      mark: "RCP",
      title: "Responsabilité civile professionnelle",
      detail: insuranceProvider,
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
            <div className="public-institutional-item" key={reference.key}>
              <span className="public-institutional-mark" aria-hidden="true">
                {reference.mark}
              </span>
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
  compactLegalValue,
  guaranteeDetail,
  insuranceDetail,
  registrationDetail,
};
