"use strict";

const fs = require("node:fs");
const { buildMatrix } = require("./mse-25-210-acquisition-campaign-links");

const BASE_URL=(process.env.ACQUISITION_ANALYTICS_BASE_URL||"http://127.0.0.1:4000").replace(/\/$/,"");
const DAYS=Math.min(Math.max(Number(process.env.ACQUISITION_ANALYTICS_DAYS||30),1),365);

async function getJson(path){const response=await fetch(`${BASE_URL}${path}`);const body=await response.json();if(!response.ok||!body?.ok)throw new Error(`${path} -> HTTP ${response.status}`);return body}
function csvCell(value){const text=String(value??"");return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text}
function toCsv(rows){const headers=["agency","publicSiteSlug","siteSlug","utmSource","utmMedium","utmCampaign","utmContent","leads","hot","warm","cold","contacted","converted","notificationSent","avgScore"];
return [headers.join(","),...rows.map(row=>headers.map(key=>csvCell(row[key])).join(","))].join("\n")+"\n"}
async function main(){const [funnel,channel]=await Promise.all([getJson(`/api/leads/acquisition/analytics?days=${DAYS}`),getJson(`/api/leads/acquisition/analytics?days=${DAYS}&by=channel`)]);const agencies=new Map(buildMatrix().map(row=>[row.siteSlug,row]));const rows=channel.funnels.map(row=>({agency:agencies.get(row.siteSlug)?.agency||row.siteSlug,publicSiteSlug:agencies.get(row.siteSlug)?.publicSiteSlug||"",...row}));const report={ok:true,mse:"MSE-25.210",generatedAt:new Date().toISOString(),days:DAYS,links:buildMatrix(),funnelAnalytics:funnel.funnels,channelAnalytics:rows};const jsonPath=process.env.ACQUISITION_ATTRIBUTION_JSON;const csvPath=process.env.ACQUISITION_ATTRIBUTION_CSV;if(jsonPath)fs.writeFileSync(jsonPath,`${JSON.stringify(report,null,2)}\n`);if(csvPath)fs.writeFileSync(csvPath,toCsv(rows));console.log("MSE-25.210 — ATTRIBUTION REPORT");console.log(`Fenêtre : ${DAYS} jours`);console.log(`Liens   : ${report.links.reduce((n,row)=>n+Object.keys(row.links).length,0)}`);console.log(`Lignes attribution : ${rows.length}`);console.table(rows.map(({agency,utmSource,utmMedium,leads,hot,warm,cold,contacted,converted})=>({agency,utmSource,utmMedium,leads,hot,warm,cold,contacted,converted})));if(jsonPath)console.log(`JSON : ${jsonPath}`);if(csvPath)console.log(`CSV  : ${csvPath}`);console.log("MSE-25.210 REPORT SUCCESS")}
main().catch(error=>{console.error("MSE-25.210 REPORT FAILED");console.error(error.stack||error);process.exit(1)});
