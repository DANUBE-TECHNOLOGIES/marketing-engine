const PUBLIC_ORIGIN =
  String(
    process.env
      .NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
  ).replace(
    /\/+$/g,
    ""
  );

export default function robots() {
  return {
    rules: [
      {
        userAgent:
          "*",

        allow: [
          "/",
          "/agence/",
        ],

        disallow: [
          "/api/",
          "/website-builder/",
          "/admin/",
          "/admin-network/",
          "/access-check/",
          "/access-denied/",
          "/actions/",
          "/agencies/",
          "/agency-directory/",
          "/agency-directory-completion/",
          "/agency-directory-fix-plan/",
          "/agency-directory-guide/",
          "/agency-directory-missing/",
          "/agency-directory-quality/",
          "/agency-directory-ready/",
          "/login",
          "/sites/",
        ],
      },
    ],

    sitemap:
      `${PUBLIC_ORIGIN}/sitemap.xml`,

    host:
      PUBLIC_ORIGIN,
  };
}
