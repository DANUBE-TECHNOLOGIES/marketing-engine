"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TARGET_SITE_SLUG = process.env.MSE_25_197_SITE_SLUG || "mondescale-lamorlaye";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const SNAPSHOT_PATH = process.env.MSE_25_197_SNAPSHOT || "/var/tmp/mse-25-197-lamorlaye-seo-editorial-v1.snapshot.json";
const APPLY = String(process.env.MSE_25_197_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_197_ROLLBACK || "").toLowerCase() === "true";
const CONTROL_CITIES = ["Bois-Colombes", "Ozoir-la-Ferrière"];
const MEDIA_KEYS = ["imageAssetId", "imageUrl", "imageAlt", "image", "photo", "photoUrl", "portrait", "portraitUrl", "media", "asset"];

const HOME_SEO = Object.freeze({
  title: "Agence de voyages à Lamorlaye | Mondescale",
  h1: "Agence de voyages à Lamorlaye",
  metaDescription: "Mondescale, agence de voyages à Lamorlaye près de Chantilly et Gouvieux. Séjours, circuits, croisières, voyages sur mesure et billetterie avec les conseils de Stéphanie.",
});

const SERVICE_ITEMS = Object.freeze([
  { id: "sejours-clubs", title: "Séjours & clubs", text: "Pour des vacances en hôtel ou en club, Stéphanie vous aide à comparer les formules, les pensions, les catégories de chambre et les services inclus afin de choisir une proposition adaptée à votre projet." },
  { id: "circuits-accompagnes", title: "Circuits accompagnés", text: "Pour découvrir plusieurs étapes au cours d’un même voyage, l’agence étudie avec vous l’itinéraire, le rythme du circuit, les prestations prévues et les conditions du programme proposé par le voyagiste." },
  { id: "voyages-sur-mesure", title: "Voyages sur mesure", text: "Un projet plus personnel peut être construit à partir de vos dates, de vos envies, de votre budget et du rythme souhaité, en combinant les prestations disponibles auprès des partenaires référencés." },
  { id: "autotours", title: "Autotours", text: "Pour voyager avec davantage de liberté, l’agence peut étudier un itinéraire en autotour avec les étapes, hébergements et prestations nécessaires, selon les solutions disponibles pour votre destination." },
  { id: "croisieres", title: "Croisières", text: "Méditerranée, Europe ou destinations plus lointaines : l’agence vous accompagne dans la lecture des itinéraires, des catégories de cabine, des prestations à bord et des conditions proposées par les compagnies référencées." },
  { id: "famille", title: "Voyages en famille", text: "Pour un voyage en famille, l’agence prend en compte l’âge des voyageurs, le rythme du séjour, la configuration des chambres, les transports et les prestations utiles à votre organisation." },
  { id: "voyages-de-noces", title: "Voyages de noces & grands voyages", text: "Pour un voyage de noces ou un grand voyage, Stéphanie vous aide à construire un projet cohérent avec vos envies, votre calendrier et votre budget, sans imposer une formule unique." },
  { id: "groupes", title: "Voyages en groupe", text: "Associations, familles, amis ou autres groupes constitués peuvent présenter leur projet à l’agence afin d’étudier l’organisation et les prestations disponibles selon la demande." },
  { id: "billets-avion", title: "Billets d’avion", text: "L’agence peut étudier des itinéraires aériens, notamment depuis Paris-Charles-de-Gaulle (CDG) et Paris-Orly (ORY), en vérifiant les conditions tarifaires, les bagages et les correspondances applicables à la proposition retenue." },
  { id: "billets-train", title: "Billets de train", text: "Pour un trajet ferroviaire en France ou en Europe, l’agence peut rechercher une solution disponible et vous aider à lire les conditions du billet, les horaires et les correspondances avant réservation." },
]);

const PAGE_ALIASES = Object.freeze({
  home: ["", "home", "accueil", "index"],
  services: ["services"], team: ["equipe", "équipe", "team"], contact: ["contact"],
  agency: ["agence", "notre-agence", "qui-sommes-nous"], destinations: ["destinations"],
});

