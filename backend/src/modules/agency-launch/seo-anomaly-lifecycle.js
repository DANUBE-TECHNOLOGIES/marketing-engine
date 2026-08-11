"use strict";

const LEVER="seo_anomaly_state";
const ALLOWED=new Set(["new","investigating","resolved","ignored"]);

function fingerprint(anomaly={}){
  return [anomaly.type||"unknown",anomaly.keywordId||anomaly.keyword||"",anomaly.days||""].join(":");
}

function decode(row){
  try{const data=JSON.parse(row?.comment||"{}");if(data?.schema!=="seo-anomaly-state-v1")return null;return{fingerprint:data.fingerprint,status:data.status,reason:data.reason||null,updatedAt:data.updatedAt||row.createdAt||null,id:row.id};}catch{return null;}
}

async function anomalyStateHistory(database,tenantId,agencyId,limit=200){
  const rows=await database.networkAction.findMany({where:{agencyId:Number(agencyId),agency:{tenantId},lever:LEVER},orderBy:{createdAt:"desc"},take:Math.max(1,Math.min(Number(limit)||200,500))});
  return rows.map(decode).filter(Boolean);
}

function latestStateByFingerprint(history=[]){const map=new Map();for(const item of history){if(item?.fingerprint&&!map.has(item.fingerprint))map.set(item.fingerprint,item);}return map;}

function applyLifecycle(anomalies={},history=[]){
  const latest=latestStateByFingerprint(history);
  const list=(anomalies.anomalies||anomalies.alerts||[]).map(item=>{const key=fingerprint(item);const state=latest.get(key)||{status:"new",reason:null,updatedAt:null};return{...item,fingerprint:key,lifecycle:state};});
  return{...anomalies,version:"1.2",anomalies:list,alerts:list,new:list.filter(x=>x.lifecycle.status==="new").length,investigating:list.filter(x=>x.lifecycle.status==="investigating").length,resolved:list.filter(x=>x.lifecycle.status==="resolved").length,ignored:list.filter(x=>x.lifecycle.status==="ignored").length};
}

async function recordAnomalyState(database,agencyId,{fingerprint:fp,status,reason}){
  const normalized=String(status||"").trim();if(!ALLOWED.has(normalized)){const e=new Error("Statut d'alerte SEO invalide.");e.statusCode=400;e.code="SEO_ANOMALY_INVALID_STATUS";throw e;}
  if(normalized==="ignored"&&!String(reason||"").trim()){const e=new Error("Une justification est obligatoire pour ignorer une alerte SEO.");e.statusCode=400;e.code="SEO_ANOMALY_IGNORE_REASON_REQUIRED";throw e;}
  const updatedAt=new Date().toISOString();
  return database.networkAction.create({data:{agencyId:Number(agencyId),lever:LEVER,title:`Alerte SEO · ${normalized}`,description:String(fp||""),status:"done",comment:JSON.stringify({schema:"seo-anomaly-state-v1",fingerprint:String(fp||""),status:normalized,reason:String(reason||"").trim()||null,updatedAt})}});
}

module.exports={LEVER,ALLOWED,fingerprint,decode,anomalyStateHistory,latestStateByFingerprint,applyLifecycle,recordAnomalyState};
