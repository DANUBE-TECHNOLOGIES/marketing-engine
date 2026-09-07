import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registryUrl = new URL(
  "../lib/website-builder/inspector-registry.js",
  import.meta.url
);

async function source() {
  return readFile(registryUrl, "utf8");
}

test("MSE-GEO V1.6 exposes an explicit team members collection", async () => {
  const content = await source();

  const teamBlock = content.match(
    /team:\s*\{[\s\S]*?collection:\s*\{[\s\S]*?key:\s*"members"[\s\S]*?\n\s*\},\n\s*\},/
  )?.[0];

  assert.ok(teamBlock, "team.members collection must exist");

  for (const field of [
    "name",
    "role",
    "bio",
    "imageUrl",
    "knowledgeEntityId",
  ]) {
    assert.match(
      teamBlock,
      new RegExp(`key:\\s*"${field}"`),
      `team member field ${field} must be explicit`
    );
  }
});

test("MSE-GEO V1.6 does not expose free-form expertise or inferred identity fields", async () => {
  const content = await source();
  const teamBlock = content.slice(content.indexOf("  team: {"));

  for (const forbidden of [
    "expertise",
    "specialties",
    "inferredExpertise",
    "generatedSlug",
    "autoMatch",
  ]) {
    assert.equal(
      teamBlock.includes(`key: "${forbidden}"`),
      false,
      `${forbidden} must not be part of the team editor contract`
    );
  }
});
