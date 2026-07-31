# MSE-15.1 — Marketing Campaign Manager

Ajoute le modèle de campagne multi-tenant, les rattachements agences/destinations, l'orchestration initiale des tâches et l'écran `/campaigns`.

## Déploiement

```bash
cd backend
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate deploy
node --test test/campaign-manager.test.js
docker compose restart backend frontend
```

## Contrôle

```bash
curl -sS -H 'x-tenant-slug: mondescale' http://localhost:4000/campaigns/health | jq
curl -sS -H 'x-tenant-slug: mondescale' http://localhost:4000/campaigns | jq
```
