const crypto = require("node:crypto");
const prisma = require("../core/prisma/client");
const networkGeo = require("./network-geo.service");
const personReconciliation = require("./network-person-reconciliation.service");
const {
  isTeamBlock,
  isPlaceholderMember,
  memberKnowledgeEntityId,
  memberName,
  teamCollections,
} = require("../modules/minisite-structured-data/person");

function clean(value) {
  return String(value || "").trim();
}

function publishedPage(page) {
  return page?.published === true || clean(page?.status).toLowerCase() === "published";
}

function publishedBlock(block) {
  return clean(block?.status).toLowerCase() === "published";
}

function occurrenceKey(siteSlug, name, candidateSlug) {
  return `${clean(siteSlug)}::${clean(name)}::${clean(candidateSlug)}`;
}

function locateTeamMembers(source, reconciliationAgency) {
  const byKey = new Map(
    (reconciliationAgency?.members || []).map((member) => [
      occurrenceKey(reconciliationAgency.siteSlug, member.name, member.candidateSlug),
      member,
    ])
  );
  const locations = [];

  for (const site of source?.agencySites || []) {
    for (const page of site?.pages || []) {
      if (!publishedPage(page)) continue;

      for (const block of page?.blocks || []) {
        if (!publishedBlock(block) || !isTeamBlock(block)) continue;
        const content = block?.content && typeof block.content === "object" ? block.content : {};

        for (const collectionKey of teamCollections(content)) {
          const collection = content[collectionKey];
          collection.forEach((member, index) => {
            if (!member || typeof member !== "object") return;
            const name = memberName(member);
            if (!name || isPlaceholderMember(member)) return;

            const candidates = [...byKey.entries()]
              .filter(([key]) => key.startsWith(`${clean(reconciliationAgency.siteSlug)}::${clean(name)}::`));
            if (candidates.length !== 1) return;

            const [, reconciliation] = candidates[0];
            locations.push({
              agencyId: source.id,
              agencyName: source.name,
              siteSlug: reconciliationAgency.siteSlug,
              pageId: page.id,
              blockId: block.id,
              collectionKey,
              memberIndex: index,
              name,
              candidateSlug: reconciliation.candidateSlug,
              currentKnowledgeEntityId: memberKnowledgeEntityId(member) || null,
              reconciliation,
              content,
            });
          });
        }
      }
    }
  }

  return locations;
}

function stableItem(item) {
  return {
    agencyId: item.agencyId,
    siteSlug: item.siteSlug,
    blockId: item.blockId,
    collectionKey: item.collectionKey,
    memberIndex: item.memberIndex,
    name: item.name,
    candidateSlug: item.candidateSlug,
    knowledgeEntityId: item.knowledgeEntityId || null,
    action: item.action,
    reason: item.reason || null,
  };
}

async function buildReport({
  tenantSlug = "mondescale",
  tenantResolver = networkGeo.resolveTenantId,
  sourceLoader = networkGeo.listAgencySources,
  reconciliationLoader = personReconciliation.report,
} = {}) {
  const reconciliation = await reconciliationLoader({ tenantSlug });
  const tenantId = reconciliation.tenantId || await tenantResolver(tenantSlug);
  const sources = await sourceLoader(tenantId);
  const sourceByAgencyId = new Map((sources || []).map((source) => [String(source.id), source]));
  const eligible = [];
  const blocked = [];
  const noop = [];

  for (const agency of reconciliation.agencies || []) {
    const source = sourceByAgencyId.get(String(agency.agencyId));
    if (!source) continue;
    const locations = locateTeamMembers(source, agency);

    for (const location of locations) {
      const r = location.reconciliation;
      const base = {
        agencyId: location.agencyId,
        agencyName: location.agencyName,
        siteSlug: location.siteSlug,
        pageId: location.pageId,
        blockId: location.blockId,
        collectionKey: location.collectionKey,
        memberIndex: location.memberIndex,
        name: location.name,
        candidateSlug: location.candidateSlug,
      };

      if (r.status === "linked") {
        noop.push({
          ...base,
          knowledgeEntityId: r.knowledgeEntityId,
          action: "noop",
          reason: "already_explicitly_linked",
        });
        continue;
      }

      if (r.status === "canonical_match" && r?.matchedEntity?.id && r?.matchedEntity?.status === "published") {
        eligible.push({
          ...base,
          knowledgeEntityId: r.matchedEntity.id,
          action: "set_knowledge_entity_id",
          reason: "exact_canonical_person",
        });
        continue;
      }

      blocked.push({
        ...base,
        knowledgeEntityId: null,
        action: "blocked",
        reason: r.status === "ambiguous" ? "ambiguous_person" : "person_not_yet_canonical",
      });
    }
  }

  const sort = (a, b) => `${a.siteSlug}:${a.blockId}:${a.collectionKey}:${a.memberIndex}`.localeCompare(`${b.siteSlug}:${b.blockId}:${b.collectionKey}:${b.memberIndex}`);
  eligible.sort(sort);
  blocked.sort(sort);
  noop.sort(sort);

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId,
    tenantSlug,
    summary: {
      patchCount: eligible.length,
      blockedCount: blocked.length,
      noopCount: noop.length,
    },
    eligible,
    blocked,
    noop,
  };
}

