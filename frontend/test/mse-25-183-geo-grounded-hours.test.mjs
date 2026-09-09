import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const renderer = fs.readFileSync(
  path.join(root, "components/public-site/renderers/HoursRenderer.js"),
  "utf8"
);

test("hours copy stays factual and sourced", () => {
  assert.match(renderer, /horaires publiés de votre agence/);
  assert.doesNotMatch(renderer, /projet nécessitant du temps de conseil/);
  assert.doesNotMatch(renderer, /préparer votre échange/);
});

test("hours related navigation uses published pages only", () => {
  assert.match(renderer, /uniquePublishedNavigation\(site\)/);
  assert.match(renderer, /pageHref\(site\.slug, page\)/);
  assert.match(renderer, /page\.title/);
  assert.doesNotMatch(renderer, /\/equipe/);
  assert.doesNotMatch(renderer, /`\$\{root\}\/contact`/);
  assert.doesNotMatch(renderer, /`\$\{root\}\/services`/);
});

test("hours sync state is only shown when timestamp is available", () => {
  assert.match(renderer, /data\.syncedAt && syncedLabel/);
  assert.doesNotMatch(renderer, /Horaires en attente de synchronisation Google Business Profile/);
});
