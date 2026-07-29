import { absoluteUrl, getPublicSiteUrl } from "../lib/seo/site-url";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/agence/",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/seo-keywords-db/",
          "/dataforseo-preview/",
          "/_next/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getPublicSiteUrl(),
  };
}
