# MSE-25.42 — Public Experience Consolidation

## Objectif

Consolider l’expérience publique des mini-sites après le passage effectif de la source de vérité vers les `PageBlock` Website Designer V2.

Cette tranche ne crée pas de nouveau contenu commercial. Elle rend correctement les contenus déjà publiés, restaure les médias dynamiques, réduit la densité visuelle de la home et conserve les acquis SEO de MSE-25.30 / MSE-25.31 / MSE-25.40 / MSE-25.41.

## Contrat

1. Les médias d’une destination sont hydratés quelle que soit la collection publique utilisée (`items` ou `destinations`).
2. Les médias équipe acceptent les références d’asset historiques compatibles (`imageAssetId`, `photoAssetId`, `avatarAssetId`, `mediaAssetId`) sans inventer de média.
3. Les URLs média déjà présentes restent prioritaires et ne sont jamais remplacées par une valeur vide.
4. Les liens SEO internes restent crawlables mais leur présentation devient secondaire et éditorialement plus naturelle.
5. Le bloc Flexible Payment reste entièrement visible mais adopte une hauteur et une hiérarchie plus compactes.
6. La zone locale de fin de home devient une synthèse compacte quand la home V2 possède déjà un contenu local riche.
7. Aucun contenu de page ni aucune policy commerciale n’est écrit par cette tranche.
8. Le rendu mobile reste fonctionnel et lisible.

## Critères de fermeture

- photos destinations visibles lorsqu’une URL ou un asset publié existe ;
- photos équipe visibles lorsqu’une URL ou un asset publié existe ;
- aucun placeholder ne remplace un média valide ;
- CTA génériques et Flexible Payment avec contraste AA raisonnable ;
- home sensiblement moins longue sans suppression des intentions SEO couvertes ;
- liens internes conservés dans le DOM ;
- build frontend vert ;
- tests MSE-25.42 verts ;
- contrôle public sur les sept mini-sites publiés.
