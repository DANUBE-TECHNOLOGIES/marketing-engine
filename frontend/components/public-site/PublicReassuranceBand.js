const PAYMENT_METHODS = Object.freeze([
  { id: "cb", label: "Carte bancaire" },
  { id: "visa", label: "VISA" },
  { id: "mastercard", label: "Mastercard" },
  { id: "amex", label: "American Express" },
]);

const TRUST_REFERENCES = Object.freeze([
  { id: "cediv", label: "CEDIV Travel", detail: "Réseau professionnel" },
  { id: "edv", label: "Les Entreprises du Voyage", detail: "Organisation professionnelle" },
  { id: "atout-france", label: "Atout France", detail: "Immatriculation tourisme" },
  { id: "groupama", label: "GROUPAMA", detail: "Garantie financière & RCP" },
]);

function BrandMark({ id, label }) {
  if (id === "cb") {
    return (
      <svg className="public-reassurance-logo" viewBox="0 0 96 54" role="img" aria-label="Carte Bancaire">
        <defs>
          <linearGradient id="cbGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#183c78" />
            <stop offset="1" stopColor="#0d8d90" />
          </linearGradient>
        </defs>
        <rect x="12" y="5" width="72" height="44" rx="8" fill="url(#cbGradient)" />
        <path d="M31 17h17a9 9 0 0 1 0 18H31a9 9 0 0 1 0-18Zm0 6a3 3 0 0 0 0 6h17a3 3 0 1 0 0-6H31Z" fill="#fff" />
        <path d="M54 17h13a8 8 0 0 1 6 13 8 8 0 0 1-6 5H54V17Zm6 6v6h7a3 3 0 1 0 0-6h-7Z" fill="#fff" />
      </svg>
    );
  }

  if (id === "visa") {
    return (
      <svg className="public-reassurance-logo" viewBox="0 0 110 54" role="img" aria-label="Visa">
        <text x="55" y="34" textAnchor="middle" fontSize="31" fontWeight="900" fontStyle="italic" fill="#1434CB">VISA</text>
      </svg>
    );
  }

  if (id === "mastercard") {
    return (
      <svg className="public-reassurance-logo" viewBox="0 0 110 54" role="img" aria-label="Mastercard">
        <circle cx="45" cy="24" r="17" fill="#EB001B" />
        <circle cx="65" cy="24" r="17" fill="#F79E1B" />
        <path d="M55 11.5a17 17 0 0 1 0 25 17 17 0 0 1 0-25Z" fill="#FF5F00" />
        <text x="55" y="51" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1f2937">mastercard</text>
      </svg>
    );
  }

  if (id === "amex") {
    return (
      <svg className="public-reassurance-logo" viewBox="0 0 110 54" role="img" aria-label="American Express">
        <rect x="24" y="4" width="62" height="46" rx="5" fill="#2E77BC" />
        <text x="55" y="24" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">AMERICAN</text>
        <text x="55" y="38" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">EXPRESS</text>
      </svg>
    );
  }

  if (id === "cediv") {
    return (
      <svg className="public-reassurance-logo public-reassurance-logo--wide" viewBox="0 0 150 54" role="img" aria-label="CEDIV Travel">
        <text x="75" y="25" textAnchor="middle" fontSize="24" fontWeight="800" fill="#1E77B7">CEDiV</text>
        <text x="75" y="41" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="3" fill="#65B7D4">TRAVEL</text>
      </svg>
    );
  }

  if (id === "edv") {
    return (
      <svg className="public-reassurance-logo public-reassurance-logo--wide" viewBox="0 0 170 54" role="img" aria-label="Les Entreprises du Voyage">
        <text x="76" y="20" textAnchor="middle" fontSize="10" fontWeight="800" fill="#173B71">LES ENTREPRISES</text>
        <text x="76" y="34" textAnchor="middle" fontSize="13" fontWeight="900" fill="#173B71">DU VOYAGE</text>
        <path d="M133 12l17 14-17 14 7-14-7-14Z" fill="#E5243F" />
      </svg>
    );
  }

  if (id === "atout-france") {
    return (
      <svg className="public-reassurance-logo public-reassurance-logo--wide" viewBox="0 0 160 54" role="img" aria-label="Atout France">
        <text x="80" y="19" textAnchor="middle" fontSize="15" fontWeight="900" letterSpacing="5" fill="#1D3557">ATOUT</text>
        <text x="80" y="37" textAnchor="middle" fontSize="15" fontWeight="900" letterSpacing="4" fill="#1D3557">FRANCE</text>
        <rect x="26" y="10" width="5" height="9" fill="#D82034" />
        <rect x="129" y="28" width="5" height="9" fill="#D82034" />
      </svg>
    );
  }

  if (id === "groupama") {
    return (
      <svg className="public-reassurance-logo public-reassurance-logo--wide" viewBox="0 0 150 54" role="img" aria-label="Groupama">
        <rect x="14" y="5" width="42" height="42" rx="5" fill="#007A3D" />
        <path d="M35 13c6 6 9 11 10 17-5-3-8-4-10-4s-5 1-10 4c1-6 4-11 10-17Zm0 14v13" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        <text x="98" y="32" textAnchor="middle" fontSize="18" fontWeight="800" fill="#007A3D">Groupama</text>
      </svg>
    );
  }

  return <span className="public-reassurance-logo-fallback">{label}</span>;
}

function Badge({ item, kind }) {
  return (
    <div className={`public-reassurance-badge public-reassurance-badge--${kind}`} data-reassurance-id={item.id}>
      <div className="public-reassurance-logo-slot">
        <BrandMark id={item.id} label={item.label} />
      </div>
      <div className="public-reassurance-badge-copy">
        <strong>{item.label}</strong>
        {item.detail ? <small>{item.detail}</small> : null}
      </div>
    </div>
  );
}

export default function PublicReassuranceBand() {
  return (
    <section className="public-reassurance" aria-label="Moyens de paiement et garanties professionnelles">
      <div className="public-site-container public-reassurance-inner">
        <div className="public-reassurance-group" aria-label="Moyens de paiement acceptés">
          <div className="public-reassurance-group-title">
            <div>
              <span className="public-reassurance-kicker">Paiement en agence</span>
              <strong>Moyens de paiement acceptés</strong>
              <small>Selon les conditions de votre dossier</small>
            </div>
          </div>
          <div className="public-reassurance-badges public-reassurance-badges--payments">
            {PAYMENT_METHODS.map((item) => <Badge key={item.id} item={item} kind="payment" />)}
          </div>
        </div>

        <div className="public-reassurance-group" aria-label="Garanties et affiliations professionnelles">
          <div className="public-reassurance-group-title">
            <div>
              <span className="public-reassurance-kicker">Votre agence en toute confiance</span>
              <strong>Garanties & affiliations</strong>
              <small>Les repères professionnels de Mondescale</small>
            </div>
          </div>
          <div className="public-reassurance-badges public-reassurance-badges--trust">
            {TRUST_REFERENCES.map((item) => <Badge key={item.id} item={item} kind="trust" />)}
          </div>
        </div>
      </div>
    </section>
  );
}

export { PAYMENT_METHODS, TRUST_REFERENCES };
