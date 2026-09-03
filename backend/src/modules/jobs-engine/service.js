"use strict";

const crypto = require("node:crypto");
const { JOB_STATUS, DEFAULTS } = require("./constants");

function asDate(value, fallback = new Date()) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error("Date de job invalide.");
    error.statusCode = 400;
    throw error;
  }
  return date;
}

function createJobsService(prisma, registry, options = {}) {
  if (!prisma) throw new Error("Jobs Engine requires Prisma.");
  if (!registry) throw new Error("Jobs Engine requires a registry.");

  const now = options.now || (() => new Date());
  const workerId = options.workerId || `worker-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

  async function enqueue(input = {}) {
    const type = String(input.type || "").trim();
    if (!type) { const error = new Error("Le type de job est obligatoire."); error.statusCode = 400; throw error; }
    if (!registry.has(type) && !input.allowUnknownType) {
      const error = new Error(`Type de job non pris en charge: ${type}.`); error.statusCode = 400; throw error;
    }
    const runAt = asDate(input.runAt, now());
    const maxAttempts = Math.max(1, Math.min(Number(input.maxAttempts || DEFAULTS.maxAttempts), 20));
    const retryDelaySeconds = Math.max(1, Math.min(Number(input.retryDelaySeconds || DEFAULTS.retryDelaySeconds), 86400));
    const dedupeKey = input.dedupeKey ? String(input.dedupeKey) : null;

    if (dedupeKey) {
      const existing = await prisma.backgroundJob.findFirst({
        where: { dedupeKey, status: { in: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING] } },
        orderBy: { createdAt: "desc" },
      });
      if (existing) return { job: existing, deduplicated: true };
    }

    const job = await prisma.backgroundJob.create({
      data: {
        type,
        payload: input.payload || {},
        status: JOB_STATUS.QUEUED,
        priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : 100,
        runAt,
        maxAttempts,
        retryDelaySeconds,
        dedupeKey,
        createdBy: input.createdBy || null,
        metadata: input.metadata || undefined,
      },
    });
    return { job, deduplicated: false };
  }

  async function claimNext() {
    const leaseUntil = new Date(now().getTime() + (options.leaseSeconds || DEFAULTS.leaseSeconds) * 1000);
    return prisma.$transaction(async (tx) => {
      const candidate = await tx.backgroundJob.findFirst({
        where: {
          status: JOB_STATUS.QUEUED,
          runAt: { lte: now() },
          OR: [{ lockedUntil: null }, { lockedUntil: { lt: now() } }],
        },
        orderBy: [{ priority: "asc" }, { runAt: "asc" }, { createdAt: "asc" }],
      });
      if (!candidate) return null;
      const claimed = await tx.backgroundJob.updateMany({
        where: { id: candidate.id, status: JOB_STATUS.QUEUED },
        data: {
          status: JOB_STATUS.RUNNING,
          lockedBy: workerId,
          lockedUntil: leaseUntil,
          startedAt: candidate.startedAt || now(),
          attempts: { increment: 1 },
        },
      });
      if (!claimed.count) return null;
      return tx.backgroundJob.findUnique({ where: { id: candidate.id } });
    });
  }

  async function complete(job, result) {
    return prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: JOB_STATUS.SUCCEEDED,
        result: result === undefined ? {} : result,
        finishedAt: now(),
        lockedBy: null,
        lockedUntil: null,
        lastError: null,
      },
    });
  }

  async function fail(job, error) {
    const attempts = Number(job.attempts || 1);
    const maxAttempts = Number(job.maxAttempts || DEFAULTS.maxAttempts);
    const exhausted = attempts >= maxAttempts;
    const delay = Number(job.retryDelaySeconds || DEFAULTS.retryDelaySeconds) * Math.max(attempts, 1);
    return prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? JOB_STATUS.DEAD : JOB_STATUS.QUEUED,
        runAt: exhausted ? job.runAt : new Date(now().getTime() + delay * 1000),
        finishedAt: exhausted ? now() : null,
        lockedBy: null,
        lockedUntil: null,
        lastError: String(error?.stack || error?.message || error).slice(0, 8000),
      },
    });
  }

  async function runOne() {
    const job = await claimNext();
    if (!job) return { processed: false, workerId };
    try {
      const result = await registry.execute(job.type, { job, payload: job.payload || {}, prisma, service: api });
      const updated = await complete(job, result);
      return { processed: true, ok: true, job: updated, workerId };
    } catch (error) {
      const updated = await fail(job, error);
      return { processed: true, ok: false, job: updated, error: error.message, workerId };
    }
  }

  async function runDue({ limit = 20 } = {}) {
    const bounded = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const results = [];
    for (let i = 0; i < bounded; i += 1) {
      const result = await runOne();
      if (!result.processed) break;
      results.push(result);
    }
    return {
      workerId,
      processed: results.length,
      succeeded: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };
  }

  async function retry(id) {
    const job = await prisma.backgroundJob.findUnique({ where: { id } });
    if (!job) { const error = new Error("Job introuvable."); error.statusCode = 404; throw error; }
    if (![JOB_STATUS.FAILED, JOB_STATUS.DEAD, JOB_STATUS.CANCELLED].includes(job.status)) {
      const error = new Error(`Le job ${id} ne peut pas être relancé depuis le statut ${job.status}.`); error.statusCode = 409; throw error;
    }
    return prisma.backgroundJob.update({ where: { id }, data: { status: JOB_STATUS.QUEUED, runAt: now(), finishedAt: null, lastError: null, lockedBy: null, lockedUntil: null } });
  }

  async function cancel(id) {
    const job = await prisma.backgroundJob.findUnique({ where: { id } });
    if (!job) { const error = new Error("Job introuvable."); error.statusCode = 404; throw error; }
    if ([JOB_STATUS.SUCCEEDED, JOB_STATUS.DEAD].includes(job.status)) {
      const error = new Error(`Le job ${id} ne peut plus être annulé.`); error.statusCode = 409; throw error;
    }
    return prisma.backgroundJob.update({ where: { id }, data: { status: JOB_STATUS.CANCELLED, finishedAt: now(), lockedBy: null, lockedUntil: null } });
  }

  const api = { enqueue, claimNext, runOne, runDue, retry, cancel, workerId };
  return api;
}

module.exports = { createJobsService, asDate };
