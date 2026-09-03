# MSE-000.01 — Prisma Migration Audit Engine

Ajoute :

```bash
./mondescale prisma audit
```

Le moteur détecte notamment :

- `ALTER TABLE` avant `CREATE TABLE` ;
- références de clés étrangères avant création ;
- index créés sur une table inconnue ;
- écritures SQL vers des tables inconnues ;
- tables créées plusieurs fois.

Un rapport HTML est généré dans :

```text
reports/prisma/
```

## Résultat attendu sur l’historique actuel

L’audit doit signaler que `SeoGenerationJob`
est utilisée dans une migration antérieure
à celle qui la crée.
