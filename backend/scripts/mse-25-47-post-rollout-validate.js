#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { run: previewNetwork } = require("./mse-25-40-network-preview");

function digest(value){return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");}
function load(file){return JSON.parse(fs.readFileSync(path.resolve(file),"utf8"));}

async function run(){
  const rolloutPath=process.env.MSE_25_47_ROLLOUT_REPORT;
  if(!rolloutPath) throw Object.assign(new Error("MSE_25_47_ROLLOUT_REPORT requis."),{code:"MSE_25_47_POST_ROLLOUT_REQUIRED"});
  const rollout=load(rolloutPath);
  const preview=await previewNetwork({emitOutput:false});
  const targets=(rollout.rollbackManifest||[]).map((row)=>({siteSlug:row.siteSlug,pageSlug:"engagements"}));
  const details=targets.map((target)=>{
    const agency=(preview.agencies||[]).find((row)=>String(row.site?.slug)===String(target.siteSlug));
    const orphan=(agency?.topicGraph?.orphanPages||[]).includes(target.pageSlug);
    return {...target,orphan,closed:!orphan};
  });
  const summary={targetCount:details.length,closedTargetCount:details.filter((r)=>r.closed).length,openTargetCount:details.filter((r)=>!r.closed).length,remainingEngagementOrphanCount:details.filter((r)=>r.orphan).length,automaticWriteCount:0,closureCertified:details.length>0&&details.every((r)=>r.closed)};
  const report={type:"mse-25.47-post-rollout-validation",readOnly:true,writes:false,rolloutReportFingerprint:rollout.reportFingerprint,sourcePlanFingerprint:preview.planFingerprint,targets:details,summary};
  report.validationFingerprint=digest(report);
  const dir=process.env.MSE_25_47_REPORT_DIR||"/tmp";fs.mkdirSync(dir,{recursive:true});const reportPath=path.join(dir,`mse-25-47-post-rollout-${report.validationFingerprint.slice(0,12)}.json`);fs.writeFileSync(reportPath,`${JSON.stringify(report,null,2)}\n`);
  if(!summary.closureCertified){const e=new Error("La clôture MSE-25.47 n'est pas certifiée.");e.code="MSE_25_47_POST_ROLLOUT_NOT_CERTIFIED";e.details={reportPath,summary};throw e;}
  console.log(JSON.stringify({ok:true,readOnly:true,writes:false,closureCertified:true,reportPath,validationFingerprint:report.validationFingerprint,summary},null,2));return report;
}
if(require.main===module)run().catch((error)=>{console.error(JSON.stringify({ok:false,readOnly:true,writes:false,error:error.code||"MSE_25_47_POST_ROLLOUT_FAILED",message:error.message,details:error.details||{}},null,2));process.exitCode=1;});
module.exports={run};
