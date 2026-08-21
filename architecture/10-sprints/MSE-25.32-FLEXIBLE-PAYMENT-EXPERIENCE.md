# MSE-25.32 — Flexible Payment Experience

## Contexte

Mondescale propose déjà régulièrement des règlements échelonnés, particulièrement en billetterie aérienne. Cette capacité commerciale est aujourd'hui peu visible dans les mini-sites.

MSE-25.32 transforme cette pratique existante en expérience publique structurée, sans fabriquer de promesse financière non configurée et sans mélanger cette fonctionnalité avec le chantier SEO MSE-25.31.

## Objectifs

1. Mettre en avant le paiement en plusieurs fois sur les mini-sites lorsque l'agence l'autorise.
2. Donner la priorité à la page Billetterie et vols, avec une présence plus compacte sur la home.
3. Conserver Website Designer V2 comme source de vérité pour toute écriture de blocs.
4. Ne jamais publier automatiquement un nombre d'échéances, une absence de frais ou une condition de financement sans donnée explicite.
5. Préparer un contrat réutilisable par le SEO, le renderer public et les futures campagnes.
6. Permettre une activation par agence et par catégorie de produit.

## Contrat fonctionnel

La configuration minimale porte sur :

- `enabled` : service visible ou non ;
- `products` : `flight`, `travel` ;
- `installmentCounts` : nombres d'échéances explicitement autorisés, facultatifs ;
- `feeMode` : `unspecified`, `with-fees`, `without-fees` ;
- `disclaimer` : texte réglementaire ou commercial facultatif ;
- `ctaLabel` : libellé de contact facultatif.

En l'absence de précision chiffrée, la communication publique reste volontairement générique : « paiement en plusieurs fois » / « règlement échelonné selon les possibilités proposées par votre agence ».

## Tranche 1 — contrat, rendu et placement

### Payment policy normalizer

- normaliser et valider la configuration ;
- refuser les valeurs inconnues ;
- dédupliquer les nombres d'échéances ;
- empêcher les promesses chiffrées implicites.

### Public copy builder

- produire un message prioritaire pour la billetterie aérienne ;
- produire un message voyage lorsque ce produit est activé ;
- n'afficher « sans frais » que si `feeMode=without-fees` ;
- n'afficher des échéances précises que si `installmentCounts` est renseigné.

### Placement planner

- proposer un bloc compact sur `home` ;
- proposer un bloc enrichi sur les pages de type billetterie / vols ;
- ne jamais proposer de doublon lorsqu'un bloc flexible-payment est déjà présent.

### Website Designer V2 et renderer public

- bloc `flexible_payment` ajouté au catalogue ;
- renderer compact/enrichi enregistré dans le registry public ;
- garde-fous répétés au rendu pour empêcher les promesses non configurées.

## Tranche 2 — preview/apply sécurisé

### Preview fingerprintée

- la policy est normalisée avant calcul du plan ;
- la preview est déterministe ;
- un fingerprint SHA-256 couvre version MSE-25.32, site, policy et propositions ;
- l'apply refuse un fingerprint absent ou périmé.

### Apply Website Designer V2

- `confirm=true` est obligatoire ;
- chaque page est relue dans la transaction juste avant l'écriture ;
- une page supprimée, dépubliée ou déjà équipée est ignorée proprement ;
- une `AgencySitePageVersion` contenant le snapshot courant est créée avant l'ajout du bloc ;
- le nouveau `PageBlock` est marqué avec `purpose=flexible-payment-experience`, `source=mse-25.32` et le fingerprint de preview ;
- l'exécution est idempotente : un bloc déjà présent n'est jamais dupliqué.

### Rollback ciblé

- `confirm=true` est également obligatoire ;
- le rollback ne peut supprimer qu'un bloc explicitement marqué comme appartenant à MSE-25.32 ;
- un bloc manuel ou étranger au moteur est refusé avec conflit.

## Invariants

- aucun financement n'est inventé ;
- aucune promesse « 3x », « 4x », « sans frais » ou équivalente sans configuration explicite ;
- aucune écriture sans confirmation explicite ;
- aucun apply sur une preview périmée ;
- les pages non publiées restent hors du plan public ;
- les blocs existants manuels sont préservés ;
- chaque écriture de page est précédée d'un snapshot versionné ;
- le module reste indépendant de MSE-25.31, mais expose des données réutilisables par le SEO.

## Étapes suivantes

1. persister et exposer complètement la configuration par agence ;
2. ajouter les contrôles structurés dédiés dans Website Designer V2 ;
3. instrumenter les CTA ;
4. connecter MSE-25.31 aux nouvelles intentions seulement après validation du rendu réel ;
5. mesurer les conversions CTA et la performance SEO avant toute génération de landing locale.

## Critères de sortie de la tranche actuelle

- contrat de configuration déterministe ;
- messages publics prudents par défaut ;
- placement home + billetterie ;
- absence de doublons ;
- bloc et renderer Website Designer V2 fonctionnels ;
- preview fingerprintée ;
- apply protégé par confirmation et transaction ;
- version de page créée avant écriture ;
- rollback limité aux blocs MSE-25.32 ;
- tests couvrant promesses chiffrées, mode sans frais, confirmation, stale preview, idempotence et rollback ;
- aucune régression des couches MSE-25.30 / MSE-25.31.
