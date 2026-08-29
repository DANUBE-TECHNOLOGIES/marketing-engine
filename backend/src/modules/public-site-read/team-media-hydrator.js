"use strict";

const TEAM_BLOCK_TYPES = new Set([
  "team",
  "equipe",
  "team-grid",
  "equipe-grid",
]);

const TEAM_COLLECTION_KEYS = Object.freeze([
  "members",
  "items",
  "team",
  "teamMembers",
  "people",
  "staff",
  "advisors",
  "consultants",
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
  const photoAsset = asObject(member.photoAsset);
  const portraitAsset = asObject(member.portraitAsset);
  const profilePhoto = asObject(member.profilePhoto);
  const profileImage = asObject(member.profileImage);
  const picture = asObject(member.picture);

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
    photoAsset.assetId ||
    photoAsset.id ||
    portraitAsset.assetId ||
    portraitAsset.id ||
    profilePhoto.assetId ||
    profilePhoto.id ||
    profileImage.assetId ||
    profileImage.id ||
    picture.assetId ||
    picture.id ||
    ""
  ).trim();
}

function teamCollections(content) {
  return TEAM_COLLECTION_KEYS.filter((key) => Array.isArray(content?.[key]));
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

  /*
   * The page publication is the public gate. Historical portrait assets can
   * still carry legacy type/status values even though a published team block
   * explicitly references them. Filtering here made those valid portraits
   * disappear from the public contract. Only deleted assets remain excluded.
   */
  return prisma.asset.findMany({
    where: {
      tenantId: String(tenantId),
      id: { in: references },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      payload: true,
      currentVersion: true,
    },
  });
}

function assetImageUrl(asset) {
  const payload = asObject(asset?.payload);
  const file = asObject(payload.file);
  const media = asObject(payload.media);
  const image = asObject(payload.image);
  const original = asObject(payload.original);
  return String(
    payload.publicUrl ||
    payload.url ||
    payload.src ||
    payload.path ||
    payload.href ||
    payload.fileUrl ||
    payload.storageUrl ||
    payload.originalUrl ||
    file.publicUrl ||
    file.url ||
    file.src ||
    media.publicUrl ||
    media.url ||
    media.src ||
    image.publicUrl ||
    image.url ||
    image.src ||
    original.publicUrl ||
    original.url ||
    ""
  ).trim();
}

function directMemberImageUrl(member) {
  if (!member || typeof member !== "object") return "";

  const candidates = [
    typeof member.image === "string" ? member.image : "",
    member.imageUrl,
    typeof member.photo === "string" ? member.photo : "",
    member.photoUrl,
    typeof member.avatar === "string" ? member.avatar : "",
    member.avatarUrl,
    typeof member.portrait === "string" ? member.portrait : "",
    member.portraitUrl,
    member.photoAsset?.publicUrl,
    member.photoAsset?.url,
    member.portraitAsset?.publicUrl,
    member.portraitAsset?.url,
    member.profilePhoto?.publicUrl,
    member.profilePhoto?.url,
    member.profilePhotoUrl,
    member.profileImage?.publicUrl,
    member.profileImage?.url,
    member.profileImageUrl,
    member.picture?.publicUrl,
    member.picture?.url,
    member.pictureUrl,
    member.media?.publicUrl,
    member.media?.url,
  ];

  return String(candidates.find((value) => typeof value === "string" && value.trim()) || "").trim();
}

function hydrateMember(member, byId) {
  if (!member || typeof member !== "object") return member;

  const existingUrl = directMemberImageUrl(member);
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
  TEAM_COLLECTION_KEYS,
  asObject,
  blockType,
  isTeamBlock,
  memberAssetId,
  teamCollections,
  teamMediaReferences,
  loadTeamMediaAssets,
  assetImageUrl,
  directMemberImageUrl,
  hydrateMember,
  hydrateTeamMembers,
  hydrateTeamMediaAssets,
};
