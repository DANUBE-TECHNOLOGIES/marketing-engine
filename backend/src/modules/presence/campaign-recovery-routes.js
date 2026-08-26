"use strict";

const express = require("express");
const { getCampaign, createCampaign } = require("./campaign-store");
const { listCampaignExecutions } = require("./campaign-execution-ledger");
const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildNetworkCockpit } = require("./network-cockpit");
const { stableId } = require("./campaign-planner");
const { buildRecoveryPlan, evaluateRecoveryEligibility, evaluateRecoveryQualificationState } = require("./campaign-recovery");
const { qualifyRecoveryItem } = require("./campaign-recovery-qualification");
const { getRecoveryStabilization, recordRecoveryManualResolution, recordRecoveryResolutionVerification } = require("./campaign-recovery-stabilization");

async function listRecoveryQualifications(prisma, campaignId) {
  return prisma.$queryRaw`
    SELECT DISTINCT ON (("payload"->>'campaignIndex')::INTEGER)
      "id", "operationId", "agencyId", "status", "payload", "result", "createdAt"
    FROM "PresenceOperationAudit"
    WHERE "scope" = 'campaign_recovery' AND "eventType" = 'recovery_qualification'
      AND "payload"->>'sourceCampaignId' = ${campaignId}
    ORDER BY ("payload"->>'campaignIndex')::INTEGER, "createdAt" DESC, "id" DESC
  `;
}

async function buildRecoveryContext(prisma, campaignId) {
  const sourceCampaign = await getCampaign(prisma, campaignId);
  if (!sourceCampaign) { const error = new Error("Campagne Presence introuvable"); error.status = 404; throw error; }
  const [executions, latestPreflight, deploymentReadiness, state, qualifications, stabilization] = await Promise.all([listCampaignExecutions(prisma, campaignId), getLatestDeploymentPreflight(prisma), buildDeploymentReadiness(prisma), loadCockpitState(prisma), listRecoveryQualifications(prisma, campaignId), getRecoveryStabilization(prisma, campaignId)]);
  const eligibility = evaluateRecoveryEligibility(sourceCampaign, executions, latestPreflight);
  const qualificationState = evaluateRecoveryQualificationState(eligibility.uncertain || [], qualifications);
  const activationGate = evaluatePilotActivationGate({ preflight: latestPreflight, currentReadiness: deploymentReadiness });
  const cockpit = buildNetworkCockpit(state);
  const plan = buildRecoveryPlan(sourceCampaign, cockpit, executions, latestPreflight?.preflightId || null);
  const blockers = [...new Set([...(eligibility.blockers || []), ...(activationGate.blockers || [])])];
  if (!qualificationState.complete) blockers.push("ambiguous_items_require_qualification");
  if (!stabilization.ready) blockers.push(...(stabilization.blockers || []));
  if (!plan.executableCount) blockers.push("no_untouched_items_to_recover");
  const ready = blockers.length === 0;
  const operatorState = !qualificationState.complete ? "qualification_required" : !stabilization.ready ? "manual_stabilization_required" : "safe_recovery";
  return { sourceCampaign, executions, latestPreflight, deploymentReadiness, eligibility, qualificationState, stabilization, activationGate, plan, qualifications, readiness: { ready, decision: ready ? "go" : "no_go", operatorState, blockers: [...new Set(blockers)] } };
}

