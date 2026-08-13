"use strict";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function blockType(block) {
  return String(block?.blockType || block?.type || "")
    .trim()
    .toLowerCase();
}

function galleryMediaReferences(pages = []) {
  const references = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "gallery") continue;

      const content = asObject(block.content);
      const images = Array.isArray(content.images)
        ? content.images
        : [];

      for (const image of images) {
        const id = String(image?.imageAssetId || "").trim();
        if (id) references.add(id);
      }
    }
  }

  return [...references];
}

async function loadGalleryMediaAssets({
  prisma,
  tenantId,
  references = [],
}) {
  if (!prisma?.asset || !tenantId || !references.length) {
    return [];
  }

  return prisma.asset.findMany({
    where: {
      tenantId: String(tenantId),
      id: { in: references },
      type: "MEDIA_IMAGE",
      status: "published",
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      payload: true,
      currentVersion: true,
    },
  });
}

function hydrateGalleryImage(image, byId) {
  if (!image || typeof image !== "object") return image;

  const imageAssetId = String(image.imageAssetId || "").trim();
  if (!imageAssetId) return image;

  const asset = byId.get(imageAssetId);
  if (!asset) return image;

  const payload = asObject(asset.payload);
  const url = String(payload.url || "").trim();
  if (!url) return image;

  return {
    ...image,
    imageAssetId,
    url,
    alt:
      String(image.alt || "").trim() ||
      String(payload.altText || "").trim() ||
      asset.title ||
      "",
    __mediaSource: "asset-engine",
    __mediaVersion: asset.currentVersion ?? null,
  };
}

function hydrateGalleryBlocks(pages = [], assets = []) {
  if (!assets.length) return pages;

  const byId = new Map(
    assets.map((asset) => [String(asset.id), asset])
  );

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "gallery") return block;

      const content = asObject(block.content);
      const images = Array.isArray(content.images)
        ? content.images
        : [];

      return {
        ...block,
        content: {
          ...content,
          images: images.map((image) =>
            hydrateGalleryImage(image, byId)
          ),
        },
      };
    }),
  }));
}

async function hydrateGalleryMediaAssets({
  prisma,
  tenantId,
  pages = [],
}) {
  const references = galleryMediaReferences(pages);
  const assets = await loadGalleryMediaAssets({
    prisma,
    tenantId,
    references,
  });

  return hydrateGalleryBlocks(pages, assets);
}

module.exports = {
  asObject,
  blockType,
  galleryMediaReferences,
  loadGalleryMediaAssets,
  hydrateGalleryImage,
  hydrateGalleryBlocks,
  hydrateGalleryMediaAssets,
};
