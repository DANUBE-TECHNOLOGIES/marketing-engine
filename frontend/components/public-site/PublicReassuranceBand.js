const PAYMENT_METHODS = Object.freeze([
  {
    id: "cb",
    label: "Carte bancaire",
    logo: "https://d2csxpduxe849s.cloudfront.net/media/F44207E3-1DDE-4798-B0FCC94F6227FCB7/8642409E-0CD7-4EB5-A36E36D5BA3E9BE7/webimage-0D45FA73-E241-49FC-9F4CCF6FD9747B83.jpg",
  },
  {
    id: "visa",
    label: "VISA",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
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
  {
    id: "atout-france",
    label: "Atout France",
    detail: "Immatriculation tourisme",
    logo: "https://etc-corporate.org/uploads/2021/09/Picture4.png",
  },
  {
    id: "groupama",
    label: "GROUPAMA",
    detail: "Garantie financière & RCP",
    logo: "https://images.ctfassets.net/8tpbxzn2rg50/1lU4ekQZcrTPRSYfKd5JE9/122d8e3d4306829a71ede8d5f224341a/groupama-nouveau-logo.png",
  },
]);

function BrandMark({ item, kind }) {
  return (
    <div
      className={`public-reassurance-mark public-reassurance-mark--${kind}`}
      data-reassurance-id={item.id}
      title={item.label}
    >
      <div className="public-reassurance-logo-slot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="public-reassurance-logo"
          src={item.logo}
          alt={`Logo ${item.label}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
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

export default function PublicReassuranceBand() {
  return (
    <section
      className="public-reassurance"
      aria-label="Moyens de paiement et garanties professionnelles"
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
            <span className="public-reassurance-kicker">Votre agence en toute confiance</span>
            <div>
              <strong>Garanties & affiliations</strong>
              <small>Les repères professionnels de Mondescale</small>
            </div>
          </header>
          <BrandRow items={TRUST_REFERENCES} kind="trust" />
        </div>
      </div>
    </section>
  );
}

export { PAYMENT_METHODS, TRUST_REFERENCES };
