# MSE-25.31 — Local SEO Quality Uplift

## Contexte

MSE-25.30 est validé et idempotent sur le réseau public : 7 mini-sites publiés, 73 pages contrôlées, 0 changement résiduel, 0 blocage qualité, 0 blocage sitemap et 0 conflit de similarité bloquant.

Le rollout conserve toutefois 86 warnings non bloquants. Ils correspondent principalement à :

- intentions locales secondaires dont la cible reste faible ;
- contenus éditoriaux trop courts sur certaines pages ;
- liens internes éditoriaux manquants.

MSE-25.31 améliore ces signaux sans réintroduire un gate artificiel sur le score SEO.

## Objectifs

1. Réduire les warnings de qualité locale sans dégrader l'idempotence MSE-25.30.
2. Améliorer les cibles secondaires : conseil, sur-mesure, séjours/circuits, croisières, billetterie et prise de rendez-vous.
3. Enrichir uniquement les pages réellement trop faibles, sans contenu générique dupliqué entre agences.
4. Ajouter un maillage interne éditorial déterministe et pertinent.
5. Préserver Website Designer V2 comme source de vérité et toutes les garanties de preview/apply/rollback.
6. Conserver les mini-sites non publiés hors du rollout public.

## Invariants

- `localSeo.ready` dépend des gaps réellement bloquants, pas du score brut.
- Les warnings `medium` restent consultatifs.
- Aucun texte existant manuel n'est écrasé.
- Aucun nouveau bloc n'est ajouté si un bloc équivalent existe déjà.
- Toute écriture reste versionnée et rollbackable.
- Un second preflight après apply doit être idempotent.

## Première tranche

### Intent quality uplift

- identifier la meilleure page cible de chaque intention secondaire ;
- calculer ce qui manque réellement : titre, H1, body local, profondeur, CTA ou lien interne ;
- enrichir le body sans forcer les métadonnées lorsqu'elles sont déjà adaptées ;
- viser une amélioration mesurable du score de cible sans transformer les warnings en gates.

### Thin-content uplift

- ne traiter que les pages indexables réellement sous le seuil éditorial ;
- utiliser le contexte agence et le type de page ;
- ne jamais fabriquer de faits locaux non présents dans les données de l'agence.

### Internal-link uplift

- proposer uniquement des liens vers des pages publiées et indexables du même mini-site ;
- privilégier les routes correspondant aux intentions secondaires ;
- éviter les ancres dupliquées et les liens déjà présents.

## Critères de sortie

- 0 régression sur les tests MSE-25.30 ;
- 0 blocage supplémentaire ;
- baisse mesurable des warnings `THIN_CONTENT`, `EDITORIAL_INTERNAL_LINK_MISSING` et `local-secondary-intent-target-quality-weak` ;
- aucune hausse des conflits de similarité bloquants ;
- preview/apply strictement fingerprintés ;
- idempotence post-rollout certifiée.
