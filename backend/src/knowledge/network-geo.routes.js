const express = require("express");
const service = require("./network-geo.service");
const applyService = require("./network-geo-apply.service");
const personService = require("./network-person-reconciliation.service");
const personApplyService = require("./network-person-apply.service");
const teamLinkService = require("./network-team-link.service");
const publicReadinessService = require("./network-public-readiness.service");
const expertiseService = require("./network-expertise.service");
const agencyKnowledgeService = require("./network-agency-knowledge.service");
const agencyKnowledgeBulkService = require("./network-agency-knowledge-bulk.service");

const router = express.Router();

function asyncRoute(handler) {
  return function wrappedRoute(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function tenantSlug(req) {
  return req.headers["x-tenant-slug"] || req.query?.tenantSlug || "mondescale";
}

router.get("/report", asyncRoute(async (req, res) => {
  res.json({ data: await service.report({ tenantSlug: tenantSlug(req) }) });
}));
router.get("/public-readiness", asyncRoute(async (req, res) => {
  res.json({ data: await publicReadinessService.report({ tenantSlug: tenantSlug(req) }) });
}));
router.get("/agency-knowledge-matrix", asyncRoute(async (_req, res) => {
  res.json({ data: await agencyKnowledgeService.matrix() });
}));
router.post("/agency-knowledge-links", asyncRoute(async (req, res) => {
  res.json({ data: await agencyKnowledgeService.addExplicitRelation({
    agencyKnowledgeId: req.body?.agencyKnowledgeId,
    targetKnowledgeId: req.body?.targetKnowledgeId,
    relationType: req.body?.relationType,
  }) });
}));
router.post("/agency-knowledge-bulk-preview", asyncRoute(async (req, res) => {
  res.json({ data: await agencyKnowledgeBulkService.preview({
    agencyKnowledgeIds: req.body?.agencyKnowledgeIds,
    targetKnowledgeId: req.body?.targetKnowledgeId,
    relationType: req.body?.relationType,
  }) });
}));
router.post("/agency-knowledge-bulk-apply", asyncRoute(async (req, res) => {
  res.json({ data: await agencyKnowledgeBulkService.apply({
    agencyKnowledgeIds: req.body?.agencyKnowledgeIds,
    targetKnowledgeId: req.body?.targetKnowledgeId,
    relationType: req.body?.relationType,
    approvalToken: req.body?.approvalToken,
  }) });
}));
router.get("/expertise-matrix", asyncRoute(async (_req, res) => {
  res.json({ data: await expertiseService.matrix() });
}));
router.post("/expertise-links", asyncRoute(async (req, res) => {
  res.json({ data: await expertiseService.addExplicitExpertise({
    personId: req.body?.personId,
    expertiseId: req.body?.expertiseId,
  }) });
}));
router.get("/people-report", asyncRoute(async (req, res) => {
  res.json({ data: await personService.report({ tenantSlug: tenantSlug(req) }) });
}));
router.get("/people-apply-preview", asyncRoute(async (req, res) => {
  res.json({ data: await personApplyService.preview({ tenantSlug: tenantSlug(req) }) });
}));
router.post("/apply-people", asyncRoute(async (req, res) => {
  res.json({ data: await personApplyService.apply({ tenantSlug: tenantSlug(req), approvalToken: req.body?.approvalToken }) });
}));
router.get("/team-link-preview", asyncRoute(async (req, res) => {
  res.json({ data: await teamLinkService.preview({ tenantSlug: tenantSlug(req) }) });
}));
router.post("/apply-team-links", asyncRoute(async (req, res) => {
  res.json({ data: await teamLinkService.apply({ tenantSlug: tenantSlug(req), approvalToken: req.body?.approvalToken }) });
}));
router.get("/apply-preview", asyncRoute(async (req, res) => {
  res.json({ data: await applyService.preview({ tenantSlug: tenantSlug(req) }) });
}));
router.post("/apply-agencies", asyncRoute(async (req, res) => {
  res.json({ data: await applyService.apply({ tenantSlug: tenantSlug(req), approvalToken: req.body?.approvalToken }) });
}));

module.exports = router;
