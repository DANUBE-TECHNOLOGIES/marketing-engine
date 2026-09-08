const crypto = require("node:crypto");
const prisma = require("../core/prisma/client");
const {
  isPlaceholderMember,
  isTeamBlock,
  memberKnowledgeEntityId,
  memberName,
  teamCollections,
} = require("../modules/minisite-structured-data/person");
const networkGeo = require("./network-geo.service");
const personReconciliation = require("./network-person-reconciliation.service");

function clean(value) {
  return String(value || "").trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])])
  );
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(value)), "utf8")
    .digest("hex");
}

function asIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function publishedPage(page) {
  return page?.published === true || clean(page?.status).toLowerCase() === "published";
}

function publishedBlock(block) {
  return clean(block?.status).toLowerCase() === "published";
}

function collectTeamOccurrences(source) {
  const occurrences = [];
  const siteSlug = clean(source?.seoSite?.slug);
  if (!siteSlug) return occurrences;

  for (const site of source?.agencySites || []) {
    for (const page of site?.pages || []) {
      if (!publishedPage(page)) continue;

      for (const block of page?.blocks || []) {
        if (!publishedBlock(block) || !isTeamBlock(block)) continue;

        const content = block?.content && typeof block.content === "object"
          ? block.content
          : {};
        const blockHash = hashValue(content);

        for (const collectionKey of teamCollections(content)) {
          const collection = content[collectionKey];

          for (let memberIndex = 0; memberIndex < collection.length; memberIndex += 1) {
            const member = collection[memberIndex];
            if (!member || typeof member !== "object") continue;

            const name = memberName(member);
            if (!name || isPlaceholderMember(member)) continue;

            occurrences.push({
              agencyId: source.id,
              agencyName: source.name,
              siteSlug,
              siteId: site.id,
              pageId: page.id,
              pageSlug: page.slug,
              blockId: block.id,
              blockUpdatedAt: asIso(block.updatedAt),
              blockHash,
              collectionKey,
              memberIndex,
              memberHash: hashValue(member),
              name,
              currentKnowledgeEntityId: memberKnowledgeEntityId(member) || null,
              candidateSlug: personReconciliation.canonicalPersonSlug(name, siteSlug),
            });
          }
        }
      }
    }
  }

  return occurrences;
}

function resolveOccurrence(occurrence, peopleIndex) {
  const explicitId = clean(occurrence.currentKnowledgeEntityId);

  if (explicitId) {
    const person = peopleIndex.byId.get(explicitId);
    if (!person || person.type !== "person" || person.status !== "published") {
      return {
        ...occurrence,
        status: "blocked",
        expectedKnowledgeEntityId: null,
        reason: "explicit_person_missing_or_not_published",
      };
    }

    return {
      ...occurrence,
      status: "noop",
      expectedKnowledgeEntityId: person.id,
      reason: "explicit_person_link_already_present",
    };
  }

  const person = peopleIndex.bySlugLanguage.get(`fr:${occurrence.candidateSlug}`);
  if (!person || person.type !== "person" || person.status !== "published") {
    return {
      ...occurrence,
      status: "blocked",
      expectedKnowledgeEntityId: null,
      reason: "canonical_person_missing_or_not_published",
    };
  }

  return {
    ...occurrence,
    status: "link_required",
    expectedKnowledgeEntityId: person.id,
    reason: "exact_canonical_person_slug_language",
  };
}

function stableLink(item) {
  return {
    agencyId: item.agencyId,
    siteSlug: item.siteSlug,
    pageId: item.pageId,
    blockId: item.blockId,
    blockUpdatedAt: item.blockUpdatedAt,
    blockHash: item.blockHash,
    collectionKey: item.collectionKey,
    memberIndex: item.memberIndex,
    memberHash: item.memberHash,
    name: item.name,
    candidateSlug: item.candidateSlug,
    currentKnowledgeEntityId: item.currentKnowledgeEntityId || null,
    expectedKnowledgeEntityId: item.expectedKnowledgeEntityId || null,
    status: item.status,
    reason: item.reason,
  };
}

function sortLinks(items) {
  return [...(items || [])]
    .map(stableLink)
    .sort((a, b) =>
      `${a.siteSlug}:${a.blockId}:${a.collectionKey}:${a.memberIndex}`
        .localeCompare(`${b.siteSlug}:${b.blockId}:${b.collectionKey}:${b.memberIndex}`)
    );
}

async function report({
  tenantSlug = "mondescale",
  tenantId,
  tenantResolver = networkGeo.resolveTenantId,
  sourceLoader = networkGeo.listAgencySources,
  peopleLoader = personReconciliation.listKnowledgePeople,
} = {}) {
  const resolvedTenantId = tenantId || await tenantResolver(tenantSlug);
  const [sources, people] = await Promise.all([
    sourceLoader(resolvedTenantId),
    peopleLoader(),
  ]);
  const peopleIndex = personReconciliation.indexes(people);
  const resolved = [];

  for (const source of sources || []) {
    for (const occurrence of collectTeamOccurrences(source)) {
      resolved.push(resolveOccurrence(occurrence, peopleIndex));
    }
  }

  const linkRequired = resolved.filter((item) => item.status === "link_required");
  const noop = resolved.filter((item) => item.status === "noop");
  const blocked = resolved.filter((item) => item.status === "blocked");

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId: resolvedTenantId,
    tenantSlug,
    summary: {
      occurrenceCount: resolved.length,
      linkRequiredCount: linkRequired.length,
      noopCount: noop.length,
      blockedCount: blocked.length,
      affectedBlockCount: new Set(linkRequired.map((item) => item.blockId)).size,
    },
    linkRequired: sortLinks(linkRequired),
    noop: sortLinks(noop),
    blocked: sortLinks(blocked),
  };
}

