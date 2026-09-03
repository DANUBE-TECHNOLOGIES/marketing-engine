# MSE-25.31 — Local SEO Quality Uplift

## Statut

**Implémentation code terminée — prête pour injection et validation runtime sur la VM.**

Aucun rollout réel n'a encore été exécuté. La prochaine étape est strictement opérateur : synchroniser la branche sur la VM, redémarrer le backend, exécuter `mse-25.31:vm-readiness`, puis le preflight réseau read-only.

Runbook : `docs/MSE-25.31-VM-HANDOFF.md`.

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
- Toute page approuvée est liée au payload exact présenté au reviewer.
- Toute valeur modifiable possède une empreinte de sa valeur source afin de refuser une édition concurrente.
- Deux écritures approuvées ne peuvent pas cibler la même ressource persistée.
- L'apply exige les fingerprints explicites du plan d'exécution et du write-intent.
- L'attestation CI est liée au HEAD exact et à la définition du workflow GitHub Actions.

## Implémenté

### Diagnostic et preview

- preview agence et réseau strictement read-only ;
- exclusion des sites non publiés ;
- planner intentions / thin content / maillage interne ;
- consolidation des warnings par page ;
- priorités high / medium / low ;
- simulation d'impact avant/après ;
- copy locale déterministe et fact-safe ;
- valeurs exactes title/meta/H1 ;
- maillage interne scellé sur un bloc `rich_text` précis ;
- rapport opérateur réseau ;
- fingerprints agence et réseau.

### Preflight et approbation

- double preview déterministe ;
- attestation GitHub Actions `push` du HEAD exact ;
- définition du workflow épinglée par blob SHA ;
- audit de couverture des payloads ;
- contrôle hors ligne du preflight ;
- manifeste d'approbation deny-by-default ;
- aperçu exact des écritures pour le reviewer ;
- fingerprints des payloads approuvés ;
- contrôle hors ligne des décisions.

### Exécution scellée

- execution plan ne contenant que les pages explicitement approuvées ;
- détection des collisions de cibles d'écriture ;
- write-intent multi-page reconstruit depuis l'état Website Designer V2 courant ;
- validation du body final par le contrat Page Builder V2 ;
- source fingerprints title/meta/H1/HTML ;
- write-intent fingerprinté et revalidable ;
- apply gate fail-closed ;
- dry-run par défaut ;
- confirmation et fingerprints explicites obligatoires.

### Rollout et reprise

- snapshots de rollback versionnés avant chaque page ;
- écriture via Website Designer V2 ;
- compensation automatique en ordre inverse en cas d'échec ;
- distinction explicite d'un échec de compensation ;
- rapport de rollout fingerprinté ;
- contrôle d'intégrité du rapport ;
- rollback opérateur explicite ;
- validation post-rollout de la réduction réelle des warnings.

### Handoff VM

- commande `npm run mse-25.31:vm-readiness` ;
- vérification branche/worktree/workflow/CI ;
- vérification des commandes et modules ;
- audit de toutes les surfaces HTTP MSE-25.31 ;
- refus de toute route HTTP MSE-25.31 d'apply ;
- preview runtime read-only obligatoire ;
- runbook opérateur complet.

## Première tranche fonctionnelle

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
- éviter les ancres dupliquées et les liens déjà présents ;
- sceller la page source, le `blockId`, le HTML source, le `href`, le libellé et le HTML final.

## Critères de sortie code

- 0 régression sur les tests MSE-25.30 ;
- tests MSE-25.31 intégrés au workflow ;
- frontend et backend CI verts ;
- aucune route HTTP MSE-25.31 d'apply ;
- chaîne preview → preflight → approval → execution plan → write-intent → dry-run → rollout → rollback/post-validation entièrement outillée.

## Critères de sortie runtime

À valider sur la VM après injection :

- `mse-25.31:vm-readiness` vert ;
- preflight réseau déterministe ;
- périmètre publié conforme ;
- revue des pages candidates ;
- dry-run strictement sans écriture ;
- rollout uniquement après approbation opérateur ;
- baisse mesurable des warnings `THIN_CONTENT`, `EDITORIAL_INTERNAL_LINK_MISSING` et `local-secondary-intent-target-quality-weak` ;
- aucune hausse des conflits de similarité bloquants ;
- idempotence post-rollout certifiée.
