# MSE-25.322 — Go-live gates (Ambassade FRAM)

## Commercial contract
- One monthly Exclus Ambassade FRAM campaign (YYYY-MM) with at most four published offers.
- Flash sales are independent of monthly exclusives.
- Only explicitly approved and enabled Ambassade FRAM agencies receive offers.
- Loyalty programme: 100 EUR eligible FRAM spend = 1 point; Plein Vent excluded. Redemption terms must be approved before marketing claims.

## Security — mandatory before exposing admin routes
- Admin router is intentionally **not mounted**. Do not use the demonstrative global /session state for authorization.
- Integrate a trusted, per-request authenticated identity and server-verified tenant and FRAM network administrator permission.
- Set framAdminAuthenticated only after trusted verification; do not accept client-supplied role, tenant ID, or authentication flag.
- Test 401/403, cross-tenant access, CSRF protection for browser-based mutations, and audit logging of publish/approve/disable actions.

## Release checks
1. Run backend npm ci, Prisma validate/generate and all MSE-25.322 tests.
2. Review migrations 20261013150000, 20261014120000, 20261014123000 and verify order against a disposable PostgreSQL 16 database.
3. Test concurrent attempts to publish the fifth exclusive for the same month; PostgreSQL must reject excess publications.
4. Validate image URLs, quote links, pricing, campaign boundaries and visibility on one approved and one unapproved agency.
5. Build frontend, confirm noindex remains until content and legal review.
6. Deploy from an isolated checkout, never overwrite the existing dirty VM 102 worktree. Back up database, record image tags, perform health checks and prepare rollback.
7. Enable public indexing and administrative access only after explicit approval.

## Status
Code in draft PR #341. CI execution, security integration, database migrations and production deployment are not yet verified.
