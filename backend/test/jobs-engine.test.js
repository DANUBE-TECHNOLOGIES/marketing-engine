"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { JobRegistry } = require("../src/modules/jobs-engine/registry");
const { createJobsService } = require("../src/modules/jobs-engine/service");

function fakePrisma() {
  const jobs = [];
  let seq = 0;
  const model = {
    async create({ data }) { const row = { id: `job-${++seq}`, attempts: 0, createdAt: new Date(), updatedAt: new Date(), ...data }; jobs.push(row); return { ...row }; },
    async findFirst({ where = {}, orderBy }) {
      let rows = jobs.filter((j) => !where.status || (where.status.in ? where.status.in.includes(j.status) : j.status === where.status));
      if (where.dedupeKey) rows = rows.filter((j) => j.dedupeKey === where.dedupeKey);
      if (where.runAt?.lte) rows = rows.filter((j) => new Date(j.runAt) <= where.runAt.lte);
      if (orderBy) rows.sort((a,b) => a.priority-b.priority || new Date(a.runAt)-new Date(b.runAt));
      return rows[0] ? { ...rows[0] } : null;
    },
    async findUnique({ where }) { const row = jobs.find((j) => j.id === where.id); return row ? { ...row } : null; },
    async updateMany({ where, data }) { const row = jobs.find((j) => j.id === where.id && j.status === where.status); if (!row) return { count: 0 }; Object.assign(row, data, { attempts: row.attempts + (data.attempts?.increment || 0) }); delete row.attempts?.increment; return { count: 1 }; },
    async update({ where, data }) { const row = jobs.find((j) => j.id === where.id); Object.assign(row, data, { updatedAt: new Date() }); return { ...row }; },
  };
  return { backgroundJob: model, $transaction: async (fn) => fn({ backgroundJob: model }), jobs };
}

test("registry registers and executes handlers", async () => {
  const registry = new JobRegistry().register("system.echo", async ({ payload }) => payload);
  assert.deepEqual(await registry.execute("system.echo", { payload: { ok: true } }), { ok: true });
});

test("enqueue creates a queued job", async () => {
  const prisma = fakePrisma();
  const registry = new JobRegistry().register("system.echo", async () => ({}));
  const service = createJobsService(prisma, registry, { now: () => new Date("2026-07-29T10:00:00Z") });
  const result = await service.enqueue({ type: "system.echo", payload: { a: 1 } });
  assert.equal(result.job.status, "queued");
  assert.equal(result.job.maxAttempts, 3);
});

test("dedupe returns existing queued job", async () => {
  const prisma = fakePrisma();
  const registry = new JobRegistry().register("system.echo", async () => ({}));
  const service = createJobsService(prisma, registry);
  await service.enqueue({ type: "system.echo", dedupeKey: "daily" });
  const second = await service.enqueue({ type: "system.echo", dedupeKey: "daily" });
  assert.equal(second.deduplicated, true);
  assert.equal(prisma.jobs.length, 1);
});

test("runOne completes a successful job", async () => {
  const prisma = fakePrisma();
  const registry = new JobRegistry().register("system.echo", async ({ payload }) => ({ echoed: payload }));
  const service = createJobsService(prisma, registry, { now: () => new Date("2026-07-29T10:00:00Z") });
  await service.enqueue({ type: "system.echo", payload: { hello: "world" } });
  const result = await service.runOne();
  assert.equal(result.ok, true);
  assert.equal(result.job.status, "succeeded");
});

test("failed job is retried then dead after max attempts", async () => {
  const prisma = fakePrisma();
  const registry = new JobRegistry().register("system.fail", async () => { throw new Error("boom"); });
  let current = new Date("2026-07-29T10:00:00Z");
  const service = createJobsService(prisma, registry, { now: () => current });
  await service.enqueue({ type: "system.fail", maxAttempts: 2, retryDelaySeconds: 1 });
  const first = await service.runOne();
  assert.equal(first.job.status, "queued");
  current = new Date("2026-07-29T10:00:02Z");
  const second = await service.runOne();
  assert.equal(second.job.status, "dead");
});
