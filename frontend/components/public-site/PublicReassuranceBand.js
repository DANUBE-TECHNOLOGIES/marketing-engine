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

function Badge({ item, kind }) {
  return (
    <div className={`public-reassurance-badge public-reassurance-badge--${kind}`} data-reassurance-id={item.id}>
      <strong>{item.label}</strong>
      {item.detail ? <small>{item.detail}</small> : null}
    </div>
  );
}

export default function PublicReassuranceBand() {
  return (
    <section className="public-reassurance" aria-labelledby="public-reassurance-title">
      <div className="public-site-container public-reassurance-inner">
        <header className="public-reassurance-heading">
          <p className="public-reassurance-kicker">Réservation en agence</p>
          <h2 id="public-reassurance-title">Des paiements simples, un voyage encadré</h2>
          <p>
            Réglez votre voyage avec les principaux moyens de paiement et bénéficiez des garanties,
            affiliations et protections professionnelles de votre agence.
          </p>
        </header>

        <div className="public-reassurance-groups">
          <div className="public-reassurance-group" aria-label="Moyens de paiement acceptés">
            <div className="public-reassurance-group-title">
              <span aria-hidden="true">01</span>
              <div>
                <strong>Moyens de paiement</strong>
                <small>Selon les conditions de votre dossier</small>
              </div>
            </div>
            <div className="public-reassurance-badges public-reassurance-badges--payments">
              {PAYMENT_METHODS.map((item) => <Badge key={item.id} item={item} kind="payment" />)}
            </div>
          </div>

          <div className="public-reassurance-group" aria-label="Garanties et affiliations professionnelles">
            <div className="public-reassurance-group-title">
              <span aria-hidden="true">02</span>
              <div>
                <strong>Garanties & affiliations</strong>
                <small>Les repères professionnels de Mondescale</small>
              </div>
            </div>
            <div className="public-reassurance-badges public-reassurance-badges--trust">
              {TRUST_REFERENCES.map((item) => <Badge key={item.id} item={item} kind="trust" />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { PAYMENT_METHODS, TRUST_REFERENCES };
