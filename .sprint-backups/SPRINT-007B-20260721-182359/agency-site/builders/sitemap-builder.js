function xmlEscape(value) { return String(value).replace(/[<>&'\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
class SitemapBuilder {
  build(site, pages, origin = "https://www.mondescale.fr") {
    const cleanOrigin = origin.replace(/\/$/, "");
    const urls = pages.filter(p => p.status !== "archived").map(p => `  <url><loc>${xmlEscape(cleanOrigin + p.path)}</loc><changefreq>${p.pageType === "HOME" ? "weekly" : "monthly"}</changefreq><priority>${p.pageType === "HOME" ? "1.0" : "0.7"}</priority></url>`).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }
  robots(site, origin = "https://www.mondescale.fr") {
    const cleanOrigin = origin.replace(/\/$/, "");
    return `User-agent: *\nAllow: ${site.basePath}/\nSitemap: ${cleanOrigin}${site.basePath}/sitemap.xml\n`;
  }
}
module.exports = SitemapBuilder;
