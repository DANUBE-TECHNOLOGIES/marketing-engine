"use strict";

function asObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value
    : {};
}

function blockType(block) {
  return String(
    block?.blockType ||
    block?.type ||
    ""
  )
    .trim()
    .toLowerCase();
}

function isImageTextBlock(block) {
  return blockType(block) === "image_text";
}

function imageTextMediaReferences(pages = []) {
  const references = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isImageTextBlock(block)) continue;

      const content = asObject(block.content);
      const id = String(
        content.imageAssetId || ""
      ).trim();

      if (id) references.add(id);
    }
  }

  return [...references];
}

async function loadImageTextMediaAssets({
  prisma,
  tenantId,
  references = [],
}) {
  if (
    !prisma?.asset ||
    !tenantId ||
    !references.length
  ) {
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

function hydrateImageTextBlocks(
  pages = [],
  assets = []
) {
  if (!assets.length) return pages;

  const byId = new Map(
    assets.map((asset) => [
      String(asset.id),
      asset,
    ])
  );

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (!isImageTextBlock(block)) return block;

      const content = asObject(block.content);
      const imageAssetId = String(
        content.imageAssetId || ""
      ).trim();

      if (!imageAssetId) return block;

      const asset = byId.get(imageAssetId);
      if (!asset) return block;

      const payload = asObject(asset.payload);
      const imageUrl = String(
        payload.url || ""
      ).trim();

      if (!imageUrl) return block;

      return {
        ...block,
        content: {
          ...content,
          imageAssetId,
          imageUrl,
          imageAlt:
            String(content.imageAlt || "").trim() ||
            String(payload.altText || "").trim() ||
            asset.title ||
            "",
          __mediaSource: "asset-engine",
          __mediaVersion:
            asset.currentVersion ?? null,
        },
      };
    }),
  }));
}

async function hydrateImageTextMediaAssets({
  prisma,
  tenantId,
  pages = [],
}) {
  const references =
    imageTextMediaReferences(pages);

  const assets =
    await loadImageTextMediaAssets({
      prisma,
      tenantId,
      references,
    });

  return hydrateImageTextBlocks(
    pages,
    assets
  );
}

module.exports = {
  asObject,
  blockType,
  isImageTextBlock,
  imageTextMediaReferences,
  loadImageTextMediaAssets,
  hydrateImageTextBlocks,
  hydrateImageTextMediaAssets,
};
