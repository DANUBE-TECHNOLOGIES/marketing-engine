# Aggregates — Domain Model V1

## 1. Tenant Aggregate

### Root

Tenant

### Responsabilités

- identité client ;
- configuration SaaS ;
- isolation des données ;
- marques ;
- domaines ;
- abonnements ;
- politiques globales.

### Invariants

- un Tenant possède un identifiant unique ;
- une Agency appartient à un seul Tenant ;
- les secrets d’intégration sont isolés par Tenant ;
- les quotas sont définis au niveau du Tenant.

---

## 2. Organization Aggregate

### Root

Brand

### Entités

- Agency ;
- Team ;
- UserMembership ;
- CommercialZone.

### Invariants

- une Brand appartient à un Tenant ;
- une Agency appartient à un Tenant ;
- une Agency peut appartenir à zéro ou une Brand ;
- un UserMembership est limité à un Tenant.

---

## 3. Geography Aggregate

### Root

GeoEntity

### Entités et Value Objects

- GeoType ;
- GeoCoordinates ;
- AdministrativeCode ;
- ParentGeoRelation ;
- AlternativeName.

### Invariants

- toute GeoEntity possède un type ;
- les coordonnées utilisent un système explicite ;
- les relations administratives ne doivent pas créer de cycle incohérent.

---

## 4. Travel Catalog Aggregate

### Root

TravelProduct

### Entités

- Destination ;
- Accommodation ;
- Transport ;
- Activity ;
- Itinerary ;
- ProductComponent.

### Invariants

- un TravelProduct appartient à un Tenant ou est global ;
- un produit commercialisable possède au moins une Destination ou une GeoEntity ;
- le catalogue ne porte pas les prix temporaires.

---

## 5. Offer Aggregate

### Root

Offer

### Entités

- OfferPrice ;
- Availability ;
- Departure ;
- Promotion ;
- ValidityPeriod ;
- SupplierReference.

### Invariants

- une Offer référence un TravelProduct ;
- une Offer possède une période de validité ;
- les prix possèdent une devise ;
- une Offer expirée ne peut être affichée comme active.

---

## 6. Knowledge Aggregate

### Root

KnowledgeEntity

### Entités

- KnowledgeFact ;
- KnowledgeSource ;
- KnowledgeVersion ;
- KnowledgeRelation ;
- KnowledgeLineageEvent ;
- KnowledgeValidation.

### Invariants

- toute KnowledgeEntity appartient à un Tenant ou est globale ;
- tout fait publiable possède une source ;
- toute modification crée une version ou un événement de lignée ;
- les relations pointent vers des entités existantes ;
- le niveau de confiance est explicite ;
- une entité stale ne peut pas être utilisée sans politique explicite.

---

## 7. Media Aggregate

### Root

MediaAsset

### Entités

- MediaVersion ;
- MediaUsage ;
- MediaRights ;
- MediaMetadata.

### Invariants

- tout média possède une provenance ;
- les droits d’utilisation sont explicites ;
- un média expiré ou interdit ne peut être publié ;
- les variantes dérivées conservent la référence à l’original.

---

## 8. Content Aggregate

### Root

ContentAsset

### Entités

- ContentBrief ;
- ContentVariant ;
- ContentRevision ;
- Approval ;
- ContentGenome ;
- ContentDependency.

### Invariants

- tout ContentAsset possède une intention ;
- tout ContentAsset référence au moins une KnowledgeEntity ou une source métier ;
- une publication utilise une variante approuvée ou une politique d’auto-validation ;
- toute révision conserve l’historique ;
- la dépendance aux connaissances est traçable.

---

## 9. Site Aggregate

### Root

Site

### Entités

- DomainBinding ;
- SiteTheme ;
- SiteNavigation ;
- Page ;
- PageRoute ;
- SitemapConfiguration ;
- StructuredDataConfiguration.

### Invariants

- un Site appartient à un Tenant ;
- un DomainBinding actif est unique ;
- une Page publiée possède une route unique dans son Site ;
- une Page référence un ContentVariant ;
- une publication de site est versionnée.

---

## 10. Publication Aggregate

### Root

Publication

### Entités

- ChannelConfiguration ;
- PublicationSchedule ;
- PublicationAttempt ;
- PublicationResult ;
- PublicationPolicy.

### Invariants

- toute Publication appartient à un Tenant ;
- toute Publication référence un ContentVariant ;
- toute Publication possède un Channel ;
- les tentatives sont historisées ;
- les erreurs ne détruisent pas l’état précédent ;
- les doublons sont contrôlés selon la politique du canal.

---

## 11. Local SEO Aggregate

### Root

LocalSEOProfile

### Entités

- GoogleLocation ;
- GooglePost ;
- Review ;
- ReviewRequest ;
- DirectoryListing ;
- LocalRanking ;
- LocalSEOScore ;
- LocalSEOAlert.

### Invariants

- un LocalSEOProfile appartient à une Agency ;
- une Agency ne possède qu’un profil actif par fournisseur local ;
- les identifiants externes sont uniques par Tenant et fournisseur ;
- les réponses aux avis conservent l’historique ;
- les scores sont historisés.

---

## 12. Search Aggregate

### Root

SearchTopic

### Entités

- Keyword ;
- KeywordCluster ;
- SearchIntent ;
- SearchLocation ;
- RankingMeasurement ;
- SearchOpportunity.

### Invariants

- toute mesure possède une date, une zone et un moteur ;
- une position sans contexte géographique n’est pas comparable ;
- l’historique n’est jamais écrasé.

---

## 13. Analytics Aggregate

### Root

AnalyticsSubject

### Entités

- MetricDefinition ;
- Measurement ;
- Snapshot ;
- Conversion ;
- Attribution ;
- Anomaly.

### Invariants

- toute Measurement référence un sujet mesurable ;
- toute métrique possède une unité ;
- toute mesure possède une période ou une date ;
- les sources de métriques sont identifiables.

---

## 14. Strategy Aggregate

### Root

StrategyRecommendation

### Entités

- Observation ;
- RecommendationRule ;
- ExpectedImpact ;
- RecommendationExplanation ;
- RecommendationDecision.

### Invariants

- toute recommandation possède une explication ;
- toute recommandation référence des observations ;
- toute recommandation possède un niveau de confiance ;
- une recommandation automatique critique nécessite validation humaine.

---

## 15. Automation Aggregate

### Root

Workflow

### Entités

- Trigger ;
- Condition ;
- WorkflowAction ;
- AutomationRun ;
- AutomationStepRun ;
- RetryPolicy ;
- Notification.

### Invariants

- toute exécution est historisée ;
- les retries sont limités ;
- un Workflow désactivé ne peut pas démarrer ;
- les actions sensibles nécessitent une politique d’autorisation.

---

## 16. AI Aggregate

### Root

AIRequest

### Entités

- PromptTemplate ;
- AIContext ;
- AIModelConfiguration ;
- AIResponse ;
- AIValidation ;
- AICostMeasurement.

### Invariants

- toute réponse IA conserve son modèle et son contexte ;
- les données sensibles respectent la politique du Tenant ;
- le coût est mesurable ;
- une sortie IA publiable possède un statut de validation.