function normalize(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function stable(v) { if (Array.isArray(v)) return v.map(stable); if (v && typeof v === "object") return Object.keys(v).sort().reduce((a,k)=>(a[k]=stable(v[k]),a),{}); return v; }
function hash(v) { return crypto.createHash("sha256").update(JSON.stringify(stable(v))).digest("hex"); }
function typeOf(b) { return normalize(b?.blockType); }
function contentOf(b) { return b?.content && typeof b.content === "object" && !Array.isArray(b.content) ? clone(b.content) : {}; }
function pageByKind(site, kind) { const aliases = new Set((PAGE_ALIASES[kind] || []).map(normalize)); return (site.pages || []).find(p => aliases.has(normalize(p.slug))) || null; }
function firstBlockOfTypes(page, types) { const accepted = new Set(types.map(normalize)); return (page.blocks || []).find(b => accepted.has(typeOf(b))) || null; }
function existingNamedBlock(page, name) { return (page.blocks || []).find(b => b.name === name) || null; }
function nextOrder(page) { return Math.max(-1, ...(page.blocks || []).map(b => Number(b.displayOrder) || 0)) + 1; }
function blockSnapshot(b) { return { id:b.id, pageId:b.pageId, content:clone(b.content), blockType:b.blockType, name:b.name, displayOrder:b.displayOrder, status:b.status, visibleDesktop:b.visibleDesktop, visibleMobile:b.visibleMobile, version:b.version, settings:clone(b.settings), seo:clone(b.seo) }; }

async function loadSites(tenantId) {
  return prisma.agencySite.findMany({ where:{tenantId}, include:{ agency:true, pages:{ include:{ blocks:{ orderBy:{displayOrder:"asc"} } }, orderBy:{displayOrder:"asc"} } } });
}

function assertTarget(site) {
  if (!site || site.slug !== TARGET_SITE_SLUG) throw new Error(`MSE-25.197: site exact introuvable: ${TARGET_SITE_SLUG}`);
  if (normalize(site.agency?.city) !== "lamorlaye") throw new Error(`MSE-25.197: garde-fou ville refusé: ${site.agency?.city || "absente"}`);
}

function findStephanie(site) {
  const home = pageByKind(site, "home");
  if (!home) return null;
  const blocks = [...(home.blocks || [])].filter(b => ["team","equipe","team-grid","equipe-grid"].includes(typeOf(b)));
  for (const block of blocks) {
    const content = contentOf(block);
    for (const key of ["members","items","team","teamMembers"]) {
      if (!Array.isArray(content[key])) continue;
      const index = content[key].findIndex(m => normalize(m?.name || m?.title).includes("stephanie"));
      if (index >= 0) {
        const member = clone(content[key][index]);
        const mediaKeys = MEDIA_KEYS.filter(k => Object.prototype.hasOwnProperty.call(member, k));
        return { page:home, block, content, collectionKey:key, index, member, mediaKeys };
      }
    }
  }
  return null;
}

function routeFingerprint(site) {
  return hash((site.pages || []).map(p => ({ id:p.id, slug:p.slug, path:p.path, pageType:p.pageType, menuTitle:p.menuTitle, menuLocation:p.menuLocation, displayOrder:p.displayOrder, schemaType:p.schemaType, status:p.status, published:p.published })).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
}
function destinationFingerprint(site) { const p=pageByKind(site,"destinations"); return p ? hash({ page:{title:p.title,seoTitle:p.seoTitle,metaDescription:p.metaDescription,h1:p.h1}, blocks:p.blocks }) : null; }
function controlEditorialFingerprint(site) {
  return hash({
    site:{ id:site.id, slug:site.slug, basePath:site.basePath, status:site.status, theme:site.theme },
    pages:(site.pages || []).map(p => ({
      id:p.id,title:p.title,slug:p.slug,path:p.path,pageType:p.pageType,menuTitle:p.menuTitle,menuLocation:p.menuLocation,displayOrder:p.displayOrder,
      seoTitle:p.seoTitle,metaDescription:p.metaDescription,h1:p.h1,schemaType:p.schemaType,status:p.status,published:p.published,
      blocks:(p.blocks || []).map(b => ({ id:b.id,blockType:b.blockType,name:b.name,content:b.content,settings:b.settings,seo:b.seo,displayOrder:b.displayOrder,status:b.status,visibleDesktop:b.visibleDesktop,visibleMobile:b.visibleMobile,version:b.version }))
    }))
  });
}

function stephaniePresentation() { return "Stéphanie accompagne les voyageurs de l’agence de Lamorlaye dans la préparation de leurs séjours, circuits accompagnés, autotours, voyages sur mesure et croisières. Elle prend en compte les dates, le budget, le rythme souhaité et les prestations utiles afin d’étudier les solutions disponibles et de construire le projet avec le client."; }
function homeBlocks() { return [
  { name:"lamorlaye-editorial-intro-v1", blockType:"rich_text", content:{ title:"Une agence de voyages pour construire le voyage qui vous correspond", html:"<p>À Lamorlaye, Mondescale vous accompagne dans la préparation de vos vacances et déplacements, que vous habitiez Lamorlaye, Gouvieux, Chantilly, Coye-la-Forêt ou Orry-la-Ville. Stéphanie prend le temps d’étudier votre projet et de comparer les solutions disponibles auprès des voyagistes référencés afin de construire avec vous un séjour, un circuit, une croisière, un autotour ou un voyage sur mesure.</p>" } },
  { name:"lamorlaye-trip-types-v1", blockType:"features", content:{ title:"Quel voyage préparez-vous ?", columns:3, introduction:"Des vacances en club au grand voyage, votre projet est étudié selon vos dates, vos envies, votre budget et les solutions disponibles.", items:[SERVICE_ITEMS[0],SERVICE_ITEMS[1],SERVICE_ITEMS[2],SERVICE_ITEMS[3],SERVICE_ITEMS[4],SERVICE_ITEMS[6]].map(({id,title,text})=>({id,title,text})) } },
  { name:"lamorlaye-catchment-v1", blockType:"rich_text", content:{ title:"Votre agence de voyages à Lamorlaye et autour de Chantilly", html:"<p>L’agence accueille les voyageurs de Lamorlaye et des communes voisines, notamment Gouvieux, Chantilly, Coye-la-Forêt et Orry-la-Ville. Cette proximité permet d’échanger en agence sur votre projet et de disposer d’un interlocuteur pour la préparation et le suivi du dossier.</p>" } },
  { name:"lamorlaye-ticketing-v1", blockType:"rich_text", content:{ title:"Billets d’avion et de train depuis votre agence de Lamorlaye", html:"<p>Pour vos déplacements, l’agence peut étudier des billets d’avion et de train. Pour l’aérien, les itinéraires peuvent notamment être recherchés depuis Paris-Charles-de-Gaulle (CDG) et Paris-Orly (ORY), selon les vols disponibles. Avant réservation, Stéphanie peut vous aider à vérifier les conditions tarifaires, les bagages et les correspondances applicables à l’itinéraire proposé.</p>" } },
]; }
function serviceContent(existing) { return { ...existing, title:"Billets d'avion et de train à Lamorlaye", introduction:"Séjours, circuits, voyages sur mesure, autotours, croisières, vacances en famille, voyages de noces, groupes et billetterie : découvrez les services proposés par votre agence de voyages à Lamorlaye.", items:SERVICE_ITEMS.map(clone) }; }
function teamEditorialContent() { return { title:"Stéphanie — Conseillère voyage à Lamorlaye", html:`<p>${stephaniePresentation()}</p>` }; }
function contactContent() { return { title:"Venir dans votre agence de voyages à Lamorlaye", html:"<p>Votre agence Mondescale à Lamorlaye accueille également les voyageurs de Gouvieux, Chantilly, Coye-la-Forêt et Orry-la-Ville. Pour préparer votre venue, utilisez les horaires, l’adresse, le téléphone et les autres coordonnées affichés sur cette page : ces informations proviennent des données structurées de l’agence et ne sont pas dupliquées dans ce texte.</p><p>En agence, vous pouvez présenter vos dates, votre budget, le nombre de voyageurs et vos premières envies afin d’étudier un séjour, un circuit, une croisière, un voyage sur mesure ou un besoin de billetterie.</p>" }; }
function agencyContent() { return { title:"Votre agence Mondescale à Lamorlaye", html:"<p>À Lamorlaye, l’accompagnement commence par l’écoute de votre projet. Stéphanie étudie avec vous les possibilités correspondant à vos dates, à votre budget et à votre manière de voyager, puis vous aide à comparer les propositions disponibles auprès des voyagistes référencés.</p><p>L’agence peut vous accompagner pour un séjour, un circuit accompagné, un autotour, un voyage sur mesure, une croisière ou de la billetterie, avec un interlocuteur en agence pour la préparation et le suivi de votre dossier.</p>" }; }

async function upsertBlock(tx,page,spec,snapshot) {
  const existing=existingNamedBlock(page,spec.name);
  if (existing) { snapshot.updatedBlocks.push(blockSnapshot(existing)); await tx.pageBlock.update({where:{id:existing.id},data:{blockType:spec.blockType,content:spec.content,status:"published",visibleDesktop:true,visibleMobile:true,version:existing.version+1}}); return; }
  const created=await tx.pageBlock.create({data:{pageId:page.id,blockType:spec.blockType,name:spec.name,content:spec.content,settings:{},seo:{},displayOrder:nextOrder(page)+snapshot.createdBlocks.filter(x=>x.pageId===page.id).length,status:"published",visibleDesktop:true,visibleMobile:true}});
  snapshot.createdBlocks.push({id:created.id,pageId:page.id});
}

async function restoreSnapshot(snapshot) {
  await prisma.$transaction(async tx => {
    for (const b of snapshot.createdBlocks || []) await tx.pageBlock.delete({where:{id:b.id}}).catch(()=>null);
    for (const b of snapshot.updatedBlocks || []) await tx.pageBlock.update({where:{id:b.id},data:{blockType:b.blockType,name:b.name,content:b.content,settings:b.settings,seo:b.seo,displayOrder:b.displayOrder,status:b.status,visibleDesktop:b.visibleDesktop,visibleMobile:b.visibleMobile,version:b.version}});
    for (const p of snapshot.pages || []) await tx.agencySitePage.update({where:{id:p.id},data:{seoTitle:p.seoTitle,metaDescription:p.metaDescription,h1:p.h1}});
  });
}

async function archiveSnapshot(suffix) {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  const path=`${SNAPSHOT_PATH}.${suffix}-${Date.now()}`;
  fs.renameSync(SNAPSHOT_PATH,path);
  return path;
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error("MSE-25.197: APPLY et ROLLBACK sont mutuellement exclusifs");
  const tenant=await prisma.tenant.findUnique({where:{slug:TENANT_SLUG}});
  if (!tenant) throw new Error(`MSE-25.197: tenant introuvable: ${TENANT_SLUG}`);
  let sites=await loadSites(tenant.id);
  const site=sites.find(s=>s.slug===TARGET_SITE_SLUG); assertTarget(site);

  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.197: snapshot absent: ${SNAPSHOT_PATH}`);
    const snapshot=JSON.parse(fs.readFileSync(SNAPSHOT_PATH,"utf8"));
    if (snapshot.siteId!==site.id || snapshot.siteSlug!==site.slug) throw new Error("MSE-25.197: snapshot incompatible");
    await restoreSnapshot(snapshot);
    const archived=await archiveSnapshot("rolledback");
    console.log(JSON.stringify({mse:"25.197",mode:"ROLLBACK",site:site.slug,restoredBlocks:snapshot.updatedBlocks.length,removedBlocks:snapshot.createdBlocks.length,archivedSnapshot:archived},null,2));
    return;
  }

  const home=pageByKind(site,"home"), services=pageByKind(site,"services"), team=pageByKind(site,"team"), contact=pageByKind(site,"contact"), agency=pageByKind(site,"agency"), destinations=pageByKind(site,"destinations");
  const stephanie=findStephanie(site);
  if (!home || !services || !contact || !stephanie || !stephanie.mediaKeys.length) throw new Error("MSE-25.197: préconditions Lamorlaye non satisfaites");

  const controlsBefore=Object.fromEntries(CONTROL_CITIES.map(city=>{const c=sites.find(s=>normalize(s.agency?.city)===normalize(city));return [city,c?controlEditorialFingerprint(c):null];}));
  if (Object.values(controlsBefore).some(v=>!v)) throw new Error("MSE-25.197: agence témoin absente");
  const report={mse:"25.197",mode:APPLY?"APPLY":"DRY_RUN",site:site.slug,preconditions:{home:home.slug,services:services.slug,team:team?.slug||null,contact:contact.slug,agency:agency?.slug||null,destinations:destinations?.slug||null,stephaniePage:stephanie.page.slug,stephanieBlockId:stephanie.block.id,stephanieMediaKeys:stephanie.mediaKeys},protected:{siteRouteFingerprint:routeFingerprint(site),destinationFingerprint:destinationFingerprint(site),controls:controlsBefore},planned:{homeSeo:HOME_SEO,services:SERVICE_ITEMS.map(i=>i.title),networkWrites:0}};
  if (!APPLY) { console.log(JSON.stringify(report,null,2)); return; }
  if (fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.197: snapshot déjà présent: ${SNAPSHOT_PATH}`);

  const snapshot={mse:"25.197",siteId:site.id,siteSlug:site.slug,createdAt:new Date().toISOString(),pages:[{id:home.id,seoTitle:home.seoTitle,metaDescription:home.metaDescription,h1:home.h1}],updatedBlocks:[blockSnapshot(stephanie.block)],createdBlocks:[]};
  fs.writeFileSync(SNAPSHOT_PATH,JSON.stringify(snapshot,null,2),{flag:"wx",mode:0o600});

  try {
    await prisma.$transaction(async tx=>{
      await tx.agencySitePage.update({where:{id:home.id},data:{seoTitle:HOME_SEO.title,metaDescription:HOME_SEO.metaDescription,h1:HOME_SEO.h1}});
      const teamContent=contentOf(stephanie.block), list=clone(teamContent[stephanie.collectionKey]), original=clone(list[stephanie.index]);
      list[stephanie.index]={...original,name:original.name||"Stéphanie",role:"Conseillère voyage",presentation:stephaniePresentation()};
      await tx.pageBlock.update({where:{id:stephanie.block.id},data:{content:{...teamContent,title:"Stéphanie, votre conseillère voyage à Lamorlaye",text:"Un accompagnement en agence pour construire votre projet de voyage.",[stephanie.collectionKey]:list},version:stephanie.block.version+1}});
      for (const spec of homeBlocks()) await upsertBlock(tx,home,spec,snapshot);
      const servicesBlock=firstBlockOfTypes(services,["features","services","services-grid","services-highlight","cards"]);
      if (servicesBlock) { snapshot.updatedBlocks.push(blockSnapshot(servicesBlock)); await tx.pageBlock.update({where:{id:servicesBlock.id},data:{content:serviceContent(contentOf(servicesBlock)),status:"published",visibleDesktop:true,visibleMobile:true,version:servicesBlock.version+1}}); }
      else await upsertBlock(tx,services,{name:"lamorlaye-services-editorial-v1",blockType:"services-grid",content:serviceContent({})},snapshot);
      if (team) await upsertBlock(tx,team,{name:"lamorlaye-team-editorial-v1",blockType:"rich_text",content:teamEditorialContent()},snapshot);
      await upsertBlock(tx,contact,{name:"lamorlaye-contact-editorial-v1",blockType:"rich_text",content:contactContent()},snapshot);
      if (agency) await upsertBlock(tx,agency,{name:"lamorlaye-agency-editorial-v1",blockType:"rich_text",content:agencyContent()},snapshot);
      const partners=firstBlockOfTypes(home,["partners","logos","partner-logos"]);
      if (partners) { snapshot.updatedBlocks.push(blockSnapshot(partners)); await tx.pageBlock.update({where:{id:partners.id},data:{content:{...contentOf(partners),title:"Plusieurs voyagistes, un seul conseiller",text:"Votre agence s’appuie uniquement sur les marques et partenaires actuellement référencés par Mondescale pour étudier les solutions correspondant à votre projet."},version:partners.version+1}}); }
      const reviews=firstBlockOfTypes(home,["reviews"]); if (!reviews) await upsertBlock(tx,home,{name:"lamorlaye-google-reviews-v1",blockType:"reviews",content:{title:"Les avis Google de votre agence à Lamorlaye",limit:3}},snapshot);
    });
    fs.writeFileSync(SNAPSHOT_PATH,JSON.stringify(snapshot,null,2),{mode:0o600});

    sites=await loadSites(tenant.id);
    const fresh=sites.find(s=>s.id===site.id);
    const controlsAfter=Object.fromEntries(CONTROL_CITIES.map(city=>{const c=sites.find(s=>normalize(s.agency?.city)===normalize(city));return [city,c?controlEditorialFingerprint(c):null];}));
    const failures=[];
    if (routeFingerprint(fresh)!==routeFingerprint(site)) failures.push("topologie Lamorlaye");
    if (destinationFingerprint(fresh)!==destinationFingerprint(site)) failures.push("Destinations Lamorlaye");
    for (const city of CONTROL_CITIES) if (controlsBefore[city]!==controlsAfter[city]) failures.push(`contenu éditorial ${city}`);
    if (failures.length) {
      await restoreSnapshot(snapshot);
      const archived=await archiveSnapshot("auto-rollback");
      throw new Error(`MSE-25.197: validation post-écriture échouée (${failures.join(", ")}); rollback automatique effectué; snapshot=${archived}`);
    }
    report.result={snapshot:SNAPSHOT_PATH,createdBlocks:snapshot.createdBlocks.length,updatedBlocks:snapshot.updatedBlocks.length,routeFingerprintUnchanged:true,destinationsUnchanged:true,controlSitesUnchanged:Object.fromEntries(CONTROL_CITIES.map(c=>[c,true]))};
    console.log(JSON.stringify(report,null,2));
  } catch (error) {
    throw error;
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>prisma.$disconnect());
