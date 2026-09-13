#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
echo "== Funnel definition =="
curl -fsS "$BASE_URL/api/public/acquisition-funnels/bois-colombes/soleil-hiver" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.ok||!j.funnel)process.exit(1);console.log(j.funnel.id,j.funnel.version||"")})'
echo "== Qualification =="
curl -fsS -X POST "$BASE_URL/api/public/acquisition-funnels/bois-colombes/soleil-hiver/qualify" -H 'content-type: application/json' --data '{"answers":{"departureWindow":"fevrier","travellers":"2","budgetPerPerson":"3000-5000","travelStyle":"plage","departureAirport":"paris","maturity":"reservation-prochaine"},"contact":{"name":"Smoke Test","email":"smoke@example.invalid","postalCode":"92270"},"consents":{"emailMarketing":false,"phoneProjectContact":false}}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.ok||!j.qualification)process.exit(1);console.log(j.qualification.temperature,j.qualification.score)})'
echo "MSE-25.206 acquisition API smoke: PASS (no lead persisted)"