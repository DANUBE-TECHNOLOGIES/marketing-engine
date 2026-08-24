"use strict";

const { buildNetworkCoverage } = require("./network-coverage");
const { buildAnomalyQueue } = require("./anomaly-queue");
const { buildRemediationPlan } = require("./remediation-planner");
const { buildPropagationAlerts } = require("./propagation-alerts");
const { buildNetworkHealth } = require("./network-health");

function priorityBand(score) {
  const value = Number(score || 0);
  if (value >= 120) return "critical";
  if (value >= 80) return "high";
  if (value >= 45) return "medium";
  return "low";
}

function buildInterventionQueue(remediationPlan = { items: [] }, propagationAlerts = [], actions = []) {
  const queue = [];
  for (const item of remediationPlan.items || []) {
    queue.push({
      source: "nap_anomaly",
      agencyId: item.agencyId,
      agencyName: item.agencyName,
      providerKey: item.providerKey,
      listingId: item.listingId || null,
      score: Number(item.score || 0),
      priority: priorityBand(item.score),
      status: item.status,
      drift: item.drift || [],
      remediationKind: item.remediationKind,
      executable: item.executable === true,
      instruction: item.instruction
    });
  }
  for (const alert of propagationAlerts || []) {
    const score = alert.severity === "critical" ? 160 : alert.severity === "stale" ? 130 : 90;
    queue.push({
      source: "propagation",
      agencyId: alert.agencyId,
      agencyName: alert.agencyName,
      providerKey: alert.providerKey,
      listingId: alert.listingId || null,
      score,
      priority: priorityBand(score),
      status: alert.severity,
      drift: [],
      remediationKind: "verification",
      executable: true,
      instruction: alert.title
    });
  }
  for (const action of actions || []) {
    if (!["todo", "in_progress"].includes(action.status)) continue;
    queue.push({
      source: "network_action",
      agencyId: action.agencyId || null,
      agencyName: action.agency?.name || null,
      providerKey: action.lever?.includes("google") ? "google_business_profile" : null,
      listingId: null,
      score: 140,
      priority: "critical",
      status: action.status,
      drift: [],
      remediationKind: "manual_followup",
      executable: false,
      instruction: action.title
    });
  }
  queue.sort((a, b) => b.score - a.score || String(a.agencyName || "").localeCompare(String(b.agencyName || "")));
  return Object.freeze(queue.map(Object.freeze));
}

function buildNetworkCockpit({ agencies = [], directories = [], listings = [], pendingPropagation = [], actions = [], env = process.env } = {}) {
  const coverage = buildNetworkCoverage(agencies, directories, listings);
  const anomalies = buildAnomalyQueue(agencies, directories, listings);
  const remediation = buildRemediationPlan(anomalies, { limit: 500, env });
  const propagation = buildPropagationAlerts(pendingPropagation, { providerKey: "google_business_profile" });
  const health = buildNetworkHealth({ coverage, anomalyCount: anomalies.length, propagationAlerts: propagation.alerts });
  const interventionQueue = buildInterventionQueue(remediation, propagation.alerts, actions);
  const summary = {
    agencies: agencies.length,
    directories: directories.filter((item) => item.active !== false).length,
    coveragePercent: coverage.summary.coveragePercent,
    anomalies: anomalies.length,
    executableRemediations: remediation.executable,
    blockedProviders: remediation.blocked,
    propagationAlerts: propagation.alerts.length,
    openActions: actions.filter((item) => ["todo", "in_progress"].includes(item.status)).length,
    interventionQueue: interventionQueue.length
  };
  return Object.freeze({ health, summary: Object.freeze(summary), coverage, remediation, propagation, interventionQueue });
}

module.exports = { buildNetworkCockpit, buildInterventionQueue, priorityBand };
