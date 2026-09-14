# MSE-25.164 — Destination FAQ parity & canonical linkage V1

## Objectif

Aligner strictement les FAQ visibles des pages Destination et leur `FAQPage` JSON-LD, puis rattacher cette FAQ au `WebPage` canonique sans modifier l’autorité principale `TouristDestination`.

## Contrat

- `destinationFaqItems()` est la source unique des couples question/réponse visibles et structurés.
- Les lignes dont la question ou la réponse est vide sont exclues des deux surfaces.
- L’ordre éditorial est conservé ; aucune FAQ n’est générée ou déduite.
- Le `FAQPage` conserve l’identité stable `<canonical>#faq`.
- Le `FAQPage.isPartOf` référence `<canonical>#webpage`.
- Le `FAQPage.about` référence `<canonical>#destination`.
- Le `WebPage` référence le FAQPage via `hasPart` uniquement si la FAQ structurée existe.
- `WebPage.mainEntity` reste le `TouristDestination`.
- Aucun prix, stock, disponibilité, réservation, note agrégée ou expertise inférée n’est ajouté.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
