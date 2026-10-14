"use strict";
const { createHash, timingSafeEqual } = require("node:crypto");

/**
 * Optional server-to-server gate for FRAM network administration.
 * Not mounted by default. The caller must supply a trusted, server-resolved
 * tenant ID; client-supplied tenant headers are not authorization.
 */
function createFramAdminAuth({ token, tenantId }) {
  if (typeof token !== "string" || token.length < 32 || !token.trim()) {
    throw new TypeError("FRAM admin secret of at least 32 characters required");
  }
  if (typeof tenantId !== "string" || !tenantId.trim()) {
    throw new TypeError("Server-verified FRAM tenant required");
  }
  const expected = createHash("sha256").update(token).digest();
  return function framAdminAuth(req, res, next) {
    const authorization = req.get?.("authorization");
    if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const candidate = authorization.slice(7);
    if (candidate.length < 32 || candidate.length > 4096) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const actual = createHash("sha256").update(candidate).digest();
    if (!timingSafeEqual(expected, actual)) {
      return res.status(401).json({ error: "Authentication required" });
    }
    req.tenantId = tenantId;
    req.user = { role: "admin", authType: "fram-service-token" };
    req.framAdminAuthenticated = true;
    return next();
  };
}
module.exports = { createFramAdminAuth };
