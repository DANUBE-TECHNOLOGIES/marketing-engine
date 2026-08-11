"use strict";

const { isPublished } = require("./service");

const REQUIRED_CONTENT_PAGES = [
  { key: "home", label: "Accueil" },
  { key: "agence", label: "Présentation de l'agence" },
  { key: "services", label: "Services" },
  { key: "contact", label: "Contact" },
];

const REQUIRED_LEGAL_PAGES = [
  { key: "mentions-legales", label: "Mentions légales" },
  { key: "confidentialite", label: "Politique de confidentialité" },
];

const RECOMMENDED_PAGES = [
  { key: "equipe", label: "Équipe" },
  { key: "engagements", label: "Engagements" },
  { key: "partenaires", label: "Partenaires" },
  { key: "avis", label: "Avis clients" },
];

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function canonicalPageKey(value) {
  const slug = normalizeSlug(value);
  if (slug === "" || slug === "home" || slug === "accueil") return "home";
  return slug;
}

function pageByKey(pages, key) {
  return (pages || []).find(
    (page) => canonicalPageKey(page?.slug) === key
  ) || null;
}

function publicEntries(entries = []) {
  const visible = entries.filter(
    (entry) => String(entry?.status || "").toLowerCase() !== "hidden"
  );
  return {
    total: entries.length,
    visible: visible.length,
    published: visible.filter(isPublished).length,
  };
}

function designerContentState(page) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const sections = Array.isArray(page?.sections) ? page.sections : [];
  const blockState = publicEntries(blocks);
  const sectionState = publicEntries(sections);
  const pagePublished = isPublished(page);

  const source = blockState.total > 0
    ? "website-designer-v2-blocks"
    : sectionState.total > 0
      ? "agency-site-sections"
      : "empty";

  const selectedState = source === "website-designer-v2-blocks"
    ? blockState
    : source === "agency-site-sections"
      ? sectionState
      : { total: 0, visible: 0, published: 0 };

  const hasVisibleContent = selectedState.visible > 0;
  const coherent =
    hasVisibleContent &&
    (!pagePublished || selectedState.published > 0);

  return {
    source,
    hasV2Blocks: blockState.total > 0,
    totalBlocks: blockState.total,
    visibleBlocks: blockState.visible,
    publishedBlocks: blockState.published,
    hasDesignerSections: sectionState.total > 0,
    totalSections: sectionState.total,
    visibleSections: sectionState.visible,
    publishedSections: sectionState.published,
    hasVisibleContent,
    coherent,
  };
}

function pagePresenceCheck(pages, definition, required) {
  const page = pageByKey(pages, definition.key);
  const contentState = designerContentState(page);
  const exists = Boolean(page);

  return {
    code: `PAGE_${definition.key.toUpperCase().replace(/-/g, "_")}`,
    label: definition.label,
    required,
    exists,
    published: isPublished(page),
    passed: exists && contentState.coherent,
    pageId: page?.id || null,
    slug: definition.key,
    actualSlug: page?.slug ?? null,
    contentState,
  };
}

function identityCheck(agency) {
  const fields = {
    name: Boolean(agency?.name),
    city: Boolean(agency?.city),
    address: Boolean(agency?.address),
    postalCode: Boolean(agency?.postalCode),
    phone: Boolean(agency?.phone),
    email: Boolean(agency?.email),
  };

  const missing = Object.entries(fields)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  return {
    code: "IDENTITY",
    label: "Identité de l'agence",
    required: true,
    passed: missing.length === 0,
    fields,
    missing,
  };
}

function localSeoCheck(agency) {
  const signals = {
    website: Boolean(String(agency?.website || "").trim()),
    googleLocation: Boolean(String(agency?.googleLocationId || "").trim()),
    googleReviewUrl: Boolean(String(agency?.googleReviewUrl || "").trim()),
  };

  const missing = Object.entries(signals)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  return {
    code: "LOCAL_SEO",
    label: "SEO local avancé",
    required: false,
    passed: missing.length === 0,
    signals,
    missing,
    recommendation:
      missing.length > 0
        ? "Compléter les liens et identifiants Google pour renforcer la cohérence entre mini-site et fiche établissement."
        : null,
  };
}

function contentCheck(site) {
  const pages = site?.pages || [];
  const requiredPages = REQUIRED_CONTENT_PAGES.map(
    (definition) => pagePresenceCheck(pages, definition, true)
  );
  const recommendedPages = RECOMMENDED_PAGES.map(
    (definition) => pagePresenceCheck(pages, definition, false)
  );

  return {
    code: "GENERAL_CONTENT",
    label: "Pages générales",
    required: true,
    passed: requiredPages.every((item) => item.passed),
    requiredPages,
    recommendedPages,
    requiredPassed: requiredPages.filter((item) => item.passed).length,
    requiredTotal: requiredPages.length,
    recommendedPassed: recommendedPages.filter((item) => item.passed).length,
    recommendedTotal: recommendedPages.length,
  };
}

function legalCheck(site) {
  const pages = site?.pages || [];
  const items = REQUIRED_LEGAL_PAGES.map(
    (definition) => pagePresenceCheck(pages, definition, true)
  );

  return {
    code: "LEGAL",
    label: "Informations légales",
    required: true,
    passed: items.every((item) => item.passed),
    items,
  };
}

