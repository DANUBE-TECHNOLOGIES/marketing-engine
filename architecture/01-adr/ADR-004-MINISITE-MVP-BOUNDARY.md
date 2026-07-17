# ADR-004 — Périmètre canonique minimal pour les mini-sites

## Statut

Acceptée.

## Contexte

Le Marketing Engine doit reposer sur un modèle métier durable.

Cependant, attendre la modélisation exhaustive du tourisme retarderait inutilement la création des mini-sites SEO.

## Décision

Nous adoptons un Canonical Domain Model progressif.

Le premier périmètre implémenté couvre uniquement les concepts nécessaires au Mini-site Engine V1.

## Entités incluses dans le MVP

- Tenant
- Brand
- Agency
- KnowledgeEntity
- GeoEntity
- Destination
- Topic
- Audience
- KnowledgeSource
- KnowledgeFact
- KnowledgeRelation
- MediaAsset
- ContentBrief
- ContentAsset
- ContentVariant
- Site
- DomainBinding
- SiteTheme
- SiteNavigation
- Page
- PageRoute
- Template
- SEOMetadata
- StructuredData
- Publication
- AnalyticsMeasurement

## Entités reportées

- TravelProduct détaillé
- Offer
- Supplier
- Availability
- Campaign avancée
- Strategy Engine complet
- Opportunity Engine complet
- AI Engine autonome
- Facturation SaaS
- Abonnements
- Marketplace

## Principe

Le Mini-site Engine V1 doit pouvoir fonctionner sans ERP.

Les offres commerciales pourront être ajoutées plus tard via API.

## Conséquence

Le développement des mini-sites peut commencer dès validation du modèle de données correspondant à ce périmètre.
