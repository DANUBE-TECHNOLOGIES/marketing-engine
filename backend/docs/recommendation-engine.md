# MSE-03.2 — Travel Recommendation Engine

Le moteur classe les destinations publiées selon huit familles de signaux : thèmes, types de voyage, profils voyageurs, budget, climat, durée de vol, géographie et saison.

## API

- `GET /recommendations/health`
- `GET /recommendations/destination/:slug?limit=8&minScore=35`
- `POST /recommendations/destination/:slug/rebuild`
- `POST /recommendations/rebuild`

Les reconstructions écrivent dans `DestinationRelation` avec `origin=recommendation-engine`. Les relations manuelles ne sont jamais supprimées.
