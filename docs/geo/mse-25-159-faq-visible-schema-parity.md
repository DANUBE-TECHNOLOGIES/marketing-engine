# MSE-25.159 — FAQ visible/schema parity V1

## Objectif

Garantir que les questions/réponses visibles sur les mini-sites et le JSON-LD `FAQPage` utilisent exactement la même source publique.

## Problème corrigé

Le renderer visible et le builder JSON-LD avaient des règles différentes :

- le renderer acceptait `answer`, `text` ou `description` ;
- le JSON-LD acceptait `answer`, `text` ou `content` ;
- le JSON-LD dédupliquait les questions et limitait la liste à 20 alors que le rendu visible ne le faisait pas.

Cela pouvait créer une divergence entre contenu visible et contenu structuré.

## Résolution

Le module partagé `frontend/lib/public-faq.js` fournit :

- `faqItemsForSection(section)` pour le renderer ;
- `faqSectionsForPage(page)` avec `sortSections` et `isSectionVisible` ;
- `faqItemsForPage(page)` pour le JSON-LD.

Question et réponse utilisent désormais les mêmes fallbacks :

- question : `question || title` ;
- réponse : `answer || text || description || content`.

Aucune déduplication cachée ni limite arbitraire différente du rendu public n'est appliquée.

## Portée GEO

Le `FAQPage` reflète les mêmes réponses que celles que l'utilisateur peut réellement lire. Aucune FAQ n'est générée ou inférée.
