# Constitution du Mondescale Marketing Engine

## Statut

Document fondateur.

Toute décision d’architecture, toute API et toute fonctionnalité doivent respecter les principes suivants.

---

## Article 1 — Knowledge First

Le Marketing Engine gère d’abord des connaissances structurées.

Une page, un article, une FAQ ou un Google Post sont des représentations d’une connaissance, jamais la connaissance elle-même.

---

## Article 2 — Toute connaissance possède une provenance

Aucune connaissance publiable ne peut exister sans source identifiable.

Une source peut être :

- officielle ;
- partenaire ;
- interne ;
- utilisateur ;
- ERP ;
- import ;
- IA ;
- API externe.

---

## Article 3 — Toute connaissance possède un niveau de confiance

Le système doit distinguer :

- donnée officielle ;
- donnée partenaire ;
- donnée interne validée ;
- donnée IA validée ;
- donnée IA non validée ;
- donnée obsolète ou incertaine.

---

## Article 4 — Toute connaissance possède une fraîcheur

Chaque information susceptible d’évoluer possède :

- une date de collecte ;
- une date de vérification ;
- une date de prochaine révision ;
- une politique de fraîcheur.

---

## Article 5 — Une offre commerciale n’est pas une connaissance

La connaissance décrit le monde, les destinations et les produits.

L’offre décrit :

- un prix ;
- une disponibilité ;
- une période ;
- une promotion ;
- un départ ;
- un fournisseur.

Ces responsabilités doivent rester séparées.

---

## Article 6 — Un contenu possède une intention

Aucun contenu ne peut être créé sans intention explicite.

L’intention peut être :

- SEO ;
- GEO ;
- informationnelle ;
- commerciale ;
- transactionnelle ;
- locale ;
- fidélisation ;
- notoriété ;
- conversion.

---

## Article 7 — Un contenu maître est indépendant du canal

Le ContentAsset ne contient pas la logique propre à Google, Facebook, un mini-site ou une newsletter.

Les adaptations sont portées par les ContentVariant.

---

## Article 8 — Une publication dépend d’un contenu

Aucune publication ne peut exister sans ContentAsset ou ContentVariant source.

Une publication ne devient jamais la source de vérité éditoriale.

---

## Article 9 — Une publication appartient à un canal

Chaque publication identifie explicitement :

- son canal ;
- son tenant ;
- sa marque ;
- son agence éventuelle ;
- son contenu source ;
- son statut ;
- sa date de publication.

---

## Article 10 — Une agence appartient toujours à un tenant

Aucune Agency ne peut exister sans Tenant.

Une Agency peut appartenir à une Brand, mais ne peut jamais exister hors du périmètre d’un Tenant.

---

## Article 11 — Aucun client n’est codé en dur

Mondescale, TUI, FRAM, CEDIV ou tout autre nom commercial sont des données.

Ils ne doivent jamais apparaître dans le Domain Model comme règles structurelles.

---

## Article 12 — API First

Un domaine ne lit jamais directement les tables internes d’un autre domaine.

Les échanges utilisent :

- API ;
- événements ;
- webhooks ;
- contrats versionnés.

---

## Article 13 — Capability First

Toute évolution commence par une capacité métier.

Nous ne commençons jamais par :

- une table ;
- une route ;
- un bouton ;
- une page.

---

## Article 14 — Bounded Contexts

Chaque domaine est responsable de son propre modèle et de ses règles.

Les termes peuvent être partagés uniquement s’ils possèdent une définition commune formalisée.

---

## Article 15 — Multi-tenant natif

Toute donnée appartenant à un client doit porter explicitement son tenantId ou être rattachée à une entité qui le porte sans ambiguïté.

---

## Article 16 — Isolation des secrets

Les secrets d’intégration sont isolés par tenant et par connecteur.

Aucun secret ne doit être partagé implicitement entre tenants.

---

## Article 17 — IA assistante, jamais source silencieuse

Toute donnée générée par IA doit être identifiable comme telle.

Le système doit conserver :

- le modèle utilisé ;
- le prompt ou template ;
- la date ;
- le contexte ;
- le statut de validation.

