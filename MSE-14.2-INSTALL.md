# MSE-14.2 — Mini-site auto provisioning

## Capabilities

- Inventory of provisioned/missing agency mini-sites per tenant.
- Idempotent provisioning of one agency.
- Batch provisioning, with dry-run and missing-only mode.
- Initial draft PageBlock seeding for home, reviews and contact pages.
- Tenant isolation on agencies, sites and page blocks.

## API

- `GET /provisioning/health`
- `GET /provisioning/mini-sites/status`
- `POST /provisioning/mini-sites/agencies/:id`
- `POST /provisioning/mini-sites/batch`

No Prisma migration is required for this lot; it uses the MSE-14.1 `PageBlock` model.
