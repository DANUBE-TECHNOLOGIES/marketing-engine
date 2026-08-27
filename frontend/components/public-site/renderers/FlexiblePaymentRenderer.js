import TrackedConversionLink from "../TrackedConversionLink";
import { getSectionContent, getSectionTitle } from "./helpers";
import { resolvePublicCtaHref } from "./ctaLinks";

const ALLOWED_FEE_MODES = new Set(["unspecified", "with-fees", "without-fees"]);

function normalizeInstallmentCounts(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)].map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 2 && item <= 24).sort((a, b) => a - b);
}

function installmentLabel(counts) {
  const labels = counts.map((count) => `${count}x`);
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} ou ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} ou ${labels.at(-1)}`;
}

function safePaymentBody(content) {
  const counts = normalizeInstallmentCounts(content.installmentCounts);
  const rawFeeMode = String(content.feeMode || "unspecified").trim();
  const feeMode = ALLOWED_FEE_MODES.has(rawFeeMode) ? rawFeeMode : "unspecified";
  if (!counts.length) return content.body || content.text || "Votre agence peut étudier avec vous une solution de règlement échelonné adaptée à votre réservation.";
  const fees = feeMode === "without-fees" ? " sans frais" : "";
  return content.body || `Selon votre réservation et les conditions applicables, votre agence peut vous proposer un règlement en ${installmentLabel(counts)}${fees}.`;
}

export default function FlexiblePaymentRenderer({ section, site }) {
  const content = getSectionContent(section);
  const variant = content.variant === "compact" ? "compact" : "enriched";
  const ctaLabel = content.ctaLabel || content.primaryCta?.label || "Étudier mes possibilités de paiement";
  const ctaHref = content.primaryCta?.href || (content.ctaMode === "quote" ? "devis" : "contact");
  const installmentCounts = normalizeInstallmentCounts(content.installmentCounts);
  const feeMode = ALLOWED_FEE_MODES.has(content.feeMode) ? content.feeMode : "unspecified";
  const eyebrow = content.eyebrow || "Facilités de paiement";

  return <section className={`public-site-section public-site-cta public-site-flexible-payment public-site-flexible-payment--${variant}`} data-payment-variant={variant} aria-label="Facilités de paiement">
    <div className="public-site-container">
      <p className="public-site-eyebrow">{eyebrow}</p>
      <h2>{getSectionTitle(section, "Payez vos billets d’avion et vos voyages en plusieurs fois")}</h2>
      <p>{safePaymentBody(content)}</p>
      {installmentCounts.length ? <p className="public-site-flexible-payment-installments">Paiement possible en <strong>{installmentLabel(installmentCounts)}</strong>{feeMode === "without-fees" ? " sans frais" : ""}</p> : null}
      {content.disclaimer ? <small>{content.disclaimer}</small> : null}
      <div className="public-site-hero-actions">
        <TrackedConversionLink className="public-site-button" href={resolvePublicCtaHref(site, ctaHref, "contact")} tracking={{ conversionType: "flexible_payment_cta", siteId: site?.id, siteSlug: site?.slug, paymentVariant: variant, paymentProducts: content.products, paymentInstallments: installmentCounts, paymentFeeMode: feeMode, paymentCtaMode: content.ctaMode || "contact", ctaLabel }}>{ctaLabel}</TrackedConversionLink>
      </div>
    </div>
  </section>;
}

export { installmentLabel, normalizeInstallmentCounts, safePaymentBody };
