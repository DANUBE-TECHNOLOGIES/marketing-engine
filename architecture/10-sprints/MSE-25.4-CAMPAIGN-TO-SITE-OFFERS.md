# MSE-25.4 — Campaign-to-site offers

## Objectif

Raccorder les contenus de campagne approuvés aux blocs `offers` du Website Designer V2 et au renderer public, sans introduire de modèle `Offer` parallèle.

## Source de vérité

- `CampaignAsset` pour le contenu marketing de campagne ;
- ciblage par `MarketingCampaign.tenantId` et `CampaignAgency` ;
- `status = approved` obligatoire avant exposition publique ;
- Website Designer V2 conserve le contrat du bloc `offers`.

## Modes du bloc Offres

### Manuel

`source = manual`

Le bloc conserve une liste ordonnée `offerIds`. Le renderer résout uniquement ces identifiants, dans l’ordre choisi et dans la limite configurée.

### Campagnes approuvées

`source = campaign`

Le bloc consomme automatiquement les derniers `CampaignAsset` approuvés qui ciblent l’agence du mini-site, dans la limite configurée.

## Contrat carte publique

Une carte publique peut exposer uniquement :

- `id` ;
- `campaignId` ;
- `title` ;
- `description` ;
- `image` ;
- `badge` ;
- `price` ;
- `href`.

Le payload brut de campagne ne doit jamais être exposé au frontend public.

## Règles de sécurité

- isolation stricte par tenant ;
- campagne ciblant explicitement l’agence ;
- asset approuvé uniquement ;
- protocoles CTA filtrés par le résolveur public existant ;
- aucun prix, visuel ou lien inventé par le renderer ;
- un asset générique sans sémantique d’offre est ignoré.

## Critères de sortie

- génération d’assets persistée correctement par `taskId` ;
- hydratation manuelle par `offerIds` ;
- mode automatique `source = campaign` ;
- catalogue d’offres approuvées disponible par agence ;
- proxy Next et client V2 disponibles ;
- renderer public respecte le lien de l’offre ;
- preview V2 et live passent par le même hydrateur ;
- tests de contrat backend et frontend ajoutés ;
- sélecteur visuel V2 branché dès qu’un patch sûr de `VisualPageBuilder.js` est possible.
