"use strict";

const express = require("express");
const { listPendingPropagation } = require("./propagation-watch");
const { buildPropagationAlerts } = require("./propagation-alerts");

async function syncPropagationNotifications(prisma, alertPlan) {
  const activeAgencyIds = new Set(alertPlan.alerts.map((alert) => alert.agencyId));
  const open = await prisma.notification.findMany({
    where: { type: "presence_propagation", status: "open" }
  });
  let created = 0;
  let updated = 0;
  let resolved = 0;

  for (const alert of alertPlan.alerts) {
    const existing = open.find((item) => item.agencyId === alert.agencyId);
    const message = `${alert.providerKey}: propagation ${alert.severity}; attente ${Math.round((alert.ageMs || 0) / 3600000)} h; listing ${alert.listingId}.`;
    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: { level: alert.level, title: alert.title, message, link: "/presence/propagation" }
      });
      updated += 1;
    } else {
      await prisma.notification.create({
        data: {
          agencyId: alert.agencyId,
          type: "presence_propagation",
          level: alert.level,
          title: alert.title,
          message,
          status: "open",
          link: "/presence/propagation"
        }
      });
      created += 1;
    }
  }

  for (const notification of open) {
    if (activeAgencyIds.has(notification.agencyId)) continue;
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "resolved", message: `${notification.message} Résolu par Presence.` }
    });
    resolved += 1;
  }

  return { created, updated, resolved };
}

function propagationAlertRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/propagation/alerts", async (req, res) => {
    try {
      const rows = await listPendingPropagation(prisma, { limit: req.query.limit });
      const plan = buildPropagationAlerts(rows, {
        providerKey: "google_business_profile",
        warnAfterMs: req.query.warnAfterMs,
        staleAfterMs: req.query.staleAfterMs,
        criticalAfterMs: req.query.criticalAfterMs
      });
      return res.json({ ok: true, persisted: false, ...plan });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/propagation/alerts/sync", async (req, res) => {
    try {
      if (req.body?.confirm !== true) {
        return res.status(409).json({ ok: false, error: "confirm=true requis pour synchroniser les notifications Presence" });
      }
      const rows = await listPendingPropagation(prisma, { limit: req.body?.limit });
      const plan = buildPropagationAlerts(rows, {
        providerKey: "google_business_profile",
        warnAfterMs: req.body?.warnAfterMs,
        staleAfterMs: req.body?.staleAfterMs,
        criticalAfterMs: req.body?.criticalAfterMs
      });
      const sync = await syncPropagationNotifications(prisma, plan);
      return res.json({ ok: true, persisted: true, plan, sync });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { propagationAlertRoutes, syncPropagationNotifications };
