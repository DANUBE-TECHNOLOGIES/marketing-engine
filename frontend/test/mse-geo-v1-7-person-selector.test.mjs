import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  fetchPublishedPersonKnowledge,
  normalizePublishedPersonEntities,
  publishedPersonKnowledgeUrl,
} from "../lib/website-builder/knowledge-person-selector.js";

test("Person selector URL is strictly filtered to published person entities", () => {
  const url = publishedPersonKnowledgeUrl({ pageSize: 42 });

  assert.match(url, /^\/api\/knowledge\?/);
  assert.match(url, /type=person/);
  assert.match(url, /status=published/);
  assert.match(url, /page=1/);
  assert.match(url, /pageSize=42/);
});

test("normalizer rejects draft and non-person entities and deduplicates by explicit id", () => {
  const result = normalizePublishedPersonEntities({
    data: [
      { id: "p1", type: "person", status: "published", title: "Anisia", slug: "anisia" },
      { id: "p1", type: "person", status: "published", title: "Duplicate" },
      { id: "p2", type: "person", status: "draft", title: "Draft" },
      { id: "e1", type: "expertise", status: "published", title: "Croisières" },
      { id: "", type: "person", status: "published", title: "No id" },
    ],
  });

  assert.deepEqual(result, [
    { id: "p1", title: "Anisia", slug: "anisia" },
  ]);
});

test("fetcher preserves safe failure when Knowledge is unavailable", async () => {
  await assert.rejects(
    () =>
      fetchPublishedPersonKnowledge({
        fetchImpl: async () => ({
          ok: false,
          json: async () => ({
            error: { message: "Knowledge indisponible" },
          }),
        }),
      }),
    /Knowledge indisponible/
  );
});

test("fetcher returns only published Person options and never creates a match", async () => {
  let requestedUrl = null;

  const result = await fetchPublishedPersonKnowledge({
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          data: [
            { id: "p1", type: "person", status: "published", title: "Anisia" },
            { id: "p2", type: "person", status: "review", title: "Review Person" },
          ],
        }),
      };
    },
  });

  assert.match(requestedUrl, /type=person/);
  assert.match(requestedUrl, /status=published/);
  assert.deepEqual(result, [
    { id: "p1", title: "Anisia", slug: null },
  ]);
});

test("selector UI preserves explicit ids and requires an explicit user change", () => {
  const source = fs.readFileSync(
    new URL("../components/website-builder/KnowledgePersonSelect.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /Aucune liaison Knowledge/);
  assert.match(source, /Liaison existante/);
  assert.match(source, /onChange\(event\.target\.value\)/);
  assert.match(source, /fetchPublishedPersonKnowledge/);
  assert.doesNotMatch(source, /autoMatch|generatedSlug|selectedIndex\s*=|defaultValue\s*=\s*people/);
});
