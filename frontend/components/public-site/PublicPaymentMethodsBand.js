const PAYMENT_METHODS = Object.freeze([
  {
    key: "cb",
    label: "Carte bancaire",
    mark: "CB",
    className: "payment-mark-cb",
    logoSrc: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_GIE_CB_(2024).svg",
  },
  {
    key: "visa",
    label: "Visa",
    mark: "VISA",
    className: "payment-mark-visa",
    logoSrc: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Visa_2021.svg",
  },
  {
    key: "mastercard",
    label: "Mastercard",
    mark: "MC",
    className: "payment-mark-mastercard",
    logoSrc: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mastercard_2019_logo.svg",
  },
  {
    key: "amex",
    label: "American Express",
    mark: "AMEX",
    className: "payment-mark-amex",
    logoSrc: "https://commons.wikimedia.org/wiki/Special:Redirect/file/American_Express_logo_(2018).svg",
  },
  { key: "transfer", label: "Virement bancaire", mark: "Virement", className: "payment-mark-neutral" },
  { key: "cheque", label: "Chèque", mark: "Chèque", className: "payment-mark-neutral" },
  {
    key: "ancv",
    label: "Chèques-Vacances ANCV",
    mark: "ANCV",
    className: "payment-mark-ancv",
    logoSrc: "https://www.chateau-montreal.com/uploads/images/theme/ANCV.jpg",
  },
]);

const INSTALLMENT_COUNTS = Object.freeze([3, 4, 10]);

function PaymentMark({ method }) {
  return (
    <span className={`public-payment-mark ${method.logoSrc ? "public-payment-logo-wrap" : ""} ${method.className}`} aria-hidden="true">
      <span className="public-payment-mark-fallback">{method.mark}</span>
      {method.logoSrc ? (
        // The textual mark remains underneath as a resilient fallback if a remote logo cannot load.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="public-payment-logo"
          src={method.logoSrc}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </span>
  );
}

export default function PublicPaymentMethodsBand() {
  return (
    <section className="public-payment-band" aria-labelledby="public-payment-band-title">
      <div className="public-site-container public-payment-band-inner">
        <div className="public-payment-band-heading">
          <span className="public-payment-band-eyebrow">Solutions de paiement</span>
          <h2 id="public-payment-band-title">Réglez votre voyage comme vous le souhaitez</h2>
          <p>
            Plusieurs moyens de règlement sont acceptés en agence, avec des
            possibilités de paiement en plusieurs fois selon votre dossier et
            votre voyage.
          </p>
        </div>

        <div className="public-payment-methods" aria-label="Moyens de paiement acceptés">
          {PAYMENT_METHODS.map((method) => (
            <div className="public-payment-method" key={method.key}>
              <PaymentMark method={method} />
              <span>{method.label}</span>
            </div>
          ))}

          <div className="public-payment-method public-payment-installments">
            <span className="public-payment-installment-marks" aria-hidden="true">
              {INSTALLMENT_COUNTS.map((count) => <strong key={count}>{count}x</strong>)}
            </span>
            <span>Paiement en plusieurs fois</span>
          </div>
        </div>

        <p className="public-payment-band-note">
          Paiement en 3x, 4x ou 10x selon les conditions applicables à votre
          dossier et aux prestations réservées. Votre conseiller vous précise
          les modalités avant validation.
        </p>
      </div>
    </section>
  );
}

export { INSTALLMENT_COUNTS, PAYMENT_METHODS, PaymentMark };
