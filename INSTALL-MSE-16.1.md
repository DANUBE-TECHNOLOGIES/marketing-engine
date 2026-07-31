# MSE-16.1 — Content Generation Job Engine

## Installation

```bash
cd ~/mondescale-local-engine
tar -xzf /home/admin1/MSE-16.1-content-generation-jobs.tar.gz -C .
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
docker compose up -d --force-recreate backend
```

## Vérifications

```bash
curl -sS http://localhost:4000/generation/health -H 'x-tenant-slug: mondescale' | jq
```

Créer un job après planification d'une campagne :

```bash
curl -sS -X POST http://localhost:4000/generation/jobs \
  -H 'content-type: application/json' \
  -H 'x-tenant-slug: mondescale' \
  -d '{"campaignId":"CAMPAIGN_ID","priority":"normal"}' | jq
```
