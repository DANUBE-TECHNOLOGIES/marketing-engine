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
- seules les offres issues d’un `CampaignAsset` au statut `approved` sont publiables ;
- le ciblage tenant + agence est obligatoire ;
- aucun prix, visuel ou lien n’est inventé par le renderer.

### Critères de sortie

- pipeline de génération des `CampaignAsset` fonctionnel par `taskId` ;
- hydratation des offres manuelles et automatiques ;
- catalogue approuvé disponible via API + proxy Next + client V2 ;
- liens d’offre filtrés par le résolveur CTA public ;
- tests backend et frontend versionnés ;
- sélecteur de source/choix des offres branché dans V2 ;
- validation d’intégration sur l’instance Marketing Engine.