function approvalPayload(report) {
  return {
    tenantId: report?.tenantId || null,
    tenantSlug: report?.tenantSlug || null,
    eligible: (report?.eligible || []).map(stableItem),
    blocked: (report?.blocked || []).map(stableItem),
    noop: (report?.noop || []).map(stableItem),
  };
}

function approvalTokenForReport(report) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(approvalPayload(report)), "utf8")
    .digest("hex");
}

function validateApproval(report, token) {
  if (!token || typeof token !== "string") {
    throw new Error("Une approbation explicite du backlink équipe réseau est obligatoire.");
  }
  const expected = approvalTokenForReport(report);
  const supplied = token.trim().toLowerCase();
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    throw new Error("L'approbation backlink équipe ne correspond pas au rapport courant.");
  }
  return true;
}

async function preview(options = {}) {
  const report = await buildReport(options);
  return { report, approvalToken: approvalTokenForReport(report) };
}

async function loadBlock(blockId, { prismaClient = prisma } = {}) {
  return prismaClient.pageBlock.findUnique({
    where: { id: blockId },
    select: { id: true, blockType: true, content: true, status: true, pageId: true },
  });
}

function patchedContent(block, approved) {
  if (!block || !isTeamBlock(block) || !publishedBlock(block)) {
    throw new Error(`Bloc équipe publié introuvable: ${approved.blockId}`);
  }
  const content = block.content && typeof block.content === "object" ? block.content : {};
  const collection = content?.[approved.collectionKey];
  if (!Array.isArray(collection)) {
    throw new Error(`Collection équipe introuvable: ${approved.collectionKey}`);
  }
  const member = collection[approved.memberIndex];
  if (!member || typeof member !== "object" || clean(memberName(member)) !== clean(approved.name)) {
    throw new Error(`Le conseiller ${approved.name} a changé depuis le preview.`);
  }
  if (memberKnowledgeEntityId(member)) {
    if (memberKnowledgeEntityId(member) === approved.knowledgeEntityId) return content;
    throw new Error(`La liaison Knowledge de ${approved.name} a changé depuis le preview.`);
  }

  const nextCollection = [...collection];
  nextCollection[approved.memberIndex] = {
    ...member,
    knowledgeEntityId: approved.knowledgeEntityId,
  };
  return {
    ...content,
    [approved.collectionKey]: nextCollection,
  };
}

function groupByBlock(items = []) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.blockId)) groups.set(item.blockId, []);
    groups.get(item.blockId).push(item);
  }
  return groups;
}

async function apply({
  approvalToken,
  tenantSlug = "mondescale",
  reportLoader = buildReport,
  blockLoader = loadBlock,
  updateBlock = (id, content) => prisma.pageBlock.update({ where: { id }, data: { content } }),
} = {}) {
  if (!approvalToken) {
    throw new Error("Une approbation explicite du backlink équipe réseau est obligatoire.");
  }

  const current = await reportLoader({ tenantSlug });
  validateApproval(current, approvalToken);

  const preflight = [];
  for (const [blockId, approvedItems] of groupByBlock(current.eligible || [])) {
    const block = await blockLoader(blockId);
    let content = block?.content;

    for (const approved of approvedItems) {
      content = patchedContent({ ...block, content }, approved);
    }

    preflight.push({
      blockId,
      content,
      approvedItems,
    });
  }

  const results = [];
  for (const item of preflight) {
    await updateBlock(item.blockId, item.content);
    for (const approved of item.approvedItems) {
      results.push({ ...stableItem(approved), result: "patched" });
    }
  }

  return {
    mode: "apply",
    destructive: false,
    tenantId: current.tenantId,
    tenantSlug: current.tenantSlug,
    patchedCount: results.length,
    updatedBlockCount: preflight.length,
    blocked: current.blocked || [],
    noop: current.noop || [],
    results,
  };
}

module.exports = {
  approvalPayload,
  approvalTokenForReport,
  apply,
  buildReport,
  groupByBlock,
  loadBlock,
  locateTeamMembers,
  patchedContent,
  preview,
  stableItem,
  validateApproval,
};
