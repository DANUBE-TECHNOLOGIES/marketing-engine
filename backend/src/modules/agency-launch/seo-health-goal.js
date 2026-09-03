"use strict";

const TARGET_STEPS = [60, 70, 80, 90];

function nextHealthTarget(score) {
  const current = Math.max(0, Math.min(100, Number(score || 0)));
  return TARGET_STEPS.find((target) => target > current) || 100;
}

function seoHealthGoal(report) {
  const health = report?.seoHealth || {};
  const plan = report?.seoActionPlan || {};
  const current = Math.max(0, Math.min(100, Number(health.score || 0)));
  const target = nextHealthTarget(current);
  const requiredGain = Math.max(0, target - current);
  const actionablePotential = (plan.steps || [])
    .filter((step) => step.status === "actionable")
    .reduce((sum, step) => sum + Number(step.lostPoints || 0), 0);
  const reachable = current >= 100 || actionablePotential >= requiredGain;
  const selected = [];
  let accumulated = 0;
  for (const step of plan.steps || []) {
    if (step.status !== "actionable" || accumulated >= requiredGain) continue;
    selected.push(step);
    accumulated += Number(step.lostPoints || 0);
  }
  return {
    version: "1.0",
    current: Math.round(current * 10) / 10,
    target,
    requiredGain: Math.round(requiredGain * 10) / 10,
    actionablePotential: Math.round(actionablePotential * 10) / 10,
    reachable,
    progress: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 100,
    recommendedSteps: selected.map((step) => ({ order: step.order, component: step.component, label: step.label, potentialGain: step.lostPoints, action: step.action })),
    note: reachable ? "Le palier peut théoriquement être atteint avec les leviers actuellement actionnables." : "Le palier nécessite aussi des leviers encore en observation ou sans action fiable.",
  };
}

function applySeoHealthGoal(report) {
  return { ...report, version: "3.9", seoHealthGoal: seoHealthGoal(report) };
}

module.exports = { TARGET_STEPS, nextHealthTarget, seoHealthGoal, applySeoHealthGoal };
