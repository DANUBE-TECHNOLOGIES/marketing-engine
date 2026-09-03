import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.118 measurement contract distinguishes data quality and remediation cases", () => {
  const source = read("lib/seo/local-search-measurement.js");
  for (const expected of [
    "no-data",
    "no-impressions",
    "low-volume",
    "visibility-no-clicks",
    "low-ctr",
    "weak-position",
    "improving",
    "healthy",
  ]) assert.match(source, new RegExp(expected));
});

test("MSE-25.118 does not authorize automatic public or Google writes", () => {
  const source = read("lib/seo/local-search-measurement.js");
  assert.match(source, /automatedPublicChangeAllowed:\s*false/);
  assert.match(source, /googleWriteAllowed:\s*false/);
});

test("MSE-25.118 protects low-volume observations from premature CTR conclusions", () => {
  const source = read("lib/seo/local-search-measurement.js");
  assert.match(source, /minimumImpressionsForCtrJudgement:\s*20/);
  assert.match(source, /confidence === "low"/);
  assert.match(source, /collect-more-data/);
});
