const MONDESCALE_FALLBACK_LOGO = "/brand/logo-mondescale.png";

function assetPublicUrl(asset) {
  if (!asset) return null;
  if (typeof asset === "string") return asset.trim() || null;
  if (Array.isArray(asset)) {
    for (const candidate of asset) {
      const value = assetPublicUrl(candidate);
      if (value) return value;
    }
    return null;
  }
  if (typeof asset !== "object") return null;
  return (
    asset.publicUrl ||
    asset.url ||
    asset.src ||
    asset.path ||
    asset.href ||
    asset.assetUrl ||
    asset.fileUrl ||
    asset.file?.publicUrl ||
    asset.file?.url ||
    null
  );
}

function normalizeAsset(asset) {
  if (!asset) return null;
  if (Array.isArray(asset)) {
    const preferred =
      asset.find((candidate) => {
        const type = String(candidate?.type || candidate?.kind || candidate?.role || "").toLowerCase();
        const variant = String(candidate?.variant || candidate?.name || candidate?.title || "").toLowerCase();
        return type.includes("logo") && /(primary|principal|main)/.test(variant);
      }) ||
      asset.find((candidate) => String(candidate?.type || candidate?.kind || candidate?.role || "").toLowerCase().includes("logo")) ||
      asset.find((candidate) => assetPublicUrl(candidate));
    return normalizeAsset(preferred);
  }
  if (typeof asset === "string") return { publicUrl: asset };
  if (typeof asset !== "object") return null;
  const publicUrl = assetPublicUrl(asset);
  return publicUrl ? { ...asset, publicUrl } : null;
}

function isMondescaleIdentity({ brand, site, agency }) {
  const identity = [
    brand?.values?.name,
    brand?.name,
    site?.name,
    site?.slug,
    agency?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return identity.includes("mondescale");
}

function resolveLogo({ brand, brandAssets, site, agency }) {
  // The public Mondescale header must never depend on a stale or broken
  // Brand Studio URL. The canonical network logo is shipped inside the
  // frontend image and is therefore guaranteed to exist at runtime.
  if (isMondescaleIdentity({ brand, site, agency })) {
    return {
      publicUrl: MONDESCALE_FALLBACK_LOGO,
      altText: "Logo Mondescale",
      width: 360,
      height: 144,
      __source: "bundled-canonical",
    };
  }

  const assetCollections = [
    brandAssets,
    brand?.assets,
    site?.brandAssets,
    site?.brand?.assets,
    site?.branding?.assets,
    site?.brandProfile?.assets,
  ].filter(Boolean);

  const explicitCandidates = [];
  for (const assets of assetCollections) {
    if (Array.isArray(assets)) {
      explicitCandidates.push(assets);
      continue;
    }
    explicitCandidates.push(
      assets.logoPrimary,
      assets.logo,
      assets.primaryLogo,
      assets.logoLight,
      assets.logoDark,
      assets.brandLogo,
    );
  }

  explicitCandidates.push(
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
  );

  for (const candidate of explicitCandidates) {
    const normalized = normalizeAsset(candidate);
    if (normalized?.publicUrl) return normalized;
  }

  return {
    publicUrl: MONDESCALE_FALLBACK_LOGO,
    altText: "Logo Mondescale",
  };
}

const DEFAULT_LOGO_WIDTH = 240;
const DEFAULT_LOGO_HEIGHT = 96;

export default function PublicBrandLogo({
  brand,
  brandAssets,
  site,
  agency,
  className = "",
  priority = false,
}) {
  const logo = resolveLogo({ brand, brandAssets, site, agency });
  if (!logo?.publicUrl) return null;

  const name =
    brand?.values?.name ||
    brand?.name ||
    site?.name ||
    agency?.name ||
    "Mondescale Voyages";

  return (
    <img
      data-public-brand-logo="1"
      data-public-brand-logo-source={logo.__source || "runtime"}
      className={["public-brand-logo", className].filter(Boolean).join(" ")}
      src={logo.publicUrl}
      alt={logo.altText || logo.title || `Logo ${name}`}
      width={logo.width || DEFAULT_LOGO_WIDTH}
      height={logo.height || DEFAULT_LOGO_HEIGHT}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}

export {
  DEFAULT_LOGO_HEIGHT,
  DEFAULT_LOGO_WIDTH,
  MONDESCALE_FALLBACK_LOGO,
  assetPublicUrl,
  isMondescaleIdentity,
  normalizeAsset,
  resolveLogo,
};
