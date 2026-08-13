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

function destinationMediaReferences(pages = []) {
  const references = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isDestinationBlock(block)) {
        continue;
      }

      const content =
        asObject(block.content);

      for (
        const item of
        Array.isArray(content.items)
          ? content.items
          : []
      ) {
        const id = String(
          item?.imageAssetId || ""
        ).trim();

        if (id) {
          references.add(id);
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

      id: {
        in: references,
      },

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

function hydrateDestinationItems(
  pages = [],
  assets = []
) {
  if (!assets.length) {
    return pages;
  }

  const byId = new Map(
    assets.map((asset) => [
      String(asset.id),
      asset,
    ])
  );

  return pages.map((page) => ({
    ...page,

    blocks: (page.blocks || []).map(
      (block) => {
        if (!isDestinationBlock(block)) {
          return block;
        }

        const content =
          asObject(block.content);

        const items =
          Array.isArray(content.items)
            ? content.items
            : [];

        return {
          ...block,

          content: {
            ...content,

            items: items.map((item) => {
              const imageAssetId =
                String(
                  item?.imageAssetId || ""
                ).trim();

              if (!imageAssetId) {
                return item;
              }

              const asset =
                byId.get(imageAssetId);

              if (!asset) {
                return item;
              }

              const payload =
                asObject(asset.payload);

              const imageUrl =
                String(
                  payload.url || ""
                ).trim();

              if (!imageUrl) {
                return item;
              }

              return {
                ...item,

                imageAssetId,

                // Compatibilité renderer existant.
                image: imageUrl,
                imageUrl,

                imageAlt:
                  String(
                    item?.imageAlt || ""
                  ).trim() ||
                  String(
                    payload.altText || ""
                  ).trim() ||
                  asset.title ||
                  "",

                __mediaSource:
                  "asset-engine",

                __mediaVersion:
                  asset.currentVersion ??
                  null,
              };
            }),
          },
        };
      }
    ),
  }));
}

async function hydrateDestinationMediaAssets({
  prisma,
  tenantId,
  pages = [],
}) {
  const references =
    destinationMediaReferences(pages);

  const assets =
    await loadDestinationMediaAssets({
      prisma,
      tenantId,
      references,
    });

  return hydrateDestinationItems(
    pages,
    assets
  );
}

module.exports = {
  asObject,
  blockType,
  isDestinationBlock,
  destinationMediaReferences,
  loadDestinationMediaAssets,
  hydrateDestinationItems,
  hydrateDestinationMediaAssets,
};
