# MSE-25.32 — Flexible Payment Experience

## Contexte

Mondescale propose déjà régulièrement des règlements échelonnés, particulièrement en billetterie aérienne. Cette capacité commerciale est aujourd'hui peu visible dans les mini-sites.

MSE-25.32 transforme cette pratique existante en expérience publique structurée, sans fabriquer de promesse financière non configurée et sans mélanger cette fonctionnalité avec le chantier SEO MSE-25.31.

## Objectifs

1. Mettre en avant le paiement en plusieurs fois sur les mini-sites lorsque l'agence l'autorise.
2. Donner la priorité à la page Billetterie et vols, avec une présence plus compacte sur la home.
3. Conserver Website Designer V2 comme source de vérité pour toute future écriture de blocs.
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

## Première tranche

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
- rester en preview et sans écriture ;
- ne jamais proposer de doublon lorsqu'un bloc flexible-payment est déjà présent.

## Invariants

- aucun financement n'est inventé ;
- aucune promesse « 3x », « 4x », « sans frais » ou équivalente sans configuration explicite ;
- aucune écriture directe dans les pages à ce stade ;
- les pages non publiées restent hors du plan public ;
- les blocs existants manuels sont préservés ;
- le module reste indépendant de MSE-25.31, mais expose des données réutilisables par le SEO.

## Étapes suivantes

1. brancher le planner sur les données agences ;
2. ajouter le bloc Website Designer V2 ;
3. implémenter le renderer public compact/enrichi ;
4. ajouter preview/apply fingerprinté et rollbackable ;
5. connecter MSE-25.31 aux nouvelles intentions seulement après validation du rendu réel ;
6. mesurer les conversions CTA et la performance SEO avant toute génération de landing locale.

## Critères de sortie de la tranche 1

- contrat de configuration déterministe ;
- messages publics prudents par défaut ;
- placement home + billetterie ;
- absence de doublons ;
- tests couvrant les promesses chiffrées et le mode sans frais ;
- aucune régression des couches MSE-25.30 / MSE-25.31.
