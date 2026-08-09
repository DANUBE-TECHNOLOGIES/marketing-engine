# Current Sprint

## MSE-25.4 — Campaign-to-site offers

### Objectifs

- raccorder les `CampaignAsset` approuvés aux blocs `offers` du Website Designer V2 ;
- conserver une sélection manuelle ordonnée par `offerIds` ;
- ajouter un mode automatique basé sur les campagnes ciblant l’agence ;
- exposer un catalogue d’offres approuvées par agence au Designer ;
- garantir la parité preview V2 / rendu public ;
- ne jamais exposer le payload brut des campagnes.

### Règles

- Website Designer V2 reste la source de vérité de la composition des pages ;
- aucun modèle `Offer` parallèle n’est créé ;
- seules les offres issues d’un `CampaignAsset` au statut `approved` et d’un type d’offre reconnu sont publiables ;
- le ciblage tenant + agence est obligatoire ;
- aucun prix, visuel ou lien n’est inventé par le renderer ;
- le catalogue du Designer reste tenant-scopé dans Campaign Manager et n’est pas exposé via `public-site-read`.

### État au 9 août 2026

- [x] pipeline de persistance des `CampaignAsset` corrigé autour de l’upsert par `taskId` ;
- [x] contrat d’offre mini-site ajouté avec validation du titre, du contenu, du prix et du lien ;
- [x] cycle création → `review` → approbation/rejet disponible dans Campaign Manager ;
- [x] ciblage multi-agences disponible à la création et à la modification d’une campagne ;
- [x] hydratation des offres manuelles et automatiques dans le renderer public ;
- [x] ordre des `offerIds` manuels et limite V2 conservés ;
- [x] nouveaux blocs `offers` configurés par défaut sur `source: "campaign"` ;
- [x] catalogue approuvé par agence disponible via Campaign Manager + proxy Next + client V2 ;
- [x] isolation tenant + agence + statut `approved` + types d’offre reconnue ;
- [x] mapper public partagé entre Campaign Manager et renderer ;
- [x] prix texte + devise normalisés sans duplication de devise ;
- [x] payload brut de campagne non exposé au Website Designer ;
- [x] liens d’offre filtrés par le résolveur CTA public ;
- [x] tests backend et frontend versionnés et renforcés sur les contrats critiques ;
- [ ] sélecteur visuel `Campagnes approuvées / Sélection manuelle` branché dans `VisualPageBuilder` ;
- [ ] validation d’intégration exécutée sur l’instance Marketing Engine.

### Point UI restant

`VisualPageBuilder` sait déjà éditer les `offerIds` lorsque `content.source === "manual"`, mais l’inspecteur n’expose pas encore le champ `source` pour un bloc `offers`. Le contrôle à ajouter est localisé dans `BlockProperties` à côté du sélecteur de source des témoignages. Ce raccordement doit être réalisé par un patch ciblé du fichier central afin d’éviter une réécriture complète de l’éditeur.

### Critères de sortie

MSE-25.4 peut être considéré fonctionnel côté métier, API et rendu public. La clôture complète du sprint nécessite encore :

1. le sélecteur de source dans l’inspecteur V2 ;
2. une validation d’intégration sur l’instance Marketing Engine avec une campagne ciblée, une offre approuvée et un mini-site comportant un bloc `offers` publié.
