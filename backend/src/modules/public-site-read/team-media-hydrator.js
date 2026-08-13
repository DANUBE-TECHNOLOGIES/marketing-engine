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

function isTeamBlock(block) {
  return blockType(block) === "team";
}

function teamMediaReferences(pages = []) {
  const references = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isTeamBlock(block)) {
        continue;
      }

      const content = asObject(block.content);

      const collections = [
        content.members,
        content.items,
        content.team,
      ];

      for (const collection of collections) {
        for (
          const member of
          Array.isArray(collection)
            ? collection
            : []
        ) {
          const id = String(
            member?.imageAssetId || ""
          ).trim();

          if (id) {
            references.add(id);
          }
        }
      }
    }
  }

  return [...references];
}

async function loadTeamMediaAssets({
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

function hydrateMember(member, byId) {
  if (
    !member ||
    typeof member !== "object"
  ) {
    return member;
  }

  const imageAssetId = String(
    member.imageAssetId || ""
  ).trim();

  if (!imageAssetId) {
    return member;
  }

  const asset = byId.get(imageAssetId);

  if (!asset) {
    return member;
  }

  const payload = asObject(asset.payload);

  const imageUrl = String(
    payload.url || ""
  ).trim();

  if (!imageUrl) {
    return member;
  }

  const name = String(
    member.name ||
    member.title ||
    ""
  ).trim();

  return {
    ...member,

    imageAssetId,

    // Compatibilité avec TeamRenderer existant.
    image: imageUrl,
    imageUrl,

    imageAlt:
      String(
        member.imageAlt || ""
      ).trim() ||
      String(
        payload.altText || ""
      ).trim() ||
      (name ? `Portrait de ${name}` : "") ||
      asset.title ||
      "",

    __mediaSource: "asset-engine",

    __mediaVersion:
      asset.currentVersion ??
      null,
  };
}

function hydrateTeamMembers(
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
        if (!isTeamBlock(block)) {
          return block;
        }

        const content =
          asObject(block.content);

        const nextContent = {
          ...content,
        };

        for (const key of [
          "members",
          "items",
          "team",
        ]) {
          if (!Array.isArray(content[key])) {
            continue;
          }

          nextContent[key] =
            content[key].map((member) =>
              hydrateMember(member, byId)
            );
        }

        return {
          ...block,
          content: nextContent,
        };
      }
    ),
  }));
}

async function hydrateTeamMediaAssets({
  prisma,
  tenantId,
  pages = [],
}) {
  const references =
    teamMediaReferences(pages);

  const assets =
    await loadTeamMediaAssets({
      prisma,
      tenantId,
      references,
    });

  return hydrateTeamMembers(
    pages,
    assets
  );
}

module.exports = {
  asObject,
  blockType,
  isTeamBlock,
  teamMediaReferences,
  loadTeamMediaAssets,
  hydrateMember,
  hydrateTeamMembers,
  hydrateTeamMediaAssets,
};
