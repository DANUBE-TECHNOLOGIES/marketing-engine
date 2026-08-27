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

function isDestinationBlock(block) {
  return [
    "destination-grid",
    "destinations",
    "destinations-highlight",
    "destination-recommendations",
  ].includes(blockType(block));
}

function destinationAssetId(item) {
  if (!item || typeof item !== "object") return "";

  const image = asObject(item.image);
  const media = asObject(item.media);
  const cover = asObject(item.cover);

  return String(
    item.imageAssetId ||
    item.heroImageAssetId ||
    item.mediaAssetId ||
    item.coverAssetId ||
    image.assetId ||
    image.id ||
    media.assetId ||
    media.id ||
    cover.assetId ||
    cover.id ||
    ""
  ).trim();
}

function destinationCollections(content) {
  const keys = [];
  for (const key of ["destinations", "items"]) {
    if (Array.isArray(content?.[key])) keys.push(key);
  }
  return keys;
}

function destinationMediaReferences(pages = []) {
  const references = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isDestinationBlock(block)) continue;

      const content = asObject(block.content);

      for (const key of destinationCollections(content)) {
        for (const item of content[key]) {
          const id = destinationAssetId(item);
          if (id) references.add(id);
        }
      }
    }
  }

  return [...references];
}

async function loadDestinationMediaAssets({
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

function hydrateDestinationItem(item, byId) {
  if (!item || typeof item !== "object") return item;

  // Une URL déjà publique est une preuve plus forte qu'une référence asset.
  const existingUrl = String(
    (typeof item.image === "string" ? item.image : "") ||
    item.imageUrl ||
    item.heroImageUrl ||
    item.backgroundImage ||
    item.coverImage ||
    item.photoUrl ||
    item.media?.url ||
    ""
  ).trim();

  if (existingUrl) {
    return {
      ...item,
      image: existingUrl,
      imageUrl: existingUrl,
    };
  }

  const imageAssetId = destinationAssetId(item);
  if (!imageAssetId) return item;

  const asset = byId.get(imageAssetId);
  if (!asset) return item;

  const payload = asObject(asset.payload);
  const imageUrl = String(
    payload.url ||
    payload.publicUrl ||
    payload.src ||
    ""
  ).trim();

  if (!imageUrl) return item;

  return {
    ...item,
    imageAssetId,
    image: imageUrl,
    imageUrl,
    imageAlt:
      String(item?.imageAlt || "").trim() ||
      String(payload.altText || payload.alt || "").trim() ||
      asset.title ||
      "",
    __mediaSource: "asset-engine",
    __mediaVersion: asset.currentVersion ?? null,
  };
}

function hydrateDestinationItems(
  pages = [],
  assets = []
) {
  const byId = new Map(
    assets.map((asset) => [String(asset.id), asset])
  );

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (!isDestinationBlock(block)) return block;

      const content = asObject(block.content);
      const nextContent = { ...content };

      for (const key of destinationCollections(content)) {
        nextContent[key] = content[key].map((item) =>
          hydrateDestinationItem(item, byId)
        );
      }

      return {
        ...block,
        content: nextContent,
      };
    }),
  }));
}

async function hydrateDestinationMediaAssets({
  prisma,
  tenantId,
  pages = [],
}) {
  const references = destinationMediaReferences(pages);
  const assets = await loadDestinationMediaAssets({
    prisma,
    tenantId,
    references,
  });

  // Même sans référence Asset, normaliser les URLs déjà présentes dans les
  // collections dynamiques afin que le renderer lise la même forme partout.
  return hydrateDestinationItems(pages, assets);
}

module.exports = {
  asObject,
  blockType,
  isDestinationBlock,
  destinationAssetId,
  destinationCollections,
  destinationMediaReferences,
  loadDestinationMediaAssets,
  hydrateDestinationItem,
  hydrateDestinationItems,
  hydrateDestinationMediaAssets,
};
