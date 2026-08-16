"use strict";

const { networkSimilarityReport } = require("./similarity-guard");
const { preRolloutQualityReport } = require("./pre-rollout-quality");
const { localPageProfile, stableVariant } = require("./local-differentiator");

const INSTALLED = Symbol.for("mse-25.30.editorial-hardening-installed");
const DEFAULT_EXCLUDED_SITE_SLUGS = Object.freeze(["tui-store-melun"]);
const DIFFERENTIATED_PAGE_KINDS = new Set(["services", "engagements", "destinations"]);
const VOWEL_INITIAL = /^[aeiouyhàâäéèêëîïôöùûüÿ]/i;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function configuredExcludedSiteSlugs(value) {
  let source = value;
  if (source === undefined) {
    source = Object.prototype.hasOwnProperty.call(process.env, "MSE_25_30_EXCLUDED_SITE_SLUGS")
      ? process.env.MSE_25_30_EXCLUDED_SITE_SLUGS
      : DEFAULT_EXCLUDED_SITE_SLUGS;
  }
  const values = Array.isArray(source) ? source : String(source || "").split(",");
  return [...new Set(values.map((item) => clean(item).toLocaleLowerCase("fr-FR")).filter(Boolean))];
}

function naturalizeFrench(value, city) {
  if (typeof value !== "string") return value;
  const locality = clean(city);
  if (!locality) return value;

  const escapedCity = escapeRegex(locality);
  let next = value;

  if (VOWEL_INITIAL.test(locality)) {
    next = next.replace(new RegExp(`\\bde\\s+${escapedCity}\\b`, "gi"), `d’${locality}`);
  }

  const brandedCity = new RegExp(
    `\\b((?:TUI\\s+STORE|Ambassade\\s+FRAM\\s+-\\s+Mondescale|Mondescale)\\s+${escapedCity})\\s+à\\s+${escapedCity}\\b`,
    "gi"
  );
  next = next.replace(brandedCity, "$1");

  return next;
}

function transformStrings(value, transform, replacements = new Map()) {
  if (typeof value === "string") {
    const next = transform(value);
    if (next !== value) replacements.set(value, next);
    return next;
  }
  if (Array.isArray(value)) return value.map((item) => transformStrings(item, transform, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, transformStrings(item, transform, replacements)])
    );
  }
  return value;
}

function replaceKnownStrings(value, replacements) {
  if (typeof value === "string") return replacements.get(value) || value;
  if (Array.isArray(value)) return value.map((item) => replaceKnownStrings(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceKnownStrings(item, replacements)])
    );
  }
  return value;
}

function naturalizeAgencyPlan(plan = {}) {
  const city = clean(plan.city);
  if (!city) return plan;

  const transform = (value) => naturalizeFrench(value, city);
  const replacements = new Map();
  const pages = (plan.pages || []).map((page) => {
    const changes = (page.changes || []).map((change) => ({
      ...change,
      next: transformStrings(change.next, transform, replacements),
    }));
    const projectedPageMetadata = page.projectedPageMetadata
      ? transformStrings(page.projectedPageMetadata, transform, replacements)
      : page.projectedPageMetadata;
    const pageRecord = page.page && typeof page.page === "object"
      ? {
          ...page.page,
          seoTitle: transform(page.page.seoTitle),
          metaDescription: transform(page.page.metaDescription),
        }
      : page.page;
    return {
      ...page,
      page: pageRecord,
      projectedPageMetadata,
      changes,
      optimizedBlocks: replaceKnownStrings(page.optimizedBlocks || [], replacements),
    };
  });

  return { ...plan, pages };
}

