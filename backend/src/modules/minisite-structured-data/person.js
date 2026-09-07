"use strict";

const {
  cleanText,
  removeEmpty,
  siteUrl,
} = require("./utils");

const TEAM_BLOCK_TYPES = new Set([
  "team",
  "equipe",
  "team-grid",
  "equipe-grid",
]);

const TEAM_COLLECTION_KEYS = [
  "members",
  "items",
  "team",
  "teamMembers",
  "people",
  "staff",
  "advisors",
  "consultants",
];

function normalizedLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function personSlug(value) {
  return normalizedLabel(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function blockType(block) {
  return normalizedLabel(block?.blockType || block?.type);
}

function isTeamBlock(block) {
  return TEAM_BLOCK_TYPES.has(blockType(block));
}

function teamCollections(content) {
  return TEAM_COLLECTION_KEYS.filter((key) => Array.isArray(content?.[key]));
}

function memberName(member) {
  return cleanText(
    member?.name ||
    member?.fullName ||
    member?.title
  );
}

function isPlaceholderMember(member) {
  const label = normalizedLabel(memberName(member));
  return [
    "votre equipe",
    "notre equipe",
    "equipe",
    "vos conseillers",
    "nos conseillers",
  ].includes(label);
}

function memberImage(member) {
  const candidates = [
    typeof member?.image === "string" ? member.image : null,
    member?.imageUrl,
    typeof member?.photo === "string" ? member.photo : null,
    member?.photoUrl,
    typeof member?.avatar === "string" ? member.avatar : null,
    member?.avatarUrl,
    typeof member?.portrait === "string" ? member.portrait : null,
    member?.portraitUrl,
    member?.profilePhotoUrl,
    member?.profileImageUrl,
    member?.pictureUrl,
  ];

  return cleanText(candidates.find((value) => cleanText(value)));
}

function memberDescription(member) {
  return cleanText(
    member?.description ||
    member?.bio ||
    member?.about ||
    member?.summary
  );
}

function memberJobTitle(member) {
  return cleanText(
    member?.jobTitle ||
    member?.role ||
    member?.position
  );
}

function memberIdentity(member) {
  const name = memberName(member);
  if (!name) return "";

  return cleanText(member?.id) ||
    cleanText(member?.email) ||
    normalizedLabel(name);
}

function memberKnowledgeEntityId(member) {
  return cleanText(
    member?.knowledgeEntityId ||
    member?.knowledge?.entityId ||
    member?.knowledge?.id
  );
}

function collectVerifiedTeamMembers(pages = []) {
  const members = new Map();

  for (const page of pages || []) {
    for (const block of page?.blocks || []) {
      if (!isTeamBlock(block)) continue;

      const content = block?.content && typeof block.content === "object"
        ? block.content
        : {};

      for (const key of teamCollections(content)) {
        for (const member of content[key]) {
          if (!member || typeof member !== "object") continue;
          if (!memberName(member) || isPlaceholderMember(member)) continue;

          const identity = memberIdentity(member);
          if (identity && !members.has(identity)) {
            members.set(identity, member);
          }
        }
      }
    }
  }

  return [...members.values()];
}

function collectKnowledgeEntityIds(pages = []) {
  return [...new Set(
    collectVerifiedTeamMembers(pages)
      .map(memberKnowledgeEntityId)
      .filter(Boolean)
  )];
}

function isPublishedKnowledgeEntity(entity, type) {
  return Boolean(
    entity &&
    cleanText(entity.type).toLowerCase() === type &&
    cleanText(entity.status).toLowerCase() === "published"
  );
}

function explicitExpertiseNames(knowledgePerson) {
  if (!isPublishedKnowledgeEntity(knowledgePerson, "person")) return [];

  const names = [];
  const seen = new Set();

  for (const relation of knowledgePerson.outgoingRelations || []) {
    if (cleanText(relation?.relationType).toLowerCase() !== "expert_in") continue;

    const target = relation?.target;
    if (!isPublishedKnowledgeEntity(target, "expertise")) continue;

    const title = cleanText(target.title);
    const key = normalizedLabel(title);
    if (!title || seen.has(key)) continue;

    seen.add(key);
    names.push(title);
  }

  return names;
}

function linkedKnowledgePerson(member, knowledgePeople = []) {
  const knowledgeEntityId = memberKnowledgeEntityId(member);
  if (!knowledgeEntityId) return null;

  return (knowledgePeople || []).find((entity) =>
    String(entity?.id || "") === knowledgeEntityId &&
    isPublishedKnowledgeEntity(entity, "person")
  ) || null;
}

function buildPerson({ member, site, publicOrigin } = {}) {
  const name = memberName(member);
  if (!name || isPlaceholderMember(member)) return null;

  const agencyUrl = siteUrl(publicOrigin, site?.slug);
  const stablePart = personSlug(member?.id || name);
  if (!stablePart) return null;

  const knowledgePerson = linkedKnowledgePerson(
    member,
    site?.knowledgePeople || []
  );
  const knowsAbout = explicitExpertiseNames(knowledgePerson);

  return removeEmpty({
    "@type": "Person",
    "@id": `${agencyUrl}#person-${stablePart}`,
    name,
    jobTitle: memberJobTitle(member),
    description: memberDescription(member),
    image: memberImage(member),
    worksFor: {
      "@id": `${agencyUrl}#travel-agency`,
    },
    knowsAbout,
  });
}

function buildPeople({ site, publicOrigin } = {}) {
  return collectVerifiedTeamMembers(site?.pages).map((member) =>
    buildPerson({ member, site, publicOrigin })
  ).filter(Boolean);
}

module.exports = {
  TEAM_BLOCK_TYPES,
  TEAM_COLLECTION_KEYS,
  blockType,
  buildPeople,
  buildPerson,
  collectKnowledgeEntityIds,
  collectVerifiedTeamMembers,
  explicitExpertiseNames,
  isPlaceholderMember,
  isPublishedKnowledgeEntity,
  isTeamBlock,
  linkedKnowledgePerson,
  memberDescription,
  memberImage,
  memberJobTitle,
  memberKnowledgeEntityId,
  memberName,
  normalizedLabel,
  personSlug,
  teamCollections,
};
