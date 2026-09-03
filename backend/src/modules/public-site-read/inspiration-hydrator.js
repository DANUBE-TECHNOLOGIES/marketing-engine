"use strict";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanReferences(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();

  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

function normalizeLimit(value, fallback = 6) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

function blockType(block) {
  return String(block?.blockType || block?.type || "")
    .trim()
    .toLowerCase();
}

function inspirationConfig(block) {
  const content = asObject(block?.content);
  const settings = asObject(block?.settings);
  const references = cleanReferences(
    content.contentIds || settings.contentIds
  );

  const source = String(
    content.source ||
      content.__dataSource ||
      settings.__dataSource ||
      settings.dataSource ||
      "content-generation"
  )
    .trim()
    .toLowerCase();

  const selectionMode = String(
    content.selectionMode ||
      settings.selectionMode ||
      (references.length ? "manual" : "automatic")
  )
    .trim()
    .toLowerCase();

  return {
    content,
    settings,
    references,
    source,
    selectionMode,
    limit: normalizeLimit(content.limit || settings.limit),
  };
}

function isDynamicInspirationBlock(block) {
  if (blockType(block) !== "inspirations") return false;

  const { source } = inspirationConfig(block);

  return [
    "content-generation",
    "ai-content",
    "automatic",
    "auto",
  ].includes(source);
}

function inspirationImage(content) {
  const body = asObject(content?.body);
  const seo = asObject(content?.seo);
  const openGraph = asObject(seo.openGraph);
  const hero = asObject(body.hero);
  const media = asObject(body.media);

  return [
    body.image,
    body.imageUrl,
    body.heroImage,
    hero.image,
    hero.imageUrl,
    media.image,
    media.imageUrl,
    openGraph.image,
    openGraph.imageUrl,
  ].find((value) => typeof value === "string" && value.trim()) || null;
}

function inspirationCard(content) {
  const body = asObject(content?.body);

  return {
    id: content.id,
    slug: content.slug,
    title: content.title,
    description: content.excerpt || body.introduction || "",
    category: body.category || body.theme || content.channel || "Inspiration",
    image: inspirationImage(content),
    channel: content.channel,
    locale: content.locale,
    qualityScore: content.qualityScore,
    publishedAt: content.publishedAt,
  };
}

function collectInspirationPlan(pages = []) {
  const references = [];
  const seen = new Set();
  let automaticLimit = 0;

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isDynamicInspirationBlock(block)) continue;

      const config = inspirationConfig(block);

      if (config.selectionMode === "manual") {
        for (const reference of config.references) {
          if (seen.has(reference)) continue;
          seen.add(reference);
          references.push(reference);
        }
      } else {
        automaticLimit = Math.max(automaticLimit, config.limit);
      }
    }
  }

  return {
    references,
    automaticLimit,
  };
}

async function loadPublishedInspirations({
  prisma,
  tenantId,
  references = [],
  limit = 0,
}) {
  const ids = cleanReferences(references);

  if (
    !prisma?.seoContent ||
    !tenantId ||
    (!ids.length && !limit)
  ) {
    return [];
  }

  return prisma.seoContent.findMany({
    where: {
      tenantId,
      status: "published",
      channel: "article",
      ...(ids.length ? { id: { in: ids } } : {}),
    },
    orderBy: [
      { publishedAt: "desc" },
      { updatedAt: "desc" },
    ],
    take: ids.length
      ? Math.min(ids.length, 100)
      : normalizeLimit(limit),
  });
}

function hydrateInspirationBlocks(
  pages,
  manualContents = [],
  automaticContents = []
) {
  const manualById = new Map(
    manualContents.map((content) => [String(content.id), content])
  );
  const automaticCards = automaticContents.map(inspirationCard);

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (!isDynamicInspirationBlock(block)) return block;

      const config = inspirationConfig(block);
      const items =
        config.selectionMode === "manual"
          ? config.references
              .map((reference) => manualById.get(String(reference)))
              .filter(Boolean)
              .map(inspirationCard)
              .slice(0, config.limit)
          : automaticCards.slice(0, config.limit);

      return {
        ...block,
        content: {
          ...config.content,
          inspirations: items,
          items,
        },
      };
    }),
  }));
}

async function hydratePublicInspirations({
  prisma,
  tenantId,
  pages = [],
} = {}) {
  if (!Array.isArray(pages) || !pages.length) return [];

  const plan = collectInspirationPlan(pages);

  if (!plan.references.length && !plan.automaticLimit) {
    return pages;
  }

  const [manualContents, automaticContents] = await Promise.all([
    loadPublishedInspirations({
      prisma,
      tenantId,
      references: plan.references,
      limit: plan.references.length,
    }),
    plan.automaticLimit
      ? loadPublishedInspirations({
          prisma,
          tenantId,
          limit: plan.automaticLimit,
        })
      : [],
  ]);

  return hydrateInspirationBlocks(
    pages,
    manualContents,
    automaticContents
  );
}

module.exports = {
  asObject,
  cleanReferences,
  normalizeLimit,
  blockType,
  inspirationConfig,
  isDynamicInspirationBlock,
  inspirationImage,
  inspirationCard,
  collectInspirationPlan,
  loadPublishedInspirations,
  hydrateInspirationBlocks,
  hydratePublicInspirations,
};
