"use strict";

const express = require("express");
const { listOperationAudit } = require("./operation-audit");
const { remediationRisk } = require("./google-remediation");

function operationRetryRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/operations/:operationId/retry-preview", async (req, res) => {
    try {
      const events = await listOperationAudit(prisma, { operationId: req.params.operationId, limit: 100 });
      if (!events.length) return res.status(404).json({ ok: false, error: "Opération Presence introuvable" });
      const failed = events.find((event) => event.status === "failed");
      if (!failed) return res.status(409).json({ ok: false, error: "Cette opération n'est pas en échec" });
      if (failed.providerKey !== "google_business_profile") return res.status(409).json({ ok: false, error: "Retry automatique non supporté pour ce provider" });
      const drift = Array.isArray(failed.payload?.drift) ? failed.payload.drift : [];
      if (!drift.length) return res.status(409).json({ ok: false, error: "Impossible de reconstruire la dérive à rejouer" });
      const risk = remediationRisk(drift);
      return res.json({
        ok: true,
        externalWrite: false,
        retryEligible: true,
        originalOperationId: failed.operationId,
        agencyId: failed.agencyId,
        providerKey: failed.providerKey,
        drift,
        risk,
        execute: {
          method: "POST",
          path: `/api/presence/agencies/${failed.agencyId}/google/remediation/execute`,
          body: { confirm: true, confirmSensitive: risk.requiresSensitiveConfirmation, drift }
        }
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { operationRetryRoutes };
