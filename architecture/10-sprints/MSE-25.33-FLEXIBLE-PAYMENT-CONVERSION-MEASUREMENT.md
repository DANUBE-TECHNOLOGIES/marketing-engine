# MSE-25.33 — Flexible Payment Conversion Measurement

## Objectif

Mesurer l’usage réel du service « paiement en plusieurs fois » introduit par MSE-25.32, sans collecter de donnée personnelle et sans coupler le renderer public à un fournisseur analytics précis.

## Périmètre

- instrumenter le clic sur le CTA du bloc `flexible_payment` ;
- produire un contrat d’événement stable et exploitable par `dataLayer`/GTM ou par un listener applicatif ;
- conserver la navigation même si la couche analytics est absente ou en erreur ;
- limiter les propriétés aux informations non personnelles nécessaires à l’analyse : mini-site, variante du bloc, produits, échéances configurées et mode de frais ;
- ne jamais inclure téléphone, email, nom client, texte libre saisi par l’utilisateur ou identifiant de session.

## Contrat événement

Événement : `mondescale_conversion`

Propriétés :

- `conversion_type: flexible_payment_cta`
- `site_id`
- `site_slug`
- `payment_variant`
- `payment_products`
- `payment_installments`
- `payment_fee_mode`
- `cta_label`

Le même payload est également publié via un `CustomEvent` navigateur `mondescale:conversion` afin de ne pas dépendre de Google Tag Manager.

## Garde-fous

- aucun `preventDefault()` : l’analytics ne bloque jamais le CTA ;
- `dataLayer` est utilisé seulement dans le navigateur ;
- toute erreur de tracking est silencieuse et sans impact UX ;
- aucun PII ;
- aucune modification du contrat financier de MSE-25.32 ;
- tests de contrat dédiés et lint CI.

## Critère de sortie

Le CTA public de paiement flexible émet un événement stable, sans PII, tout en conservant le comportement de navigation existant et en restant indépendant du fournisseur analytics final.
