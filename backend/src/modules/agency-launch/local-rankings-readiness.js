"use strict";

const { rankingVisibilityTrend } = require("./ranking-visibility-trend");
const RANKING_FRESHNESS_TARGET_DAYS = 45;
const OPPORTUNITY_MIN_POSITION = 11;
const OPPORTUNITY_MAX_POSITION = 20;
const RANKING_HISTORY_POINTS = 20;

function daysSince(value, now = new Date()) { if (!value) return null; const date = new Date(value); if (Number.isNaN(date.getTime())) return null; return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000)); }
function orderedResults(keyword) { const results = Array.isArray(keyword?.results) ? keyword.results : []; return [...results].sort((l,r) => new Date(r.checkedAt||0)-new Date(l.checkedAt||0)); }
function latestResult(keyword) { return orderedResults(keyword)[0] || null; }
function rankingMomentum(keyword) {
  const history = orderedResults(keyword).filter((result) => result?.checkedAt).slice(0, 6);
  const numeric = history.filter((result) => Number.isFinite(Number(result?.position)));
  if (numeric.length < 2) return { status:"insufficient_data", delta:null, latestPosition:numeric[0]?Number(numeric[0].position):null, previousPosition:null, bestPosition:numeric[0]?Number(numeric[0].position):null, worstPosition:numeric[0]?Number(numeric[0].position):null, measurements:history.length };
  const latestPosition=Number(numeric[0].position), previousPosition=Number(numeric[1].position), delta=previousPosition-latestPosition, positions=numeric.map(r=>Number(r.position));
  return { status:delta>=2?"improving":delta<=-2?"declining":"stable", delta, latestPosition, previousPosition, bestPosition:Math.min(...positions), worstPosition:Math.max(...positions), measurements:history.length };
}
function rankingOpportunity(item) {
  if (!item?.fresh) return null;
  const suffix=item.momentum?.status==="improving"?" La requête progresse déjà : consolider les gains sans bouleverser la page.":item.momentum?.status==="declining"?" La requête recule : vérifier les changements récents, la concurrence et la pertinence de la page cible.":"";
  if(item.position!=null&&item.position>=11&&item.position<=20)return{priority:"high",type:"near_top10",keywordId:item.keywordId,keyword:item.keyword,city:item.city,position:item.position,momentum:item.momentum,action:"Renforcer en priorité la page qui répond déjà à cette intention : contenu local spécifique, maillage interne et preuve d'expertise, sans créer de page artificielle supplémentaire."+suffix};
  if(item.position!=null&&item.position>20)return{priority:item.momentum?.status==="declining"?"high":"medium",type:"visible_but_weak",keywordId:item.keywordId,keyword:item.keyword,city:item.city,position:item.position,momentum:item.momentum,action:"Vérifier que l'intention est réellement couverte par un contenu publié, local et distinct avant d'enrichir la page existante."+suffix};
  if(!item.found)return{priority:"medium",type:"not_found",keywordId:item.keywordId,keyword:item.keyword,city:item.city,position:null,momentum:item.momentum,action:"Contrôler d'abord l'indexation et la pertinence de la page cible, puis enrichir uniquement si cette requête correspond réellement à l'activité de l'agence."};
  return null;
}
function localRankingCheck(keywords=[],now=new Date()) {
  const active=(keywords||[]).filter(k=>k?.active!==false);
  const items=active.map(keyword=>{const result=latestResult(keyword);const position=Number.isFinite(Number(result?.position))?Number(result.position):null;const ageDays=daysSince(result?.checkedAt,now);const fresh=ageDays!=null&&ageDays<=45;return{keywordId:keyword.id,keyword:keyword.keyword,city:keyword.city,lastCheckStatus:keyword.lastCheckStatus||null,found:Boolean(result?.found),position,checkedAt:result?.checkedAt||null,ageDays,fresh,top10:position!=null&&position<=10,top20:position!=null&&position<=20,momentum:rankingMomentum(keyword)}});
  const measured=items.filter(i=>i.checkedAt),fresh=measured.filter(i=>i.fresh),top10=fresh.filter(i=>i.top10),top20=fresh.filter(i=>i.top20),improving=fresh.filter(i=>i.momentum?.status==="improving"),declining=fresh.filter(i=>i.momentum?.status==="declining"),missingOrStale=items.filter(i=>!i.checkedAt||!i.fresh);
  const opportunities=items.map(rankingOpportunity).filter(Boolean).sort((l,r)=>{const rank={high:0,medium:1,low:2};const d=rank[l.priority]-rank[r.priority];if(d!==0)return d;if(l.momentum?.status==="declining"&&r.momentum?.status!=="declining")return-1;if(r.momentum?.status==="declining"&&l.momentum?.status!=="declining")return 1;return(l.position??999)-(r.position??999)});
  const passed=active.length>0&&missingOrStale.length===0;
  return{code:"LOCAL_RANKINGS",label:"Suivi des positions locales",required:false,passed,freshnessTargetDays:45,historyPoints:RANKING_HISTORY_POINTS,activeKeywords:active.length,measuredKeywords:measured.length,freshKeywords:fresh.length,top10Keywords:top10.length,top20Keywords:top20.length,improvingKeywords:improving.length,decliningKeywords:declining.length,top10Rate:fresh.length?Math.round(top10.length/fresh.length*1000)/1000:0,top20Rate:fresh.length?Math.round(top20.length/fresh.length*1000)/1000:0,visibilityTrend:rankingVisibilityTrend(active,now),missingOrStale:missingOrStale.slice(0,20),opportunities:opportunities.slice(0,20),items:items.slice(0,50),recommendation:passed?(opportunities.length>0?"Les mesures sont à jour. Prioriser les requêtes proches du top 10 et surveiller en premier celles qui reculent.":null):(active.length===0?"Définir quelques requêtes locales réellement stratégiques pour suivre la visibilité de l'agence dans sa zone de chalandise.":"Relancer les mesures de position pour les mots-clés sans résultat récent avant d'évaluer l'impact SEO du mini-site.")};
}
async function localRankingsReadiness(database,tenantId,agencyId){const keywords=await database.rankingKeyword.findMany({where:{agencyId:Number(agencyId),active:true,agency:{tenantId}},orderBy:[{createdAt:"asc"}],select:{id:true,keyword:true,city:true,active:true,lastCheckStatus:true,results:{orderBy:{checkedAt:"desc"},take:RANKING_HISTORY_POINTS,select:{position:true,found:true,checkedAt:true}}}});return localRankingCheck(keywords);}
function applyLocalRankingsToReadiness(report,check){const checks=Array.isArray(report?.checks)?report.checks:[];return{...report,version:"3.6",checks:[...checks.filter(i=>i?.code!=="LOCAL_RANKINGS"),check]};}
module.exports={RANKING_FRESHNESS_TARGET_DAYS,OPPORTUNITY_MIN_POSITION,OPPORTUNITY_MAX_POSITION,RANKING_HISTORY_POINTS,daysSince,orderedResults,latestResult,rankingMomentum,rankingOpportunity,localRankingCheck,localRankingsReadiness,applyLocalRankingsToReadiness};
