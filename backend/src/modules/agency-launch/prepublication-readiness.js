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

const SIMILARITY_PAGE_KEYS = ["home", "agence", "services"];
const SIMILARITY_THRESHOLD = 0.82;
const SIMILARITY_MIN_WORDS = 60;

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

function textValues(value, output = []) {
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized) output.push(normalized);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => textValues(item, output));
    return output;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      if (["id", "url", "href", "imageUrl", "image", "icon"].includes(key)) return;
      textValues(item, output);
    });
  }

  return output;
}

function publishedPageText(page) {
  if (!page) return "";

  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const source = blocks.length > 0 ? blocks : sections;
  const entries = source.filter(
    (entry) =>
      String(entry?.status || "").toLowerCase() !== "hidden" &&
      isPublished(entry)
  );

  return textValues([
    page.title,
    page.h1,
    page.seoTitle,
    page.metaDescription,
    ...entries.map((entry) => entry.content ?? entry.jsonContent ?? {}),
  ]).join(" ");
}

function localDifferentiationCheck(site, agency) {
  const pages = site?.pages || [];
  const city = String(agency?.city || "").trim().toLowerCase();
  const agencyName = String(agency?.name || "").trim().toLowerCase();
  const details = REQUIRED_CONTENT_PAGES.map((definition) => {
    const page = pageByKey(pages, definition.key);
    const text = publishedPageText(page);
    const normalized = text.toLowerCase();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const hasCity = Boolean(city) && normalized.includes(city);
    const hasAgencyName = Boolean(agencyName) && normalized.includes(agencyName);
    const locallyAnchored = hasCity || hasAgencyName;

    return {
      slug: definition.key,
      wordCount,
      hasCity,
      hasAgencyName,
      locallyAnchored,
    };
  });

  const substantivePages = details.filter((item) => item.wordCount >= 45).length;
  const locallyAnchoredPages = details.filter((item) => item.locallyAnchored).length;
  const passed = substantivePages >= 2 && locallyAnchoredPages >= 3;

  return {
    code: "LOCAL_CONTENT",
    label: "Différenciation du contenu local",
    required: false,
    passed,
    substantivePages,
    locallyAnchoredPages,
    pages: details,
    recommendation: passed
      ? null
      : "Enrichir au moins deux pages avec du contenu propre à l'agence (équipe, expertises, accompagnement, zone locale ou conseils) et conserver des références naturelles à l'agence ou à sa ville.",
  };
}

function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function comparisonTokens(text, agency) {
  const ignored = new Set(
    textValues([agency?.name, agency?.city])
      .flatMap((value) => stripDiacritics(value).toLowerCase().split(/[^a-z0-9]+/))
      .filter((value) => value.length >= 2)
  );

  return stripDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !ignored.has(token));
}

function tokenShingles(tokens, size = 3) {
  const shingles = new Set();
  if (!Array.isArray(tokens) || tokens.length < size) return shingles;

  for (let index = 0; index <= tokens.length - size; index += 1) {
    shingles.add(tokens.slice(index, index + size).join(" "));
  }

  return shingles;
}

function jaccardSimilarity(left, right) {
  if (!left?.size || !right?.size) return 0;

  let intersection = 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;

  smaller.forEach((value) => {
    if (larger.has(value)) intersection += 1;
  });

  return intersection / (left.size + right.size - intersection);
}

function pageSimilarity(currentPage, currentAgency, peerPage, peerAgency) {
  const currentText = publishedPageText(currentPage);
  const peerText = publishedPageText(peerPage);
  const currentTokens = comparisonTokens(currentText, currentAgency);
  const peerTokens = comparisonTokens(peerText, peerAgency);

  if (
    currentTokens.length < SIMILARITY_MIN_WORDS ||
    peerTokens.length < SIMILARITY_MIN_WORDS
  ) {
    return null;
  }

  return jaccardSimilarity(
    tokenShingles(currentTokens),
    tokenShingles(peerTokens)
  );
}