function approvalPayload(currentReport) {
  return {
    tenantId: currentReport?.tenantId || null,
    tenantSlug: currentReport?.tenantSlug || null,
    linkRequired: sortLinks(currentReport?.linkRequired),
    noop: sortLinks(currentReport?.noop),
    blocked: sortLinks(currentReport?.blocked),
  };
}

function approvalTokenForReport(currentReport) {
  return hashValue(approvalPayload(currentReport));
}

function validateApproval(currentReport, approvalToken) {
  if (!approvalToken || typeof approvalToken !== "string") {
    throw new Error("Une approbation explicite des liaisons équipe est obligatoire.");
  }

  const expected = approvalTokenForReport(currentReport);
  const supplied = approvalToken.trim().toLowerCase();
  if (supplied.length !== expected.length) {
    throw new Error("L'approbation des liaisons équipe ne correspond pas au rapport courant.");
  }

  if (!crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    throw new Error("L'approbation des liaisons équipe ne correspond pas au rapport courant.");
  }

  return true;
}

function memberAt(content, item) {
  const collection = content?.[item.collectionKey];
  return Array.isArray(collection) ? collection[item.memberIndex] : null;
}

function cloneWithKnowledgeLink(content, item) {
  const next = structuredClone(content);
  const collection = next[item.collectionKey];
  const member = collection?.[item.memberIndex];
  collection[item.memberIndex] = {
    ...member,
    knowledgeEntityId: item.expectedKnowledgeEntityId,
  };
  return next;
}

async function preview(options = {}) {
  const currentReport = await report(options);
  return {
    report: currentReport,
    approvalToken: approvalTokenForReport(currentReport),
  };
}

async function apply({
  approvalToken,
  tenantSlug = "mondescale",
  reportLoader = report,
  prismaClient = prisma,
} = {}) {
  if (!approvalToken) {
    throw new Error("Une approbation explicite des liaisons équipe est obligatoire.");
  }

  const currentReport = await reportLoader({ tenantSlug });
  validateApproval(currentReport, approvalToken);

  if (!currentReport.linkRequired?.length) {
    return {
      mode: "apply",
      destructive: false,
      tenantId: currentReport.tenantId,
      tenantSlug: currentReport.tenantSlug,
      updatedBlockCount: 0,
      linkedOccurrenceCount: 0,
      blocked: currentReport.blocked || [],
    };
  }

  const result = await prismaClient.$transaction(async (tx) => {
    const blockStates = new Map();

    // Full transaction-local preflight before the first update.
    for (const item of currentReport.linkRequired) {
      if (!blockStates.has(item.blockId)) {
        const block = await tx.pageBlock.findUnique({
          where: { id: item.blockId },
          select: {
            id: true,
            content: true,
            updatedAt: true,
            page: {
              select: {
                site: {
                  select: {
                    tenantId: true,
                    agencyId: true,
                  },
                },
              },
            },
          },
        });

        if (!block || block.page?.site?.tenantId !== currentReport.tenantId) {
          throw new Error(`Bloc équipe ${item.blockId} introuvable pour ce tenant.`);
        }
        if (String(block.page?.site?.agencyId) !== String(item.agencyId)) {
          throw new Error(`Le bloc équipe ${item.blockId} a changé d'agence.`);
        }
        if (asIso(block.updatedAt) !== item.blockUpdatedAt || hashValue(block.content) !== item.blockHash) {
          throw new Error(`Le bloc équipe ${item.blockId} a changé depuis le preview.`);
        }

        blockStates.set(item.blockId, block);
      }

      const block = blockStates.get(item.blockId);
      const member = memberAt(block.content, item);
      if (!member || hashValue(member) !== item.memberHash || memberName(member) !== item.name) {
        throw new Error(`Le profil ${item.name} a changé depuis le preview.`);
      }

      const currentId = memberKnowledgeEntityId(member) || null;
      if (currentId && currentId !== item.expectedKnowledgeEntityId) {
        throw new Error(`Le profil ${item.name} possède désormais une autre liaison Knowledge.`);
      }

      const person = await tx.knowledgeEntity.findUnique({
        where: { id: item.expectedKnowledgeEntityId },
        select: { id: true, type: true, status: true },
      });
      if (!person || person.type !== "person" || person.status !== "published") {
        throw new Error(`La Person Knowledge de ${item.name} n'est plus publiée.`);
      }
    }

    const byBlock = new Map();
    for (const item of currentReport.linkRequired) {
      const entries = byBlock.get(item.blockId) || [];
      entries.push(item);
      byBlock.set(item.blockId, entries);
    }

    let linkedOccurrenceCount = 0;
    for (const [blockId, items] of byBlock.entries()) {
      let content = structuredClone(blockStates.get(blockId).content);
      for (const item of items) {
        content = cloneWithKnowledgeLink(content, item);
        linkedOccurrenceCount += 1;
      }

      await tx.pageBlock.update({
        where: { id: blockId },
        data: { content },
      });
    }

    return {
      updatedBlockCount: byBlock.size,
      linkedOccurrenceCount,
    };
  });

  return {
    mode: "apply",
    destructive: false,
    tenantId: currentReport.tenantId,
    tenantSlug: currentReport.tenantSlug,
    ...result,
    blocked: currentReport.blocked || [],
  };
}

module.exports = {
  approvalPayload,
  approvalTokenForReport,
  apply,
  cloneWithKnowledgeLink,
  collectTeamOccurrences,
  hashValue,
  memberAt,
  preview,
  report,
  resolveOccurrence,
  stableValue,
  validateApproval,
};
