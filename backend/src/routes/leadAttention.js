"use strict";

const express = require("express");

function clampHours(value) {
  const parsed = Number(value || 4);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(Math.max(parsed, 1), 168);
}

module.exports = function createLeadAttentionRoutes(prisma) {
  const router = express.Router();

  router.get("/api/leads/attention", async (req, res) => {
    try {
      const hours = clampHours(req.query.hours);

      const overdue = await prisma.$queryRaw`
        SELECT
          l."id",
          l."agencyId",
          l."siteSlug",
          l."projectType",
          l."name",
          l."phone",
          l."email",
          l."destination",
          l."createdAt",
          ROUND((EXTRACT(EPOCH FROM (NOW() - l."createdAt")) / 3600.0)::numeric, 1) AS "ageHours",
          a."name" AS "agencyName",
          a."city" AS "agencyCity"
        FROM "PublicLead" l
        LEFT JOIN "Agency" a ON a."id" = l."agencyId"
        WHERE l."status" = 'NEW'
          AND l."contactedAt" IS NULL
          AND l."createdAt" <= NOW() - (${hours} * INTERVAL '1 hour')
        ORDER BY l."createdAt" ASC
        LIMIT 100
      `;

      const agencies = await prisma.$queryRaw`
        SELECT
          l."agencyId",
          COALESCE(a."name", l."siteSlug") AS "agencyName",
          COALESCE(a."city", '') AS "agencyCity",
          COUNT(*)::int AS "overdue"
        FROM "PublicLead" l
        LEFT JOIN "Agency" a ON a."id" = l."agencyId"
        WHERE l."status" = 'NEW'
          AND l."contactedAt" IS NULL
          AND l."createdAt" <= NOW() - (${hours} * INTERVAL '1 hour')
        GROUP BY l."agencyId", a."name", a."city", l."siteSlug"
        ORDER BY COUNT(*) DESC, COALESCE(a."city", '') ASC
      `;

      return res.json({
        ok: true,
        slaHours: hours,
        overdueCount: overdue.length,
        overdue: overdue.map((lead) => ({
          ...lead,
          ageHours: Number(lead.ageHours || 0),
        })),
        agencies,
      });
    } catch (error) {
      console.error("[leads] attention failed", error);
      return res.status(500).json({ ok: false, error: "LEADS_ATTENTION_FAILED" });
    }
  });

  return router;
};
