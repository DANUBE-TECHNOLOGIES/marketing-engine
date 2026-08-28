"use strict";

const crypto = require("node:crypto");
const express = require("express");

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters";
const SEARCH_CONSOLE_PROVIDER = "search-console";
const STATE_TTL_MS = 10 * 60 * 1000;

function getRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || "https://localengine.mondescale.com/api/google/callback";
}

function stateSecret() {
  return process.env.SEARCH_CONSOLE_OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
}

function createState(now = Date.now()) {
  const secret = stateSecret();
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET manquant pour signer le state OAuth Search Console");
  const payload = Buffer.from(JSON.stringify({ provider: SEARCH_CONSOLE_PROVIDER, ts: now })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyState(state, now = Date.now()) {
  const secret = stateSecret();
  if (!secret || !state || !String(state).includes(".")) return false;
  const [payload, sig] = String(state).split(".", 2);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.provider === SEARCH_CONSOLE_PROVIDER && Number.isFinite(parsed.ts) && now - parsed.ts >= 0 && now - parsed.ts <= STATE_TTL_MS;
  } catch (_) {
    return false;
  }
}

function buildAuthorizationUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getRedirectUri();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID manquant");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SEARCH_CONSOLE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "false");
  url.searchParams.set("state", createState());
  return url.toString();
}

function createSearchConsoleOAuthRoutes(prisma, { fetchImpl = fetch } = {}) {
  const router = express.Router();

  router.get(["/search-console/auth", "/api/search-console/auth"], (req, res) => {
    try {
      return res.redirect(buildAuthorizationUrl());
    } catch (error) {
      return res.status(500).json({ ok: false, error: "SEARCH_CONSOLE_OAUTH_NOT_READY", message: error.message });
    }
  });

  router.get(["/google/callback", "/api/google/callback"], async (req, res, next) => {
    if (!verifyState(req.query.state)) return next();

    try {
      if (req.query.error) return res.status(400).send(`Erreur OAuth Search Console : ${req.query.error}`);
      if (!req.query.code) return res.status(400).send("Code OAuth Search Console manquant");

      const body = new URLSearchParams({
        code: String(req.query.code),
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
      });

      const tokenRes = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({ ok: false, error: "SEARCH_CONSOLE_TOKEN_EXCHANGE_FAILED", google: tokenData });
      }
      if (!tokenData.refresh_token) {
        return res.status(400).send("Google n'a pas renvoyé de refresh_token Search Console. Révoquez l'autorisation précédente puis recommencez le consentement.");
      }

      const expiryDate = BigInt(Date.now() + Number(tokenData.expires_in || 3600) * 1000);
      await prisma.$transaction(async (tx) => {
        await tx.googleToken.deleteMany({ where: { provider: SEARCH_CONSOLE_PROVIDER } });
        await tx.googleToken.create({
          data: {
            provider: SEARCH_CONSOLE_PROVIDER,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiryDate,
          },
        });
      });

      return res.send(`<!doctype html><html><body style="font-family:Arial;padding:40px"><h2>Search Console connectée</h2><p>Le jeton Search Console a été enregistré séparément du token Google Business. Les écritures restent soumises aux gardes et à l'approbation explicite du cockpit.</p><p>Vous pouvez fermer cette fenêtre et retourner dans Local Engine.</p></body></html>`);
    } catch (error) {
      return res.status(500).json({ ok: false, error: "SEARCH_CONSOLE_OAUTH_CALLBACK_FAILED", message: error.message });
    }
  });

  router.get(["/search-console/token-status", "/api/search-console/token-status"], async (req, res) => {
    try {
      const token = await prisma.googleToken.findFirst({ where: { provider: SEARCH_CONSOLE_PROVIDER }, orderBy: { createdAt: "desc" } });
      return res.json({
        ok: true,
        provider: SEARCH_CONSOLE_PROVIDER,
        exists: Boolean(token),
        hasAccessToken: Boolean(token?.accessToken),
        hasRefreshToken: Boolean(token?.refreshToken),
        expiryDate: token?.expiryDate ? String(token.expiryDate) : null,
        expired: token?.expiryDate ? Number(token.expiryDate) < Date.now() : true,
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "SEARCH_CONSOLE_TOKEN_STATUS_FAILED", message: error.message });
    }
  });

  return router;
}

module.exports = {
  SEARCH_CONSOLE_SCOPE,
  SEARCH_CONSOLE_PROVIDER,
  STATE_TTL_MS,
  createState,
  verifyState,
  buildAuthorizationUrl,
  createSearchConsoleOAuthRoutes,
};
