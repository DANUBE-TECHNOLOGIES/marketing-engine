"use strict";

function remediationKind(item) {
  if (item.submissionMode === "api") return "managed_api";
  if (item.submissionMode === "submission_api") return "submission_api";
  return "manual";
}

function remediationInstruction(item) {
  const drift = item.drift?.length ? item.drift.join(", ") : "citation absente ou non validée";
  const kind = remediationKind(item);
  if (kind === "managed_api") return `Synchroniser via le provider ${item.providerKey} après validation explicite. Dérive: ${drift}.`;
  if (kind === "submission_api") return `Préparer une soumission de correction ${item.providerKey}; ne pas considérer la correction comme publiée avant vérification. Dérive: ${drift}.`;
  return `Correction manuelle requise sur ${item.directoryName}. Dérive: ${drift}.`;
}

function buildRemediationPlan(queue = [], options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const items = queue.slice(0, limit).map((item) => Object.freeze({
    ...item,
    remediationKind: remediationKind(item),
    instruction: remediationInstruction(item),
    requiresConfirmation: true
  }));
  return Object.freeze({
    totalAnomalies: queue.length,
    planned: items.length,
    items: Object.freeze(items)
  });
}

module.exports = { buildRemediationPlan, remediationKind, remediationInstruction };
