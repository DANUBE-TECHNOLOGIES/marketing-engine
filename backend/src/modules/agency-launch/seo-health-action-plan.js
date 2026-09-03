"use strict";

const COMPONENT_SOURCES = {
  visibility: ["LOCAL_RANKINGS"],
  freshness: ["LOCAL_RANKINGS"],
  citations: ["LOCAL_CITATIONS"],
  trust: ["LOCAL_TRUST"],
  content: ["CONTENT_SIMILARITY", "LOCAL_CONTENT"],
  trend: ["LOCAL_RANKINGS"],
};

function lostPoints(component) {
  return Math.max(0, Number(component?.weight || 0) - Number(component?.points || 0));
}

function actionPlan(report) {
  const components = Array.isArray(report?.seoHealth?.components) ? report.seoHealth.components : [];
  const actions = Array.isArray(report?.seoActions?.actions) ? report.seoActions.actions : [];

  const weaknesses = components
    .map((component) => ({ ...component, lostPoints: Math.round(lostPoints(component) * 10) / 10 }))
    .filter((component) => component.lostPoints > 0)
    .sort((left, right) => right.lostPoints - left.lostPoints);

  const steps = weaknesses.map((weakness, index) => {
    const sources = COMPONENT_SOURCES[weakness.code] || [];
    const linkedActions = actions.filter((item) => sources.includes(item?.source));
    const bestAction = linkedActions[0] || null;
    return {
      order: index + 1,
      component: weakness.code,
      label: weakness.label,
      lostPoints: weakness.lostPoints,
      currentPoints: weakness.points,
      maxPoints: weakness.weight,
      detail: weakness.detail,
      action: bestAction,
      status: bestAction ? "actionable" : "monitor",
    };
  });

  return {
    version: "1.0",
    totalLostPoints: Math.round(weaknesses.reduce((sum, item) => sum + item.lostPoints, 0) * 10) / 10,
    actionableSteps: steps.filter((item) => item.status === "actionable").length,
    steps: steps.slice(0, 6),
  };
}

function applySeoHealthActionPlan(report) {
  return {
    ...report,
    version: "3.8",
    seoActionPlan: actionPlan(report),
  };
}

module.exports = { COMPONENT_SOURCES, lostPoints, actionPlan, applySeoHealthActionPlan };
