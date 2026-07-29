"use strict";

const crypto = require("node:crypto");
const { auditPage } = require("./audit");
const { createSnapshot, restoreData } = require("./snapshot");
const { assertTransition, stateToPageData, STATES } = require("./workflow");

function hashSnapshot(snapshot) {
  return crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function createPublicationService(prisma) {
  if (!prisma) throw new Error("Publication Engine requires Prisma.");

  async function loadPage(pageId) {
    const page = await prisma.agencySitePage.findUnique({
      where: { id: pageId },
      include: { sections: { orderBy: { displayOrder: "asc" } }, site: true },
    });
    if (!page) { const error = new Error("Page introuvable."); error.statusCode = 404; throw error; }
    return page;
  }

  async function saveVersion(tx, page, { actor = null, reason = null, source = "manual" } = {}) {
    const latest = await tx.pagePublicationVersion.findFirst({ where: { pageId: page.id }, orderBy: { version: "desc" }, select: { version: true } });
    const snapshot = createSnapshot(page);
    return tx.pagePublicationVersion.create({
      data: { pageId: page.id, version: (latest?.version || 0) + 1, status: page.status, snapshot, checksum: hashSnapshot(snapshot), actor, reason, source },
    });
  }

  async function event(tx, pageId, type, fromStatus, toStatus, metadata, actor) {
    return tx.pagePublicationEvent.create({ data: { pageId, type, fromStatus, toStatus, metadata: metadata || undefined, actor } });
  }

  async function transition(pageId, target, options = {}) {
    const page = await loadPage(pageId);
    const movement = assertTransition(page.status, target, { force: Boolean(options.force) });
    const audit = auditPage(page, { baseUrl: options.baseUrl });
    if (target === STATES.PUBLISHED && !audit.passed && !options.force) {
      const error = new Error("Publication bloquée par l'audit SEO."); error.statusCode = 422; error.details = audit; throw error;
    }
    if (movement.noop) return { page, audit, transition: movement, version: null };
    return prisma.$transaction(async (tx) => {
      const version = await saveVersion(tx, page, options);
      const updated = await tx.agencySitePage.update({ where: { id: pageId }, data: stateToPageData(target) });
      await tx.agencySiteSection.updateMany({ where: { pageId }, data: { status: target === STATES.PUBLISHED ? "published" : target } });
      await event(tx, pageId, target === STATES.PUBLISHED ? "publish" : "transition", page.status, target, { auditScore: audit.score, version: version.version }, options.actor || null);
      return { page: updated, audit, transition: movement, version };
    });
  }

  async function rollback(pageId, versionNumber, options = {}) {
    const current = await loadPage(pageId);
    const version = await prisma.pagePublicationVersion.findUnique({ where: { pageId_version: { pageId, version: Number(versionNumber) } } });
    if (!version) { const error = new Error("Version introuvable."); error.statusCode = 404; throw error; }
    const restored = restoreData(version.snapshot);
    return prisma.$transaction(async (tx) => {
      const safetyVersion = await saveVersion(tx, current, { ...options, reason: options.reason || `Sauvegarde avant retour à la version ${versionNumber}`, source: "rollback-safety" });
      await tx.agencySiteSection.deleteMany({ where: { pageId } });
      if (restored.sections.length) await tx.agencySiteSection.createMany({ data: restored.sections.map((section) => ({ ...section, pageId })) });
      const page = await tx.agencySitePage.update({ where: { id: pageId }, data: restored.page });
      await event(tx, pageId, "rollback", current.status, restored.page.status, { restoredVersion: Number(versionNumber), safetyVersion: safetyVersion.version }, options.actor || null);
      return { page, restoredVersion: Number(versionNumber), safetyVersion: safetyVersion.version };
    });
  }

  async function schedule(pageId, input = {}) {
    const page = await loadPage(pageId);
    const action = input.action === "unpublish" ? "unpublish" : "publish";
    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) { const error = new Error("La date planifiée doit être valide et future."); error.statusCode = 400; throw error; }
    return prisma.pagePublicationSchedule.create({ data: { pageId, action, scheduledAt, status: "scheduled", actor: input.actor || null, options: input.options || undefined } });
  }

  async function runDue({ limit = 50 } = {}) {
    const schedules = await prisma.pagePublicationSchedule.findMany({ where: { status: "scheduled", scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: "asc" }, take: Math.min(Math.max(Number(limit) || 50, 1), 200) });
    const results = [];
    for (const item of schedules) {
      try {
        await transition(item.pageId, item.action === "publish" ? STATES.PUBLISHED : STATES.UNPUBLISHED, { ...(item.options || {}), actor: item.actor, source: "schedule" });
        await prisma.pagePublicationSchedule.update({ where: { id: item.id }, data: { status: "completed", executedAt: new Date() } });
        results.push({ id: item.id, ok: true });
      } catch (error) {
        await prisma.pagePublicationSchedule.update({ where: { id: item.id }, data: { status: "failed", executedAt: new Date(), error: error.message } });
        results.push({ id: item.id, ok: false, error: error.message });
      }
    }
    return { processed: results.length, succeeded: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length, results };
  }

  return { loadPage, audit: async (id, options) => auditPage(await loadPage(id), options), transition, rollback, schedule, runDue };
}

module.exports = { createPublicationService, hashSnapshot };
