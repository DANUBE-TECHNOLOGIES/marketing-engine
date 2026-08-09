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

  assert.match(source, /createOffer:/);
  assert.match(source, /assets\/offers/);
  assert.match(source, /approveAsset:/);
  assert.match(source, /\/approve/);
  assert.match(source, /rejectAsset:/);
  assert.match(source, /\/reject/);
});

test("campaign UI creates and reviews mini-site offers", () => {
  const source = read("app/campaigns/CampaignsClient.js");

  assert.match(source, /Gérer les offres mini-site/);
  assert.match(source, /campaignApi\.createOffer/);
  assert.match(source, /campaignApi\.approveAsset/);
  assert.match(source, /campaignApi\.rejectAsset/);
  assert.match(source, /status === "review"/);
  assert.match(source, /Offre créée et placée en relecture/);
});

test("campaign page loads offer management styles", () => {
  const page = read("app/campaigns/page.js");
  const css = read("app/campaigns/campaigns.css");

  assert.match(page, /campaigns\.css/);
  assert.match(css, /\.offer-panel/);
  assert.match(css, /\.offer-status-approved/);
  assert.match(css, /\.danger-button/);
});
