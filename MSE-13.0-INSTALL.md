# MSE-13.0 — White Label Foundation

## Contenu
- Modèle Prisma `Brand` lié 1:1 à `Tenant`
- Migration SQL avec création automatique d'une marque pour les tenants existants
- API tenantisée `GET /brand`, `PUT /brand`, `GET /brand/theme`
- API publique `GET /public/brands/:tenantSlug/theme`
- Variables CSS de marque prêtes à consommer par le frontend et les mini-sites
- Validation des couleurs, domaines et objets JSON
- Tests unitaires

## Validation locale
- `node --test backend/test/brand.test.js backend/test/tenant-core.test.js`: 14/14 réussis
- Suite globale: 175 tests réussis sur 176; l'unique échec préexistant vient de l'absence de la dépendance `express` dans l'environnement d'assemblage.
- Prisma non validé localement car `node_modules` n'est pas inclus dans l'archive source.

## Installation serveur
```bash
cd /home/admin1/mondescale-local-engine
tar -xzf /home/admin1/MSE-13.0-white-label-foundation.tar.gz -C .
cd backend
npm install
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate deploy
node --test test/brand.test.js test/tenant-core.test.js
```
