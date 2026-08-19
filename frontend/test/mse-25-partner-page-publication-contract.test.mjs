import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("partner rollout drafts remain explicit until operator publishes from Designer V2", () => {
  const launcher = read("components/website-builder/WebsiteBuilderLauncher.js");
  const builder = read("components/page-builder-v2/VisualPageBuilder.js");
  const state = read("lib/page-builder-v2/page-builder-state.js");
  const api = read("lib/page-builder-v2/page-builder-api.js");

  assert.match(launcher, /Crée uniquement les pages <strong>\/partenaires<\/strong> absentes en brouillon/);
  assert.match(launcher, /aucune publication n’est automatique/);

  assert.match(builder, /<option value="draft">/);
  assert.match(builder, /<option value="review">/);
  assert.match(builder, /<option value="published">/);
  assert.match(builder, /status: event\.target\.value/);

  assert.match(state, /page\.status === "published"\s*\? true/);
  assert.match(state, /page\.status === "draft" \|\|\s*page\.status === "review" \|\|\s*page\.status === "archived"\s*\? false/);

  assert.match(api, /published:serialized\.published/);
  assert.match(api, /status:serialized\.status/);
});
