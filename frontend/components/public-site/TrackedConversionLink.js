"use client";

function compactArray(value) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    : [];
}

export function buildConversionPayload({
  conversionType,
  siteId,
  siteSlug,
  paymentVariant,
  paymentProducts,
  paymentInstallments,
  paymentFeeMode,
  ctaLabel,
} = {}) {
  return {
    event: "mondescale_conversion",
    conversion_type: String(conversionType || "").trim(),
    site_id: String(siteId || "").trim(),
    site_slug: String(siteSlug || "").trim(),
    payment_variant: String(paymentVariant || "").trim(),
    payment_products: compactArray(paymentProducts),
    payment_installments: compactArray(paymentInstallments),
    payment_fee_mode: String(paymentFeeMode || "unspecified").trim() || "unspecified",
    cta_label: String(ctaLabel || "").trim(),
  };
}

export function trackConversion(payload) {
  if (typeof window === "undefined") return;

  try {
    window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
    window.dataLayer.push(payload);
  } catch {
    // Analytics must never block public navigation.
  }

  try {
    window.dispatchEvent(
      new CustomEvent("mondescale:conversion", {
        detail: payload,
      })
    );
  } catch {
    // Custom event support is optional and must remain non-blocking.
  }
}

export default function TrackedConversionLink({
  href,
  className,
  children,
  tracking,
  ...props
}) {
  const payload = buildConversionPayload(tracking);

  function handleClick() {
    trackConversion(payload);
  }

  return (
    <a
      {...props}
      className={className}
      href={href}
      onClick={handleClick}
      data-conversion-type={payload.conversion_type || undefined}
    >
      {children}
    </a>
  );
}
