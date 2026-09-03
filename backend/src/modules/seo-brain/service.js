"use strict";

const { analyzePage, overlap } = require("./analyzers");
const { scoreSiteSignals } = require("./scorer");
const { findDestinationOpportunities } = require("./opportunities");
const { buildRecommendations } = require("./recommendations");
const { buildExecutionPlan } = require("./planner");

function grade(score) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

function priority(impact) {
  if (impact >= 14) return "critical";
  if (impact >= 10) return "high";
  if (impact >= 7) return "medium";
  return "low";
}

class SeoBrainService {
  constructor(repository) { this.repository = repository; }

  async health() {
    return { ok: true, version: "2.0.0", capability: "seo-brain-orchestrator", modes: ["page", "site", "portfolio", "agency-plan"] };
  }

  buildPagePlan(page, peers = []) {
    const analysis = analyzePage(page);
    const actions = analysis.checks.filter(c => !c.ok).map(c => ({
      type: c.key === "links" ? "internal_linking" : c.key === "faq" ? "content_generation" : "page_optimization",
      code: c.key,
      priority: priority(c.impact),
      estimatedGain: c.impact,
      title: c.message,
      targetPageId: page.id,
      targetPath: page.path,
      autoExecutable: ["title", "meta", "faq", "links"].includes(c.key)
    }));

    const related = peers
      .filter(p => p.id !== page.id)
      .map(p => ({ id: p.id, title: p.title, path: p.path, score: Math.round(overlap(`${page.title} ${page.h1}`, `${p.title} ${p.h1}`) * 100) }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (analysis.linkCount < 3 && related.length) {
      actions.push({
        type: "internal_linking",
        code: "link_targets",
        priority: "high",
        estimatedGain: Math.min(10, related.length * 2),
        title: `Relier la page à ${related.length} contenu(s) thématiquement proche(s).`,
        targetPageId: page.id,
        targets: related,
        autoExecutable: true
      });
    }

    return {
      page: { id: page.id, siteId: page.siteId, title: page.title, path: page.path, status: page.status },
      score: analysis.score,
      grade: grade(analysis.score),
      metrics: {
        words: analysis.wordCount,
        titleLength: analysis.titleLength,
        metaLength: analysis.metaLength,
        faqCount: analysis.faqCount,
        links: analysis.linkCount,
        sections: page.sections.length
      },
      actions: actions.sort((a, b) => b.estimatedGain - a.estimatedGain),
      estimatedPotentialScore: Math.min(100, analysis.score + actions.reduce((s, a) => s + (a.code === "link_targets" ? 0 : a.estimatedGain), 0))
    };
  }

  async analyzePage(id) {
    const page = await this.repository.findPage(id);
    if (!page) { const e = new Error("Page introuvable"); e.status = 404; throw e; }
    const site = await this.repository.findSite(page.siteId);
    return { generatedAt: new Date().toISOString(), ...this.buildPagePlan(page, site ? site.pages : []) };
  }

  async analyzeSite(id) {
    const site = await this.repository.findSite(id);
    if (!site) { const e = new Error("Mini-site introuvable"); e.status = 404; throw e; }
    const pages = site.pages.map(page => this.buildPagePlan(page, site.pages));
    const score = pages.length ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length) : 0;
    const actions = pages.flatMap(p => p.actions).sort((a, b) => b.estimatedGain - a.estimatedGain);
    const weakPages = pages.filter(p => p.score < 60).sort((a, b) => a.score - b.score).map(p => p.page);
    return {
      generatedAt: new Date().toISOString(),
      site: { id: site.id, name: site.name, slug: site.slug, status: site.status },
      score, grade: grade(score),
      summary: { pages: pages.length, weakPages: weakPages.length, actions: actions.length, estimatedGain: actions.reduce((s, a) => s + a.estimatedGain, 0) },
      priorities: actions.slice(0, 25),
      weakPages,
      pages
    };
  }

  async agencyPlan(id, options = {}) {
    const site = await this.repository.findSite(id);
    if (!site) { const e = new Error("Mini-site introuvable"); e.status = 404; throw e; }
    const campaigns = await this.repository.listCampaigns(id);
    const destinations = await this.repository.listDestinations();
    const pages = site.pages.map(page => this.buildPagePlan(page, site.pages));
    const baseScore = pages.length ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length) : 0;
    const siteReport = {
      site: { id: site.id, name: site.name, slug: site.slug, status: site.status },
      score: baseScore,
      priorities: pages.flatMap(p => p.actions).sort((a, b) => b.estimatedGain - a.estimatedGain),
      pages
    };
    const signals = scoreSiteSignals({ pages: site.pages, pagePlans: pages, campaigns, destinations });
    const opportunities = findDestinationOpportunities({ site, destinations, campaigns, limit: options.opportunityLimit });
    const recommendations = buildRecommendations({ siteReport, opportunities, campaigns });
    const executionPlan = buildExecutionPlan(recommendations, options);
    return {
      generatedAt: new Date().toISOString(),
      agency: site.agency ? { id: site.agency.id, name: site.agency.name, city: site.agency.city || null } : null,
      site: siteReport.site,
      score: signals.global,
      grade: grade(signals.global),
      dimensions: signals.dimensions,
      summary: { pages: site.pages.length, campaigns: campaigns.length, opportunities: opportunities.length, recommendations: recommendations.length },
      opportunities,
      recommendations,
      executionPlan
    };
  }

  async roadmap(options = {}) {
    const sites = await this.repository.listSites();
    const reports = sites.map(site => {
      const pages = site.pages.map(page => this.buildPagePlan(page, site.pages));
      const score = pages.length ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length) : 0;
      return { site: { id: site.id, name: site.name, slug: site.slug }, score, grade: grade(score), actions: pages.flatMap(p => p.actions) };
    });
    const limit = Math.max(1, Math.min(100, Number(options.limit || 30)));
    const actions = reports.flatMap(r => r.actions.map(a => ({ ...a, site: r.site }))).sort((a, b) => b.estimatedGain - a.estimatedGain).slice(0, limit);
    return { generatedAt: new Date().toISOString(), sites: reports.length, averageScore: reports.length ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length) : 0, actions, reports };
  }
}

module.exports = { SeoBrainService, grade, priority };
