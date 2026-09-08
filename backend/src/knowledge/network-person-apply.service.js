const crypto = require("node:crypto");
const knowledgeRepository = require("./knowledge.repository");
const knowledgeService = require("./knowledge.service");
const knowledgeRelationService = require("./knowledge-relation.service");
const personReconciliation = require("./network-person-reconciliation.service");

function clean(value) {
  return String(value || "").trim();
}

function stableMember(item) {
  return {
    agencyId: item.agencyId,
    agencyName: item.agencyName || null,
    siteSlug: item.siteSlug,
    name: item.name,
    status: item.status,
    candidateSlug: item.candidateSlug || null,
    personId: item.personId || null,
    agencyKnowledgeId: item.agencyKnowledgeId || null,
    action: item.action,
    reason: item.reason || null,
  };
}

function approvalPayload(report) {
  return {
    tenantSlug: report?.tenantSlug || null,
    tenantId: report?.tenantId || null,
    eligible: [...(report?.eligible || [])]
      .map(stableMember)
      .sort((a, b) => `${a.siteSlug}:${a.candidateSlug || a.name}`.localeCompare(`${b.siteSlug}:${b.candidateSlug || b.name}`)),
    blocked: [...(report?.blocked || [])]
      .map(stableMember)
      .sort((a, b) => `${a.siteSlug}:${a.candidateSlug || a.name}`.localeCompare(`${b.siteSlug}:${b.candidateSlug || b.name}`)),
  };
}

function approvalTokenForReport(report) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(approvalPayload(report)), "utf8")
    .digest("hex");
}

function validateApproval(report, token) {
  if (!token || typeof token !== "string") {
    throw new Error("Une approbation explicite du plan Person réseau est obligatoire.");
  }

  const expected = approvalTokenForReport(report);
  const supplied = token.trim().toLowerCase();

  if (supplied.length !== expected.length) {
    throw new Error("L'approbation Person réseau ne correspond pas au rapport courant.");
  }

  if (!crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    throw new Error("L'approbation Person réseau ne correspond pas au rapport courant.");
  }

  return true;
}

function hasWorksAt(person, agencyKnowledgeId) {
  return Boolean(
    person?.outgoingRelations?.some(
      (relation) =>
        relation?.relationType === "works_at" &&
        clean(relation?.targetId || relation?.target?.id) === clean(agencyKnowledgeId)
    )
  );
}

async function agencyKnowledgeForSlug(siteSlug, {
  entityLookup = knowledgeRepository.findBySlugAndLanguage,
} = {}) {
  const entity = await entityLookup(`mondescale-${clean(siteSlug)}`, "fr");
  return entity?.type === "agency" && entity?.status === "published" ? entity : null;
}

function personPayload(member) {
  return {
    type: "person",
    slug: member.candidateSlug,
    title: member.name,
    status: "published",
    language: "fr",
    summary: null,
  };
}

async function buildApplyReport({
  tenantSlug = "mondescale",
  reconciliationLoader = personReconciliation.report,
  entityLookup = knowledgeRepository.findBySlugAndLanguage,
  detailLookup = knowledgeRepository.findById,
} = {}) {
  const source = await reconciliationLoader({ tenantSlug });
  const eligible = [];
  const blocked = [];

  for (const agency of source.agencies || []) {
    const agencyKnowledge = await agencyKnowledgeForSlug(agency.siteSlug, { entityLookup });

    for (const member of agency.members || []) {
      const base = {
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        siteSlug: agency.siteSlug,
        name: member.name,
        status: member.status,
        candidateSlug: member.candidateSlug || null,
        personId: member.matchedEntity?.id || member.knowledgeEntityId || null,
        agencyKnowledgeId: agencyKnowledge?.id || null,
      };

      if (member.status === "ambiguous") {
        blocked.push({ ...base, action: "blocked", reason: member.reason || "ambiguous" });
        continue;
      }

      if (!agencyKnowledge) {
        blocked.push({ ...base, action: "blocked", reason: "canonical_agency_missing_or_not_published" });
        continue;
      }

      if (member.status === "linked" || member.status === "canonical_match") {
        const person = base.personId ? await detailLookup(base.personId) : null;
        if (!person || person.type !== "person" || person.status !== "published") {
          blocked.push({ ...base, action: "blocked", reason: "person_missing_or_not_published" });
          continue;
        }

        eligible.push({
          ...base,
          personId: person.id,
          action: hasWorksAt(person, agencyKnowledge.id) ? "noop" : "create_works_at",
          reason: member.reason,
        });
        continue;
      }

      if (member.status === "new_candidate") {
        eligible.push({
          ...base,
          action: "create_person_and_works_at",
          reason: member.reason,
        });
        continue;
      }

      blocked.push({ ...base, action: "blocked", reason: "unsupported_person_state" });
    }
  }

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId: source.tenantId,
    tenantSlug: source.tenantSlug,
    summary: {
      explicitMemberCount: source.summary?.explicitMemberCount || 0,
      eligibleCount: eligible.length,
      blockedCount: blocked.length,
      createPersonCount: eligible.filter((item) => item.action === "create_person_and_works_at").length,
      createWorksAtCount: eligible.filter((item) => item.action === "create_works_at").length,
      noopCount: eligible.filter((item) => item.action === "noop").length,
    },
    eligible,
    blocked,
  };
}

