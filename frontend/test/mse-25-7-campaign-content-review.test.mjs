import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.7 expose la validation des contenus générés dans Campaign Manager", () => {
  const client = source("app/campaigns/CampaignsClient.js");

  assert.match(client, /function GeneratedContentPanel/);
  assert.match(client, /Valider les contenus générés/);
  assert.match(client, /type:\s*"seo-content"/);
  assert.match(client, /Approuver et publier/);
  assert.match(client, /Contenu rejeté et retiré du catalogue Inspirations/);
});

test("MSE-25.7 utilise le workflow générique approuver rejeter du Campaign Manager", () => {
  const client = source("app/campaigns/CampaignsClient.js");
  const api = source("lib/campaign-api.js");

  assert.match(client, /campaignApi\.approveAsset\(campaign\.id, asset\.id/);
  assert.match(client, /campaignApi\.rejectAsset\(campaign\.id, asset\.id/);
  assert.match(api, /reviewedBy:[\s\S]*?Campaign Manager/);
  assert.match(api, /comment:[\s\S]*?data\.note/);
});

test("MSE-25.7 désactive la validation d'un asset éditorial sans seoContentId", () => {
  const client = source("app/campaigns/CampaignsClient.js");

  assert.match(client, /Référence de contenu manquante/);
  assert.match(client, /disabled={!payload\.seoContentId}/);
});

test("MSE-25.7 conserve le panneau offres mini-site existant", () => {
  const client = source("app/campaigns/CampaignsClient.js");

  assert.match(client, /function OfferPanel/);
  assert.match(client, /Gérer les offres mini-site/);
  assert.match(client, /createOffer/);
});
