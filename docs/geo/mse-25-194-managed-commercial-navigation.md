# MSE-25.194 — GEO managed commercial navigation V1

## Constat

MSE-25.193 a supprimé à juste titre les sous-routes locales fabriquées par `LocalContentContext` et a limité la navigation de contexte aux pages réellement publiées. Cette règle a toutefois masqué deux pages publiques spéciales qui ne sont pas des pages CMS : `voyages-affaires` et `groupes`.

Ces deux routes sont gérées explicitement par l’application et disposent de leurs propres pages publiques. Elles doivent donc rester découvrables sans être assimilées à des pages CMS publiées.

## Correction

`PublicSiteHeader` conserve `uniquePublishedNavigation(site)` comme source stricte des pages éditoriales publiées et ajoute `uniquePublicNavigation(site)` qui fusionne :

- les pages réellement présentes dans la navigation publiée ;
- les deux routes applicatives explicites `voyages-affaires` et `groupes`.

La fusion est dédupliquée par slug. Si une route est déjà présente dans la navigation publiée, elle n’est pas ajoutée une seconde fois.

Le header public utilise désormais cette navigation publique combinée. `LocalContentContext` réutilise la même source pour ses liens connexes.

## Garde-fous de provenance

Le contact reste recherché uniquement dans `uniquePublishedNavigation(site)` : aucune page `/contact` n’est recréée artificiellement.

Le correctif ne réintroduit aucune génération implicite de `/services`, `/destinations`, `/inspiration` ou `/contact`.

Les routes ajoutées sont une liste fermée, explicite et versionnée dans le code :

- `/agence/{slug}/voyages-affaires`
- `/agence/{slug}/groupes`

## Validation

Le test `mse-25-194-geo-managed-commercial-navigation.test.mjs` couvre la présence des deux routes, la séparation entre provenance CMS et routes gérées, la déduplication par slug et l’absence de retour des routes génériques fabriquées.

Le test historique MSE-25.193 est réaligné sur la notion de navigation publique fondée : il continue de protéger contre la fabrication des anciennes sous-routes génériques.
