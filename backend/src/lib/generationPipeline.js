"use strict";

const { buildGenerationPlan, persistGenerationPlan } = require("./siteGenerator");
const { buildNavigation } = require("./siteNavigationBuilder");
const { buildSitemap, buildRobots } = require("./sitemapBuilder");

function step(name, status, startedAt, extra = {}) { return { name, status, durationMs: Date.now() - startedAt, ...extra }; }

async function runSiteGenerationPipeline({ prisma, siteSlug, publish = false, overwrite = false, dryRun = false, baseUrl = "http://localhost:3000" } = {}) {
  if (!prisma) throw new Error("Prisma is required");
  if (!siteSlug) throw new Error("siteSlug is required");
  const job = { id: `site-generation-${Date.now()}`, type: "site-generation", status: "running", startedAt: new Date().toISOString(), steps: [] };
  try {
    let started = Date.now();
    const site = await prisma.agencySite.findUnique({ where: { slug: siteSlug }, include: { agency: true } });
    if (!site) throw new Error(`Mini-site introuvable: ${siteSlug}`);
    job.steps.push(step("load-site", "success", started, { siteId: site.id }));

    started = Date.now();
    const destinations = await prisma.destination.findMany({
      where: { status: "published" },
      include: { countryRef: true, regionRef: true, cityRef: true, themes: { include: { theme: true }, orderBy: { weight: "desc" } }, travelTypes: { include: { travelType: true }, orderBy: { weight: "desc" } }, sections: { orderBy: { position: "asc" } }, faqs: { orderBy: { position: "asc" } }, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } },
      orderBy: { name: "asc" },
    });
    job.steps.push(step("load-destinations", "success", started, { count: destinations.length }));

    started = Date.now();
    const plan = buildGenerationPlan({ site, destinations, publish });
    job.steps.push(step("compose-pages", "success", started, { summary: plan.summary }));

    let persistence = { total: plan.pages.length, created: 0, updated: 0, skipped: plan.pages.length, failed: 0, dryRun: true };
    if (!dryRun) {
      started = Date.now();
      persistence = await persistGenerationPlan(prisma, site, plan, { overwrite });
      job.steps.push(step("persist-pages", persistence.failed ? "partial" : "success", started, { summary: { ...persistence, results: undefined } }));
    } else job.steps.push({ name: "persist-pages", status: "skipped", reason: "dry-run", durationMs: 0 });

    started = Date.now();
    const pages = dryRun ? plan.pages.map((page, index) => ({ ...page, id: `preview-${index}` })) : await prisma.agencySitePage.findMany({ where: { siteId: site.id }, orderBy: [{ displayOrder: "asc" }, { title: "asc" }] });
    const navigation = buildNavigation({ site, pages, includeDrafts: !publish || dryRun });
    job.steps.push(step("build-navigation", "success", started, { count: navigation.count }));

    started = Date.now();
    const sitemap = buildSitemap({ site, pages, baseUrl, includeDrafts: !publish || dryRun });
    const robots = buildRobots({ baseUrl, siteSlug: site.slug });
    job.steps.push(step("build-sitemap", "success", started, { count: sitemap.count }));

    job.status = persistence.failed ? "partial" : "success";
    job.finishedAt = new Date().toISOString();
    return { ok: true, job, site: { id: site.id, slug: site.slug, name: site.name }, plan: plan.summary, persistence, navigation, sitemap, robots };
  } catch (error) {
    job.status = "failed"; job.finishedAt = new Date().toISOString(); job.error = { name: error.name, message: error.message };
    return { ok: false, job };
  }
}

module.exports = { runSiteGenerationPipeline };
