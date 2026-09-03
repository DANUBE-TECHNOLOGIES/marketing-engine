"use strict";

function classifyOpportunity(item={}){
  const position=Number.isFinite(Number(item.position))?Number(item.position):null;
  const target=item.targetPage||null;
  const coverage=Number(target?.coverage||0);
  const titleCoverage=Number(target?.titleCoverage||0);

  if(target&&coverage>=0.75){
    return {
      mode:"reinforce_existing",
      priority: position!=null&&position<=20?"high":"medium",
      reason:"Une page publiée couvre déjà clairement cette intention. Il faut renforcer son utilité locale avant de créer quoi que ce soit.",
      targetPage:target,
      recommendation:"Renforcer la page existante avec des preuves locales, des réponses plus complètes à l’intention de recherche, un meilleur maillage interne et des éléments de réassurance propres à l’agence.",
    };
  }

  if(target&&coverage>=0.5){
    return {
      mode:"enrich_existing",
      priority: position!=null&&position<=20?"high":"medium",
      reason:"La page existe mais ne couvre que partiellement l’intention recherchée.",
      targetPage:target,
      recommendation:"Élargir la page existante : clarifier le sujet dans le H1/SEO title si pertinent, ajouter des sections dédiées, des exemples locaux et des liens internes cohérents.",
    };
  }

  if(!target&&position!=null&&position<=20){
    return {
      mode:"consider_new_page",
      priority:"high",
      reason:"La requête est déjà visible dans les résultats mais aucune page publiée ne la couvre clairement. Une page dédiée peut être justifiée si l’intention correspond à une vraie offre ou expertise de l’agence.",
      targetPage:null,
      recommendation:"Valider d’abord la valeur métier de cette intention. Si elle correspond à une offre réelle et différenciante, créer une page locale dédiée ; sinon enrichir la page la plus proche.",
    };
  }

  return {
    mode:"monitor",
    priority:"low",
    reason:"Le signal n’est pas encore assez fort pour justifier une nouvelle page.",
    targetPage:target,
    recommendation:"Continuer à mesurer la requête et éviter toute création de contenu artificielle tant qu’une intention claire et durable n’est pas confirmée.",
  };
}

function localContentOpportunities(report={}){
  const ranking=(report.checks||[]).find(check=>check?.code==="LOCAL_RANKINGS")||{};
  const opportunities=(ranking.opportunities||[]).map(item=>({
    keywordId:item.keywordId,
    keyword:item.keyword,
    city:item.city,
    position:item.position,
    momentum:item.momentum,
    ...classifyOpportunity(item),
  }));

  const rank={high:0,medium:1,low:2};
  opportunities.sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||((a.position??999)-(b.position??999)));

  return {
    version:"1.0",
    total:opportunities.length,
    reinforce:opportunities.filter(x=>x.mode==="reinforce_existing").length,
    enrich:opportunities.filter(x=>x.mode==="enrich_existing").length,
    considerNewPage:opportunities.filter(x=>x.mode==="consider_new_page").length,
    monitor:opportunities.filter(x=>x.mode==="monitor").length,
    opportunities:opportunities.slice(0,25),
    guardrail:"Une nouvelle page n’est recommandée que lorsqu’une intention est déjà visible ou stratégiquement confirmée et qu’aucune page publiée ne la couvre correctement.",
  };
}

function applyLocalContentOpportunities(report={}){
  return {...report,version:"4.6",localContentOpportunities:localContentOpportunities(report)};
}

module.exports={classifyOpportunity,localContentOpportunities,applyLocalContentOpportunities};
