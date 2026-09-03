"use strict";

function classifyAutomationAlert(automation = {}) {
  const stale = Number(automation.stale || 0);
  const missing = Number(automation.missing || 0);
  if (missing > 0) {
    return {
      level: "critical",
      code: "SEO_HEALTH_SNAPSHOT_MISSING",
      title: "Collecte SEO interrompue pour certaines agences",
      detail: `${missing} agence${missing > 1 ? "s" : ""} sans snapshot disponible. Vérifier le timer, le service et l'accès API.`,
      action: "check_timer_and_run_snapshot",
    };
  }
  if (stale > 0) {
    return {
      level: "warning",
      code: "SEO_HEALTH_SNAPSHOT_STALE",
      title: "Snapshots SEO en retard",
      detail: `${stale} agence${stale > 1 ? "s" : ""} avec une dernière capture trop ancienne. Relancer une capture et contrôler les journaux systemd.`,
      action: "run_snapshot_and_check_logs",
    };
  }
  return {
    level: "ok",
    code: "SEO_HEALTH_SNAPSHOT_OK",
    title: "Collecte SEO à jour",
    detail: "Les snapshots SEO observés sont suffisamment récents.",
    action: null,
  };
}

function applyAutomationAlert(automation = {}) {
  return { ...automation, version: "1.1", alert: classifyAutomationAlert(automation) };
}

module.exports = { classifyAutomationAlert, applyAutomationAlert };
