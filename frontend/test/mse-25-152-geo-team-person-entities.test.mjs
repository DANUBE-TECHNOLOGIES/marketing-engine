import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/TeamRenderer.js"),
  "utf8",
);

test("MSE-25.152 public team members expose grounded Person semantics", () => {
  assert.match(source, /itemType="https:\/\/schema\.org\/Person"/);
  assert.match(source, /itemID=\{memberEntityId\(site, member, index\)\}/);
  assert.match(source, /itemProp="name"/);
  assert.match(source, /itemProp="jobTitle"/);
  assert.match(source, /itemProp="description"/);
  assert.match(source, /itemProp="image"/);
});

test("MSE-25.152 Person entities link to the same canonical TravelAgency identity", () => {
  assert.match(source, /import \{ absoluteUrl \} from "\.\.\/\.\.\/\.\.\/lib\/seo\/site-url"/);
  assert.match(source, /#travel-agency/);
  assert.match(source, /itemProp="worksFor"/);
  assert.match(source, /itemType="https:\/\/schema\.org\/TravelAgency"/);
  assert.match(source, /itemID=\{agencyId\}/);
});

test("MSE-25.152 team semantics do not invent expertise or destination knowledge", () => {
  assert.doesNotMatch(source, /itemProp="knowsAbout"/);
  assert.doesNotMatch(source, /itemProp="hasCredential"/);
  assert.doesNotMatch(source, /itemProp="award"/);
});
