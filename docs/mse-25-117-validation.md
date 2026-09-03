# MSE-25.117 — validation contract

## Scope

MSE-25.117 améliore le contrat SEO local sans modifier la structure visuelle des mini-sites. Les données locales doivent provenir de `site` / `site.agency` et des zones de chalandise déjà configurées.

## Validation locale à exécuter avant merge

Depuis `frontend/` :

```bash
node scripts/audit-local-search-contract.mjs
node --test test/mse-25-117-local-search-performance.test.mjs test/mse-25-117-local-search-signals.test.mjs test/mse-25-117-local-search-audit-wiring.test.mjs
npm run test:indexation
npm run test:indexation:performance
npm run lint
npm run build
```

Verdict attendu de l'audit :

```text
MSE_25_117_LOCAL_SEARCH_CONTRACT=OK
```

## Non-régression

- aucune page doorway générée depuis les communes cibles ;
- aucune adresse, aucun téléphone et aucune ville codés en dur ;
- aucune modification de composant visuel dans le lot MSE-25.117 ;
- conservation des canonicals et règles d'indexation MSE-25.112 ;
- conservation des routes Inspiration et des surfaces commerciales existantes ;
- aucune écriture vers Search Console dans ce lot.

## Mesure après déploiement

Comparer la baseline Search Console du 03/09/2026 à période comparable, par agence : impressions, clics, CTR et position moyenne sur l'intention principale `agence de voyage(s) + ville`, puis sur les intentions secondaires réellement servies par le mini-site.
