# MSE-17.2 — AI Content Service

## Apport
- fournisseurs `deterministic` et `openai-compatible` ;
- exécution et relance des jobs ;
- compteur de tentatives ;
- création automatique d'un `CampaignAsset` en statut `review` ;
- enrichissement depuis la campagne ;
- route `POST /ai-content/jobs/:id/retry`.

## Variables optionnelles
```env
AI_CONTENT_PROVIDER=deterministic
# AI_CONTENT_PROVIDER=openai-compatible
# AI_CONTENT_API_KEY=...
# AI_CONTENT_BASE_URL=https://api.openai.com/v1
# AI_CONTENT_MODEL=gpt-4.1-mini
# AI_CONTENT_TIMEOUT_MS=45000
```

## Installation
```bash
npx --prefix backend prisma validate
npx --prefix backend prisma migrate deploy
npx --prefix backend prisma generate
npm --prefix backend test
docker compose up -d --build backend
```