function interAgencySimilarityCheck(site, agency, peers = []) {
  const matches = [];

  for (const peerAgency of peers || []) {
    const peerSite = peerAgency?.agencySites?.[0] || null;
    if (!peerSite || !isPublished(peerSite)) continue;

    for (const slug of SIMILARITY_PAGE_KEYS) {
      const currentPage = pageByKey(site?.pages || [], slug);
      const peerPage = pageByKey(peerSite.pages || [], slug);
      if (!currentPage || !peerPage || !isPublished(currentPage) || !isPublished(peerPage)) continue;

      const similarity = pageSimilarity(currentPage, agency, peerPage, peerAgency);
      if (similarity == null || similarity < SIMILARITY_THRESHOLD) continue;

      matches.push({
        slug,
        peerAgencyId: peerAgency.id,
        peerAgencyName: peerAgency.name,
        peerCity: peerAgency.city,
        similarity: Math.round(similarity * 1000) / 1000,
      });
    }
  }

  matches.sort((left, right) => right.similarity - left.similarity);

  return {
    code: "CONTENT_SIMILARITY",
    label: "Similarité inter-agences",
    required: false,
    passed: matches.length === 0,
    threshold: SIMILARITY_THRESHOLD,
    minimumWords: SIMILARITY_MIN_WORDS,
    comparedPages: SIMILARITY_PAGE_KEYS,
    matches: matches.slice(0, 12),
    recommendation:
      matches.length > 0
        ? "Certaines pages ressemblent fortement à celles d'une autre agence après neutralisation du nom et de la ville. Ajouter des éléments réellement propres à l'équipe, aux expertises, à la clientèle locale ou aux pratiques de l'agence avant de renforcer leur indexation."
        : null,
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
    GENERAL_CONTENT: 25,
    LEGAL: 15,
    SEO: 15,
    LOCAL_SEO: 5,
    LOCAL_CONTENT: 5,
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

const PUBLIC_CONTENT_SELECT = {
  id: true,
  slug: true,
  title: true,
  h1: true,
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
      content: true,
      status: true,
      displayOrder: true,
    },
  },
  sections: {
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      sectionType: true,
      jsonContent: true,
      status: true,
      displayOrder: true,
    },
  },
};

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
              select: PUBLIC_CONTENT_SELECT,
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

  async loadPeerAgencies(agencyId) {
    return this.prisma.agency.findMany({
      where: {
        tenantId: this.tenantId,
        id: { not: Number(agencyId) },
        agencySites: { some: { status: "published", tenantId: this.tenantId } },
      },
      select: {
        id: true,
        name: true,
        city: true,
        agencySites: {
          where: { tenantId: this.tenantId, status: "published" },
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            pages: {
              where: { published: true },
              orderBy: { displayOrder: "asc" },
              select: PUBLIC_CONTENT_SELECT,
            },
          },
        },
      },
    });
  }

  async readiness(agencyId) {
    const [agency, peers] = await Promise.all([
      this.loadAgency(agencyId),
      this.loadPeerAgencies(agencyId),
    ]);
    const site = agency.agencySites?.[0] || null;

    const checks = [
      siteCheck(site),
      identityCheck(agency),
      contentCheck(site),
      legalCheck(site),
      seoCheck(site),
      localSeoCheck(agency),
      localDifferentiationCheck(site, agency),
      interAgencySimilarityCheck(site, agency, peers),
    ];

    const launchBlockers = blockers(checks);
    const launchScore = score(checks);

    return {
      version: "1.9",
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
  textValues,
  publishedPageText,
  localDifferentiationCheck,
  stripDiacritics,
  comparisonTokens,
  tokenShingles,
  jaccardSimilarity,
  pageSimilarity,
  interAgencySimilarityCheck,
  publicSiteSlugValid,
  siteCheck,
  score,
  blockers,
};
