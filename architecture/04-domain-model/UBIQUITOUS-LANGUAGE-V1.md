# Ubiquitous Language — Version 1

Ce document fixe les termes métier officiels utilisés dans :

- le code ;
- les API ;
- la base de données ;
- les interfaces ;
- les documents d’architecture ;
- les échanges fonctionnels.

---

## Tenant

Organisation cliente utilisant la plateforme SaaS.

Exemple : un réseau, une agence indépendante ou un groupe.

---

## Brand

Marque commerciale appartenant à un Tenant.

Une Brand peut regrouper plusieurs Agency.

---

## Agency

Établissement local ou point de vente.

Une Agency possède toujours un Tenant.

---

## User

Personne authentifiée utilisant la plateforme.

---

## Role

Ensemble de permissions assignées à un User dans un Tenant.

---

## Geography

Domaine représentant le monde physique et administratif.

---

## GeoEntity

Entité géographique structurée.

Types possibles :

- continent ;
- country ;
- region ;
- department ;
- city ;
- district ;
- island ;
- lake ;
- mountain ;
- airport ;
- port ;
- point_of_interest.

---

## Destination

Concept touristique pouvant regrouper plusieurs GeoEntity.

Une Destination n’est pas obligatoirement une ville ou un pays.

Exemple : Côte amalfitaine, lac Balaton, Riviera Maya.

---

## TravelProduct

Objet touristique commercialisable ou descriptible.

Exemples :

- stay ;
- tour ;
- cruise ;
- flight ;
- hotel ;
- activity ;
- excursion ;
- package.

---

## Supplier

Organisation fournissant un produit ou une prestation.

---

## Offer

Proposition commerciale temporaire liée à un TravelProduct.

Elle contient notamment :

- price ;
- validity ;
- availability ;
- departure ;
- return ;
- supplier ;
- promotion.

---

## KnowledgeEntity

Unité de connaissance structurée et réutilisable.

Elle contient des faits, relations, sources, médias et métadonnées.

Elle ne contient pas de HTML de présentation.

---

## KnowledgeFact

Assertion structurée portée par une KnowledgeEntity.

Exemple : « Budapest compte plus de 100 sources thermales ».

---

## KnowledgeSource

Origine vérifiable d’un KnowledgeFact.

---

## KnowledgeVersion

État historisé d’une KnowledgeEntity à une date donnée.

---

## KnowledgeRelation

Lien typé entre deux KnowledgeEntity.

Exemples :

- located_in ;
- part_of ;
- near ;
- suitable_for ;
- sold_by ;
- related_to ;
- served_by ;
- available_from.

---

## KnowledgeLineage

Traçabilité complète d’une connaissance :

- origine ;
- enrichissements ;
- validations ;
- versions ;
- usages ;
- contenus dépendants.

---

## TrustLevel

Niveau de confiance d’une connaissance ou d’un fait.

Valeurs cibles :

- official ;
- partner_verified ;
- internal_verified ;
- ai_verified ;
- ai_unverified ;
- disputed.

---

## FreshnessPolicy

Règle déterminant la durée de validité d’une information.

---

## ContentBrief

Spécification d’un contenu à produire.

Il définit :

- objectif ;
- intention ;
- audience ;
- entités sources ;
- canal cible éventuel ;
- contraintes ;
- ton ;
- mots-clés ;
- appel à l’action.

---

## ContentAsset

Contenu maître indépendant des canaux.

---

## ContentVariant

Adaptation d’un ContentAsset à :

- une marque ;
- une agence ;
- une langue ;
- une audience ;
- un canal ;
- une longueur ;
- un ton.

---

## Channel

Support de diffusion.

Exemples :

- website ;
- minisite ;
- google_business ;
- newsletter ;
- facebook ;
- instagram ;
- linkedin ;
- pinterest ;
- youtube.

---

## Publication

Diffusion planifiée ou réalisée d’un ContentVariant vers un Channel.

---

## Site

Ensemble éditorial publié sur un ou plusieurs domaines.

---

## MiniSite

Site SEO ciblé sur une agence, une destination, une thématique ou une campagne.

Un MiniSite est un type de Site.

---

## Page

Représentation web publiée dans un Site.

Une Page n’est jamais la source de vérité éditoriale.

---

## Template

Structure de rendu appliquée à une Page, une Publication ou un ContentVariant.

---

## Campaign

Ensemble coordonné de contenus, offres, audiences et publications poursuivant un objectif commun.

---

## LocalSEOProfile

Représentation de la présence locale d’une Agency.

Il regroupe notamment :

- Google Business ;
- reviews ;
- citations ;
- rankings ;
- local posts ;
- local scores.

---

## Review

Avis client lié à une Agency ou à une Brand.

---

## Directory

Annuaire ou plateforme de référencement local.

---

## DirectoryListing

Présence d’une Agency dans un Directory.

---

## RankingMeasurement

Mesure de position d’un mot-clé pour une zone, une agence et une date.

---

## AnalyticsMeasurement

Mesure de performance associée à une entité, un contenu, une publication ou un site.

---

## MarketingAction

Action recommandée ou assignée afin d’améliorer une performance marketing.

---

## StrategyRecommendation

Décision proposée par le Strategy Engine à partir d’observations et de règles explicables.

---

## Workflow

Suite d’étapes automatisées déclenchée par un événement ou une planification.

---

## Trigger

Événement ou condition démarrant un Workflow.

---

## AutomationRun

Exécution historisée d’un Workflow.

---

## MediaAsset

Ressource média réutilisable :

- image ;
- video ;
- audio ;
- logo ;
- document ;
- illustration.

---

## ContentGenome

Métadonnées décrivant l’identité et le cycle de vie d’un contenu :

- sujet ;
- intention ;
- audience ;
- entités ;
- saisonnalité ;
- canal ;
- performance ;
- fraîcheur ;
- historique.

---

## MarketingDigitalTwin

Représentation numérique consolidée de la présence marketing d’un Tenant, d’une Brand ou d’une Agency.
