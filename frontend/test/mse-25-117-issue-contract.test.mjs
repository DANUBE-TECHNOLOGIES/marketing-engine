import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const marker = fs.readFileSync(path.join(root, ".mse-25-117"), "utf8");
const docs = fs.readFileSync(path.join(root, "..", "docs/mse-25-117-validation.md"), "utf8");

test("MSE-25.117 implementation remains linked to issue 51 and consolidated validation", () => {
  assert.match(marker, /ISSUE=51/);
  assert.match(docs, /MSE-25\.117/);
  assert.match(docs, /npm run build/);
});
