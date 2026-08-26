#!/usr/bin/env node
"use strict";
const fs=require("node:fs");const path=require("node:path");const crypto=require("node:crypto");
const {PrismaClient}=require("@prisma/client");
const {buildWebsiteDesignerEditorialSnapshot}=require("../src/modules/minisite-semantic-engine/editorial-page-snapshot");
const {buildEditorialDiffPreview,certifyEditorialDiffPreview}=require("../src/modules/minisite-semantic-engine/editorial-diff-preview");
function stable(v){if(Array.isArray(v))return v.map(stable);if(!v||typeof v!=="object")return v;return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))}
function fp(v){return crypto.createHash("sha256").update(JSON.stringify(stable(v))).digest("hex")}
function read(file){if(!file||!fs.existsSync(file))throw new Error(`MSE_25_56_SOURCE_REPORT_MISSING:${file||"null"}`);return JSON.parse(fs.readFileSync(file,"utf8"))}
function writeReport(dir,prefix,value){fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${prefix}-${fp(value).slice(0,12)}.json`);fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n");return file}
function proposalFromMandate(report,snapshot){const p=report?.mandate?.proposal||report?.mandate?.editorialProposal||null;if(!p)throw new Error("MSE_25_56_EDITORIAL_PROPOSAL_MISSING");return{siteSlug:snapshot.siteSlug,page:snapshot.page,title:p.title||p.h1||snapshot.title,introduction:p.introduction||p.intro||p.description||"",replaceManualContent:p.replaceManualContent===true}}
async function run({prisma,sourceReportPath,reportDir=process.env.MSE_25_56_REPORT_DIR||"/home/admin1/mse-25-56-reports"}={}){
 const source=read(sourceReportPath||process.env.MSE_25_56_SOURCE_REPORT);const mandate=source.mandate||{};if(!mandate.siteSlug||!mandate.page)throw new Error("MSE_25_56_MANDATE_PAGE_IDENTITY_MISSING");
 const own=!prisma;const db=prisma||new PrismaClient();try{
  const page=await db.agencySitePage.findFirst({where:{path:mandate.page,site:{is:{slug:mandate.siteSlug}}},include:{sections:{orderBy:{displayOrder:"asc"}},blocks:{orderBy:{displayOrder:"asc"}},site:{select:{slug:true}}}});
  const snapshot=buildWebsiteDesignerEditorialSnapshot({page,expectedSiteSlug:mandate.siteSlug,expectedPath:mandate.page});
  const proposal=proposalFromMandate(source,snapshot);const preview=buildEditorialDiffPreview({mandateReport:source,currentPage:snapshot,proposal});const certification=certifyEditorialDiffPreview(preview);
  if(!certification.certified)throw new Error(`MSE_25_56_PREVIEW_CERTIFICATION_FAILED:${certification.reasons.join(",")}`);
  const sealed={type:"MSE_25_56_EDITORIAL_DIFF_OBSERVATION",ok:true,certified:true,readOnly:true,writes:false,publicWrites:false,sourceMandateReportPath:sourceReportPath||process.env.MSE_25_56_SOURCE_REPORT,sourceMandateFingerprint:mandate.mandateFingerprint,pageSnapshot:snapshot,preview,certification,summary:{changedFieldCount:preview.changedFields.length,executableCount:0,automaticWriteCount:0,pageCreationCount:0,publicationCount:0,websiteDesignerMutationCount:0},nextStep:"HUMAN_REVIEW_EDITORIAL_DIFF"};sealed.observationFingerprint=fp(sealed);sealed.reportPath=writeReport(reportDir,"mse-25-56-observation",sealed);return sealed;
 }finally{if(own)await db.$disconnect()}
}
if(require.main===module)run().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({ok:false,readOnly:true,writes:false,publicWrites:false,error:"MSE_25_56_OBSERVATION_FAILED",message:e.message},null,2));process.exitCode=1});
module.exports={run,proposalFromMandate,writeReport};
