# MSE-25.78 — Runtime audit tuning

Le transport interne MSE-25.77 supprime le hairpin vers `agences.mondescale.com`.

Pour éviter que 115 rendus SSR soient classés `PUBLIC_FETCH_UNAVAILABLE` sous charge, le runtime doit utiliser :

- `PUBLIC_INDEXABILITY_TIMEOUT_MS=15000`
- `PUBLIC_INDEXABILITY_CONCURRENCY=2`
- `PUBLIC_INDEXABILITY_FETCH_ORIGIN=http://frontend:3000`

Ces paramètres ne changent aucune règle SEO et n'écrivent ni dans Google ni dans Website Designer. Ils réduisent uniquement la pression de l'audit read-only sur Next.js.
