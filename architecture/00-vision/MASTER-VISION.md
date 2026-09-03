# Mondescale Platform — Master Vision

## Ambition

Mondescale Platform est une plateforme SaaS modulaire destinée à piloter l’activité commerciale, marketing, SEO et opérationnelle d’un réseau d’agences de voyages.

La plateforme doit permettre :

- la gestion commerciale via l’ERP ;
- la génération de campagnes multi-canales ;
- la création de mini-sites SEO ;
- la centralisation des données Travel Core ;
- l’exploitation de Google Business Profile ;
- l’analyse Search Console et Analytics ;
- l’automatisation par intelligence artificielle ;
- la commercialisation future en SaaS multi-tenant.

## Principes directeurs

1. Le multi-tenant est natif.
2. Chaque domaine métier possède son propre module.
3. Les modules communiquent par services et événements.
4. Les données ont une source de vérité explicite.
5. Toute évolution passe par le Patch Manager.
6. Toute IA est encapsulée derrière un AI Gateway.
7. Toute fonctionnalité doit être réutilisable par plusieurs canaux ou modules.
8. L’architecture et les contrats sont versionnés dans Git.

## Architecture cible

```text
Core Platform
├── Auth
├── Tenant
├── Permissions
├── Event Bus
├── Scheduler
├── Notifications
├── Media
├── Audit
├── Search
├── Patch Manager
└── AI Gateway

Business Engines
├── ERP Engine
├── Marketing Engine
├── Brand Engine
├── Travel Core
├── Google Business Engine
├── Website Engine
├── SEO Engine
├── Search Console Engine
├── Analytics Engine
└── Media Engine
```

## Critère de succès

Une nouvelle agence doit pouvoir être créée, connectée à Google, dotée d’un brand, d’un mini-site et de premières pages SEO en quelques minutes.
