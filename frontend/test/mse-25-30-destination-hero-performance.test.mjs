import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const renderer = fs.readFileSync(path.join(root, "components/destination/DestinationPage.js"), "utf8");
const css = fs.readFileSync(path.join(root, "components/destination/DestinationPage.module.css"), "utf8");

test("MSE-25.30 destination hero image is discoverable as an eager high-priority image", () => {
  assert.match(renderer, /className=\{styles\["de-hero-media"\]\}/);
  assert.match(renderer, /fetchPriority="high"/);
  assert.match(renderer, /loading="eager"/);
  assert.doesNotMatch(renderer, /backgroundImage:\s*`linear-gradient/);
});

test("MSE-25.30 preserves the visual hero overlay without using the image as CSS background", () => {
  assert.match(css, /\.de-hero-media\{/);
  assert.match(css, /object-fit:cover/);
  assert.match(css, /\.de-hero:after\{/);
  assert.match(css, /linear-gradient/);
});
