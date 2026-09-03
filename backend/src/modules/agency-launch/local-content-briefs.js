"use strict";

function clean(value){return String(value||"").replace(/\s+/g," ").trim();}
function cityOf(opportunity={},agency={}){return clean(opportunity.city||agency.city||"");}
function subjectTerms(keyword,city){const normalized=clean(keyword);if(!city)return normalized;return normalized.replace(new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,`ig`),"").replace(/\s+/g," ").trim()||normalized;}

function briefForOpportunity(opportunity={},agency={}){
  const city=cityOf(opportunity,agency);const subject=subjectTerms(opportunity.keyword,city);const agencyName=clean(agency.name||"notre agence");
  if(opportunity.mode==="monitor")return null;
  const page=opportunity.targetPage||null;
  const mode=opportunity.mode;
  const proposedH1=city?`${subject.charAt(0).toUpperCase()+subject.slice(1)} à ${city}`:subject.charAt(0).toUpperCase()+subject.slice(1);
  const angle=mode==="consider_new_page"
    ?`Répondre précisément à l’intention « ${opportunity.keyword} » avec une page utile, locale et liée à une offre ou expertise réellement disponible chez ${agencyName}.`
    :`Améliorer la page « ${page?.title||"existante"} » pour mieux répondre à l’intention « ${opportunity.keyword} », sans dupliquer ce qui est déjà publié.`;
  const sections=[
    {code:"intent_answer",title:`Répondre clairement à « ${opportunity.keyword} »`,purpose:"Donner une réponse utile dès le début de page, sans bourrage de mots-clés."},
    {code:"local_proof",title:city?`Pourquoi passer par une agence à ${city}`:"Pourquoi passer par notre agence",purpose:"Ajouter des preuves locales vérifiables : implantation, connaissance de la clientèle, accompagnement, accès ou zone desservie."},
    {code:"expertise",title:`Expertise et accompagnement ${subject}`,purpose:"Décrire uniquement les services, conseils et expertises réellement proposés par l’agence."},
    {code:"reassurance",title:"Réassurance et passage à l’action",purpose:"Mettre en avant contact, rendez-vous, conseil humain, avis ou autres preuves existantes sans inventer de données."},
  ];
  return {
    version:"1.0",keywordId:opportunity.keywordId,keyword:opportunity.keyword,city:city||null,position:opportunity.position,mode,priority:opportunity.priority,targetPage:page,
    proposedH1,angle,sections,
    localProofsRequired:["faits propres à l’agence et à sa zone de chalandise","expertises ou services réellement disponibles","éléments de réassurance déjà vérifiés"],
    internalLinking:{from:["page d’accueil","pages services ou expertises proches"],to:page?[page.slug]:["page contact","page agence"],note:"Utiliser des ancres naturelles et descriptives ; ne pas répéter une ancre exacte artificiellement."},
    editorialGuardrails:["Ne pas inventer de destinations, tarifs, partenariats, avis ou expertises.","Ne pas recopier le même texte entre agences.","Ne pas créer une page uniquement pour répéter le nom d’une ville et un mot-clé.","Faire valider toute nouvelle page avant publication."],
    publishAutomatically:false,
  };
}

function localContentBriefs(report={}){
  const agency=report.agency||{};const source=report.localContentOpportunities?.opportunities||[];
  const briefs=source.map(item=>briefForOpportunity(item,agency)).filter(Boolean);
  return{version:"1.0",total:briefs.length,newPageBriefs:briefs.filter(x=>x.mode==="consider_new_page").length,existingPageBriefs:briefs.filter(x=>x.mode!=="consider_new_page").length,briefs:briefs.slice(0,15),guardrail:"Ces briefs orientent la production éditoriale mais ne créent ni ne publient automatiquement de contenu."};
}
function applyLocalContentBriefs(report={}){return{...report,version:"4.7",localContentBriefs:localContentBriefs(report)};}
module.exports={clean,subjectTerms,briefForOpportunity,localContentBriefs,applyLocalContentBriefs};
