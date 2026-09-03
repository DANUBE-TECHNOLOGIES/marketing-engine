const express = require("express");
const getGoogleAccessToken = require("../lib/googleAccessToken");

function getGoogleReviewId(review) {
  return review.googleReviewId?.split("/").filter(Boolean).at(-1) || null;
}

function generateSeoReply(review) {
  const agencyName = review.agency?.name || "notre agence";
  const city = review.agency?.city || "";
  const author = review.authorName || "Madame, Monsieur";
  const comment = review.comment || "";

  if (review.rating >= 4) {
    return `Bonjour ${author},

Merci beaucoup pour votre avis ${review.rating} étoiles et pour votre confiance.

Toute l'équipe de ${agencyName}${city ? ` à ${city}` : ""} est ravie de vous avoir accompagné dans votre projet de voyage. Votre retour positif est précieux pour notre agence de voyages et aide d'autres voyageurs à nous faire confiance.

${comment ? `Nous sommes heureux de lire votre retour : "${comment}".` : ""}

Au plaisir de vous accompagner à nouveau pour vos prochains séjours, circuits, croisières ou voyages sur mesure.

Bien cordialement,
L'équipe ${agencyName}`;
  }

  return `Bonjour ${author},

Merci d'avoir pris le temps de partager votre avis concernant ${agencyName}${city ? ` à ${city}` : ""}.

Nous sommes désolés de lire que votre expérience n'a pas pleinement répondu à vos attentes. Votre retour est important pour notre agence de voyages et nous permet d'améliorer continuellement notre accompagnement client.

${comment ? `Nous avons bien pris en compte votre commentaire : "${comment}".` : ""}

Notre équipe reste à votre écoute afin d'échanger plus précisément sur votre situation.

Bien cordialement,
L'équipe ${agencyName}`;
}

