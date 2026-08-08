export const BRAND_ASSET_KINDS = Object.freeze([
  "logo-primary",
  "logo-light",
  "logo-dark",
  "favicon",
  "hero",
  "cover",
  "open-graph",
  "gallery",
  "document",
]);

export const BRAND_ASSET_KIND_LABELS = Object.freeze({
  "logo-primary": "Logo principal",
  "logo-light": "Logo clair",
  "logo-dark": "Logo sombre",
  favicon: "Favicon",
  hero: "Image Hero",
  cover: "Image de couverture",
  "open-graph": "Image OpenGraph",
  gallery: "Galerie",
  document: "Document",
});

export const BRAND_PROFILE_ASSET_FIELDS = Object.freeze({
  logoPrimaryId: "logo-primary",
  logoLightId: "logo-light",
  logoDarkId: "logo-dark",
  faviconId: "favicon",
  heroDefaultId: "hero",
  openGraphId: "open-graph",
});

export const BRAND_PROFILE_COLOR_FIELDS = Object.freeze([
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
]);

export const LEGAL_CONTENT_FIELDS = Object.freeze([
  "legalNoticeContent",
  "privacyPolicyContent",
  "cookiePolicyContent",
  "termsContent",
]);

export const MAX_BRAND_ASSET_SIZE =
  10 * 1024 * 1024;

export const ALLOWED_BRAND_ASSET_MIME_TYPES =
  Object.freeze([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
  ]);
