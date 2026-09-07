const prisma = require("../core/prisma/client");
const {
  memberKnowledgeEntityId,
  normalizedLabel,
  personSlug,
} = require("../modules/minisite-structured-data/person");
const networkGeo = require("./network-geo.service");

function clean(value) {
  return String(value || "").trim();
}

function personName(member) {
  return clean(member?.name || member?.fullName || member?.title);
}

function canonicalPersonSlug(name, agencySlug) {
  const personPart = personSlug(name);
  const agencyPart = clean(agencySlug).toLowerCase();
  return personPart && agencyPart ? `${personPart}-${agencyPart}` : "";
}

async function listKnowledgePeople({ prismaClient = prisma } = {}) {
  if (!prismaClient?.knowledgeEntity) return [];

  return prismaClient.knowledgeEntity.findMany({
    where: {
      type: "person",
    },
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      status: true,
      language: true,
    },
    orderBy: [
      { title: "asc" },
      { id: "asc" },
    ],
  });
}

function indexes(people = []) {
  const byId = new Map();
  const bySlugLanguage = new Map();
  const byNormalizedTitle = new Map();

  for (const person of people || []) {
    const id = clean(person?.id);
    const slug = clean(person?.slug);
    const language = clean(person?.language || "fr");
    const titleKey = normalizedLabel(person?.title);

    if (id) byId.set(id, person);
    if (slug) bySlugLanguage.set(`${language}:${slug}`, person);

    if (titleKey) {
      const existing = byNormalizedTitle.get(titleKey) || [];
      existing.push(person);
      byNormalizedTitle.set(titleKey, existing);
    }
  }

  return { byId, bySlugLanguage, byNormalizedTitle };
}

function classifyMember({ member, agencySlug, peopleIndex, language = "fr" }) {
  const name = personName(member);
  const explicitId = memberKnowledgeEntityId(member);
  const candidateSlug = canonicalPersonSlug(name, agencySlug);

  if (explicitId) {
    const linked = peopleIndex.byId.get(explicitId);
    if (linked?.type === "person") {
      return {
        status: "linked",
        name,
        knowledgeEntityId: explicitId,
        candidateSlug,
        matchedEntity: linked,
        reason: "explicit_knowledge_entity_id",
      };
    }

    return {
      status: "ambiguous",
      name,
      knowledgeEntityId: explicitId,
      candidateSlug,
      matchedEntity: null,
      reason: "explicit_link_missing_or_not_person",
    };
  }

  const canonical = peopleIndex.bySlugLanguage.get(`${language}:${candidateSlug}`);
  if (canonical?.type === "person") {
    return {
      status: "canonical_match",
      name,
      knowledgeEntityId: null,
      candidateSlug,
      matchedEntity: canonical,
      reason: "exact_canonical_slug_language",
    };
  }

  const sameTitle = peopleIndex.byNormalizedTitle.get(normalizedLabel(name)) || [];
  if (sameTitle.length) {
    return {
      status: "ambiguous",
      name,
      knowledgeEntityId: null,
      candidateSlug,
      matchedEntity: null,
      candidates: sameTitle.map((person) => ({
        id: person.id,
        slug: person.slug,
        title: person.title,
        status: person.status,
        language: person.language,
      })),
      reason: "same_normalized_title_exists_under_other_slug",
    };
  }

  return {
    status: "new_candidate",
    name,
    knowledgeEntityId: null,
    candidateSlug,
    matchedEntity: null,
    reason: "no_existing_person_conflict",
  };
}

async function report({
  tenantSlug = "mondescale",
  tenantId,
  tenantResolver = networkGeo.resolveTenantId,
  sourceLoader = networkGeo.listAgencySources,
  peopleLoader = listKnowledgePeople,
} = {}) {
  const resolvedTenantId = tenantId || await tenantResolver(tenantSlug);
  const [sources, people] = await Promise.all([
    sourceLoader(resolvedTenantId),
    peopleLoader(),
  ]);

  const peopleIndex = indexes(people);
  const agencies = [];
  const summary = {
    agencyCount: 0,
    explicitMemberCount: 0,
    linked: 0,
    canonicalMatch: 0,
    newCandidate: 0,
    ambiguous: 0,
  };

  for (const source of sources || []) {
    const agencySlug = clean(source?.seoSite?.slug);
    if (!agencySlug) continue;

    const audit = networkGeo.teamAudit(source);
    const members = audit.members.map((member) =>
      classifyMember({
        member,
        agencySlug,
        peopleIndex,
      })
    );

    const counts = members.reduce(
      (acc, item) => {
        if (item.status === "linked") acc.linked += 1;
        if (item.status === "canonical_match") acc.canonicalMatch += 1;
        if (item.status === "new_candidate") acc.newCandidate += 1;
        if (item.status === "ambiguous") acc.ambiguous += 1;
        return acc;
      },
      { linked: 0, canonicalMatch: 0, newCandidate: 0, ambiguous: 0 }
    );

    summary.agencyCount += 1;
    summary.explicitMemberCount += members.length;
    summary.linked += counts.linked;
    summary.canonicalMatch += counts.canonicalMatch;
    summary.newCandidate += counts.newCandidate;
    summary.ambiguous += counts.ambiguous;

    agencies.push({
      agencyId: source.id,
      agencyName: source.name,
      siteSlug: agencySlug,
      counts,
      members,
    });
  }

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId: resolvedTenantId,
    tenantSlug,
    knowledgePersonCount: (people || []).length,
    summary,
    agencies,
  };
}

module.exports = {
  canonicalPersonSlug,
  classifyMember,
  indexes,
  listKnowledgePeople,
  personName,
  report,
};
