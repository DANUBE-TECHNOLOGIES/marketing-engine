"use strict";

const TEAM_BLOCK_TYPES = new Set([
  "team",
  "equipe",
  "team-grid",
  "equipe-grid",
]);

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
  return TEAM_BLOCK_TYPES.has(blockType(block));
}

function memberAssetId(member) {
  if (!member || typeof member !== "object") return "";

  const image = asObject(member.image);
  const photo = asObject(member.photo);
  const avatar = asObject(member.avatar);
  const portrait = asObject(member.portrait);
  const media = asObject(member.media);

  return String(
    member.imageAssetId ||
    member.photoAssetId ||
    member.avatarAssetId ||
    member.portraitAssetId ||
    member.mediaAssetId ||
    member.assetId ||
    image.assetId ||
    image.id ||
    photo.assetId ||
    photo.id ||
    avatar.assetId ||
    avatar.id ||
    portrait.assetId ||
    portrait.id ||
    media.assetId ||
    media.id ||
    ""
  ).trim();
}

function teamCollections(content) {
  return ["members", "items", "team", "people", "staff"].filter((key) =>
    Array.isArray(content?.[key])
  );
}

function teamMediaReferences(pages = []) {
  const references = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isTeamBlock(block)) continue;

      const content = asObject(block.content);

      for (const key of teamCollections(content)) {
        for (const member of content[key]) {
          const id = memberAssetId(member);
          if (id) references.add(id);
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

function assetImageUrl(asset) {
  const payload = asObject(asset?.payload);
  const file = asObject(payload.file);
  const media = asObject(payload.media);
  return String(
    payload.publicUrl ||
    payload.url ||
    payload.src ||
    payload.fileUrl ||
    payload.storageUrl ||
    payload.originalUrl ||
    file.publicUrl ||
    file.url ||
    media.publicUrl ||
    media.url ||
    ""
  ).trim();
}

function hydrateMember(member, byId) {
  if (!member || typeof member !== "object") return member;

  const existingUrl = String(
    (typeof member.image === "string" ? member.image : "") ||
    member.imageUrl ||
    (typeof member.photo === "string" ? member.photo : "") ||
    member.photoUrl ||
    (typeof member.avatar === "string" ? member.avatar : "") ||
    member.avatarUrl ||
    (typeof member.portrait === "string" ? member.portrait : "") ||
    member.portraitUrl ||
    member.media?.publicUrl ||
    member.media?.url ||
    ""
  ).trim();

  if (existingUrl) {
    return {
      ...member,
      image: existingUrl,
      imageUrl: existingUrl,
    };
  }

  const imageAssetId = memberAssetId(member);
  if (!imageAssetId) return member;

  const asset = byId.get(imageAssetId);
  if (!asset) return member;

  const payload = asObject(asset.payload);
  const imageUrl = assetImageUrl(asset);
  if (!imageUrl) return member;

  const name = String(
    member.name ||
    member.title ||
    ""
  ).trim();

  return {
    ...member,
    imageAssetId,
    image: imageUrl,
    imageUrl,
    imageAlt:
      String(member.imageAlt || member.photoAlt || "").trim() ||
      String(payload.altText || payload.alt || "").trim() ||
      (name ? `Portrait de ${name}` : "") ||
      asset.title ||
      "",
    __mediaSource: "asset-engine",
    __mediaVersion: asset.currentVersion ?? null,
  };
}

function hydrateTeamMembers(
  pages = [],
  assets = []
) {
  const byId = new Map(
    assets.map((asset) => [String(asset.id), asset])
  );

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (!isTeamBlock(block)) return block;

      const content = asObject(block.content);
      const nextContent = { ...content };

      for (const key of teamCollections(content)) {
        nextContent[key] = content[key].map((member) =>
          hydrateMember(member, byId)
        );
      }

      return {
        ...block,
        content: nextContent,
      };
    }),
  }));
}

async function hydrateTeamMediaAssets({
  prisma,
  tenantId,
  pages = [],
}) {
  const references = teamMediaReferences(pages);
  const assets = await loadTeamMediaAssets({
    prisma,
    tenantId,
    references,
  });

  return hydrateTeamMembers(pages, assets);
}

module.exports = {
  TEAM_BLOCK_TYPES,
  asObject,
  blockType,
  isTeamBlock,
  memberAssetId,
  teamCollections,
  teamMediaReferences,
  loadTeamMediaAssets,
  assetImageUrl,
  hydrateMember,
  hydrateTeamMembers,
  hydrateTeamMediaAssets,
};
