# MSE-16.2 — AI SEO Generator

## Contenu

- Générateur SEO déterministe, utilisable sans API externe.
- Interface de fournisseur injectable pour un futur LLM.
- Production d'assets `landing-page` et `faq`.
- Métadonnées SEO (title, description, Open Graph, canonical slug).
- JSON-LD Schema.org (`WebPage`, `FAQPage`, `TravelAgency`).
- Persistance idempotente dans `CampaignAsset` par tâche.
- Route de prévisualisation `POST /ai-seo/preview`.
- Intégration automatique dans les jobs `/generation/jobs/:id/run`.

## Déploiement

```bash
cd ~/mondescale-local-engine
npm --prefix backend install
npm --prefix backend test
docker compose up -d --build backend
```

## Contrôles

```bash
curl -s http://127.0.0.1:4000/ai-seo/health | jq
curl -s http://127.0.0.1:4000/generation/health | jq
```

Les contenus générés sont placés au statut `review` afin de conserver une validation humaine avant publication.