function campaignRecoveryRoutes({ prisma }) {
  const router = express.Router();
  router.get("/api/presence/campaigns/:campaignId/recovery-preview", async (req, res) => { try { const c = await buildRecoveryContext(prisma, req.params.campaignId); return res.status(c.readiness.ready ? 200 : 409).json({ ok:c.readiness.ready, externalWrite:false, persisted:false, recoveryOfCampaignId:c.sourceCampaign.campaignId, preflightId:c.latestPreflight?.preflightId||null, readiness:c.readiness, eligibility:c.eligibility, qualificationState:c.qualificationState, stabilization:c.stabilization, activationGate:c.activationGate, qualifications:c.qualifications, plan:c.plan }); } catch(error){ return res.status(error.status||500).json({ok:false,error:error.message}); } });

  router.post("/api/presence/campaigns/:campaignId/recovery/qualify", async (req,res)=>{ try { if(req.body?.confirm!==true)return res.status(409).json({ok:false,externalWrite:false,error:"confirm=true requis pour interroger Google en lecture seule"}); const sourceCampaign=await getCampaign(prisma,req.params.campaignId); if(!sourceCampaign)return res.status(404).json({ok:false,externalWrite:false,error:"Campagne Presence introuvable"}); if(sourceCampaign.status!=="failed")return res.status(409).json({ok:false,externalWrite:false,error:"La qualification recovery exige une campagne failed"}); const executions=await listCampaignExecutions(prisma,req.params.campaignId); const campaignIndex=Number(req.body?.campaignIndex); const execution=executions.find(row=>Number(row.campaignIndex)===campaignIndex); if(!execution||!(execution.status==="failed"||execution.operationId))return res.status(409).json({ok:false,externalWrite:false,error:"Item non ambigu ou sans trace d’exécution"}); const qualification=await qualifyRecoveryItem(prisma,sourceCampaign,execution); return res.json({ok:true,externalWrite:false,persisted:true,retryAutomaticallyAllowed:false,qualification}); } catch(error){return res.status(error.status||500).json({ok:false,externalWrite:false,error:error.message,readiness:error.readiness,details:error.google||undefined});} });

  router.post("/api/presence/campaigns/:campaignId/recovery/resolve", async (req,res)=>{ try { if(req.body?.confirm!==true)return res.status(409).json({ok:false,externalWrite:false,error:"confirm=true requis pour enregistrer la résolution manuelle"}); const sourceCampaign=await getCampaign(prisma,req.params.campaignId); if(!sourceCampaign)return res.status(404).json({ok:false,externalWrite:false,error:"Campagne Presence introuvable"}); if(sourceCampaign.status!=="failed")return res.status(409).json({ok:false,externalWrite:false,error:"La résolution recovery exige une campagne failed"}); const executions=await listCampaignExecutions(prisma,req.params.campaignId); const campaignIndex=Number(req.body?.campaignIndex); const execution=executions.find(row=>Number(row.campaignIndex)===campaignIndex); if(!execution)return res.status(404).json({ok:false,externalWrite:false,error:"Item recovery introuvable"}); const stabilization=await recordRecoveryManualResolution(prisma,{sourceCampaignId:sourceCampaign.campaignId,campaignIndex,agencyId:execution.agencyId||null,operationId:execution.operationId||null,resolution:req.body?.resolution,note:req.body?.note||null}); return res.json({ok:true,externalWrite:false,persisted:true,stabilization}); } catch(error){return res.status(error.status||500).json({ok:false,externalWrite:false,error:error.message});} });

  router.post("/api/presence/campaigns/:campaignId/recovery/verify-resolution", async (req,res)=>{ try { if(req.body?.confirm!==true)return res.status(409).json({ok:false,externalWrite:false,error:"confirm=true requis pour recontrôler Google en lecture seule"}); const sourceCampaign=await getCampaign(prisma,req.params.campaignId); if(!sourceCampaign)return res.status(404).json({ok:false,externalWrite:false,error:"Campagne Presence introuvable"}); if(sourceCampaign.status!=="failed")return res.status(409).json({ok:false,externalWrite:false,error:"La vérification recovery exige une campagne failed"}); const executions=await listCampaignExecutions(prisma,req.params.campaignId); const campaignIndex=Number(req.body?.campaignIndex); const execution=executions.find(row=>Number(row.campaignIndex)===campaignIndex); if(!execution)return res.status(404).json({ok:false,externalWrite:false,error:"Item recovery introuvable"}); const qualification=await qualifyRecoveryItem(prisma,sourceCampaign,execution); const stabilization=await recordRecoveryResolutionVerification(prisma,{sourceCampaignId:sourceCampaign.campaignId,campaignIndex,agencyId:execution.agencyId||null,operationId:execution.operationId||null,qualification}); return res.status(qualification.classification==="already_applied"?200:409).json({ok:qualification.classification==="already_applied",externalWrite:false,persisted:true,qualification,stabilization}); } catch(error){return res.status(error.status||500).json({ok:false,externalWrite:false,error:error.message});} });

  router.post("/api/presence/campaigns/:campaignId/recovery", async (req,res)=>{ try { if(req.body?.confirm!==true)return res.status(409).json({ok:false,error:"confirm=true requis pour créer une campagne de reprise"}); const context=await buildRecoveryContext(prisma,req.params.campaignId); if(!context.readiness.ready)return res.status(409).json({ok:false,externalWrite:false,persisted:false,error:"Recovery gate NO-GO",...context.readiness,eligibility:context.eligibility,qualificationState:context.qualificationState,stabilization:context.stabilization,activationGate:context.activationGate}); const source=context.sourceCampaign.approvedScope||{}; const approvedScope={agencyIds:context.plan.policy.agencyIds,providerKeys:context.plan.policy.providerKeys,maxItems:context.plan.policy.maxItems,allowSensitive:false,rolloutStage:source.rolloutStage||null,sourceEvidenceCampaignId:source.sourceEvidenceCampaignId||null,sourceEvidenceReportId:source.sourceEvidenceReportId||null,sourceEvidenceReportCreatedAt:source.sourceEvidenceReportCreatedAt||null,recoveryOfCampaignId:context.sourceCampaign.campaignId}; const approvedPlanFingerprint=stableId({approvedScope,selected:context.plan.selected||[]}); const campaign=await createCampaign(prisma,context.plan,req.body?.name||`Reprise ${context.sourceCampaign.name||context.sourceCampaign.campaignId}`,{pilot:true,preflightId:context.latestPreflight.preflightId,approvedScope,approvedPlanFingerprint}); return res.status(201).json({ok:true,persisted:true,externalWrite:false,recovery:true,recoveryOfCampaignId:context.sourceCampaign.campaignId,campaign,approvedScope,approvedPlanFingerprint}); } catch(error){return res.status(error.status||500).json({ok:false,error:error.message});} });
  return router;
}
module.exports={campaignRecoveryRoutes,buildRecoveryContext,listRecoveryQualifications};
