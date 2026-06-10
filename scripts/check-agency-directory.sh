#!/bin/bash

echo "=== Check référentiel agences ==="

node -c backend/src/data/agencyDirectory.js || exit 1

node - <<'NODE'
const agencies = require("./backend/src/data/agencyDirectory");

console.log("Agences :", agencies.length);

const required = [
  "id",
  "code",
  "name",
  "city",
  "phone",
  "email",
  "googleReviewUrl",
  "appointmentUrl",
  "category",
  "googleBusinessId",
  "placeId"
];

let errors = 0;

for (const agency of agencies) {
  for (const field of required) {
    if (!agency[field]) {
      console.log(`ERREUR ${agency.code || agency.name}: champ manquant ${field}`);
      errors++;
    }
  }
}

if (errors > 0) {
  process.exit(1);
}

console.log("Référentiel OK");
NODE
