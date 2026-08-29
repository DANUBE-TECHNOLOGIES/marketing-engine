"use strict";

const { PrismaClient } = require("@prisma/client");
const { MiniSiteStructuredDataRepository } = require("../src/modules/minisite-structured-data/repository");
const { publicStructuredDataSite } = require("../src/modules/minisite-structured-data/service");
const { INTENTS } = require("../src/modules/minisite-structured-data/local-search-intent-coverage");
const { qualityForTarget } = require("../src/modules/minisite-structured-data/local-intent-target-quality");

const TARGETS = [
  ["Ozoir la Ferrière", "services", "ticketing"], ["Ozoir la Ferrière", "contact", "appointment"],
  ["Maurepas", "services", "ticketing"], ["Maurepas", "contact", "appointment"],
  ["Nevers", "services", "ticketing"], ["Nevers", "contact", "appointment"],
  ["Dax", "services", "ticketing"],
  ["Gien", "services", "ticketing"], ["Gien", "contact", "appointment"],
  ["Bois-Colombes", "services", "ticketing"],
  ["Lamorlaye", "services", "ticketing"], ["Lamorlaye", "contact", "appointment"],
];
function n(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function page(site,slug){return (site?.pages||[]).find(p=>n(p.slug)===n(slug))||null;}
function intent(key){return INTENTS.find(i=>i.key===key);}
function q(p,city,key){return p?qualityForTarget(p,city,intent(key)):null;}
function blockSummary(p){return (p?.blocks||[]).map(b=>({id:b.id,type:b.blockType,status:b.status||null,keys:Object.keys(b.content||{})}));}

async function main(){
 const prisma=new PrismaClient();
 try{
  const tenant=await prisma.tenant.findFirst({where:{slug:process.env.TENANT_SLUG||"mondescale"}});
  if(!tenant) throw new Error("tenant introuvable");
  const repo=new MiniSiteStructuredDataRepository(prisma);
  const rawSites=await repo.listSites(tenant.id);
  const rows=TARGETS.map(([city,slug,key])=>{
   const raw=rawSites.find(s=>n(s?.agency?.city)===n(city));
   const pub=publicStructuredDataSite(raw);
   const rp=page(raw,slug), pp=page(pub,slug);
   return {city,slug,intent:key,raw:q(rp,city,key),public:q(pp,city,key),rawBlocks:blockSummary(rp),publicBlocks:blockSummary(pp)};
  });
  console.log(JSON.stringify({mse:"25.93",readOnly:true,writes:false,rows},null,2));
 } finally {await prisma.$disconnect();}
}
main().catch(e=>{console.error(e);process.exit(1);});
