const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const createReviewsRoutes = require("../src/routes/reviews");

process.env.GOOGLE_CLIENT_ID = "client";
process.env.GOOGLE_CLIENT_SECRET = "secret";
process.env.GOOGLE_BUSINESS_ACCOUNT_ID = "account";

function createPrisma(review) {
  const updates = [];

  return {
    updates,
    googleReview: {
      findUnique: async () => review,
      update: async ({ data }) => {
        updates.push(data);
        return { ...review, ...data };
      }
    },
    googleToken: {
      findFirst: async () => ({
        id: 1,
        refreshToken: "refresh-token",
        createdAt: new Date()
      }),
      update: async () => ({})
    }
  };
}

async function withServer(prisma, callback) {
  const app = express();
  app.use(express.json());
  app.use(createReviewsRoutes(prisma));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("refuse de valider un avis sans réponse", async () => {
  const prisma = createPrisma({
    id: 1,
    status: "new",
    reply: null,
    agency: {}
  });

  await withServer(prisma, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/reviews/1/approve`, {
      method: "POST"
    });

    assert.equal(response.status, 400);
    assert.equal(prisma.updates.length, 0);
  });
});

test("refuse de publier un avis manuel", async () => {
  const prisma = createPrisma({
    id: 2,
    status: "pending_validation",
    reply: "Merci.",
    googleReviewId: null,
    agency: { googleLocationId: "locations/123" }
  });

  await withServer(prisma, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/reviews/2/publish`, {
      method: "POST"
    });

    assert.equal(response.status, 400);
    assert.equal(prisma.updates.length, 0);
  });
});

test("marque replied uniquement après succès Google", async () => {
  const prisma = createPrisma({
    id: 3,
    status: "pending_validation",
    reply: "Merci pour votre avis.",
    googleReviewId: "reviews/review-123",
    agency: { googleLocationId: "locations/location-123" }
  });
  const originalFetch = global.fetch;
  const googleCalls = [];

  global.fetch = async (url, options) => {
    if (String(url).startsWith("http://127.0.0.1:")) {
      return originalFetch(url, options);
    }

    googleCalls.push({ url: String(url), options });

    if (url === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({
        access_token: "access-token",
        expires_in: 3600
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ updateTime: "now" }), {
      status: 200
    });
  };

  try {
    await withServer(prisma, async (baseUrl) => {
      const response = await originalFetch(`${baseUrl}/reviews/3/publish`, {
        method: "POST"
      });

      assert.equal(response.status, 200);
      assert.equal(googleCalls.length, 2);
      assert.match(googleCalls[1].url, /reviews\/review-123\/reply$/);
      assert.deepEqual(prisma.updates.at(-1), { status: "replied" });
    });
  } finally {
    global.fetch = originalFetch;
  }
});
