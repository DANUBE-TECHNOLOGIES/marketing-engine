# MSE-25.152 — GEO team Person entities V1

## Goal

Make the real advisers already published on each agency mini-site easier for search and generative systems to identify as people working for the local Mondescale agency.

## Contract

- A published team card is exposed as a Schema.org `Person` in visible-page microdata.
- `name`, `jobTitle`, `description` and `image` reuse only values already rendered from the team content.
- Each Person receives a stable canonical identifier under the agency team URL.
- `worksFor` points to the same canonical `TravelAgency` identifier used elsewhere by the mini-site (`#travel-agency`).
- No `knowsAbout`, credential, award, specialty or destination claim is generated as structured data from generic prose.
- Existing specialty/destination/experience text remains visible only when explicitly present in the published team data.

## GEO rationale

The mini-site already presents named advisers, roles, portraits and biographies. MSE-25.152 turns those visible facts into an explicit entity relationship:

`Person -> worksFor -> TravelAgency -> local agency/city`

This improves entity disambiguation without inventing expertise or commercial authority.
