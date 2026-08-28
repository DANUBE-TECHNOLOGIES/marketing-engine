import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  homeFromContract,
  pageBySlugFromContract,
  pagesFromContract,
  siteFromContract,
} from "../lib/public-site-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, "../lib/public-site-api.js");

function sampleContract() {
  return {
    site: {
      id: "site-gien",
      slug: "ambassade-fram-mondescale-gien",
      name: "Ambassade FRAM - Mondescale Gien",
    },
    navigation: [{ slug: "home", title: "Accueil" }],
    pages: [
      {
        id: "home",
        slug: "home",
        title: "Accueil",
        blocks: [{ id: "hero", blockType: "hero", content: {} }],
      },
      {
        id: "services",
        slug: "services",
        title: "Services",
        blocks: [{ id: "text", blockType: "rich_text", content: {} }],
      },
    ],
    homePage: {
      id: "home",
      slug: "home",
      title: "Accueil",
      blocks: [{ id: "hero", blockType: "hero", content: {} }],
    },
  };
}

test("MSE-25.71 derives site and pages from one root contract", () => {
  const contract = sampleContract();
  const site = siteFromContract(contract);
  const home = homeFromContract(contract);
  const services = pageBySlugFromContract(contract, "services");

  assert.equal(site.slug, "ambassade-fram-mondescale-gien");
  assert.deepEqual(site.navigation, contract.navigation);
  assert.equal(pagesFromContract(contract).length, 2);
  assert.equal(home.id, "home");
  assert.equal(home.sections.length, 1);
  assert.equal(services.id, "services");
  assert.equal(services.sections.length, 1);
});

test("MSE-25.71 home aliases resolve locally without a page endpoint", () => {
  const contract = sampleContract();

  for (const slug of ["", "home", "accueil", "index"]) {
    assert.equal(pageBySlugFromContract(contract, slug)?.id, "home");
  }
});

test("MSE-25.71 public render consumers share getContract", () => {
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(source, /const getContract = cache\(async \(siteSlug\)/);
  assert.match(source, /const getSite = cache\(async \(siteSlug\) => siteFromContract\(\s*await getContract\(siteSlug\)/s);
  assert.match(source, /const getHome = cache\(async \(siteSlug\) => homeFromContract\(\s*await getContract\(siteSlug\)/s);
  assert.match(source, /const contract = await getContract\(siteSlug\)/);
  assert.doesNotMatch(source, /getHome = cache[\s\S]*?pages\/home[\s\S]*?\)\);/);
});
