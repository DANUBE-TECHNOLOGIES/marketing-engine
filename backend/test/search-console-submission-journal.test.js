"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DisabledSearchConsoleProvider,
  validateSearchConsoleSubmissionTarget,
} = require("../src/modules/search-console-submission/provider");
const { SearchConsoleSubmissionService } = require("../src/modules/search-console-submission/service");

function fakePrisma() {
  const state = { runs: [], actions: [], events: [] };
  return {
    state,
    seoAutopilotRun: {
      async create({ data }) {
        const record = { id: `run-${state.runs.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.runs.push(record);
        return record;
      },
      async findFirst({ where }) {
        const run = state.runs.find((item) => item.id === where.id && (!where.tenantId || item.tenantId === where.tenantId));
        if (!run) return null;
        return {
          ...run,
          actions: state.actions.filter((item) => item.runId === run.id).sort((a, b) => a.order - b.order),
          auditEvents: state.events.filter((item) => item.runId === run.id),
        };
      },
      async update({ where, data }) {
        const run = state.runs.find((item) => item.id === where.id);
        Object.assign(run, data, { updatedAt: new Date() });
        return run;
      },
    },
    seoAutopilotAction: {
      async createMany({ data }) {
        data.forEach((item) => state.actions.push({ id: `action-${state.actions.length + 1}`, attempts: 0, ...item }));
        return { count: data.length };
      },
      async findFirst({ where }) {
        return state.actions.find((item) => item.id === where.id) || null;
      },
      async update({ where, data }) {
        const action = state.actions.find((item) => item.id === where.id);
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "increment")) {
            action[key] = Number(action[key] || 0) + Number(value.increment || 0);
          } else action[key] = value;
        }
        return action;
      },
    },
    seoAutopilotAuditEvent: {
      async create({ data }) {
        const event = { id: `event-${state.events.length + 1}`, createdAt: new Date(), ...data };
        state.events.push(event);
        return event;
      },
    },
  };
}

function structuredDataService() {
  return {
    repository: {
      async findSiteBySlug(slug) { return { id: "site-1", slug }; },
    },
    async siteSitemapCandidate({ siteSlug }) {
      return {
        siteSlug,
        readyToSubmit: true,
        entryCount: 5,
        readiness: { siteSlug, readyToSubmit: true, blockers: [], warnings: [] },
      };
    },
  };
}

test("validates explicit Search Console property and HTTPS sitemap URL", () => {
  assert.deepEqual(
    validateSearchConsoleSubmissionTarget({ siteUrl: "sc-domain:agences.example.test", sitemapUrl: "https://agences.example.test/sitemap.xml" }),
    { siteUrl: "sc-domain:agences.example.test", sitemapUrl: "https://agences.example.test/sitemap.xml" }
  );
  assert.throws(() => validateSearchConsoleSubmissionTarget({ siteUrl: "x", sitemapUrl: "http://example.test/sitemap.xml" }), /HTTPS/);
});

test("prepare and approve are journaled before any external submission", async () => {
  const prisma = fakePrisma();
  const service = new SearchConsoleSubmissionService({ prisma, structuredDataService: structuredDataService() });
  const prepared = await service.prepare({
    tenantId: "tenant-1",
    siteSlug: "gien",
    siteUrl: "sc-domain:agences.example.test",
    sitemapUrl: "https://agences.example.test/gien-sitemap.xml",
    requestedBy: "nicolas",
  });

  assert.equal(prepared.status, "awaiting_approval");
  assert.equal(prepared.actions[0].status, "awaiting_approval");
  assert.equal(prepared.actions[0].payload.siteSlug, "gien");
  assert.ok(prepared.auditEvents.some((event) => event.eventType === "search-console-submission-prepared"));

  const approved = await service.approve({ tenantId: "tenant-1", runId: prepared.id, approvedBy: "nicolas" });
  assert.equal(approved.status, "approved");
  assert.equal(approved.actions[0].status, "approved");
  assert.ok(approved.auditEvents.some((event) => event.eventType === "search-console-submission-approved"));
});

test("disabled provider blocks submit and records the attempt", async () => {
  const prisma = fakePrisma();
  const service = new SearchConsoleSubmissionService({
    prisma,
    structuredDataService: structuredDataService(),
    provider: new DisabledSearchConsoleProvider(),
  });
  const prepared = await service.prepare({
    tenantId: "tenant-1",
    siteSlug: "gien",
    siteUrl: "sc-domain:agences.example.test",
    sitemapUrl: "https://agences.example.test/gien-sitemap.xml",
  });
  await service.approve({ tenantId: "tenant-1", runId: prepared.id, approvedBy: "admin" });

  await assert.rejects(
    service.submit({ tenantId: "tenant-1", runId: prepared.id }),
    (error) => error.code === "SEARCH_CONSOLE_PROVIDER_NOT_CONFIGURED" && error.statusCode === 503
  );
  const run = await service.get({ tenantId: "tenant-1", runId: prepared.id });
  assert.equal(run.status, "approved");
  assert.ok(run.auditEvents.some((event) => event.eventType === "search-console-provider-not-configured"));
});