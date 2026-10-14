# MSE-25.322 — Go-live gates (Ambassade FRAM)

## Commercial contract
- One monthly Exclus Ambassade FRAM campaign (YYYY-MM) with at most four published offers.
- Flash sales are independent of monthly exclusives.
- Only explicitly approved and enabled Ambassade FRAM agencies receive offers.
- Loyalty programme: 100 EUR eligible FRAM spend = 1 point; Plein Vent excluded. Redemption terms must be approved before marketing claims.

## Security — mandatory before exposing admin routes
- Admin router is **disabled by default**. Registration is conditional on `FRAM_ADMIN_TOKEN` and `FRAM_ADMIN_TENANT_ID` being set server-side; missing either while the other is configured fails startup. Do not use the demonstrative global /session state for authorization.
- A separate, optional server-to-server bearer-token middleware is implemented in `backend/src/modules/ambassade-fram/admin-auth.js` and has dedicated tests. It is wired only under explicit server-side configuration; configure a unique secret (minimum 32 characters), a server-verified tenant, secret rotation and audit logging before any activation. Do not place the token in browser JavaScript or expose it through frontend environment variables.
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
Draft PR #341. GitHub Actions run 38606335528 passed both frontend and backend jobs on commit 1a2b145 (14 October 2026). CI validates the Prisma schema via db push and the FRAM monthly trigger against disposable PostgreSQL 16, not the full historical migration chain (legacy Knowledge Engine migration requires Destination). Admin authentication integration, complete production migration rehearsal, security review and VM 102 deployment remain pending.
