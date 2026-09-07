# MSE-25.125BV — Maurepas extended exact-ID runner

This runner is intentionally separate from campaign preparation.

Safety invariants:

- accepts only an explicit Maurepas 5x5 baseline ID and an explicit prepared 11x11 campaign ID;
- requires the prepared campaign to contain exactly 121 points with 3 km spacing and center 5:5;
- requires exact agency, keyword and center equality with the baseline;
- requires the exact acknowledgement `RUN-MAUREPAS-EXTENDED-11X11`;
- refuses to run unless `RANKING_GRID_DATAFORSEO_ENABLED=true` is already visible inside the backend container;
- never changes that provider flag itself;
- validates the read-only paid plan for the exact campaign ID and enforces the configured cost ceiling;
- checks DataForSEO balance before the run;
- calls only `/rankings/grid/campaigns/<exact-id>/run`, never the campaign-creation endpoint;
- supports safe retries when only a subset of the 121 points remains unmeasured.

The default cost ceiling is USD 0.25. The runner is not executed by CI.
