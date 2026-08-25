const express = require("express");

const BUSINESS_SCOPE = "https://www.googleapis.com/auth/business.manage";
const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SEARCH_CONSOLE_STATE = "mse-25.48-search-console";

function buildAuthUrl({ clientId, redirectUri, scope, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function resolveProvider(state) {
  return state === SEARCH_CONSOLE_STATE ? "search-console" : "google";
}

module.exports = function createGoogleOAuthRoutes(prisma) {
  const router = express.Router();

  function getRedirectUri() {
    return process.env.GOOGLE_REDIRECT_URI || "https://localengine.mondescale.com/api/google/callback";
  }

  function requireOAuthClient(res) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      res.status(500).send("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ou GOOGLE_REDIRECT_URI manquant");
      return null;
    }
    return { clientId, clientSecret, redirectUri };
  }

  router.get(["/google/auth", "/api/google/auth"], async (_req, res) => {
    const oauth = requireOAuthClient(res);
    if (!oauth) return;
    res.redirect(buildAuthUrl({ clientId: oauth.clientId, redirectUri: oauth.redirectUri, scope: BUSINESS_SCOPE }));
  });

  router.get(["/search-console/auth", "/api/search-console/auth"], async (_req, res) => {
    const oauth = requireOAuthClient(res);
    if (!oauth) return;
    res.redirect(buildAuthUrl({
      clientId: oauth.clientId,
      redirectUri: oauth.redirectUri,
      scope: SEARCH_CONSOLE_SCOPE,
      state: SEARCH_CONSOLE_STATE,
    }));
  });

  router.get([
    "/google/callback",
    "/api/google/callback",
    "/google-business-status",
    "/google-business-statuts",
    "/google-buisness-status",
    "/google-buisness-statuts"
  ], async (req, res) => {
    try {
      const code = req.query.code;
      const oauthError = req.query.error;
      const provider = resolveProvider(req.query.state);

      if (oauthError) return res.status(400).send(`Erreur OAuth Google : ${oauthError}`);
      if (!code) return res.status(400).send("Code OAuth manquant");

      const oauth = requireOAuthClient(res);
      if (!oauth) return;

      const body = new URLSearchParams({
        code,
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        redirect_uri: oauth.redirectUri,
        grant_type: "authorization_code"
      });

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({ error: "Erreur échange code OAuth", google: tokenData, redirectUri: oauth.redirectUri });
      }
      if (!tokenData.refresh_token) {
        return res.status(400).send("Connexion Google reçue sans refresh_token. Révoquez l'accès de l'application puis relancez l'autorisation.");
      }

      const expiryDate = Date.now() + Number(tokenData.expires_in || 3600) * 1000;
      await prisma.googleToken.deleteMany({ where: { provider } });
      await prisma.googleToken.create({
        data: {
          provider,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiryDate: BigInt(expiryDate)
        }
      });

      if (provider === "search-console") {
        return res.send(`<html><body style="font-family:Arial;padding:40px"><h2>Connexion Google Search Console réussie</h2><p>Le token de lecture Search Console a été enregistré séparément du token Google Business.</p><p>Vous pouvez retourner dans Local Engine.</p></body></html>`);
      }

      return res.send(`<html><body style="font-family:Arial;padding:40px"><h2>Connexion Google Business réussie</h2><p>Le refresh token Google Business a bien été enregistré.</p><p>Vous pouvez retourner dans Local Engine.</p></body></html>`);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  async function refreshAccessToken() {
    const token = await prisma.googleToken.findFirst({ where: { provider: "google" }, orderBy: { createdAt: "desc" } });
    if (!token || !token.refreshToken) throw new Error("Aucun refresh token Google disponible");

    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token"
    });
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const data = await refreshRes.json();
    if (!refreshRes.ok) throw new Error(`Erreur refresh token Google : ${JSON.stringify(data)}`);

    const expiryDate = Date.now() + Number(data.expires_in || 3600) * 1000;
    const updated = await prisma.googleToken.update({
      where: { id: token.id },
      data: { accessToken: data.access_token, expiryDate: BigInt(expiryDate) }
    });
    return updated.accessToken;
  }

  router.get("/google/token-status", async (_req, res) => {
    try {
      const token = await prisma.googleToken.findFirst({ where: { provider: "google" }, orderBy: { createdAt: "desc" } });
      res.json({ exists: Boolean(token), hasAccessToken: Boolean(token?.accessToken), hasRefreshToken: Boolean(token?.refreshToken), expiryDate: token?.expiryDate ? String(token.expiryDate) : null, expired: token?.expiryDate ? Number(token.expiryDate) < Date.now() : true });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  router.get("/search-console/token-status", async (_req, res) => {
    try {
      const token = await prisma.googleToken.findFirst({ where: { provider: "search-console" }, orderBy: { createdAt: "desc" } });
      res.json({ provider: "search-console", exists: Boolean(token), hasAccessToken: Boolean(token?.accessToken), hasRefreshToken: Boolean(token?.refreshToken), expiryDate: token?.expiryDate ? String(token.expiryDate) : null, expired: token?.expiryDate ? Number(token.expiryDate) < Date.now() : true });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  router.post("/google/refresh-token", async (_req, res) => {
    try {
      await refreshAccessToken();
      const token = await prisma.googleToken.findFirst({ where: { provider: "google" }, orderBy: { createdAt: "desc" } });
      res.json({ ok: true, hasAccessToken: Boolean(token?.accessToken), hasRefreshToken: Boolean(token?.refreshToken), expiryDate: token?.expiryDate ? String(token.expiryDate) : null });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  router.get("/google/accounts", async (_req, res) => {
    try {
      const accessToken = await refreshAccessToken();
      const googleRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: { Authorization: `Bearer ${accessToken}` } });
      const text = await googleRes.text();
      res.status(googleRes.status).set("Content-Type", "application/json").send(text);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  router.get("/google/locations", async (req, res) => {
    try {
      const accountId = req.query.accountId || process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
      if (!accountId) return res.status(400).json({ error: "accountId manquant" });
      const accessToken = await refreshAccessToken();
      const googleRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const text = await googleRes.text();
      res.status(googleRes.status).set("Content-Type", "application/json").send(text);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  return router;
};

module.exports.buildAuthUrl = buildAuthUrl;
module.exports.resolveProvider = resolveProvider;
module.exports.BUSINESS_SCOPE = BUSINESS_SCOPE;
module.exports.SEARCH_CONSOLE_SCOPE = SEARCH_CONSOLE_SCOPE;
module.exports.SEARCH_CONSOLE_STATE = SEARCH_CONSOLE_STATE;
