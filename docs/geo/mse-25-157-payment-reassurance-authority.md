# MSE-25.157 — Payment reassurance authority V1

## Objectif

Supprimer les moyens de paiement codés en dur du bandeau public et n'afficher que les moyens explicitement configurés dans le contrat public Mondescale.

## Autorité

La source retenue est `runtimeLegalValues().settings.paymentMethods`.

Le champ `settings` est déjà résolu par le module `public-brand-legal` avec héritage réseau et surcharge agence. Aucun nouveau modèle ni migration n'est ajouté.

## Règles

- aucune marque de paiement n'est présumée acceptée ;
- sans `settings.paymentMethods`, le panneau paiement est omis ;
- une entrée doit avoir un libellé public non vide ;
- les doublons d'identifiant sont ignorés ;
- logo, détail et fallback ne sont utilisés que lorsqu'ils sont explicitement configurés ;
- le wording public parle de « moyens de paiement publiés », pas de disponibilité transactionnelle ;
- aucune donnée de prix, stock, disponibilité ou réservation n'est ajoutée.

## Portée GEO

Cette évolution améliore la concordance entre faits visibles et source publique. Elle ne crée aucun balisage commercial ni aucune autorité de paiement implicite.
