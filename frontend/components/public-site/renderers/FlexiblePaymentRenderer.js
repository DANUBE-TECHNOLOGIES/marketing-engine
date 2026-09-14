import TrackedConversionLink from "../TrackedConversionLink";
import { getSectionContent, getSectionTitle } from "./helpers";
import { resolvePublicCtaHref } from "./ctaLinks";

const ALLOWED_FEE_MODES = new Set(["unspecified", "with-fees", "without-fees"]);

function normalizeInstallmentCounts(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)]
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 2 && item <= 24)
    .sort((a, b) => a - b);
}

function installmentLabel(counts) {
  const labels = counts.map((count) => `${count}x`);
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} ou ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} ou ${labels.at(-1)}`;
}

function normalizedFeeMode(value) {
  const mode = String(value || "unspecified").trim();
  return ALLOWED_FEE_MODES.has(mode) ? mode : "unspecified";
}

function configuredPaymentBody(content) {
  return String(content.body || content.text || content.description || "").trim() || null;
}

function factualInstallmentText(content) {
  const counts = normalizeInstallmentCounts(content.installmentCounts);
  if (!counts.length) return null;
  const feeMode = normalizedFeeMode(content.feeMode);
  const suffix = feeMode === "without-fees" ? " sans frais" : feeMode === "with-fees" ? " avec frais" : "";
  return `Modalités publiées : règlement en ${installmentLabel(counts)}${suffix}.`;
}

function configuredPaymentAction(content) {
  const cta = content.primaryCta && typeof content.primaryCta === "object" ? content.primaryCta : null;
  const label = String(content.ctaLabel || cta?.label || "").trim();
  const href = String(cta?.href || content.ctaHref || "").trim();
  return label && href ? { label, href } : null;
}

export default function FlexiblePaymentRenderer({ section, site }) {
  const content = getSectionContent(section);
  const variant = content.variant === "compact" ? "compact" : "enriched";
  const installmentCounts = normalizeInstallmentCounts(content.installmentCounts);
  const feeMode = normalizedFeeMode(content.feeMode);
  const body = configuredPaymentBody(content);
  const installmentText = factualInstallmentText(content);
  const action = configuredPaymentAction(content);
  const actionHref = action ? resolvePublicCtaHref(site, action.href, "") : null;
  const title = getSectionTitle(section, installmentCounts.length ? "Modalités de paiement publiées" : null);
  const eyebrow = String(content.eyebrow || "").trim() || null;

  if (!title && !body && !installmentText && !content.disclaimer && !actionHref) return null;

  return (
    <section
      className={`public-site-section public-site-cta public-site-flexible-payment public-site-flexible-payment--${variant}`}
      data-payment-variant={variant}
      aria-label={title || "Informations de paiement publiées"}
    >
      <div className="public-site-container">
        {eyebrow ? <p className="public-site-eyebrow">{eyebrow}</p> : null}
        {title ? <h2>{title}</h2> : null}
        {body ? <p>{body}</p> : null}
        {installmentText ? (
          <p className="public-site-flexible-payment-installments">{installmentText}</p>
        ) : null}
        {content.disclaimer ? <small>{content.disclaimer}</small> : null}

        {action && actionHref ? (
          <div className="public-site-hero-actions">
            <TrackedConversionLink
              className="public-site-button"
              href={actionHref}
              tracking={{
                conversionType: "flexible_payment_cta",
                siteId: site?.id,
                siteSlug: site?.slug,
                paymentVariant: variant,
                paymentProducts: content.products,
                paymentInstallments: installmentCounts,
                paymentFeeMode: feeMode,
                paymentCtaMode: content.ctaMode || null,
                ctaLabel: action.label,
              }}
            >
              {action.label}
            </TrackedConversionLink>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  configuredPaymentAction,
  configuredPaymentBody,
  factualInstallmentText,
  installmentLabel,
  normalizeInstallmentCounts,
  normalizedFeeMode,
};
