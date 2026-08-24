function compactLegalValue(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || null;
}

function includesProvider(value, provider) {
  return String(value || "").toLowerCase().includes(String(provider || "").toLowerCase());
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
  const groupamaGuaranteed = includesProvider(financialGuarantee, "groupama");

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
      detail: "Référence professionnelle du secteur du voyage",
    },
    {
      key: "atout-france",
      mark: "AF",
      title: "Atout France",
      detail: travelRegistration || "Immatriculation opérateur de voyages",
    },
    {
      key: "guarantee",
      mark: groupamaGuaranteed ? "GROUPAMA" : "GARANTIE",
      title: groupamaGuaranteed ? "Garantie financière Groupama" : "Garantie financière",
      detail: financialGuarantee || "Protection financière prévue par la réglementation",
    },
  ];

  if (professionalInsurance) {
    references.push({
      key: "insurance",
      mark: "RCP",
      title: "Responsabilité civile professionnelle",
      detail: professionalInsurance,
    });
  }

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
  compactLegalValue,
  guaranteeDetail,
  includesProvider,
  insuranceDetail,
  registrationDetail,
};
