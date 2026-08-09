import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("campaign API exposes mini-site offer lifecycle", () => {
  const source = read("lib/campaign-api.js");

  assert.match(source, /agencyOptions:/);
  assert.match(source, /update:/);
  assert.match(source, /createOffer:/);
  assert.match(source, /assets\/offers/);
  assert.match(source, /approveAsset:/);
  assert.match(source, /rejectAsset:/);
  assert.match(source, /reviewedBy/);
  assert.match(source, /Campaign Manager/);
  assert.match(source, /comment/);
});

test("campaign UI creates reviews and targets mini-site offers", () => {
  const source = read("app/campaigns/CampaignsClient.js");

  assert.match(source, /Gérer les offres mini-site/);
  assert.match(source, /Agences ciblées/);
  assert.match(source, /campaignApi\.agencyOptions/);
  assert.match(source, /campaignApi\.update/);
  assert.match(source, /agencyIds:\s*targetIds/);
  assert.match(source, /campaignApi\.createOffer/);
  assert.match(source, /campaignApi\.approveAsset/);
  assert.match(source, /campaignApi\.rejectAsset/);
  assert.match(source, /status === "review"/);
  assert.match(source, /Offre créée et placée en relecture/);
  assert.match(source, /ne cible aucune agence/);
});

test("new campaigns can receive agency targets immediately", () => {
  const source = read("app/campaigns/CampaignsClient.js");

  assert.match(source, /agencyIds:\s*selectedAgencyIds/);
  assert.match(source, /AgencyChecklist/);
  assert.match(source, /setSelectedAgencyIds/);
});

test("campaign page loads offer and targeting styles", () => {
  const page = read("app/campaigns/page.js");
  const css = read("app/campaigns/campaigns.css");

  assert.match(page, /campaigns\.css/);
  assert.match(css, /\.offer-panel/);
  assert.match(css, /\.offer-status-approved/);
  assert.match(css, /\.danger-button/);
  assert.match(css, /\.agency-checklist/);
  assert.match(css, /\.targeting-box/);
});
