function normalizeAsset(asset) {
  if (!asset) return null;

  if (typeof asset === "string") {
    return { publicUrl: asset };
  }

  if (Array.isArray(asset)) {
    const preferred = asset.find((item) => {
      const kind = String(item?.kind || item?.type || item?.key || item?.name || "").toLowerCase();
      return kind.includes("logo") && (kind.includes("primary") || kind.includes("principal"));
    }) || asset.find((item) => {
      const kind = String(item?.kind || item?.type || item?.key || item?.name || "").toLowerCase();
      return kind.includes("logo");
    });
    return normalizeAsset(preferred);
  }

  if (typeof asset === "object") {
    const publicUrl =
      asset.publicUrl ||
      asset.url ||
      asset.src ||
      asset.path ||
      asset.href ||
      asset.assetUrl ||
      asset.fileUrl ||
      null;

    return publicUrl ? { ...asset, publicUrl } : asset;
  }

  return null;
}

function resolveLogo({ brand, brandAssets, site }) {
  const assets =
    brandAssets ||
    brand?.assets ||
    site?.brand?.assets ||
    site?.branding?.assets ||
    site?.brandProfile?.assets ||
    {};

  const candidates = [
    assets?.logoPrimary,
    assets?.logo,
    assets?.primaryLogo,
    assets?.logoLight,
    assets?.logoDark,
    Array.isArray(assets) ? assets : null,
    brand?.logo,
    brand?.logoUrl,
    brand?.values?.logo,
    brand?.values?.logoUrl,
    site?.logo,
    site?.logoUrl,
    site?.theme?.logo,
    site?.theme?.logoUrl,
    site?.branding?.logo,
    site?.branding?.logoUrl,
    site?.brandProfile?.logo,
    site?.brandProfile?.logoUrl,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAsset(candidate);
    if (normalized?.publicUrl) return normalized;
  }

  return null;
}

export default function PublicBrandLogo({
  brand,
  brandAssets,
  site,
  agency,
  className = "",
  priority = true,
}) {
  const logo = resolveLogo({ brand, brandAssets, site });

  if (!logo?.publicUrl) {
    return null;
  }

  const name =
    brand?.values?.name ||
    brand?.name ||
    site?.name ||
    agency?.name ||
    "Mondescale Voyages";

  return (
    <img
      data-public-brand-logo="1"
      className={["public-brand-logo", className].filter(Boolean).join(" ")}
      src={logo.publicUrl}
      alt={logo.altText || logo.alt || logo.title || `Logo ${name}`}
      width={logo.width || undefined}
      height={logo.height || undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}

export { normalizeAsset, resolveLogo };