async function preview(options = {}) {
  const report = await buildApplyReport(options);
  return {
    report,
    approvalToken: approvalTokenForReport(report),
  };
}

async function revalidateMember(approved, {
  tenantSlug,
  reconciliationLoader,
  peopleLoader,
  entityLookup,
  detailLookup,
} = {}) {
  const source = await reconciliationLoader({
    tenantSlug,
    peopleLoader,
  });
  const agency = (source.agencies || []).find(
    (candidate) => String(candidate.agencyId) === String(approved.agencyId) && candidate.siteSlug === approved.siteSlug
  );
  const member = agency?.members?.find(
    (candidate) =>
      candidate.name === approved.name &&
      candidate.candidateSlug === approved.candidateSlug
  );

  if (!member || member.status !== approved.status) {
    throw new Error(`Le profil ${approved.name} a changé depuis le preview. Recalcul obligatoire.`);
  }

  const agencyKnowledge = await agencyKnowledgeForSlug(approved.siteSlug, { entityLookup });
  if (!agencyKnowledge || agencyKnowledge.id !== approved.agencyKnowledgeId) {
    throw new Error(`L'Agency Knowledge ${approved.siteSlug} a changé depuis le preview.`);
  }

  if (member.status === "linked" || member.status === "canonical_match") {
    const currentId = member.matchedEntity?.id || member.knowledgeEntityId || null;
    if (!currentId || currentId !== approved.personId) {
      throw new Error(`La Person Knowledge ${approved.name} a changé depuis le preview.`);
    }
    const person = await detailLookup(currentId);
    if (!person || person.type !== "person" || person.status !== "published") {
      throw new Error(`La Person Knowledge ${approved.name} n'est plus publiée.`);
    }
  }

  return { member, agencyKnowledge };
}

async function apply({
  approvalToken,
  tenantSlug = "mondescale",
  reportLoader = buildApplyReport,
  reconciliationLoader = personReconciliation.report,
  peopleLoader = personReconciliation.listKnowledgePeople,
  entityLookup = knowledgeRepository.findBySlugAndLanguage,
  detailLookup = knowledgeRepository.findById,
  createEntity = (payload) => knowledgeService.create(payload),
  createRelation = (sourceId, payload) => knowledgeRelationService.create(sourceId, payload),
} = {}) {
  if (!approvalToken) {
    throw new Error("Une approbation explicite du plan Person réseau est obligatoire.");
  }

  const currentReport = await reportLoader({ tenantSlug, reconciliationLoader, entityLookup, detailLookup });
  validateApproval(currentReport, approvalToken);

  const preflight = [];

  for (const approved of currentReport.eligible || []) {
    const validation = await revalidateMember(approved, {
      tenantSlug,
      reconciliationLoader,
      peopleLoader,
      entityLookup,
      detailLookup,
    });
    preflight.push({ approved, ...validation });
  }

  const results = [];

  for (const item of preflight) {
    const approved = item.approved;
    const agencyKnowledge = item.agencyKnowledge;

    if (approved.action === "noop") {
      results.push({ ...stableMember(approved), result: "noop" });
      continue;
    }

    let personId = approved.personId;

    if (approved.action === "create_person_and_works_at") {
      const created = await createEntity(personPayload(approved));
      if (!created?.id) {
        throw new Error(`La création Person ${approved.name} n'a pas retourné d'identifiant.`);
      }
      personId = created.id;
    }

    const person = await detailLookup(personId);
    if (!person || person.type !== "person" || person.status !== "published") {
      throw new Error(`Impossible de confirmer la Person publiée ${approved.name} avant works_at.`);
    }

    if (!hasWorksAt(person, agencyKnowledge.id)) {
      await createRelation(personId, {
        targetId: agencyKnowledge.id,
        relationType: "works_at",
      });
    }

    results.push({
      ...stableMember({ ...approved, personId }),
      result: approved.action,
    });
  }

  return {
    mode: "apply",
    destructive: false,
    tenantId: currentReport.tenantId,
    tenantSlug: currentReport.tenantSlug,
    appliedCount: results.filter((item) => item.result !== "noop").length,
    noopCount: results.filter((item) => item.result === "noop").length,
    blocked: currentReport.blocked,
    results,
  };
}

module.exports = {
  agencyKnowledgeForSlug,
  approvalPayload,
  approvalTokenForReport,
  apply,
  buildApplyReport,
  hasWorksAt,
  personPayload,
  preview,
  revalidateMember,
  stableMember,
  validateApproval,
};
