# MSE-17.1 — AI Content Foundation

## Installation

```bash
cd ~/mondescale-local-engine
npx --prefix backend prisma migrate deploy
npx --prefix backend prisma generate
npm --prefix backend test
docker compose up -d --build backend
```

## Vérifications

```bash
curl -s http://127.0.0.1:4000/ai-content/health -H 'x-tenant-slug: mondescale' | jq
curl -s -X POST http://127.0.0.1:4000/ai-content/preview \
  -H 'Content-Type: application/json' -H 'x-tenant-slug: mondescale' \
  -d '{"channel":"landing-page","topic":"Île Maurice","agencyName":"Mondescale Bois-Colombes","city":"Bois-Colombes"}' | jq
```
