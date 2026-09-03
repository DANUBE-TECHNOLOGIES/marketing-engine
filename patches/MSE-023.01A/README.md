# MSE-023.01A — Google Business Photos Foundation

Ajoute le cache local et les API de photos Google Business.

Après installation :

```bash
docker compose exec -T backend npx prisma migrate dev --name add_google_business_photos
docker compose up -d --build --force-recreate backend
```
