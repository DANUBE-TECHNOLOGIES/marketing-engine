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
