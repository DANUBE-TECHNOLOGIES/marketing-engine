"use strict";

const { getProviderReadiness } = require("./provider-readiness");

function remediationKind(item, env = process.env) {
  const readiness = item.providerKey ? getProviderReadiness(item.providerKey, env) : null;
  if (item.submissionMode === "api") {
    if (readiness && !readiness.ready) return "provider_blocked";
    return "managed_api";
  }
  if (item.submissionMode === "submission_api") {
    if (readiness && readiness.stage === "monitor_only") return "provider_blocked";
    return "submission_api";
  }
  return "manual";
}

function remediationInstruction(item, env = process.env) {
  const drift = item.drift?.length ? item.drift.join(", ") : "citation absente ou non validée";
  const kind = remediationKind(item, env);
  const readiness = item.providerKey ? getProviderReadiness(item.providerKey, env) : null;
  if (kind === "managed_api") return `Synchroniser via le provider ${item.providerKey} après validation explicite. Dérive: ${drift}.`;
  if (kind === "submission_api") return `Préparer une soumission de correction ${item.providerKey}; ne pas considérer la correction comme publiée avant vérification. Dérive: ${drift}.`;
  if (kind === "provider_blocked") return `Provider ${item.providerKey} non exécutable actuellement (${readiness?.stage || "non_configure"}). Conserver en surveillance ou terminer l’onboarding avant toute écriture. Dérive: ${drift}.`;
  return `Correction manuelle requise sur ${item.directoryName}. Dérive: ${drift}.`;
}

function buildRemediationPlan(queue = [], options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const env = options.env || process.env;
  const items = queue.slice(0, limit).map((item) => {
    const kind = remediationKind(item, env);
    const readiness = item.providerKey ? getProviderReadiness(item.providerKey, env) : null;
    return Object.freeze({
      ...item,
      remediationKind: kind,
      providerReadiness: readiness,
      instruction: remediationInstruction(item, env),
      executable: kind === "managed_api" || kind === "submission_api",
      requiresConfirmation: true
    });
  });
  return Object.freeze({
    totalAnomalies: queue.length,
    planned: items.length,
    executable: items.filter((item) => item.executable).length,
    blocked: items.filter((item) => item.remediationKind === "provider_blocked").length,
    items: Object.freeze(items)
  });
}

module.exports = { buildRemediationPlan, remediationKind, remediationInstruction };
