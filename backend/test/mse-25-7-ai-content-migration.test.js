"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const foundationPath = path.join(
  __dirname,
  "../prisma/migrations/20260731124000_mse_17_1_ai_content_foundation/migration.sql"
);
const servicePath = path.join(
  __dirname,
  "../prisma/migrations/20260731124500_mse_17_2_ai_content_service/migration.sql"
);

const foundation = fs.readFileSync(foundationPath, "utf8");
const service = fs.readFileSync(servicePath, "utf8");

test("MSE-25.7 keeps AI content foundation ordered before MSE-17.2 service migration", () => {
  assert.ok(
    path.basename(path.dirname(foundationPath)) < path.basename(path.dirname(servicePath)),
    "AI content foundation must sort before MSE-17.2"
  );
});

test("MSE-17.1 migration creates the complete AI content foundation", () => {
  assert.match(foundation, /CREATE TABLE "SeoPrompt"/);
  assert.match(foundation, /CREATE TABLE "SeoGenerationJob"/);
  assert.match(foundation, /CREATE TABLE "SeoContent"/);
});

test("MSE-17.1 migration keeps tenant and campaign isolation constraints", () => {
  assert.match(foundation, /SeoPrompt_tenantId_fkey/);
  assert.match(foundation, /SeoGenerationJob_tenantId_fkey/);
  assert.match(foundation, /SeoGenerationJob_campaignId_fkey/);
  assert.match(foundation, /SeoContent_tenantId_fkey/);
  assert.match(foundation, /SeoContent_campaignId_fkey/);
  assert.match(foundation, /SeoContent_generationJobId_fkey/);
});

test("MSE-17.2 migration extends SeoGenerationJob only after foundation exists", () => {
  assert.match(service, /ALTER TABLE "SeoGenerationJob"/);
  assert.match(service, /ADD COLUMN IF NOT EXISTS "attempts"/);
  assert.match(service, /ADD COLUMN IF NOT EXISTS "maxAttempts"/);
  assert.match(service, /ADD COLUMN IF NOT EXISTS "lastAttemptAt"/);
});

test("AI content migrations keep published-catalog and revision indexes", () => {
  assert.match(foundation, /SeoContent_tenantId_status_channel_idx/);
  assert.match(foundation, /SeoContent_tenantId_channel_slug_revision_key/);
  assert.match(foundation, /SeoGenerationJob_tenantId_status_createdAt_idx/);
  assert.match(foundation, /SeoPrompt_tenantId_key_version_key/);
});