---

## Article 18 — Publication IA contrôlée

Une IA ne publie jamais directement sans respecter une politique de validation définie par le tenant, le canal et le niveau de risque.

---

## Article 19 — Toute décision automatisée est explicable

Le Strategy Engine et l’Automation Engine doivent pouvoir expliquer :

- la règle appliquée ;
- les données observées ;
- la recommandation produite ;
- le niveau de confiance ;
- les conséquences attendues.

---

## Article 20 — Toute métrique importante est historisée

Les scores, positions, avis, impressions, clics, conversions et recommandations importantes doivent être historisés.

Une valeur courante ne remplace jamais l’historique.

---

## Article 21 — Le contenu possède un cycle de vie

Tout contenu possède un état parmi :

- draft ;
- enriching ;
- pending_review ;
- approved ;
- publishable ;
- scheduled ;
- published ;
- needs_review ;
- archived.

---

## Article 22 — La connaissance possède un cycle de vie distinct

Toute KnowledgeEntity possède un état parmi :

- draft ;
- enriching ;
- validating ;
- trusted ;
- publishable ;
- stale ;
- disputed ;
- archived.

---

## Article 23 — Knowledge Lineage obligatoire

Le système doit pouvoir déterminer :

- d’où vient une information ;
- qui l’a enrichie ;
- qui l’a validée ;
- où elle est utilisée ;
- quelles publications seraient impactées par une modification.

---

## Article 24 — Pas de duplication fonctionnelle durable

Une capacité existante du Local Engine ne peut être recréée dans le Marketing Engine sans décision de migration explicite.

---

## Article 25 — Migration sans rupture

Le Local Engine reste opérationnel tant que la capacité cible n’a pas été :

- développée ;
- testée ;
- synchronisée ;
- observée ;
- validée ;
- dotée d’un rollback.

---

## Article 26 — Local SEO central

Le Local SEO Engine est une capacité centrale du Marketing Engine.

Il n’est ni optionnel ni périphérique.

---

## Article 27 — Strategy Engine basé sur des faits

Le Strategy Engine s’appuie sur :

- analytics ;
- rankings ;
- qualité des connaissances ;
- fraîcheur des contenus ;
- activité des agences ;
- performances des publications.

Il ne doit jamais produire une recommandation uniquement à partir d’un texte généré.

---

## Article 28 — Toute recommandation possède un impact attendu

Une MarketingAction doit indiquer autant que possible :

- le problème observé ;
- l’action proposée ;
- la priorité ;
- l’effort estimé ;
- le gain attendu ;
- l’échéance ;
- le responsable.

---

## Article 29 — Reversibility

Toute publication, migration ou automatisation importante doit prévoir une stratégie de retour arrière.

---

## Article 30 — Observabilité

Chaque moteur doit exposer :

- état de santé ;
- logs ;
- métriques ;
- erreurs ;
- dernières exécutions ;
- dépendances indisponibles.

---

## Article 31 — Sécurité par défaut

Les permissions doivent être explicites.

L’absence de permission équivaut à un refus.

---

## Article 32 — Portabilité SaaS

Toute capacité doit pouvoir être utilisée par :

- Mondescale ;
- un réseau tiers ;
- une agence indépendante ;
- un tenant sans ERP.

---

## Article 33 — Technologie remplaçable

Le Domain Model et les contrats métier ne doivent pas dépendre de Prisma, PostgreSQL, Next.js ou Express.

Ces technologies sont des implémentations, pas le métier.

---

## Article 34 — Documentation synchronisée

Toute évolution structurante doit mettre à jour :

- ADR ;
- Domain Model ;
- API Contract ;
- migration ;
- tests ;
- journal des décisions.

---

## Article 35 — Le patrimoine de connaissances est un actif

Le Travel Knowledge Graph constitue un actif stratégique du tenant.

Il doit pouvoir être :

- exporté ;
- audité ;
- versionné ;
- sauvegardé ;
- restauré ;
- transféré selon les règles contractuelles.

---

# Clause finale

Toute fonctionnalité contraire à cette Constitution doit être redessinée avant implémentation.