function nextPosition(blocks = []) {
  return blocks.reduce((max, block, index) => {
    const value = Number(block?.position ?? block?.displayOrder ?? index);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, -1) + 1;
}

function hasDifferentiationBlock(page = {}) {
  return (page.optimizedBlocks || []).some((block) => block?.seo?.purpose === "local-agency-differentiation")
    || (page.changes || []).some((change) => change?.purpose === "local-agency-differentiation");
}

function differentiationContent({ siteSlug, city, page } = {}) {
  const locality = clean(city);
  if (!locality) return null;
  const profile = localPageProfile(page?.page || page || {});
  if (!DIFFERENTIATED_PAGE_KINDS.has(profile.key)) return null;

  const variants = {
    services: [
      `À ${locality}, l’accompagnement commence par l’analyse du projet avant le choix des prestations. L’équipe vérifie les priorités, les contraintes de dates et les services réellement utiles afin de construire un dossier cohérent plutôt qu’une succession d’options standard.`,
      `Le rôle de l’agence à ${locality} est aussi de rendre le parcours plus lisible : comparer les solutions, expliquer les conditions importantes et organiser les différentes étapes du dossier. Le voyageur conserve ainsi un point de contact identifié pour ses arbitrages.`,
      `Depuis ${locality}, les services sont mobilisés selon la réalité de chaque départ. Transport, hébergement, assurances, formalités ou prestations complémentaires sont examinés ensemble pour éviter les choix isolés qui fragiliseraient l’organisation du voyage.`,
      `À ${locality}, l’équipe privilégie une préparation structurée : comprendre l’objectif du voyage, vérifier les contraintes puis sélectionner les prestations adaptées. Cette méthode permet de concentrer le conseil sur ce qui apporte réellement de la valeur au dossier.`,
      `L’agence de ${locality} articule ses services autour d’un suivi continu du projet. Les options sont comparées au regard du budget et des attentes, puis les informations utiles sont reprises avec le voyageur jusqu’aux dernières étapes avant le départ.`,
      `Pour un projet préparé à ${locality}, chaque service doit répondre à un besoin identifié. L’équipe met donc en perspective les différentes prestations, leurs conditions et leur utilité dans l’itinéraire afin de conserver un ensemble compréhensible et maîtrisé.`
    ],
    engagements: [
      `À ${locality}, la qualité du conseil repose sur des engagements concrets : écouter avant de proposer, expliquer les choix importants et rester disponible lorsque le dossier évolue. Cette continuité donne au voyageur un interlocuteur clairement identifié.`,
      `L’engagement de l’équipe à ${locality} ne s’arrête pas à la réservation. Il consiste aussi à rendre les décisions compréhensibles, à signaler les points de vigilance et à assurer une continuité de suivi lorsque des informations doivent être précisées.`,
      `À ${locality}, l’accompagnement est fondé sur la clarté des échanges et la connaissance du projet. L’équipe prend le temps de confronter les envies aux contraintes réelles afin que les choix retenus restent cohérents jusqu’au départ.`,
      `La relation avec l’agence de ${locality} s’appuie sur un principe simple : un conseil utile doit rester compréhensible et suivi. Les propositions sont donc expliquées, les priorités hiérarchisées et les étapes importantes reprises avec le voyageur.`,
      `À ${locality}, les engagements se traduisent par une préparation attentive du dossier et une information transparente sur les solutions étudiées. Le voyageur sait ainsi pourquoi une option est recommandée et à qui s’adresser si son projet change.`,
      `L’équipe de ${locality} privilégie une relation durable plutôt qu’un acte de réservation isolé. Écoute, comparaison et suivi permettent de conserver le contexte du projet et d’apporter une réponse plus pertinente à chaque étape.`
    ],
    destinations: [
      `À ${locality}, le choix d’une destination part d’abord de la façon dont le voyage doit être vécu. Saison, durée, rythme, budget et expériences recherchées sont comparés avant de retenir un lieu simplement parce qu’il est populaire.`,
      `Depuis ${locality}, l’équipe utilise les destinations comme point de départ d’un échange plus large. La période, les temps de transport, le type d’hébergement et le rythme souhaité permettent ensuite d’affiner la recommandation.`,
      `Pour choisir une destination à ${locality}, l’agence met en perspective les envies avec les conditions concrètes du voyage. L’objectif est d’identifier le bon compromis entre période de départ, durée disponible, budget et niveau de prestations.`,
      `À ${locality}, une destination n’est pas sélectionnée indépendamment du projet. L’équipe compare les saisons, les possibilités de transport et les expériences accessibles afin de proposer un cadre de voyage adapté aux priorités exprimées.`,
      `L’agence de ${locality} aborde le choix de la destination par les usages : se reposer, découvrir, voyager en famille, parcourir plusieurs étapes ou privilégier une expérience précise. Cette lecture aide à écarter les options séduisantes mais mal adaptées.`,
      `Depuis ${locality}, les idées de destinations sont confrontées aux contraintes réelles avant toute recommandation. Temps disponible, météo saisonnière, budget et attentes sur place servent à transformer une envie initiale en projet réalisable.`
    ],
  };

  const choices = variants[profile.key];
  const variant = stableVariant(`${siteSlug || ""}|${locality}|${profile.key}`, choices.length);
  const titles = {
    services: `Un accompagnement organisé depuis ${locality}`,
    engagements: `Une relation de conseil suivie à ${locality}`,
    destinations: `Choisir une destination avec votre agence de ${locality}`,
  };
  return {
    title: titles[profile.key],
    html: `<p>${escapeHtml(choices[variant])}</p>`,
    alignment: "left",
  };
}

function strengthenAgencyDifferentiation(plan = {}) {
  const pages = (plan.pages || []).map((page) => {
    if (hasDifferentiationBlock(page)) return page;
    const content = differentiationContent({ siteSlug: plan.siteSlug, city: plan.city, page });
    if (!content) return page;

    const blocks = [...(page.optimizedBlocks || [])];
    blocks.push({
      type: "rich_text",
      status: page.published === true ? "published" : "draft",
      position: nextPosition(blocks),
      settings: {},
      seo: { generatedBy: "mse-25.30", purpose: "local-agency-differentiation" },
      content,
    });
    const changes = [...(page.changes || []), {
      blockId: null,
      blockType: "rich-text",
      field: "block",
      previous: null,
      next: content,
      generated: true,
      purpose: "local-agency-differentiation",
    }];
    return { ...page, optimizedBlocks: blocks, changes, changed: true };
  });

  return {
    ...plan,
    pages,
    summary: {
      ...(plan.summary || {}),
      pagesChanged: pages.filter((page) => page.changed).length,
      blockFieldsChanged: pages.reduce((sum, page) => sum + (page.changes || []).length, 0),
    },
  };
}

function hardenQualityReport(report = {}) {
  const emptyWarnings = (report.warnings || []).filter(
    (issue) => issue?.code === "THIN_CONTENT" && Number(issue?.wordCount) === 0
  );
  if (!emptyWarnings.length) return report;

  const warnings = (report.warnings || []).filter(
    (issue) => !(issue?.code === "THIN_CONTENT" && Number(issue?.wordCount) === 0)
  );
  const existing = new Set((report.blocking || []).map((issue) => `${issue.siteSlug}|${issue.slug}|${issue.code}`));
  const promoted = emptyWarnings
    .map((issue) => ({ ...issue, code: "EMPTY_INDEXABLE_CONTENT", severity: "blocking" }))
    .filter((issue) => !existing.has(`${issue.siteSlug}|${issue.slug}|${issue.code}`));
  const blocking = [...(report.blocking || []), ...promoted];

  return {
    ...report,
    blockingCount: blocking.length,
    warningCount: warnings.length,
    blocked: blocking.length > 0,
    blocking,
    warnings,
  };
}

function filterSitemapReadiness(readiness = {}, excludedSiteSlugs = []) {
  if (!excludedSiteSlugs.length) return readiness;
  const excluded = new Set(excludedSiteSlugs.map((slug) => clean(slug).toLocaleLowerCase("fr-FR")));
  const keep = (site) => !excluded.has(clean(site?.siteSlug || site?.slug).toLocaleLowerCase("fr-FR"));
  const sites = Array.isArray(readiness.sites) ? readiness.sites.filter(keep) : [];
  const notReady = sites.filter((site) => site?.readyToSubmit !== true);
  const current = readiness.current && typeof readiness.current === "object"
    ? {
        ...readiness.current,
        notReady: Array.isArray(readiness.current.notReady) ? readiness.current.notReady.filter(keep) : readiness.current.notReady,
      }
    : readiness.current;
  if (current && Array.isArray(current.notReady)) {
    current.notReadyCount = current.notReady.length;
    current.blocked = current.notReady.length > 0;
  }
  return {
    ...readiness,
    current,
    sites,
    notReady,
    notReadyCount: notReady.length,
    blocked: notReady.length > 0,
  };
}

function recomputeSummary(plan, similarity, quality, excludedAgencies) {
  const plans = plan.plans || [];
  const sitemapReadiness = plan.sitemapReadiness || { blocked: false, notReadyCount: 0 };
  return {
    ...(plan.summary || {}),
    agenciesProcessed: plans.length,
    agenciesExcluded: excludedAgencies.length,
    pagesProcessed: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesProcessed || 0), 0),
    pagesChanged: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesChanged || 0), 0),
    pagesExcludedNoindex: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesExcludedNoindex || 0), 0),
    pagesExcludedManagedRoute: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesExcludedManagedRoute || 0), 0),
    similarityConflicts: similarity.conflictCount,
    similarityBlockingConflicts: similarity.blockingConflictCount,
    similarityAdvisoryConflicts: similarity.advisoryConflictCount,
    qualityBlockingIssues: quality.blockingCount,
    qualityWarnings: quality.warningCount,
    sitemapSitesNotReady: Number(sitemapReadiness.notReadyCount || 0),
    rolloutBlocked: Boolean(similarity.blocked || quality.blocked || sitemapReadiness.blocked),
  };
}

