function normalizeAsset(
  asset
) {
  if (!asset) {
    return null;
  }

  if (
    typeof asset ===
    "string"
  ) {
    return {
      publicUrl:
        asset,
    };
  }

  return asset;
}

function resolveLogo({
  brand,
  brandAssets,
  site,
}) {
  const assets =
    brandAssets ||
    brand?.assets ||
    site?.brand?.assets ||
    site?.branding?.assets ||
    site?.brandProfile
      ?.assets ||
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

export default function PublicBrandLogo({
  brand,
  brandAssets,
  site,
  agency,
  className = "",
  priority = true,
}) {
  const logo =
    resolveLogo({
      brand,
      brandAssets,
      site,
    });

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
      className={
        [
          "public-brand-logo",
          className,
        ]
          .filter(Boolean)
          .join(" ")
      }
      src={
        logo.publicUrl
      }
      alt={
        logo.altText ||
        logo.title ||
        `Logo ${name}`
      }
      width={
        logo.width ||
        undefined
      }
      height={
        logo.height ||
        undefined
      }
      loading={
        priority
          ? "eager"
          : "lazy"
      }
      decoding="async"
    />
  );
}
