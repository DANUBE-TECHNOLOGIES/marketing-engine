const crypto = require("node:crypto");
const knowledgeService = require("./knowledge.service");
const {
  applyKnowledgePilotPlan,
  approvalTokenForPlan,
} = require("./pilot-apply");
const {
  buildKnowledgePilotPlan,
} = require("./pilot-planner");
const {
  loadKnowledgeSnapshot,
} = require("./knowledge-pilot-readonly");
const networkGeo = require("./network-geo.service");

function stableAction(action) {
  return {
    action: action?.action || null,
    ref: action?.ref || null,
    entityId: action?.entityId || null,
    entity: action?.entity || null,
  };
}

function approvalPayload(report) {
  return {
    tenantSlug: report?.tenantSlug || null,
    tenantId: report?.tenantId || null,
    agencies: [...(report?.agencies || [])]
      .map((agency) => ({
        agencyId: agency.agencyId,
        siteSlug: agency.siteSlug,
        actions: (agency.actions || []).map(stableAction),
      }))
      .sort((a, b) => String(a.siteSlug).localeCompare(String(b.siteSlug))),
    blocked: [...(report?.blocked || [])]
      .map((agency) => ({
        agencyId: agency.agencyId,
        agencyName: agency.agencyName || null,
        reason: agency.reason || null,
      }))
      .sort((a, b) => String(a.agencyId).localeCompare(String(b.agencyId))),
  };
}

function networkApprovalToken(report) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(approvalPayload(report)), "utf8")
    .digest("hex");
}

function validateNetworkApproval(report, token) {
  if (!token || typeof token !== "string") {
    throw new Error("Une approbation explicite du plan GEO réseau est obligatoire.");
  }

  const expected = networkApprovalToken(report);
  const supplied = token.trim().toLowerCase();

  if (supplied.length !== expected.length) {
    throw new Error("L'approbation GEO réseau ne correspond pas au rapport courant.");
  }

  if (!crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    throw new Error("L'approbation GEO réseau ne correspond pas au rapport courant.");
  }

  return true;
}

function validateAgencyOnlyPlan(plan) {
  for (const action of plan?.actions || []) {
    if (!["create_entity", "update_entity", "noop_entity"].includes(action.action)) {
      throw new Error(`Action interdite dans l'apply Agency réseau: ${action.action}`);
    }

    if (
      ["create_entity", "update_entity"].includes(action.action) &&
      action?.entity?.type !== "agency"
    ) {
      throw new Error("L'apply GEO réseau est limité aux entités agency.");
    }
  }

  return true;
}

async function currentPlanForManifest(manifest, snapshotLoader) {
  const snapshot = await snapshotLoader(manifest);
  return buildKnowledgePilotPlan({
    manifest,
    existingEntities: snapshot.existingEntities,
    existingRelations: snapshot.existingRelations,
  });
}

async function preview({
  tenantSlug = "mondescale",
  reportLoader = networkGeo.report,
} = {}) {
  const report = await reportLoader({ tenantSlug });

  return {
    report,
    approvalToken: networkApprovalToken(report),
  };
}

async function apply({
  approvalToken,
  tenantSlug = "mondescale",
  reportLoader = networkGeo.report,
  tenantResolver = networkGeo.resolveTenantId,
  sourceLoader = networkGeo.listAgencySources,
  snapshotLoader = loadKnowledgeSnapshot,
  createEntity = (entity) => knowledgeService.create(entity),
  updateEntity = (id, entity) => knowledgeService.update(id, entity),
} = {}) {
  if (!approvalToken) {
    throw new Error("Une approbation explicite du plan GEO réseau est obligatoire.");
  }

  const currentReport = await reportLoader({ tenantSlug });
  validateNetworkApproval(currentReport, approvalToken);

  const tenantId = currentReport.tenantId || await tenantResolver(tenantSlug);
  const sources = await sourceLoader(tenantId);
  const sourceBySlug = new Map(
    (sources || [])
      .filter((source) => source?.seoSite?.slug)
      .map((source) => [String(source.seoSite.slug), source])
  );

  const results = [];

  for (const agencyReport of currentReport.agencies || []) {
    const source = sourceBySlug.get(String(agencyReport.siteSlug));
    const manifest = networkGeo.buildAgencyManifest(source);

    if (!manifest) {
      throw new Error(`Source canonique disparue pour ${agencyReport.siteSlug}.`);
    }

    const approvedPlan = await currentPlanForManifest(manifest, snapshotLoader);
    validateAgencyOnlyPlan(approvedPlan);

    const result = await applyKnowledgePilotPlan({
      plan: approvedPlan,
      approvalToken: approvalTokenForPlan(approvedPlan),
      allowExpertise: false,
      rebuildCurrentPlan: async () => {
        const rebuilt = await currentPlanForManifest(manifest, snapshotLoader);
        validateAgencyOnlyPlan(rebuilt);
        return rebuilt;
      },
      createEntity,
      updateEntity,
      createRelation: async () => {
        throw new Error("Les relations sont interdites dans l'apply Agency réseau.");
      },
    });

    results.push({
      agencyId: agencyReport.agencyId,
      agencyName: agencyReport.agencyName,
      siteSlug: agencyReport.siteSlug,
      result,
    });
  }

  return {
    mode: "apply",
    destructive: false,
    tenantId,
    tenantSlug,
    appliedAgencyCount: results.length,
    blocked: currentReport.blocked || [],
    results,
  };
}

module.exports = {
  approvalPayload,
  apply,
  currentPlanForManifest,
  networkApprovalToken,
  preview,
  stableAction,
  validateAgencyOnlyPlan,
  validateNetworkApproval,
};
