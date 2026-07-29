# Bundle 003 — Fondation SEO technique

## Objectifs

- Centraliser l'URL canonique publique.
- Exposer un `robots.txt` dynamique.
- Exposer un `sitemap.xml` dynamique.
- Ajouter les schémas JSON-LD de base.
- Supprimer le contenu de destination codé en dur.
- Préparer le maillage et la SEO Factory.

## Schémas intégrés

- `WebSite`
- `TravelAgency`
- `BreadcrumbList`
- `TouristDestination`

## Limites actuelles

Le sitemap interroge plusieurs routes publiques possibles. Si les routes de
listing des agences ou destinations n'existent pas encore, le sitemap reste
valide mais ne contient que la page racine.

La création des endpoints publics de catalogue fait partie du bundle suivant.
