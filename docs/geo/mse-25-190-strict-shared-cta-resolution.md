# MSE-25.190 — GEO strict shared CTA resolution V1

## Objectif

Empêcher le helper CTA partagé des mini-sites de fabriquer une destination lorsque l'URL publiée est absente ou invalide.

## Contrat

- `resolvePublicCtaHref()` n'a plus de fallback `/contact` par défaut ;
- un href vide ne produit une destination que si un fallback est explicitement fourni par l'appelant ;
- `javascript:`, `data:` et `vbscript:` retournent `null` et ne sont jamais remplacés par une page locale ;
- un libellé contenant « devis », « estimation » ou « chiffrage » ne remplace plus l'URL publiée par `/demande-devis` ;
- `AppointmentRenderer`, `OffersRenderer` et `FlexiblePaymentRenderer` ne rendent aucune action lorsque l'href explicite ne peut pas être résolu ;
- les routes locales explicites, ancres, URLs HTTP(S), `mailto:` et `tel:` restent supportées.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
