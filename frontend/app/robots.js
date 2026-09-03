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

        // Keep robots.txt deliberately narrow. Public mini-sites must remain
        // crawlable so Google can see their canonical/noindex directives.
        // Authentication/API surfaces are the only routes that should not be
        // crawled at all; editor/admin routes are handled with page-level
        // noindex metadata instead of accumulating "Blocked by robots.txt".
        disallow: [
          "/api/",
          "/login",
          "/actions/",
        ],
      },
    ],

    sitemap:
      `${PUBLIC_ORIGIN}/sitemap.xml`,

    host:
      PUBLIC_ORIGIN,
  };
}
