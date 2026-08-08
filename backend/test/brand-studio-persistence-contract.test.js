"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const identityApiPath = path.resolve(
  __dirname,
  "../../frontend/lib/brand-studio/identity-api.js"
);

function identityApiSource() {
  return fs.readFileSync(identityApiPath, "utf8");
}

test(
  "Brand Studio relit le profil résolu renvoyé par le backend",
  () => {
    const source = identityApiSource();

    assert.match(
      source,
      /payload\?\.resolved\s*\|\|/,
      "Le GET Brand Profile doit privilégier payload.resolved afin de conserver les valeurs après refresh."
    );

    assert.match(
      source,
      /payload\?\.data\?\.resolved\s*\|\|/,
      "Le contrat enveloppé data.resolved doit également rester compatible."
    );
  }
);

test(
  "Brand Studio vérifie la persistance après enregistrement",
  () => {
    const source = identityApiSource();

    assert.match(
      source,
      /return\s+await\s+fetchBrandIdentity\(\s*normalizedAgencyId\s*\)/,
      "Après le PUT, l'interface doit relire la source persistée avant d'annoncer le succès."
    );
  }
);
