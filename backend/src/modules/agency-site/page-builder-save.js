"use strict";

const { pageSlugCandidates } = require("./page-slug");

const PAGE_STATUSES = new Set(["draft", "review", "published", "archived"]);
const BLOCK_STATUSES = new Set(["draft", "published", "hidden"]);

function text(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizedBlockType(block = {}) {
  return text(block.type || block.blockType || block.sectionType || "rich_text", "rich_text")
    .replace(/--\d+$/, "")
    .toLowerCase();
}

function normalizeDesignerBlocks(blocks = []) {
  if (!Array.isArray(blocks)) {
    const error = new Error("Le champ blocks doit être un tableau.");
    error.statusCode = 400;
    error.code = "AGENCY_SITE_BLOCKS_INVALID";
    throw error;
  }
  if (blocks.length > 100) {
    const error = new Error("Une page ne peut pas contenir plus de 100 blocs.");
    error.statusCode = 400;
    error.code = "AGENCY_SITE_BLOCK_LIMIT";
    throw error;
  }

  const typeCounts = new Map();
  return blocks.map((block, index) => {
    const baseType = normalizedBlockType(block);
    if (!baseType) {
      const error = new Error(`Le type du bloc ${index + 1} est obligatoire.`);
      error.statusCode = 400;
      error.code = "AGENCY_SITE_BLOCK_TYPE_REQUIRED";
      throw error;
    }
    const count = (typeCounts.get(baseType) || 0) + 1;
    typeCounts.set(baseType, count);
    const content = block?.content && typeof block.content === "object" && !Array.isArray(block.content)
      ? block.content
      : block?.jsonContent && typeof block.jsonContent === "object" && !Array.isArray(block.jsonContent)
        ? block.jsonContent
        : {};
    const rawStatus = text(block.status, "draft").toLowerCase();
    const status = BLOCK_STATUSES.has(rawStatus) ? rawStatus : "draft";

    return {
      sectionType: count === 1 ? baseType : `${baseType}--${count}`,
      jsonContent: { ...content, __builderType: baseType },
      displayOrder: Number.isFinite(Number(block.position ?? block.displayOrder))
        ? Number(block.position ?? block.displayOrder)
        : index,
      status,
    };
  });
}

function primaryHeading(blocks, fallback = "") {
  const header = blocks.find((block) => {
    const type = String(block?.jsonContent?.__builderType || block?.sectionType || "")
      .replace(/--\d+$/, "")
      .toLowerCase();
    return type === "page-header" || type === "hero";
  });
  return text(header?.jsonContent?.title, fallback);
}

async function saveDesignerPage({ prisma, tenantId, agencyId, slug, input = {} }) {
  const id = Number(agencyId);
  if (!Number.isInteger(id)) {
    const error = new Error("Identifiant d’agence invalide.");
    error.statusCode = 400;
    error.code = "INVALID_AGENCY_ID";
    throw error;
  }

  const pageInput = input?.page && typeof input.page === "object" ? input.page : {};
  const status = text(pageInput.status, "draft").toLowerCase();
  if (!PAGE_STATUSES.has(status)) {
    const error = new Error(`Statut de page invalide : ${status || "(vide)"}.`);
    error.statusCode = 400;
    error.code = "AGENCY_SITE_PAGE_STATUS_INVALID";
    throw error;
  }

  const page = await prisma.agencySitePage.findFirst({
    where: {
      site: { is: { agencyId: id, tenantId } },
      slug: { in: pageSlugCandidates(slug) },
    },
    orderBy: { slug: "desc" },
    include: { sections: { orderBy: { displayOrder: "asc" } }, site: true },
  });
  if (!page) {
    const error = new Error(`Page ${slug || "accueil"} introuvable.`);
    error.statusCode = 404;
    error.code = "AGENCY_SITE_PAGE_NOT_FOUND";
    throw error;
  }

  const requestedSlug = text(pageInput.slug, page.slug);
  if (requestedSlug !== page.slug) {
    const error = new Error("Le changement de slug n’est pas autorisé pendant la sauvegarde du Designer V2.");
    error.statusCode = 409;
    error.code = "AGENCY_SITE_PAGE_SLUG_CHANGE_REQUIRES_DEDICATED_ACTION";
    throw error;
  }

  const blocks = normalizeDesignerBlocks(input.blocks || []);
  const title = text(pageInput.title, page.title);
  if (!title) {
    const error = new Error("Le titre de la page est obligatoire.");
    error.statusCode = 400;
    error.code = "AGENCY_SITE_PAGE_TITLE_REQUIRED";
    throw error;
  }

  const seoTitle = text(pageInput.seoTitle, page.seoTitle);
  const metaDescription = text(
    pageInput.seoDescription ?? pageInput.metaDescription,
    page.metaDescription
  );
  const h1 = primaryHeading(blocks, page.h1 || title);
  const published = status === "published";

  await prisma.$transaction(async (tx) => {
    await tx.agencySitePage.update({
      where: { id: page.id },
      data: {
        title,
        status,
        published,
        seoTitle,
        metaDescription,
        h1,
      },
    });
    await tx.agencySiteSection.deleteMany({ where: { pageId: page.id } });
    if (blocks.length) {
      await tx.agencySiteSection.createMany({
        data: blocks.map((block) => ({ pageId: page.id, ...block })),
      });
    }
  });

  const saved = await prisma.agencySitePage.findUnique({
    where: { id: page.id },
    include: {
      sections: { orderBy: { displayOrder: "asc" } },
      blocks: { orderBy: { displayOrder: "asc" } },
      site: true,
    },
  });

  return {
    version: "1.0",
    operation: "designer-page-save",
    page: saved,
    publication: {
      status: saved.status,
      published: saved.published === true,
      publicEligible: saved.status === "published" && saved.published === true,
    },
  };
}

module.exports = {
  BLOCK_STATUSES,
  PAGE_STATUSES,
  normalizeDesignerBlocks,
  primaryHeading,
  saveDesignerPage,
};
