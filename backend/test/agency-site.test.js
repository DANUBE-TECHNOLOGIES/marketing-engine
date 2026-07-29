const test = require("node:test");
const assert = require("node:assert/strict");
const SiteBuilder = require("../src/modules/agency-site/builders/site-builder");
const NavigationBuilder = require("../src/modules/agency-site/builders/navigation-builder");
const SitemapBuilder = require("../src/modules/agency-site/builders/sitemap-builder");
const { slugify } = require("../src/modules/agency-site/utils/slug");

test("slugify gère accents et apostrophes", () => assert.equal(slugify("Mondescale Ozoir-la-Ferrière"), "mondescale-ozoir-la-ferriere"));
test("le builder génère les 12 pages obligatoires", () => { const r = new SiteBuilder().build({id:5,name:"Mondescale Ozoir",city:"Ozoir-la-Ferrière"}); assert.equal(r.pages.length,12); assert.equal(new Set(r.pages.map(p=>p.path)).size,12); assert.equal(r.pages[0].path,"/agence/mondescale-ozoir"); });
test("chaque page possède les fondamentaux SEO", () => { const r = new SiteBuilder().build({id:5,name:"Mondescale Ozoir",city:"Ozoir-la-Ferrière"}); for (const p of r.pages) { assert.ok(p.seoTitle); assert.ok(p.metaDescription); assert.ok(p.h1); assert.ok(p.schemaType); } });
test("navigation principale, secondaire et footer", () => { const built = new SiteBuilder().build({id:5,name:"Mondescale Ozoir",city:"Ozoir"}); const pages=built.pages.map(p=>({...p,displayOrder:p.order,menuLocation:p.menu})); const n=new NavigationBuilder().build(pages); assert.equal(n.main.length,7); assert.equal(n.secondary.length,3); assert.equal(n.footer.length,2); });
test("sitemap et robots valides", () => { const built = new SiteBuilder().build({id:5,name:"Mondescale Ozoir",city:"Ozoir"}); const xml=new SitemapBuilder().build(built.site,built.pages); assert.match(xml,/sitemaps\.org/); assert.match(xml,/mondescale-ozoir/); assert.match(new SitemapBuilder().robots(built.site),/User-agent: \*/); });
