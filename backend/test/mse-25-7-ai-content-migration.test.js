"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.join(
    __dirname,
    "../prisma/migrations/20260809220000_mse_25_7_ai_content_foundation/migration.sql"
  ),
  "utf8"
);

test("MSE-25.7 migration creates the complete AI content foundation", () => {
  assert.match(migration, /CREATE TABLE "SeoPrompt"/);
  assert.match(migration, /CREATE TABLE "SeoGenerationJob"/);
  assert.match(migration, /CREATE TABLE "SeoContent"/);
});

test("MSE-25.7 migration keeps tenant and campaign isolation constraints", () => {
  assert.match(migration, /SeoPrompt_tenantId_fkey/);
  assert.match(migration, /SeoGenerationJob_tenantId_fkey/);
  assert.match(migration, /SeoGenerationJob_campaignId_fkey/);
  assert.match(migration, /SeoContent_tenantId_fkey/);
  assert.match(migration, /SeoContent_campaignId_fkey/);
  assert.match(migration, /SeoContent_generationJobId_fkey/);
});

test("MSE-25.7 migration creates published-catalog and revision indexes", () => {
  assert.match(migration, /SeoContent_tenantId_status_channel_idx/);
  assert.match(migration, /SeoContent_tenantId_channel_slug_revision_key/);
  assert.match(migration, /SeoGenerationJob_tenantId_status_createdAt_idx/);
  assert.match(migration, /SeoPrompt_tenantId_key_version_key/);
});
