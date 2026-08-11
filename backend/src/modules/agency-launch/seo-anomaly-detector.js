"use strict";

function rankingAnomalies(report) {
  const rankings=(report?.checks||[]).find(item=>item?.code==="LOCAL_RANKINGS")||{};
  const items=Array.isArray(rankings.items)?rankings.items:[];
  const anomalies=[];
  for(const item of items){
    const latest=Number(item?.momentum?.latestPosition);
    const previous=Number(item?.momentum?.previousPosition);
    if(!Number.isFinite(latest)||!Number.isFinite(previous)) continue;
    if(previous<=10&&latest>10){
      anomalies.push({severity:latest>20?"critical":"warning",type:"top10_lost",keywordId:item.keywordId,keyword:item.keyword,city:item.city,previousPosition:previous,currentPosition:latest,delta:previous-latest,title:`Perte du Top 10 : ${item.keyword}`,detail:`La requête est passée de la position ${previous} à ${latest}.`});
      continue;
    }
    const drop=latest-previous;
    if(drop>=10){
      anomalies.push({severity:drop>=20?"critical":"warning",type:"ranking_drop",keywordId:item.keywordId,keyword:item.keyword,city:item.city,previousPosition:previous,currentPosition:latest,delta:previous-latest,title:`Recul brutal : ${item.keyword}`,detail:`La requête a reculé de ${drop} positions (${previous} → ${latest}).`});
    }
  }
  return anomalies;
}

function healthAnomalies(report){
  const trend=report?.seoHealthTrend||{};
  const anomalies=[];
  for(const window of trend.windows||[]){
    if(!window?.comparable||window?.scoreDelta==null) continue;
    const delta=Number(window.scoreDelta);
    if(delta<=-10){
      anomalies.push({severity:delta<=-20?"critical":"warning",type:"health_drop",days:window.days,previousScore:Number(window.baseline?.score||0),currentScore:Number(trend.currentScore||report?.seoHealth?.score||0),delta,title:`Baisse de santé SEO sur ${window.days} jours`,detail:`Le score santé a perdu ${Math.abs(delta)} points sur ${window.days} jours.`});
    }
  }
  return anomalies;
}

function agencySeoAnomalies(report){
  const anomalies=[...rankingAnomalies(report),...healthAnomalies(report)];
  const severityRank={critical:0,warning:1,info:2};
  anomalies.sort((a,b)=>(severityRank[a.severity]??9)-(severityRank[b.severity]??9));
  return {version:"1.0",total:anomalies.length,critical:anomalies.filter(a=>a.severity==="critical").length,warning:anomalies.filter(a=>a.severity==="warning").length,anomalies};
}

function summarizeNetworkAnomalies(items=[]){
  const rows=[];
  for(const item of items){for(const anomaly of item?.seoAnomalies?.anomalies||[]) rows.push({agency:item.agency,...anomaly});}
  const severityRank={critical:0,warning:1,info:2};
  rows.sort((a,b)=>(severityRank[a.severity]??9)-(severityRank[b.severity]??9));
  return {version:"1.0",total:rows.length,critical:rows.filter(r=>r.severity==="critical").length,warning:rows.filter(r=>r.severity==="warning").length,agenciesAffected:new Set(rows.map(r=>r.agency?.id).filter(Boolean)).size,alerts:rows.slice(0,50)};
}

module.exports={rankingAnomalies,healthAnomalies,agencySeoAnomalies,summarizeNetworkAnomalies};
