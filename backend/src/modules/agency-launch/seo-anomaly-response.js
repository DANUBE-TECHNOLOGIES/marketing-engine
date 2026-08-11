"use strict";

const PLAYBOOKS={
  top10_lost:{priority:1,owner:"SEO local",firstAction:"Contrôler la page cible, les changements récents et la SERP avant toute modification.",checks:["Vérifier que la page est toujours indexée et canonique.","Comparer title, H1, contenu local et maillage avec la dernière version connue.","Contrôler les concurrents désormais présents dans le Top 10.","Ne corriger qu'après identification d'une cause plausible."]},
  ranking_drop:{priority:2,owner:"SEO local",firstAction:"Confirmer le recul avec une nouvelle mesure avant de modifier le contenu.",checks:["Relancer la mesure de position.","Vérifier indexation, canonical et disponibilité HTTP de la page cible.","Contrôler les modifications éditoriales ou techniques récentes.","Comparer la SERP et les concurrents ayant gagné des positions."]},
  health_drop:{priority:3,owner:"Marketing Engine",firstAction:"Identifier la composante du score ayant le plus baissé avant d'ouvrir une action SEO.",checks:["Comparer les composantes du snapshot de référence et du score actuel.","Vérifier si la baisse vient de rankings, citations, avis ou contenu.","Écarter une donnée manquante ou une collecte dégradée.","Créer une action uniquement sur le levier responsable de la baisse."]},
};

function responseForAnomaly(anomaly={}){const base=PLAYBOOKS[anomaly.type]||{priority:9,owner:"SEO",firstAction:"Analyser l'anomalie avant toute modification.",checks:[]};return{...base,urgency:anomaly.severity==="critical"?"immediate":"review",automationSafe:false,note:"Aucune correction automatique : confirmer la cause avant modification du mini-site."};}
function applyAnomalyResponses(summary={}){return{...summary,version:"1.1",alerts:(summary.alerts||summary.anomalies||[]).map(alert=>({...alert,response:responseForAnomaly(alert)}))};}
module.exports={PLAYBOOKS,responseForAnomaly,applyAnomalyResponses};
