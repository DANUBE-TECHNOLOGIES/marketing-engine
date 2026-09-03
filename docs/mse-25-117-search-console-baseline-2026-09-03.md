# MSE-25.117 — Search Console baseline — 2026-09-03

Baseline issue de l'export Search Console fourni avant déploiement MSE-25.117. Elle sert de référence de comparaison et ne constitue pas une écriture vers Google.

| Requête locale | Clics | Impressions |
| --- | ---: | ---: |
| agence de voyage nevers | 3 | 42 |
| agence de voyage gien | 1 | 10 |
| agence de voyage dax | 0 | 64 |
| agence voyage dax | 0 | 21 |
| agence voyages nevers | 0 | 19 |
| agence de voyage colombes | 0 | 17 |
| agence de voyage clermont ferrand | 0 | 12 |
| agence voyage nevers | 0 | 11 |
| agence de voyage bois colombes | 0 | 9 |
| fram nevers | 0 | 10 |
| fram gien | 0 | 8 |
| agence de voyage chantilly | 0 | 6 |
| agence de voyage maurepas | 0 | 3 |

## Signaux génériques à surveiller

| Requête | Clics | Impressions |
| --- | ---: | ---: |
| voyages | 0 | 882 |
| fram | 0 | 521 |
| fram voyage | 0 | 130 |

## Lecture de départ

- Nevers possède déjà un signal local exploitable.
- Gien commence à obtenir clics et impressions sur l'intention principale.
- Dax a de la visibilité mais un CTR nul sur l'intention locale principale : priorité title/description/position et cohérence de résultat.
- Bois-Colombes et Maurepas sont encore faiblement exposées.
- Lamorlaye et Ozoir n'ont pas, dans cet export, de signal transactionnel principal suffisamment visible pour constituer une baseline chiffrée utile.
- Les volumes génériques sans clic ne doivent pas conduire à créer des pages doorway ; MSE-25.117 privilégie les intentions commerciales rattachées aux surfaces réelles de chaque agence.

## KPI de comparaison

Pour chaque agence et période comparable : impressions, clics, CTR, position moyenne et présence sur `agence de voyage(s) + ville`, puis intentions billetterie, groupes, business travel, services et marque lorsque réellement pertinentes.
