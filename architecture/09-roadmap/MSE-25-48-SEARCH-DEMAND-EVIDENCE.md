# MSE-25.48 — Search Demand Evidence

## Purpose

Continue the SEO programme after MSE-25.40 semantic consolidation and MSE-25.47 internal-link certification.

MSE-25.48 prevents a semantic signal from becoming a new SEO write unless there is measurable search demand. It is intentionally read-only in this phase.

## Evidence contract

The evidence layer can ingest a Search Console-style analytics export containing query/page/clicks/impressions/ctr/position rows. It correlates these rows with the commercial intent coverage already produced by the minisite semantic engine.

Evidence levels:

- high: at least 100 impressions with average position > 5 and <= 30;
- medium: at least 30 impressions with average position > 3 and <= 50;
- weak: some clicks or at least 10 impressions;
- none: insufficient observed demand.

Only medium/high evidence may become a human SEO review candidate. No evidence level authorizes an automatic write.

## Invariants

- semantic gaps alone are insufficient;
- no automatic content write;
- no automatic page creation;
- no automatic publication;
- MSE-25.40 and MSE-25.47 remain closed;
- concurrent MSE-25.42–25.46 work is not modified;
- all future execution remains behind a separate sealed write-intent and rollback contract.
