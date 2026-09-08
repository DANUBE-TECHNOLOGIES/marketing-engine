import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/people/page.js", import.meta.url),
  "utf8"
);

test("team linking requires a server preview and separate explicit approval", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/team-link-preview/);
  assert.match(page, /Préparer les liaisons mini-sites/);
  assert.match(page, /J’approuve explicitement l’écriture des seuls/);
  assert.match(page, /window\.confirm/);
});

test("team linking POST sends only the approval token", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/apply-team-links/);
  assert.match(page, /method:\s*"POST"/);
  assert.match(page, /approvalToken:\s*linkPreview\.approvalToken/);
  assert.doesNotMatch(page, /body:\s*JSON\.stringify\(\{[^}]*blockId:/s);
  assert.doesNotMatch(page, /body:\s*JSON\.stringify\(\{[^}]*knowledgeEntityId:/s);
});

test("UI explains locator, atomic transaction and minimal mutation contract", () => {
  assert.match(page, /blockId \+ collection \+ index/i);
  assert.match(page, /transaction Prisma unique/i);
  assert.match(page, /aucune liaison n’est écrite/i);
  assert.match(page, /Seul knowledgeEntityId est ajouté/i);
  assert.match(page, /sans modifier rôle, bio, image ou expertise/i);
});
