# SEO Factory

Endpoints:

- `POST /seo-factory/generate`
- `POST /seo-factory/sites/:siteId/publish`

Exemple:

```json
{
  "agencyId": 1,
  "siteId": "optional-mini-site-id",
  "destination": "Budapest",
  "destinationSlug": "budapest",
  "intent": "réservation",
  "travelType": "séjour",
  "season": "été",
  "language": "fr",
  "publish": true
}
```

Les fichiers statiques sont générés par défaut dans `generated-sites/` à la racine du dépôt.
