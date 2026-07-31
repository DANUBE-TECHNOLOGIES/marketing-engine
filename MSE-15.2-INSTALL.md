# MSE-15.2 — Stabilisation Campaign Manager

## Correctif

Le navigateur appelait `http://localhost:4000/campaigns`. Depuis un poste client,
`localhost` désigne le poste client et non le serveur Mondescale, ce qui produisait
`Load failed`.

Le frontend utilise désormais une route Next.js de même origine :

- navigateur → `/api/campaigns`
- proxy Next.js → `http://backend:4000/campaigns`

Le proxy transmet automatiquement le tenant `mondescale`, les méthodes HTTP et les
réponses d'erreur du backend.

## Déploiement

```bash
cd ~/mondescale-local-engine
docker compose up -d --build --force-recreate frontend
docker compose logs frontend --tail=100
```

## Validation

Depuis le serveur :

```bash
curl -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" \
  http://localhost:3000/api/campaigns | jq
```

Puis recharger `/campaigns` dans le navigateur.
