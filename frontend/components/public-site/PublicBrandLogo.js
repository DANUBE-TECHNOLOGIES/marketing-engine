function normalizeAsset(asset) {
  if (!asset) return null;
  if (typeof asset === "string") return { publicUrl: asset };
  return asset;
}

function resolveLogo({ brand, brandAssets, site }) {
  const assets =
    brandAssets ||
    brand?.assets ||
    site?.brand?.assets ||
    site?.branding?.assets ||
    site?.brandProfile?.assets ||
    {};

  return normalizeAsset(
    assets.logoPrimary ||
    assets.logoLight ||
    assets.logoDark ||
    brand?.logo ||
    brand?.logoUrl ||
    site?.logoUrl ||
    site?.theme?.logoUrl ||
    null
  );
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
  const logo = resolveLogo({ brand, brandAssets, site });
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
      className={["public-brand-logo", className].filter(Boolean).join(" ")}
      src={logo.publicUrl}
      alt={logo.altText || logo.title || `Logo ${name}`}
      width={logo.width || DEFAULT_LOGO_WIDTH}
      height={logo.height || DEFAULT_LOGO_HEIGHT}
      loading={priority ? "eager" : "lazy"}
      fetchPriority="auto"
      decoding="async"
    />
  );
}

export { DEFAULT_LOGO_HEIGHT, DEFAULT_LOGO_WIDTH, normalizeAsset, resolveLogo };
