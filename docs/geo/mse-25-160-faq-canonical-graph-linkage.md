# MSE-25.160 — FAQ canonical graph linkage V1

## Objectif

Relier explicitement le `FAQPage` au `WebPage` canonique sans modifier l'autorité `mainEntity` déjà utilisée par certaines pages, notamment le catalogue de services.

## Graphe

Lorsqu'une FAQ publique existe sur une page canonique `URL` :

- le `FAQPage` reçoit `@id: URL#faq` ;
- le `FAQPage` publie `url: URL` ;
- le `FAQPage.isPartOf` référence `URL#webpage` ;
- le `WebPage.hasPart` référence `URL#faq`.

Sans FAQ publique, aucun lien n'est ajouté et le `WebPage` reste inchangé.

## Pourquoi `hasPart`

`FAQPage` est un sous-type de `WebPage`, donc de `CreativeWork`. Schema.org autorise `hasPart` sur `CreativeWork` avec un `CreativeWork` comme valeur. Cela exprime correctement que le bloc FAQ fait partie du contenu de la page sans concurrencer son sujet principal.

## Préservation des autorités existantes

La page Services conserve son `OfferCatalog` en `mainEntity`. Le raccordement FAQ n'utilise pas `mainEntity` et ne transforme pas la FAQ en sujet principal de la page.

## Grounding

Les questions et réponses restent celles du resolver partagé introduit par MSE-25.159. Aucun contenu n'est généré ou inféré.
