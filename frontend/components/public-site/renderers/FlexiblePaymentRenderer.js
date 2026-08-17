import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";

const ALLOWED_FEE_MODES = new Set([
  "unspecified",
  "with-fees",
  "without-fees",
]);

function normalizeInstallmentCounts(value) {
  if (!Array.isArray(value)) return [];

  return [...new Set(value)]
    .map((item) => Number(item))
    .filter(
      (item) =>
        Number.isInteger(item) &&
        item >= 2 &&
        item <= 24
    )
    .sort((a, b) => a - b);
}

function installmentLabel(counts) {
  const labels = counts.map((count) => `${count}x`);

  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) {
    return `${labels[0]} ou ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")} ou ${labels.at(-1)}`;
}

function safePaymentBody(content) {
  const counts = normalizeInstallmentCounts(
    content.installmentCounts
  );
  const rawFeeMode = String(
    content.feeMode || "unspecified"
  ).trim();
  const feeMode = ALLOWED_FEE_MODES.has(rawFeeMode)
    ? rawFeeMode
    : "unspecified";

  if (!counts.length) {
    return (
      content.body ||
      content.text ||
      "Selon votre réservation et les possibilités proposées par votre agence, un règlement échelonné peut être disponible."
    );
  }

  const fees =
    feeMode === "without-fees"
      ? " sans frais"
      : "";

  return `Selon votre réservation et les conditions proposées par votre agence, un règlement en ${installmentLabel(
    counts
  )}${fees} peut être disponible.`;
}

export default function FlexiblePaymentRenderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const variant =
    content.variant === "compact"
      ? "compact"
      : "enriched";
  const ctaLabel =
    content.ctaLabel ||
    content.primaryCta?.label ||
    "Contacter mon agence";
  const ctaHref =
    content.primaryCta?.href || "contact";

  return (
    <section
      className="public-site-section public-site-cta public-site-flexible-payment"
      data-payment-variant={variant}
    >
      <div className="public-site-container">
        {variant === "enriched" ? (
          <p className="public-site-eyebrow">
            Souplesse de règlement
          </p>
        ) : null}

        <h2>
          {getSectionTitle(
            section,
            "Vos billets d’avion, payables en plusieurs fois"
          )}
        </h2>

        <p>{safePaymentBody(content)}</p>

        {content.disclaimer ? (
          <small>{content.disclaimer}</small>
        ) : null}

        <div className="public-site-hero-actions">
          <a
            className="public-site-button"
            href={resolvePublicCtaHref(
              site,
              ctaHref,
              "contact"
            )}
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

export {
  installmentLabel,
  normalizeInstallmentCounts,
  safePaymentBody,
};
