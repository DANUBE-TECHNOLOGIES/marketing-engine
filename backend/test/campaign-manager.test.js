"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {CampaignService}=require("../src/modules/campaign-manager/service");
const {validateCampaignInput}=require("../src/modules/campaign-manager/validation");
function repo(overrides={}){ const campaign={id:"c1",tenantId:"t1",name:"Hiver 2026",status:"draft",progress:0,agencies:[{agency:{id:1,name:"Gien"}}],destinations:[{destination:{id:"d1",slug:"maurice",name:"Île Maurice"}}],tasks:[],assets:[]}; return {list:async()=>[campaign],get:async id=>id==="c1"?campaign:null,countAgencies:async ids=>ids.length,countDestinations:async ids=>ids.length,create:async(d,a,z)=>({...campaign,...d,agencies:a.map(id=>({agency:{id}})),destinations:z.map(id=>({destination:{id,slug:id,name:id}}))}),update:async(id,d)=>({...campaign,...d}),remove:async id=>id==="c1"?campaign:null,createTasks:async(id,tasks)=>tasks,...overrides}; }
test("health expose le campaign manager",()=>{assert.equal(new CampaignService(repo(),"t1").health().version,"15.1.0");});
test("validation normalise agences et canaux",()=>{const x=validateCampaignInput({name:"Hiver 2026",agencyIds:[1,"2"],channels:["facebook","newsletter"]});assert.deepEqual(x.agencyIds,[1,2]);});
test("validation refuse une période inversée",()=>assert.throws(()=>validateCampaignInput({name:"Test campagne",startDate:"2026-12-01",endDate:"2026-01-01"}),/postérieure/));
test("list calcule les métriques",async()=>{const x=await new CampaignService(repo(),"t1").list();assert.equal(x[0].metrics.agencies,1);assert.equal(x[0].metrics.destinations,1);});
test("create vérifie et crée les rattachements",async()=>{const x=await new CampaignService(repo(),"t1").create({name:"Été 2027",agencyIds:[1],destinationIds:["d1"]});assert.equal(x.name,"Été 2027");assert.equal(x.metrics.agencies,1);});
test("generate construit sept tâches par destination",async()=>{let made=[];const r=repo({createTasks:async(id,t)=>{made=t;return t;},update:async()=>repo().get("c1")});const s=new CampaignService(r,"t1");await s.generate("c1");assert.equal(made.length,7);assert.equal(made[0].payload.destinationSlug,"maurice");});
test("get refuse une campagne inconnue",async()=>{await assert.rejects(()=>new CampaignService(repo(),"t1").get("absent"),/introuvable/);});
