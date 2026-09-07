const crypto = require("node:crypto");

function stableAction(action) {
  if (!action || typeof action !== "object") {
    return null;
  }

  return {
    action: action.action,
    ref: action.ref || null,
    entityId: action.entityId || null,
    entity: action.entity || null,
    sourceRef: action.sourceRef || null,
    targetRef: action.targetRef || null,
    relationType: action.relationType || null,
    sourceId: action.sourceId || null,
    targetId: action.targetId || null,
  };
}

function comparablePlan(plan) {
  return JSON.stringify({
    mode: plan?.mode || null,
    manifestKey: plan?.manifestKey || null,
    destructive: Boolean(plan?.destructive),
    actions: Array.isArray(plan?.actions)
      ? plan.actions.map(stableAction)
      : [],
  });
}

function approvalTokenForPlan(plan) {
  return crypto
    .createHash("sha256")
    .update(comparablePlan(plan), "utf8")
    .digest("hex");
}

function validateApplyPlan(plan, {
  allowExpertise = false,
} = {}) {
  if (!plan || plan.mode !== "dry-run" || !Array.isArray(plan.actions)) {
    throw new Error("Un plan Knowledge dry-run valide est obligatoire.");
  }

  if (plan.destructive) {
    throw new Error("Un plan Knowledge destructif ne peut pas être appliqué.");
  }

  const allowed = new Set([
    "create_entity",
    "update_entity",
    "create_relation",
    "noop_entity",
    "noop_relation",
  ]);

  for (const action of plan.actions) {
    if (!allowed.has(action.action)) {
      throw new Error(`Action Knowledge non autorisée: ${action.action}`);
    }

    if (
      action.action === "create_relation" &&
      action.relationType === "expert_in" &&
      !allowExpertise
    ) {
      throw new Error("La relation expert_in exige une autorisation explicite.");
    }
  }

  return true;
}

function validateApprovalToken(plan, approvalToken) {
  if (!approvalToken || typeof approvalToken !== "string") {
    throw new Error("Une approbation explicite du plan Knowledge est obligatoire.");
  }

  const expected = approvalTokenForPlan(plan);
  const supplied = approvalToken.trim().toLowerCase();

  if (supplied.length !== expected.length) {
    throw new Error("L'approbation Knowledge ne correspond pas au plan fourni.");
  }

  const matches = crypto.timingSafeEqual(
    Buffer.from(supplied, "utf8"),
    Buffer.from(expected, "utf8")
  );

  if (!matches) {
    throw new Error("L'approbation Knowledge ne correspond pas au plan fourni.");
  }

  return true;
}

async function applyKnowledgePilotPlan({
  plan,
  approvalToken,
  rebuildCurrentPlan,
  createEntity,
  updateEntity,
  createRelation,
  allowExpertise = false,
}) {
  validateApplyPlan(plan, { allowExpertise });
  validateApprovalToken(plan, approvalToken);

  if (typeof rebuildCurrentPlan !== "function") {
    throw new Error("La reconstruction du plan courant est obligatoire.");
  }

  const currentPlan = await rebuildCurrentPlan();
  validateApplyPlan(currentPlan, { allowExpertise });

  if (comparablePlan(plan) !== comparablePlan(currentPlan)) {
    throw new Error(
      "Le Knowledge Graph a changé depuis le dry-run. Recalcul du plan obligatoire."
    );
  }

  const resolvedIds = new Map();
  const results = [];

  for (const action of plan.actions) {
    if (action.action === "noop_entity") {
      if (action.ref && action.entityId) {
        resolvedIds.set(action.ref, action.entityId);
      }
      results.push({ action: "noop_entity", ref: action.ref || null });
      continue;
    }

    if (action.action === "noop_relation") {
      results.push({
        action: "noop_relation",
        sourceRef: action.sourceRef || null,
        targetRef: action.targetRef || null,
        relationType: action.relationType || null,
      });
      continue;
    }

    if (action.action === "create_entity") {
      if (typeof createEntity !== "function") {
        throw new Error("createEntity est requis pour appliquer create_entity.");
      }

      const created = await createEntity(action.entity);
      if (!created?.id) {
        throw new Error("La création Knowledge n'a pas retourné d'identifiant.");
      }

      if (action.ref) {
        resolvedIds.set(action.ref, created.id);
      }

      results.push({
        action: "create_entity",
        ref: action.ref || null,
        entityId: created.id,
      });
      continue;
    }

    if (action.action === "update_entity") {
      if (typeof updateEntity !== "function") {
        throw new Error("updateEntity est requis pour appliquer update_entity.");
      }

      const updated = await updateEntity(action.entityId, action.entity);
      const entityId = updated?.id || action.entityId;

      if (action.ref && entityId) {
        resolvedIds.set(action.ref, entityId);
      }

      results.push({
        action: "update_entity",
        ref: action.ref || null,
        entityId,
      });
      continue;
    }

    if (action.action === "create_relation") {
      if (typeof createRelation !== "function") {
        throw new Error("createRelation est requis pour appliquer create_relation.");
      }

      if (action.relationType === "expert_in" && !allowExpertise) {
        throw new Error("La relation expert_in exige une autorisation explicite.");
      }

      const sourceId =
        action.sourceId || resolvedIds.get(action.sourceRef) || null;
      const targetId =
        action.targetId || resolvedIds.get(action.targetRef) || null;

      if (!sourceId || !targetId) {
        throw new Error("Impossible de résoudre les identifiants de la relation Knowledge.");
      }

      const created = await createRelation(sourceId, {
        targetId,
        relationType: action.relationType,
      });

      results.push({
        action: "create_relation",
        sourceRef: action.sourceRef || null,
        targetRef: action.targetRef || null,
        relationType: action.relationType,
        relationId: created?.id || null,
      });
    }
  }

  return {
    mode: "apply",
    destructive: false,
    manifestKey: plan.manifestKey || null,
    approvalToken,
    applied: true,
    results,
  };
}

module.exports = {
  applyKnowledgePilotPlan,
  validateApplyPlan,
  validateApprovalToken,
  approvalTokenForPlan,
  comparablePlan,
};
