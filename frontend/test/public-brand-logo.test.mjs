import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(
  new URL("../components/public-site/PublicBrandLogo.js", import.meta.url),
  "utf8"
);

test("priority public logo is fetched eagerly with high priority", () => {
  assert.match(component, /loading=/);
  assert.match(component, /fetchPriority=/);
  assert.match(component, /priority\s*\?\s*"high"/);
});
