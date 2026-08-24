"use strict";

const { listPresenceProviders } = require("./provider-registry");
const { directoryDefaultsForProvider } = require("./provider-directory-catalog");
const { auditDirectorySchema } = require("./directory-schema-audit");

function buildCatalogReconciliation(directories = []) {
  const byName = new Map(directories.map((d) => [d.name, d]));
  const creates = [];
  const metadataDrift = [];
  for (const provider of listPresenceProviders()) {
    const expected = directoryDefaultsForProvider(provider.key);
    if (!expected) continue;
    const current = byName.get(expected.name);
    if (!current) {
      creates.push(Object.freeze({ providerKey: provider.key, ...expected }));
      continue;
    }
    const fields = ["website", "category", "impactScore", "difficulty", "priority", "active"];
    const drift = fields.filter((field) => current[field] !== expected[field]).map((field) => ({ field, current: current[field], expected: expected[field] }));
    if (drift.length) metadataDrift.push(Object.freeze({ providerKey: provider.key, directoryId: current.id, directoryName: current.name, drift: Object.freeze(drift) }));
  }
  return Object.freeze({ creates: Object.freeze(creates), metadataDrift: Object.freeze(metadataDrift), summary: Object.freeze({ creates: creates.length, metadataDrift: metadataDrift.length }) });
}

async function applyCatalogReconciliation(prisma, plan, options = {}) {
  const schema = await auditDirectorySchema(prisma);
  if (!schema.ready) { const error = new Error("Schéma directories incomplet pour réconciliation Presence"); error.status = 503; error.schema = schema; throw error; }
  const created = [];
  const updated = [];
  for (const item of plan.creates || []) {
    const directory = await prisma.localDirectory.create({ data: { name: item.name, website: item.website, category: item.category, impactScore: item.impactScore, difficulty: item.difficulty, priority: item.priority, active: true } });
    await prisma.$executeRawUnsafe('UPDATE "LocalDirectory" SET "submissionMode" = $1 WHERE "id" = $2', item.submissionMode, directory.id);
    created.push(directory.id);
  }
  if (options.alignMetadata === true) {
    for (const item of plan.metadataDrift || []) {
      const expected = directoryDefaultsForProvider(item.providerKey);
      await prisma.localDirectory.update({ where: { id: item.directoryId }, data: { website: expected.website, category: expected.category, impactScore: expected.impactScore, difficulty: expected.difficulty, priority: expected.priority, active: expected.active } });
      await prisma.$executeRawUnsafe('UPDATE "LocalDirectory" SET "submissionMode" = $1 WHERE "id" = $2', expected.submissionMode, item.directoryId);
      updated.push(item.directoryId);
    }
  }
  return Object.freeze({ created: Object.freeze(created), updated: Object.freeze(updated) });
}

module.exports = { buildCatalogReconciliation, applyCatalogReconciliation };
