# MSE-14.1 — Page Block Engine

Ajoute le modèle `PageBlock`, un CRUD multi-tenant, le réordonnancement et un premier moteur HTML sécurisé.

## Routes
- `GET /builder/health`
- `GET /builder/pages/:pageId/blocks`
- `POST /builder/pages/:pageId/blocks`
- `PUT /builder/blocks/:id`
- `DELETE /builder/blocks/:id`
- `POST /builder/pages/:pageId/blocks/reorder`
- `GET /builder/pages/:pageId/render`
