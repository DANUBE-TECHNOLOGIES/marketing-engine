const express = require("express");

module.exports = function createDirectoriesRoutes(prisma) {
  const router = express.Router();

  function computeScore(listing) {
    let score = 0;
    if (listing.nameCorrect) score += 15;
    if (listing.addressCorrect) score += 15;
    if (listing.phoneCorrect) score += 15;
    if (listing.websiteCorrect) score += 15;
    if (listing.categoryCorrect) score += 10;
    if (listing.hoursCorrect) score += 10;
    if (listing.verified) score += 10;
    if (listing.phoneMatch) score += 5;
    if (listing.addressMatch) score += 5;
    return Math.min(score, 100);
  }

  router.post("/directories/seed", async (req, res) => {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "DirectoryListing"`);
      await prisma.$executeRawUnsafe(`DELETE FROM "LocalDirectory"`);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "LocalDirectory"
        (
          name,
          website,
          priority,
          "createdAt",
          active,
          category,
          difficulty,
          "impactScore",
          "submissionUrl",
          "submissionMode",
          url
        )
        VALUES
        ('Google Business Profile', 'https://www.google.com/business/', 100, NOW(), TRUE, 'search', 1, 10, 'https://www.google.com/business/', 'api', 'https://www.google.com/business/'),
        ('PagesJaunes', 'https://www.pagesjaunes.fr/', 90, NOW(), TRUE, 'directory', 2, 9, 'https://www.pagesjaunes.fr/', 'manual', 'https://www.pagesjaunes.fr/'),
        ('Bing Places', 'https://www.bingplaces.com/', 85, NOW(), TRUE, 'search', 2, 8, 'https://www.bingplaces.com/', 'manual', 'https://www.bingplaces.com/'),
        ('Apple Business Connect', 'https://businessconnect.apple.com/', 85, NOW(), TRUE, 'map', 2, 8, 'https://businessconnect.apple.com/', 'manual', 'https://businessconnect.apple.com/'),
        ('Facebook', 'https://www.facebook.com/', 80, NOW(), TRUE, 'social', 2, 8, 'https://www.facebook.com/', 'manual', 'https://www.facebook.com/'),
        ('Instagram', 'https://www.instagram.com/', 70, NOW(), TRUE, 'social', 3, 6, 'https://www.instagram.com/', 'manual', 'https://www.instagram.com/'),
        ('OpenStreetMap', 'https://www.openstreetmap.org/', 75, NOW(), TRUE, 'map', 3, 7, 'https://www.openstreetmap.org/', 'manual', 'https://www.openstreetmap.org/'),
        ('Foursquare', 'https://foursquare.com/', 65, NOW(), TRUE, 'directory', 3, 6, 'https://foursquare.com/', 'manual', 'https://foursquare.com/'),
        ('TomTom', 'https://www.tomtom.com/', 70, NOW(), TRUE, 'map', 3, 7, 'https://www.tomtom.com/', 'manual', 'https://www.tomtom.com/'),
        ('Mappy', 'https://fr.mappy.com/', 75, NOW(), TRUE, 'directory', 2, 7, 'https://fr.mappy.com/', 'manual', 'https://fr.mappy.com/'),
        ('118000', 'https://www.118000.fr/', 60, NOW(), TRUE, 'directory', 3, 5, 'https://www.118000.fr/', 'manual', 'https://www.118000.fr/')
      `);

      const rows = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS count
        FROM "LocalDirectory"
        WHERE active = TRUE
      `);

      res.json({
        ok: true,
        directories: rows[0]?.count || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/directories/bootstrap", async (req, res) => {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "DirectoryListing"
        (
          "agencyId",
          "directoryId",
          "listingUrl",
          status,
          "nameCorrect",
          "addressCorrect",
          "phoneCorrect",
          "websiteCorrect",
          notes,
          "lastCheckedAt",
          "createdAt",
          "categoryCorrect",
          "hoursCorrect",
          "updatedAt",
          "submissionPayload",
          "submittedAt",
          "automationStatus",
          score,
          verified,
          "phoneMatch",
          "addressMatch",
          "websiteMatch"
        )
        SELECT
          a.id,
          d.id,
          NULL,
          'missing',
          FALSE,
          FALSE,
          FALSE,
          FALSE,
          NULL,
          NULL,
          NOW(),
          FALSE,
          FALSE,
          NOW(),
          jsonb_build_object(
            'agencyName', a.name,
            'city', a.city,
            'address', a.address,
            'postalCode', a."postalCode",
            'phone', a.phone,
            'email', a.email,
            'website', a.website,
            'directoryName', d.name,
            'directoryWebsite', d.website,
            'submissionUrl', d."submissionUrl"
          ),
          NULL,
          'todo',
          0,
          FALSE,
          FALSE,
          FALSE,
          FALSE
        FROM "Agency" a
        CROSS JOIN "LocalDirectory" d
        WHERE d.active = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM "DirectoryListing" dl
          WHERE dl."agencyId" = a.id
          AND dl."directoryId" = d.id
        )
      `);

      const result = await prisma.$queryRawUnsafe(`
        SELECT
          (SELECT COUNT(*)::int FROM "Agency") AS agencies,
          (SELECT COUNT(*)::int FROM "LocalDirectory" WHERE active = TRUE) AS directories,
          (
            SELECT COUNT(*)::int
            FROM "DirectoryListing" dl
            JOIN "LocalDirectory" d ON d.id = dl."directoryId"
            WHERE d.active = TRUE
          ) AS listings
      `);

      res.json({
        ok: true,
        ...result[0]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/directories/google-sync", async (req, res) => {
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "DirectoryListing" dl
        SET
          status = 'validated',
          "listingUrl" = a."googleLocationId",
          "nameCorrect" = TRUE,
          "addressCorrect" = TRUE,
          "phoneCorrect" = TRUE,
          "websiteCorrect" = TRUE,
          "categoryCorrect" = TRUE,
          "hoursCorrect" = TRUE,
          "lastCheckedAt" = NOW(),
          "updatedAt" = NOW(),
          "automationStatus" = 'validated',
          score = 100,
          verified = TRUE,
          "phoneMatch" = TRUE,
          "addressMatch" = TRUE,
          "websiteMatch" = TRUE
        FROM "Agency" a, "LocalDirectory" d
        WHERE dl."agencyId" = a.id
        AND dl."directoryId" = d.id
        AND d.name = 'Google Business Profile'
        AND d.active = TRUE
        AND a."googleLocationId" IS NOT NULL
        AND a."googleLocationId" <> ''
      `);

      const result = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS updated
        FROM "DirectoryListing" dl
        JOIN "LocalDirectory" d ON d.id = dl."directoryId"
        WHERE d.name = 'Google Business Profile'
        AND dl.status = 'validated'
      `);

      res.json({
        ok: true,
        updated: result[0]?.updated || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/directories/score-engine", async (req, res) => {
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "DirectoryListing"
        SET score =
          CASE WHEN "nameCorrect" THEN 15 ELSE 0 END +
          CASE WHEN "addressCorrect" THEN 15 ELSE 0 END +
          CASE WHEN "phoneCorrect" THEN 15 ELSE 0 END +
          CASE WHEN "websiteCorrect" THEN 15 ELSE 0 END +
          CASE WHEN "categoryCorrect" THEN 10 ELSE 0 END +
          CASE WHEN "hoursCorrect" THEN 10 ELSE 0 END +
          CASE WHEN verified THEN 10 ELSE 0 END +
          CASE WHEN "phoneMatch" THEN 5 ELSE 0 END +
          CASE WHEN "addressMatch" THEN 5 ELSE 0 END,
          "updatedAt" = NOW()
      `);

      const result = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS updated
        FROM "DirectoryListing"
      `);

      res.json({
        ok: true,
        updated: result[0]?.updated || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/directories/dashboard", async (req, res) => {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          a.id AS "agencyId",
          a.name AS "agencyName",
          a.city,
          COUNT(dl.id)::int AS total,
          COUNT(dl.id) FILTER (WHERE dl.status = 'validated')::int AS validated,
          COUNT(dl.id) FILTER (WHERE dl.status = 'missing')::int AS missing,
          COUNT(dl.id) FILTER (WHERE dl.status = 'pending')::int AS pending,
          COUNT(dl.id) FILTER (WHERE dl.status = 'error')::int AS error,
          COALESCE(ROUND(AVG(dl.score)),0)::int AS score
        FROM "Agency" a
        LEFT JOIN "DirectoryListing" dl ON dl."agencyId" = a.id
        LEFT JOIN "LocalDirectory" d ON d.id = dl."directoryId"
        WHERE d.active = TRUE OR d.id IS NULL
        GROUP BY a.id, a.name, a.city
        ORDER BY a.city
      `);

      const finalRows = rows.map((r) => ({
        ...r,
        priority:
          r.score < 40
            ? "HIGH"
            : r.score < 70
              ? "MEDIUM"
              : "OK"
      }));

      res.json({
        totalAgencies: finalRows.length,
        averageScore: finalRows.length
          ? Math.round(finalRows.reduce((s, r) => s + Number(r.score || 0), 0) / finalRows.length)
          : 0,
        high: finalRows.filter((r) => r.priority === "HIGH").length,
        medium: finalRows.filter((r) => r.priority === "MEDIUM").length,
        ok: finalRows.filter((r) => r.priority === "OK").length,
        rows: finalRows
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/directories/worklist", async (req, res) => {
    try {
      const listings = await prisma.$queryRawUnsafe(`
        SELECT
          dl.id,
          dl.status,
          dl.score,
          dl."agencyId",
          a.name AS "agencyName",
          a.city,
          dl."directoryId",
          d.name AS "directoryName",
          d.website AS "directoryWebsite",
          d."submissionUrl",
          dl."listingUrl",
          a.address,
          a."postalCode",
          a.phone,
          a.email,
          a.website AS "agencyWebsite"
        FROM "DirectoryListing" dl
        JOIN "Agency" a ON a.id = dl."agencyId"
        JOIN "LocalDirectory" d ON d.id = dl."directoryId"
        WHERE d.active = TRUE
        AND dl.status IN ('missing','pending','error')
        ORDER BY dl.status ASC, dl.id ASC
        LIMIT 500
      `);

      res.json({
        total: listings.length,
        listings: listings.map((l) => ({
          id: l.id,
          status: l.status,
          score: l.score,
          agencyId: l.agencyId,
          agencyName: l.agencyName,
          city: l.city,
          directoryId: l.directoryId,
          directoryName: l.directoryName,
          directoryWebsite: l.directoryWebsite,
          submissionUrl: l.submissionUrl,
          listingUrl: l.listingUrl,
          nap: {
            name: l.agencyName,
            address: l.address,
            postalCode: l.postalCode,
            city: l.city,
            phone: l.phone,
            email: l.email,
            website: l.agencyWebsite
          }
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  router.get("/directories/priority-worklist", async (req, res) => {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          dl.id,
          dl.status,
          dl.score,
          dl."automationStatus",
          a.id AS "agencyId",
          a.name AS "agencyName",
          a.city,
          a.address,
          a."postalCode",
          a.phone,
          a.email,
          a.website AS "agencyWebsite",
          d.id AS "directoryId",
          d.name AS "directoryName",
          d.website AS "directoryWebsite",
          d."submissionUrl",
          d."submissionMode",
          d.priority,
          d.difficulty,
          d."impactScore",
          dl."submissionPayload"
        FROM "DirectoryListing" dl
        JOIN "Agency" a ON a.id = dl."agencyId"
        JOIN "LocalDirectory" d ON d.id = dl."directoryId"
        WHERE d.active = TRUE
        AND dl.status IN ('missing','pending','error')
        ORDER BY
          d."impactScore" DESC,
          d.priority DESC,
          d.difficulty ASC,
          a.city ASC
        LIMIT 500
      `);

      res.json({
        total: rows.length,
        rows: rows.map((r) => ({
          id: r.id,
          status: r.status,
          score: r.score,
          automationStatus: r.automationStatus,
          priorityScore: Number(r.impactScore || 0) * 10 + Number(r.priority || 0) - Number(r.difficulty || 0) * 5,
          agencyId: r.agencyId,
          agencyName: r.agencyName,
          city: r.city,
          directoryId: r.directoryId,
          directoryName: r.directoryName,
          directoryWebsite: r.directoryWebsite,
          submissionUrl: r.submissionUrl || r.directoryWebsite,
          submissionMode: r.submissionMode || "manual",
          priority: r.priority,
          difficulty: r.difficulty,
          impactScore: r.impactScore,
          nap: {
            name: r.agencyName,
            address: r.address,
            postalCode: r.postalCode,
            city: r.city,
            phone: r.phone,
            email: r.email,
            website: r.agencyWebsite
          }
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/directories/generate-priority-actions", async (req, res) => {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          a.id AS "agencyId",
          a.city,
          COUNT(dl.id)::int AS missing_count,
          MAX(d."impactScore")::int AS max_impact
        FROM "Agency" a
        JOIN "DirectoryListing" dl ON dl."agencyId" = a.id
        JOIN "LocalDirectory" d ON d.id = dl."directoryId"
        WHERE d.active = TRUE
        AND dl.status IN ('missing','error')
        GROUP BY a.id, a.city
      `);

      let created = 0;
      let existing = 0;

      for (const row of rows) {
        const already = await prisma.networkAction.findFirst({
          where: {
            agencyId: Number(row.agencyId),
            lever: "citations",
            status: {
              in: ["todo", "in_progress"]
            }
          }
        });

        if (already) {
          existing++;
          continue;
        }

        await prisma.networkAction.create({
          data: {
            agencyId: Number(row.agencyId),
            lever: "citations",
            title: "Renforcer les citations locales",
            description: `${row.missing_count} citation(s) manquante(s). Priorité aux annuaires à fort impact : Bing, Apple, Facebook, PagesJaunes, OpenStreetMap.`,
            owner: "Sylvie",
            status: "todo",
            deadline: new Date(Date.now() + 14 * 86400000)
          }
        });

        created++;
      }

      res.json({
        ok: true,
        created,
        existing
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
