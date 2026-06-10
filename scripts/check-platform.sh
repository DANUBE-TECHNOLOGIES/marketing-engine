#!/bin/bash

echo "=== Mondescale Local Engine — Check plateforme ==="

echo ""
echo "1. Containers"
docker compose ps

echo ""
echo "2. Backend health"
curl -s http://localhost:4000/health || echo "Backend KO"

echo ""
echo ""
echo "3. Routes clés backend"
for route in \
  /dashboard \
  /production-status \
  /system-health \
  /platform-info \
  /agency-global-scores-v2 \
  /monthly-report \
  /seo-ai-center \
  /settings \
  /seo-today \
  /seo-monthly-report \
  /seo-month-priorities \
  /seo-cluster-calendar/stats \
  /agency-directory/ready \
  /dataforseo-readiness
do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000$route)
  echo "$route => $code"
done

echo ""
echo "4. Frontend local"
code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
echo "frontend / => $code"

echo ""
echo "5. Ports docker-compose"
grep -n "3000\|4000" docker-compose.yml

echo ""
echo "6. Syntaxe backend"
node -c backend/src/server.js && echo "server.js OK"

echo ""
echo "=== Fin du check ==="
