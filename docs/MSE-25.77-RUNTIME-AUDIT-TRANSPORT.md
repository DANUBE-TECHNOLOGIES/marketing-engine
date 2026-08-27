# MSE-25.77 — Internal runtime audit transport

## Purpose
Avoid false timeouts caused by the backend container reaching the public minisite hostname through the host/public routing path.

## Rule
SEO semantics always use `https://agences.mondescale.com` as the expected origin. Only the network transport may use `PUBLIC_INDEXABILITY_FETCH_ORIGIN`.

Default Docker Compose value:

```text
http://frontend:3000
```

The response URL is remapped to the public origin before robots, redirect and canonical diagnostics are evaluated.

## Invariants
- read-only HTTP observation
- no Google write
- no sitemap submission
- no page mutation
- no Website Designer mutation
