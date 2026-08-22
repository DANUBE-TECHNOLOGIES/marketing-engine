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
  assert.match(api, /Generated Team placeholders often carry descriptive copy/);
  assert.doesNotMatch(
    api.match(/function\s+teamMemberIsMeaningful[\s\S]*?\n\}/)?.[0] || "",
    /member\.description|member\.bio/
  );
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
  assert.match(api, /contract\.family !== "team" \|\| teamBlockHasMembers\(targetBlocks\[targetIndex\]\)/);
  assert.match(api, /return page;/);
});
