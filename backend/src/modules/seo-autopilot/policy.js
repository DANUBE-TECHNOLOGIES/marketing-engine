"use strict";

const MODES = new Set(["simulation", "approval", "automatic"]);

function normalizePolicy(input = {}) {
  const mode = MODES.has(input.mode) ? input.mode : "simulation";
  return {
    mode,
    stopOnError: input.stopOnError !== false,
    maxActions: Math.max(1, Math.min(50, Number(input.maxActions || 15))),
    allowedTypes: Array.isArray(input.allowedTypes) ? [...new Set(input.allowedTypes.filter(Boolean))] : [],
    deniedTypes: Array.isArray(input.deniedTypes) ? [...new Set(input.deniedTypes.filter(Boolean))] : [],
  };
}

function decideActionMode(action, policy) {
  if (policy.deniedTypes.includes(action.type)) return "blocked";
  if (policy.allowedTypes.length && !policy.allowedTypes.includes(action.type)) return "blocked";
  if (policy.mode === "simulation") return "simulation";
  if (policy.mode === "approval") return "approval";
  return action.mode === "automatic" || action.autoExecutable === true ? "automatic" : "approval";
}

module.exports = { normalizePolicy, decideActionMode };
