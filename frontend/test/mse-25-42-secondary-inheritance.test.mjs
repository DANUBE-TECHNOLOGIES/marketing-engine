import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");
const api = fs.readFileSync(path.join(ROOT, "lib/public-site-api.js"), "utf8");

test("MSE-25.42.5 treats generated team placeholders as non-authoritative", () => {
  assert.match(api, /GENERIC_TEAM_IDENTITIES/);
  assert.match(api, /"conseiller voyage"/);
  assert.match(api, /function\s+teamMemberIsMeaningful/);
  assert.match(api, /if \(identity\) \{[\s\S]*return !GENERIC_TEAM_IDENTITIES\.has\(identity\);[\s\S]*\}/);
  assert.match(api, /member\.imageUrl/);
  assert.match(api, /member\.photoUrl/);
});

test("MSE-25.42.5 ignores descriptive copy on generic team placeholders", () => {
  const memberPredicate = api.match(/function\s+teamMemberIsMeaningful[\s\S]*?\n\}/)?.[0] || "";
  assert.match(memberPredicate, /GENERIC_TEAM_IDENTITIES\.has\(identity\)/);
  assert.doesNotMatch(memberPredicate, /member\.description|member\.bio/);
});

test("MSE-25.42.5 replaces placeholder member collections with canonical home advisors", () => {
  assert.match(api, /function\s+teamBlockMembers/);
  assert.match(api, /teamBlockMembers\(block\)\.some\(teamMemberIsMeaningful\)/);
  assert.match(api, /function\s+mergeInheritedTeamBlock/);
  assert.match(api, /delete merged\[key\]/);
  assert.match(api, /merged\[key\] = sourceItems/);
});

test("MSE-25.42.5 prefers the populated Home team block when duplicate team blocks coexist", () => {
  assert.match(api, /function\s+selectInheritanceSourceBlock/);
  assert.match(api, /const candidates = homeBlocks\.filter/);
  assert.match(api, /contract\.family === "team"/);
  assert.match(api, /candidates\.find\(teamBlockHasMembers\) \|\| candidates\[0\]/);
  assert.match(api, /const sourceBlock = selectInheritanceSourceBlock\(homeBlocks, contract\)/);
});

test("MSE-25.42.5 still preserves explicitly populated secondary team pages", () => {
  assert.match(api, /blockHasAuthoritativeData\(targetBlocks\[targetIndex\], contract\)/);
  assert.match(api, /return page;/);
});

test("MSE-25.42.6 audits services and destinations as collection-backed secondary pages", () => {
  assert.match(api, /services:\s*Object\.freeze\(\{[\s\S]*family:\s*"services"/);
  assert.match(api, /types:\s*Object\.freeze\(\["services", "services-grid", "services-highlight"\]\)/);
  assert.match(api, /destinations:\s*Object\.freeze\(\{[\s\S]*family:\s*"destinations"/);
  assert.match(api, /"destination-recommendations"/);
  assert.match(api, /collectionKeys:\s*Object\.freeze\(\["destinations", "items", "destinationIds"\]\)/);
});

test("MSE-25.42.6 only inherits services or destinations when the dedicated collection is empty", () => {
  assert.match(api, /function\s+collectionBlockHasData/);
  assert.match(api, /function\s+blockHasAuthoritativeData/);
  assert.match(api, /Array\.isArray\(contract\.collectionKeys\)/);
  assert.match(api, /collectionBlockHasData\(block, contract\.collectionKeys\)/);
  assert.match(api, /if \(blockHasAuthoritativeData\(targetBlocks\[targetIndex\], contract\)\) \{[\s\S]*return page;/);
});

test("MSE-25.42.6 merges Home collections in memory without overwriting explicit secondary copy", () => {
  assert.match(api, /function\s+mergeInheritedCollectionBlock/);
  assert.match(api, /const merged = \{ \.\.\.sourceContent, \.\.\.targetContent \}/);
  assert.match(api, /delete merged\[key\]/);
  assert.match(api, /merged\[key\] = sourceItems/);
  assert.match(api, /inheritedHomeContent: contract\.family/);
});

test("MSE-25.42.6 leaves agency and contact outside Home inheritance", () => {
  const inheritanceSource = api.match(/const SECONDARY_PAGE_INHERITANCE = Object\.freeze\(\{[\s\S]*?\n\}\);/)?.[0] || "";
  assert.doesNotMatch(inheritanceSource, /\bagence:\s*Object\.freeze/);
  assert.doesNotMatch(inheritanceSource, /\bcontact:\s*Object\.freeze/);
});