function installEditorialHardening(ServiceClass) {
  if (!ServiceClass?.prototype || ServiceClass.prototype[INSTALLED]) return ServiceClass;
  const prototype = ServiceClass.prototype;
  const originalBuildAgency = prototype.buildAgencyContentOptimization;
  const originalBuildNetwork = prototype.buildNetworkContentOptimization;
  const originalHealth = prototype.health;

  if (typeof originalBuildAgency !== "function" || typeof originalBuildNetwork !== "function") {
    throw new Error("MSE-25.30 editorial hardening requires content optimization methods.");
  }

  prototype.buildAgencyContentOptimization = async function buildAgencyContentOptimizationHardened(options = {}) {
    const plan = await originalBuildAgency.call(this, options);
    return strengthenAgencyDifferentiation(naturalizeAgencyPlan(plan));
  };

  prototype.buildNetworkContentOptimization = async function buildNetworkContentOptimizationHardened(options = {}) {
    const plan = await originalBuildNetwork.call(this, options);
    const hardenedPlans = (plan.plans || []).map((item) => strengthenAgencyDifferentiation(naturalizeAgencyPlan(item)));
    const excludedSiteSlugs = configuredExcludedSiteSlugs(options.excludedSiteSlugs);
    const excludedSet = new Set(excludedSiteSlugs);
    const excludedAgencies = hardenedPlans
      .filter((item) => excludedSet.has(clean(item.siteSlug).toLocaleLowerCase("fr-FR")))
      .map((item) => ({ agencyId: item.agencyId ?? null, siteSlug: item.siteSlug, city: item.city || null }));
    const plans = hardenedPlans.filter(
      (item) => !excludedSet.has(clean(item.siteSlug).toLocaleLowerCase("fr-FR"))
    );

    const similarity = networkSimilarityReport(plans, {
      threshold: Number(options.similarityThreshold ?? 0.78),
      minimumWords: Number(options.minimumWords ?? 80),
    });
    const quality = hardenQualityReport(preRolloutQualityReport(plans, {
      minimumWords: Number(options.qualityMinimumWords ?? 120),
    }));
    const sitemapReadiness = filterSitemapReadiness(plan.sitemapReadiness || {}, excludedSiteSlugs);
    const enriched = {
      ...plan,
      plans,
      similarity,
      quality,
      sitemapReadiness,
      excludedAgencies,
      excludedSiteSlugs,
    };
    return { ...enriched, summary: recomputeSummary(enriched, similarity, quality, excludedAgencies) };
  };

  if (typeof originalHealth === "function") {
    prototype.health = function healthWithEditorialHardening(...args) {
      return {
        ...originalHealth.apply(this, args),
        editorialHardening: true,
        emptyIndexableContentGuard: true,
        networkAgencyExclusionGuard: true,
        deterministicAgencyDifferentiation: true,
      };
    };
  }

  Object.defineProperty(prototype, INSTALLED, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return ServiceClass;
}

module.exports = {
  DEFAULT_EXCLUDED_SITE_SLUGS,
  configuredExcludedSiteSlugs,
  differentiationContent,
  filterSitemapReadiness,
  hardenQualityReport,
  installEditorialHardening,
  naturalizeAgencyPlan,
  naturalizeFrench,
  strengthenAgencyDifferentiation,
};
