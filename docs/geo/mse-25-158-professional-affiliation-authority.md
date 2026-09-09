# MSE-25.158 — Professional affiliation authority V1

## Objectif

Supprimer les affiliations professionnelles codées en dur du bandeau public et n'afficher que les affiliations explicitement configurées dans le profil public Mondescale.

## Autorité

La source retenue est `runtimeLegalValues().settings.professionalAffiliations`.

Le champ `settings` bénéficie déjà de l'héritage réseau et de la surcharge agence dans `public-brand-legal`.

## Règles

- aucune affiliation n'est présumée pour toutes les agences ;
- sans `professionalAffiliations`, aucune affiliation réseau n'est affichée ;
- une affiliation doit fournir un libellé public non vide ;
- identifiants dupliqués ignorés ;
- logo, détail et fallback utilisés uniquement lorsqu'ils sont explicitement configurés ;
- les affiliations configurées restent distinctes de `travelRegistration`, `financialGuarantee` et `professionalInsurance` ;
- aucune propriété Schema.org `memberOf` supplémentaire n'est ajoutée sans identité canonique vérifiée.

## Portée GEO

Le bandeau visible ne contient plus de relation institutionnelle globale sans source. Cette étape prépare une future structuration des affiliations uniquement si des identités externes canoniques et vérifiées sont configurées.
