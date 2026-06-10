const express = require("express");

module.exports = function createGoogleOAuthRoutes(prisma) {
  const router = express.Router();

  const scope = "https://www.googleapis.com/auth/business.manage";

  function getRedirectUri(req) {
    return (
      process.env.GOOGLE_REDIRECT_URI ||
      "https://localengine.mondescale.com/api/google/callback"
    );
  }

  router.get([
    "/google/auth",
    "/api/google/auth"
  ], async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = getRedirectUri(req);

    if (!clientId || !redirectUri) {
      return res.status(500).send("GOOGLE_CLIENT_ID ou GOOGLE_REDIRECT_URI manquant");
    }

    const url =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&include_granted_scopes=false`;

    res.redirect(url);
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
      const error = req.query.error;

      if (error) {
        return res.status(400).send(`Erreur OAuth Google : ${error}`);
      }

      if (!code) {
        return res.status(400).send("Code OAuth manquant");
      }

      const redirectUri = getRedirectUri(req);

      const body = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      });

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({
          error: "Erreur échange code OAuth",
          google: tokenData,
          redirectUri
        });
      }

      if (!tokenData.refresh_token) {
        return res.status(400).send(`
          <html>
            <body style="font-family:Arial;padding:40px">
              <h2>Connexion Google reçue, mais sans refresh_token</h2>
              <p>Google n'a pas renvoyé de refresh_token.</p>
              <p>Supprime l'accès de l'application dans ton compte Google, puis relance l'autorisation.</p>
              <p><a href="https://myaccount.google.com/connections">Gérer les connexions Google</a></p>
            </body>
          </html>
        `);
      }

      const expiryDate =
        Date.now() + Number(tokenData.expires_in || 3600) * 1000;

      await prisma.googleToken.deleteMany({
        where: {
          provider: "google"
        }
      });

      await prisma.googleToken.create({
        data: {
          provider: "google",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiryDate: BigInt(expiryDate)
        }
      });

      res.send(`
        <html>
          <body style="font-family:Arial;padding:40px">
            <h2>Connexion Google Business réussie</h2>
            <p>Le refresh token Google a bien été enregistré.</p>
            <p>Tu peux retourner dans Local Engine.</p>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  async function refreshAccessToken() {
    const token = await prisma.googleToken.findFirst({
      where: {
        provider: "google"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!token || !token.refreshToken) {
      throw new Error("Aucun refresh token Google disponible");
    }

    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token"
    });

    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const data = await refreshRes.json();

    if (!refreshRes.ok) {
      throw new Error(`Erreur refresh token Google : ${JSON.stringify(data)}`);
    }

    const expiryDate =
      Date.now() + Number(data.expires_in || 3600) * 1000;

    const updated = await prisma.googleToken.update({
      where: {
        id: token.id
      },
      data: {
        accessToken: data.access_token,
        expiryDate: BigInt(expiryDate)
      }
    });

    return updated.accessToken;
  }

  router.get("/google/token-status", async (req, res) => {
    try {
      const token = await prisma.googleToken.findFirst({
        where: {
          provider: "google"
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      res.json({
        exists: Boolean(token),
        hasAccessToken: Boolean(token?.accessToken),
        hasRefreshToken: Boolean(token?.refreshToken),
        expiryDate: token?.expiryDate ? String(token.expiryDate) : null,
        expired: token?.expiryDate ? Number(token.expiryDate) < Date.now() : true
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.post("/google/refresh-token", async (req, res) => {
    try {
      await refreshAccessToken();

      const token = await prisma.googleToken.findFirst({
        where: {
          provider: "google"
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      res.json({
        ok: true,
        hasAccessToken: Boolean(token?.accessToken),
        hasRefreshToken: Boolean(token?.refreshToken),
        expiryDate: token?.expiryDate ? String(token.expiryDate) : null
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.get("/google/accounts", async (req, res) => {
    try {
      const accessToken = await refreshAccessToken();

      const googleRes = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const text = await googleRes.text();

      res
        .status(googleRes.status)
        .set("Content-Type", "application/json")
        .send(text);
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.get("/google/locations", async (req, res) => {
    try {
      const accountId =
        req.query.accountId ||
        process.env.GOOGLE_BUSINESS_ACCOUNT_ID;

      if (!accountId) {
        return res.status(400).json({
          error: "accountId manquant"
        });
      }

      const accessToken = await refreshAccessToken();

      const googleRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const text = await googleRes.text();

      res
        .status(googleRes.status)
        .set("Content-Type", "application/json")
        .send(text);
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
