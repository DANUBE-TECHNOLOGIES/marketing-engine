# MSE-25.194 — GEO managed commercial navigation V1

## Constat

MSE-25.193 a supprimé à juste titre les sous-routes locales fabriquées par `LocalContentContext` et a limité la navigation de contexte aux pages réellement publiées. Cette règle a toutefois masqué deux pages publiques spéciales qui ne sont pas des pages CMS : `business-travel` et `voyages-en-groupe`.

Ces deux routes sont gérées explicitement par l’application et disposent de leurs propres pages Next publiques. Elles doivent donc rester découvrables sans être assimilées à des pages CMS publiées.

Le durcissement antérieur des CTA Hero a également supprimé le fallback implicite qui envoyait un bouton vers Contact. Le CTA home `Construire mon voyage` doit être restauré comme CTA géré explicitement, sans déduire sa destination depuis son libellé.

## Correction

`PublicSiteHeader` conserve `uniquePublishedNavigation(site)` comme source stricte des pages éditoriales publiées et ajoute `uniquePublicNavigation(site)` qui fusionne :

- les pages réellement présentes dans la navigation publiée ;
- les deux routes applicatives explicites `business-travel` et `voyages-en-groupe`.

La fusion est dédupliquée par slug. Si une route est déjà présente dans la navigation publiée, elle n’est pas ajoutée une seconde fois.

Le header public utilise cette navigation publique combinée. `LocalContentContext` réutilise la même source pour ses liens connexes.

Le Hero home déclare séparément `MANAGED_HOME_CONTACT_CTA` avec le couple explicite :

- label : `Construire mon voyage` ;
- href : `/contact`.

Un CTA primaire explicitement configuré dans le contenu reste prioritaire. Le CTA géré n’est utilisé que sur la home lorsque ce CTA primaire explicite est absent.

## Garde-fous de provenance

Le CTA Contact du header reste recherché uniquement dans `uniquePublishedNavigation(site)` : aucune page Contact de header n’est recréée artificiellement.

Le Hero continue d’exiger `label + href` pour tout CTA venant du contenu. Les champs legacy `primaryButton` et `secondaryButton` ne retrouvent aucun pouvoir de navigation. Le code ne déduit jamais `/contact` depuis les mots `Construire mon voyage`.

Le correctif ne réintroduit aucune génération implicite de `/services`, `/destinations`, `/inspiration` ou `/contact`.

Les routes commerciales ajoutées sont une liste fermée, explicite et versionnée dans le code :

- `/agence/{slug}/business-travel`
- `/agence/{slug}/voyages-en-groupe`

## Validation

Le test `mse-25-194-geo-managed-commercial-navigation.test.mjs` couvre les deux vraies routes applicatives, la séparation entre provenance CMS et routes gérées, la déduplication, le CTA home Contact explicite et l’absence de retour du routage fondé sur un libellé.

Le test historique MSE-25.193 reste aligné sur la notion de navigation publique fondée et continue de protéger contre la fabrication des anciennes sous-routes génériques.
