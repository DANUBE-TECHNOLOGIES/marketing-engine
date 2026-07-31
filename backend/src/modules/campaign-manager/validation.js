"use strict";
const STATUSES = new Set(["draft", "planned", "generating", "review", "scheduled", "active", "completed", "archived"]);
const OBJECTIVES = new Set(["traffic", "sales", "seo", "awareness", "engagement", "leads"]);
const CHANNELS = new Set(["landing-page", "faq", "facebook", "instagram", "google-business", "linkedin", "newsletter", "hero-image"]);
function fail(message, code = "CAMPAIGN_VALIDATION_ERROR") { const e = new Error(message); e.statusCode = 400; e.code = code; throw e; }
function ids(value, field) { if (value == null) return []; if (!Array.isArray(value)) fail(`${field} doit être une liste.`); const out=[...new Set(value.map(String).map(x=>x.trim()).filter(Boolean))]; if (out.length !== value.length && value.some(x=>!String(x??"").trim())) fail(`${field} contient un identifiant vide.`); return out; }
function agencyIds(value) { return ids(value,"agencyIds").map(x=>{ const n=Number(x); if(!Number.isInteger(n)||n<=0) fail("agencyIds contient un identifiant invalide."); return n; }); }
function date(value, field) { if (value == null || value === "") return null; const d=new Date(value); if(Number.isNaN(d.getTime())) fail(`${field} est invalide.`); return d; }
function validateCampaignInput(input, {partial=false}={}) {
 if(!input || typeof input!=="object" || Array.isArray(input)) fail("La campagne doit être un objet JSON.");
 const out={};
 if(!partial || Object.hasOwn(input,"name")){ const v=String(input.name||"").trim(); if(v.length<3||v.length>160) fail("Le nom doit contenir entre 3 et 160 caractères."); out.name=v; }
 for(const f of ["description","createdBy"]){ if(Object.hasOwn(input,f)) out[f]=input[f]==null?null:String(input[f]).trim().slice(0,f==="description"?2000:160)||null; }
 if(Object.hasOwn(input,"status")){ const v=String(input.status).toLowerCase(); if(!STATUSES.has(v)) fail("Statut de campagne invalide."); out.status=v; }
 if(Object.hasOwn(input,"objective")){ const v=String(input.objective).toLowerCase(); if(!OBJECTIVES.has(v)) fail("Objectif de campagne invalide."); out.objective=v; }
 if(Object.hasOwn(input,"startDate")) out.startDate=date(input.startDate,"startDate");
 if(Object.hasOwn(input,"endDate")) out.endDate=date(input.endDate,"endDate");
 if(Object.hasOwn(out,"startDate")&&Object.hasOwn(out,"endDate")&&out.startDate&&out.endDate&&out.endDate<out.startDate) fail("endDate doit être postérieure à startDate.");
 if(Object.hasOwn(input,"agencyIds")) out.agencyIds=agencyIds(input.agencyIds);
 if(Object.hasOwn(input,"destinationIds")) out.destinationIds=ids(input.destinationIds,"destinationIds");
 if(Object.hasOwn(input,"channels")){ const list=ids(input.channels,"channels"); const bad=list.find(x=>!CHANNELS.has(x)); if(bad) fail(`Canal non supporté: ${bad}.`); out.channels=list; }
 return out;
}
module.exports={STATUSES,OBJECTIVES,CHANNELS,validateCampaignInput};
