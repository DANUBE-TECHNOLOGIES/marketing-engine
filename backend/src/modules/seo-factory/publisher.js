const fs = require("fs/promises");
const path = require("path");

class StaticPublisher {
  constructor(outputRoot) {
    this.outputRoot = outputRoot;
  }

  async publish({ siteSlug, baseUrl, renderedPages }) {
    const siteRoot = path.join(this.outputRoot, siteSlug);
    await fs.mkdir(siteRoot, { recursive: true });

    const urls = [];
    for (const item of renderedPages) {
      const targetDir = item.page.slug ? path.join(siteRoot, item.page.slug) : siteRoot;
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, "index.html"), item.html, "utf8");
      urls.push(item.page.slug ? `${baseUrl}/${item.page.slug}` : baseUrl);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
    const robots = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`;

    await fs.writeFile(path.join(siteRoot, "sitemap.xml"), sitemap, "utf8");
    await fs.writeFile(path.join(siteRoot, "robots.txt"), robots, "utf8");

    return { siteRoot, urls, files: renderedPages.length + 2 };
  }
}

module.exports = StaticPublisher;
