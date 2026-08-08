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