function seoCheck(site) {
  const pages = site?.pages || [];
  const launchPages = REQUIRED_CONTENT_PAGES
    .map((definition) => pageByKey(pages, definition.key))
    .filter(Boolean);

  const missingSeoTitle = launchPages
    .filter((page) => !String(page?.seoTitle || "").trim())
    .map((page) => ({ id: page.id, slug: canonicalPageKey(page.slug) }));

  const missingDescription = launchPages
    .filter((page) => !String(page?.metaDescription || "").trim())
    .map((page) => ({ id: page.id, slug: canonicalPageKey(page.slug) }));

  return {
    code: "SEO",
    label: "SEO de base",
    required: true,
    passed:
      launchPages.length === REQUIRED_CONTENT_PAGES.length &&
      missingSeoTitle.length === 0 &&
      missingDescription.length === 0,
    launchPages: launchPages.length,
    missingSeoTitle,
    missingDescription,
  };
}

function publicSiteSlugValid(value) {
  const slug = String(value || "").trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function siteCheck(site) {
  const exists = Boolean(site);
  const slugValid = exists && publicSiteSlugValid(site?.slug);

  return {
    code: "SITE",
    label: "Mini-site",
    required: true,
    passed: exists && slugValid,
    exists,
    slugValid,
    siteId: site?.id || null,
    slug: site?.slug || null,
    status: site?.status || null,
    published: isPublished(site),
  };
}

function score(checks) {
  const weights = {
    SITE: 15,
    IDENTITY: 20,
    GENERAL_CONTENT: 30,
    LEGAL: 15,
    SEO: 15,
    LOCAL_SEO: 5,
  };

  return checks.reduce(
    (total, check) => total + (check.passed ? weights[check.code] || 0 : 0),
    0
  );
}

function blockers(checks) {
  return checks
    .filter((check) => check.required && !check.passed)
    .map((check) => ({ code: check.code, label: check.label }));
}

class PrepublicationReadinessService {
  constructor({ prisma, tenantId } = {}) {
    if (!prisma) throw new Error("Le client Prisma est obligatoire.");
    if (!String(tenantId || "").trim()) throw new Error("Le tenant est obligatoire.");
    this.prisma = prisma;
    this.tenantId = String(tenantId);
  }

  async loadAgency(agencyId) {
    const id = Number(agencyId);

    if (!Number.isInteger(id) || id <= 0) {
      const error = new Error("Identifiant agence invalide.");
      error.code = "AGENCY_LAUNCH_INVALID_AGENCY_ID";
      error.statusCode = 400;
      throw error;
    }

    const agency = await this.prisma.agency.findFirst({
      where: { id, tenantId: this.tenantId },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        postalCode: true,
        phone: true,
        email: true,
        website: true,
        googleReviewUrl: true,
        googleLocationId: true,
        tenantId: true,
        agencySites: {
          where: { tenantId: this.tenantId },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            agencyId: true,
            tenantId: true,
            name: true,
            slug: true,
            basePath: true,
            status: true,
            publishedAt: true,
            updatedAt: true,
            pages: {
              orderBy: { displayOrder: "asc" },
              select: {
                id: true,
                slug: true,
                title: true,
                status: true,
                published: true,
                seoTitle: true,
                metaDescription: true,
                displayOrder: true,
                blocks: {
                  orderBy: { displayOrder: "asc" },
                  select: {
                    id: true,
                    blockType: true,
                    status: true,
                    displayOrder: true,
                  },
                },
                sections: {
                  orderBy: { displayOrder: "asc" },
                  select: {
                    id: true,
                    sectionType: true,
                    status: true,
                    displayOrder: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!agency) {
      const error = new Error("Agence introuvable dans ce tenant.");
      error.code = "AGENCY_LAUNCH_AGENCY_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    return agency;
  }

  async readiness(agencyId) {
    const agency = await this.loadAgency(agencyId);
    const site = agency.agencySites?.[0] || null;

    const checks = [
      siteCheck(site),
      identityCheck(agency),
      contentCheck(site),
      legalCheck(site),
      seoCheck(site),
      localSeoCheck(agency),
    ];

    const launchBlockers = blockers(checks);
    const launchScore = score(checks);

    return {
      version: "1.7",
      mode: "prepublication",
      agency: {
        id: agency.id,
        name: agency.name,
        city: agency.city,
      },
      site: site
        ? {
            id: site.id,
            slug: site.slug,
            basePath: site.basePath,
            status: site.status,
            published: isPublished(site),
            publishedAt: site.publishedAt,
          }
        : null,
      readiness: {
        score: launchScore,
        grade:
          launchScore >= 90 ? "A" :
          launchScore >= 75 ? "B" :
          launchScore >= 60 ? "C" :
          launchScore >= 40 ? "D" : "E",
        ready: launchBlockers.length === 0,
        blockers: launchBlockers,
      },
      checks,
    };
  }
}

module.exports = {
  PrepublicationReadinessService,
  canonicalPageKey,
  pageByKey,
  publicEntries,
  designerContentState,
  pagePresenceCheck,
  identityCheck,
  localSeoCheck,
  contentCheck,
  legalCheck,
  seoCheck,
  publicSiteSlugValid,
  siteCheck,
  score,
  blockers,
};