module.exports = function createReviewsRoutes(prisma) {
  const router = express.Router();

  router.get("/reviews", async (req, res) => {
    const reviews = await prisma.googleReview.findMany({
      include: { agency: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(reviews);
  });

  router.get("/reviews/pending-ai", async (req, res) => {
    const reviews = await prisma.googleReview.findMany({
      where: {
        OR: [
          { status: "new" },
          { status: "pending_validation" }
        ]
      },
      include: { agency: true },
      orderBy: [
        { rating: "asc" },
        { createdAt: "desc" }
      ]
    });

    res.json(reviews);
  });

  router.get("/reviews/summary", async (req, res) => {
    const agencies = await prisma.agency.findMany({
      include: { reviews: true },
      orderBy: { name: "asc" }
    });

    const now = new Date();

    const summary = agencies.map((agency) => {
      const reviews = agency.reviews || [];

      const monthlyReviews = reviews.filter((review) => {
        const date = review.publishedAt || review.createdAt;
        if (!date) return false;

        const d = new Date(date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });

      const total = reviews.length;
      const unanswered = reviews.filter((r) => !r.reply).length;

      const averageRating =
        total > 0
          ? Math.round(
              (reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10
            ) / 10
          : 0;

      return {
        agencyId: agency.id,
        agencyName: agency.name,
        city: agency.city,
        total,
        monthlyReviews: monthlyReviews.length,
        unanswered,
        averageRating
      };
    });

    res.json(summary);
  });

  router.get("/agency/:agencyId/reviews", async (req, res) => {
    const agencyId = Number(req.params.agencyId);

    const reviews = await prisma.googleReview.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" }
    });

    res.json(reviews);
  });

  router.post("/reviews", async (req, res) => {
    const {
      agencyId,
      authorName,
      rating,
      comment,
      publishedAt,
      source,
      googleReviewId
    } = req.body;

    const review = await prisma.googleReview.create({
      data: {
        agencyId: Number(agencyId),
        authorName,
        rating: Number(rating),
        comment,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        source: source || "manual",
        googleReviewId: googleReviewId || null,
        status: "new"
      },
      include: { agency: true }
    });

    res.json(review);
  });

  router.post("/reviews/:id/generate", async (req, res) => {
    const id = Number(req.params.id);

    const review = await prisma.googleReview.findUnique({
      where: { id },
      include: { agency: true }
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const reply = generateSeoReply(review);

    const updated = await prisma.googleReview.update({
      where: { id },
      data: {
        reply,
        status: "new"
      },
      include: { agency: true }
    });

    res.json(updated);
  });

  router.post("/reviews/:id/approve", async (req, res) => {
    const id = Number(req.params.id);

    const existing = await prisma.googleReview.findUnique({
      where: { id },
      include: { agency: true }
    });

    if (!existing) {
      return res.status(404).json({ error: "Avis introuvable" });
    }

    if (!existing.reply?.trim()) {
      return res.status(400).json({
        error: "Une réponse doit être enregistrée avant validation."
      });
    }

    if (existing.status !== "new") {
      return res.status(400).json({
        error: "Seul un avis au statut new peut être validé."
      });
    }

    const review = await prisma.googleReview.update({
      where: { id },
      data: {
        status: "pending_validation"
      },
      include: { agency: true }
    });

    res.json(review);
  });

  router.post("/reviews/:id/publish", async (req, res) => {
    const id = Number(req.params.id);

    const review = await prisma.googleReview.findUnique({
      where: { id },
      include: { agency: true }
    });

    if (!review) {
      return res.status(404).json({ error: "Avis introuvable" });
    }

    if (review.status !== "pending_validation") {
      return res.status(400).json({
        error: "Avis non validé. Statut attendu : pending_validation."
      });
    }

    if (!review.reply?.trim()) {
      return res.status(400).json({ error: "Aucune réponse à publier." });
    }

    const googleReviewId = getGoogleReviewId(review);
    if (!googleReviewId) {
      return res.status(400).json({
        error: "Avis test ou manuel : publication Google impossible."
      });
    }

    if (!review.agency?.googleLocationId) {
      return res.status(400).json({
        error: "Agence non liée à une fiche Google Business."
      });
    }

    const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
    if (!accountId) {
      return res.status(500).json({
        error: "GOOGLE_BUSINESS_ACCOUNT_ID manquant."
      });
    }

    const accessToken = await getGoogleAccessToken(prisma);
    const locationName = review.agency.googleLocationId.replace(/^\/+/, "");
    const googleResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/${locationName}/reviews/${encodeURIComponent(googleReviewId)}/reply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ comment: review.reply })
      }
    );
    const responseText = await googleResponse.text();

    if (!googleResponse.ok) {
      return res
        .status(googleResponse.status)
        .type("application/json")
        .send(responseText);
    }

    const updated = await prisma.googleReview.update({
      where: { id },
      data: { status: "replied" },
      include: { agency: true }
    });

    let googleData = null;
    if (responseText) {
      try {
        googleData = JSON.parse(responseText);
      } catch {
        googleData = { raw: responseText };
      }
    }

    res.json({
      success: true,
      review: updated,
      google: googleData
    });
  });

  router.post("/reviews/:id/reply", async (req, res) => {
    const id = Number(req.params.id);
    const { reply } = req.body;

    const review = await prisma.googleReview.update({
      where: { id },
      data: {
        reply,
        status: "new"
      },
      include: { agency: true }
    });

    res.json(review);
  });

  router.get("/reviews/unanswered", async (req, res) => {
    const reviews = await prisma.googleReview.findMany({
      where: {
        OR: [
          { reply: null },
          { reply: "" },
          { status: "new" },
          { status: "pending_validation" }
        ]
      },
      include: { agency: true },
      orderBy: [
        { rating: "asc" },
        { createdAt: "desc" }
      ]
    });

    res.json(reviews);
  });

  router.post("/reviews/generate-reply", async (req, res) => {
    const {
      rating,
      comment,
      agencyName,
      city,
      authorName
    } = req.body;

    const fakeReview = {
      rating: Number(rating),
      comment,
      authorName,
      agency: {
        name: agencyName,
        city
      }
    };

    const reply = generateSeoReply(fakeReview);

    res.json({
      reply,
      tone: Number(rating) <= 3
        ? "professionnelle, empathique et rassurante"
        : "chaleureuse et professionnelle"
    });
  });

  router.post("/reviews/auto-process", async (req, res) => {
    const reviews = await prisma.googleReview.findMany({
      where: {
        status: "new"
      },
      include: { agency: true },
      orderBy: { createdAt: "desc" }
    });

    let generated = 0;
    let autoReady = 0;
    let sensitive = 0;

    for (const review of reviews) {
      const reply = generateSeoReply(review);

      await prisma.googleReview.update({
        where: { id: review.id },
        data: {
          reply,
          status: "new"
        }
      });

      generated++;

      if (review.rating >= 4) autoReady++;
      else sensitive++;
    }

    res.json({
      total: reviews.length,
      generated,
      autoReady,
      sensitive
    });
  });

  router.get("/review-requests", async (req, res) => {
    const requests = await prisma.reviewRequest.findMany({
      include: { agency: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(requests);
  });

  router.post("/review-requests", async (req, res) => {
    const {
      agencyId,
      clientName,
      clientEmail,
      clientPhone,
      tripName,
      reviewUrl
    } = req.body;

    const message = `Bonjour ${clientName || ""},

Nous espérons que votre voyage${tripName ? ` ${tripName}` : ""} s'est parfaitement déroulé.

Votre avis est très précieux pour notre agence et aide d'autres voyageurs à nous faire confiance.

Vous pouvez déposer votre avis ici :
${reviewUrl || "Lien avis Google à compléter"}

Merci beaucoup pour votre confiance.`;

    const request = await prisma.reviewRequest.create({
      data: {
        agencyId: Number(agencyId),
        clientName,
        clientEmail,
        clientPhone,
        tripName,
        reviewUrl,
        message,
        status: "draft"
      }
    });

    res.json(request);
  });

  router.post("/review-requests/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const updated = await prisma.reviewRequest.update({
      where: { id },
      data: {
        status,
        sentAt: status === "sent" ? new Date() : undefined
      }
    });

    res.json(updated);
  });

  router.get("/review-requests/summary", async (req, res) => {
    const agencies = await prisma.agency.findMany({
      include: {
        reviewRequests: true
      },
      orderBy: { name: "asc" }
    });

    const summary = agencies.map((agency) => {
      const requests = agency.reviewRequests || [];
      const total = requests.length;
      const sent = requests.filter((r) => r.status === "sent").length;
      const draft = requests.filter((r) => r.status === "draft").length;

      return {
        agencyId: agency.id,
        agencyName: agency.name,
        city: agency.city,
        total,
        sent,
        draft
      };
    });

    res.json(summary);
  });

  router.get("/review-requests.csv", async (req, res) => {
    const requests = await prisma.reviewRequest.findMany({
      include: { agency: true },
      orderBy: { createdAt: "desc" }
    });

    const header = [
      "agence",
      "ville",
      "client",
      "email",
      "telephone",
      "voyage",
      "statut",
      "lien_avis",
      "date_creation"
    ];

    const rows = requests.map((request) => [
      request.agency?.name || "",
      request.agency?.city || "",
      request.clientName || "",
      request.clientEmail || "",
      request.clientPhone || "",
      request.tripName || "",
      request.status || "",
      request.reviewUrl || "",
      request.createdAt ? request.createdAt.toISOString() : ""
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=review-requests.csv"
    );

    res.send(csv);
  });

  router.get(
    "/public/agency-sites/:siteSlug/reviews",
    async (req, res, next) => {
      try {
        const limit = Math.min(
          Math.max(
            Number(req.query.limit) || 6,
            1
          ),
          20
        );

        const tenantSlug = String(
          req.headers["x-tenant-slug"] ||
          "mondescale"
        )
          .trim()
          .toLowerCase();

        const site =
          await prisma.agencySite.findFirst({
            where: {
              slug: String(
                req.params.siteSlug || ""
              ).trim(),

              tenant: {
                is: {
                  slug: tenantSlug,
                },
              },
            },
            include: {
              agency: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  googleReviewUrl: true,
                },
              },
            },
          });

        if (!site?.agency) {
          return res.status(404).json({
            error: "Mini-site agence introuvable.",
            code: "PUBLIC_AGENCY_SITE_NOT_FOUND",
          });
        }

        const where = {
          agencyId: site.agency.id,
          rating: {
            gte: 1,
          },
        };

        const [
          aggregate,
          reviews,
        ] = await Promise.all([
          prisma.googleReview.aggregate({
            where,
            _count: {
              _all: true,
            },
            _avg: {
              rating: true,
            },
          }),

          prisma.googleReview.findMany({
            where,
            orderBy: [
              {
                publishedAt: "desc",
              },
              {
                createdAt: "desc",
              },
            ],
            take: limit,
            select: {
              id: true,
              authorName: true,
              rating: true,
              comment: true,
              reply: true,
              publishedAt: true,
              createdAt: true,
              source: true,
            },
          }),
        ]);

        res.set(
          "Cache-Control",
          "public, max-age=300, stale-while-revalidate=1800"
        );

        res.json({
          agency: {
            id: site.agency.id,
            name: site.agency.name,
            city: site.agency.city,
          },

          summary: {
            averageRating:
              aggregate._avg.rating
                ? Math.round(
                    aggregate._avg.rating * 10
                  ) / 10
                : 0,

            total:
              aggregate._count._all || 0,
          },

          reviewUrl:
            site.agency.googleReviewUrl ||
            null,

          reviews: reviews.map(
            (review) => ({
              ...review,
              publishedAt:
                review.publishedAt ||
                review.createdAt,
            })
          ),
        });
      } catch (error) {
        next(error);
      }
    }
  );


  return router;
};
