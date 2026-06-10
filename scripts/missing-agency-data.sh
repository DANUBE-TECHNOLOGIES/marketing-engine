#!/bin/bash

echo "=== Données agences manquantes ==="

node - <<'NODE'
const agencies = require("./backend/src/data/agencyDirectory");

const fields = [
  "phone",
  "email",
  "googleReviewUrl",
  "appointmentUrl"
];

for (const agency of agencies) {
  const missing = fields.filter((field) => {
    const value = agency[field];
    return !value || value === "00 00 00 00 00";
  });

  if (missing.length > 0) {
    console.log("");
    console.log(`${agency.name} (${agency.code})`);
    console.log("À compléter :", missing.join(", "));
  }
}
NODE
