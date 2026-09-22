"use strict";

const express = require("express");
const { randomUUID } = require("node:crypto");

const CAMPAIGN = {
  slug: "gloire-des-pharaons-2027",
  title: "Croisière Gloire des Pharaons 5★",
  destination: "Égypte",
  duration: "8 jours / 7 nuits",
  ship: "Caprice 5★ (ou similaire)",
  board: "Formule tout inclus",
  price: 1070,
  currency: "EUR",
  partner: null,
  origins: ["PARIS", "LYON"],
  departures: [
    "2027-01-02",
    "2027-01-09",
    "2027-01-16",
    "2027-01-23",
    "2027-01-30",
    "2027-02-06",
  ],
  included: [
    "Transport France / Louxor / France",
    "1 bagage en soute et 1 bagage à main",
    "Taxes aéroport",
    "Visa et frais de services obligatoires",
    "Accueil et assistance",
    "Transferts aéroport / bateau",
    "Croisière 5★ normes locales",
    "Formule tout inclus",
    "Entrées et visites prévues au programme",
  ],
  disclaimer:
    "Préinscription gratuite et sans engagement. La date définitive reste soumise à la constitution du groupe et à la disponibilité des places.",
};


const OPERATIONAL_STATUSES = Object.freeze([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "OPTION",
  "CONFIRMED",
  "CLOSED",
]);

const OPERATIONAL_STATUS_SET =
  new Set(OPERATIONAL_STATUSES);

function normalizeOperationalStatus(value) {
  const status = clean(value, 40).toUpperCase();

  return OPERATIONAL_STATUS_SET.has(status)
    ? status
    : null;
}

function normalizeOptional(value, max = 300) {
  const result = clean(value, max);
  return result || null;
}

function normalizeDateTime(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {
      ok: true,
      value: null,
    };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return {
      ok: false,
      value: null,
    };
  }

  return {
    ok: true,
    value: parsed,
  };
}

function validateAllocation(
  row,
  departure,
  origin
) {
  if (!departure && !origin) {
    return { ok: true };
  }

  if (!departure || !origin) {
    return {
      ok: false,
      error: "INCOMPLETE_ALLOCATION",
    };
  }

  if (!CAMPAIGN.departures.includes(departure)) {
    return {
      ok: false,
      error: "INVALID_ALLOCATED_DEPARTURE",
    };
  }

  if (!CAMPAIGN.origins.includes(origin)) {
    return {
      ok: false,
      error: "INVALID_ALLOCATED_ORIGIN",
    };
  }

  const departures =
    Array.isArray(row.departures)
      ? row.departures
      : [];

  const origins =
    Array.isArray(row.origins)
      ? row.origins
      : [];

  if (!departures.includes(departure)) {
    return {
      ok: false,
      error:
        "ALLOCATION_OUTSIDE_SELECTED_DEPARTURES",
    };
  }

  if (!origins.includes(origin)) {
    return {
      ok: false,
      error:
        "ALLOCATION_OUTSIDE_SELECTED_ORIGINS",
    };
  }

  return { ok: true };
}

function buildOperationalAnalytics(rows) {
  const statuses = Object.fromEntries(
    OPERATIONAL_STATUSES.map((status) => [
      status,
      {
        registrations: 0,
        travellers: 0,
      },
    ])
  );

  const matrix = Object.fromEntries(
    CAMPAIGN.departures.map((departure) => [
      departure,
      Object.fromEntries(
        CAMPAIGN.origins.map((origin) => [
          origin,
          {
            allocatedRegistrations: 0,
            allocatedTravellers: 0,
            optionRegistrations: 0,
            optionTravellers: 0,
            confirmedRegistrations: 0,
            confirmedTravellers: 0,
          },
        ])
      ),
    ])
  );

  let allocatedRegistrations = 0;
  let allocatedTravellers = 0;
  let optionRegistrations = 0;
  let optionTravellers = 0;
  let confirmedRegistrations = 0;
  let confirmedTravellers = 0;
  let followUpsDue = 0;

  const now = Date.now();

  for (const row of rows) {
    const travellers =
      Number(row.travellerCount || 0);

    const status =
      OPERATIONAL_STATUS_SET.has(row.status)
        ? row.status
        : "NEW";

    statuses[status].registrations += 1;
    statuses[status].travellers += travellers;

    if (
      row.nextActionAt &&
      new Date(row.nextActionAt).getTime() <= now &&
      !["CONFIRMED", "CLOSED"].includes(status)
    ) {
      followUpsDue += 1;
    }

    const departure = row.allocatedDeparture;
    const origin = row.allocatedOrigin;

    if (
      !departure ||
      !origin ||
      !matrix[departure] ||
      !matrix[departure][origin]
    ) {
      continue;
    }

    const cell = matrix[departure][origin];

    allocatedRegistrations += 1;
    allocatedTravellers += travellers;

    cell.allocatedRegistrations += 1;
    cell.allocatedTravellers += travellers;

    if (status === "OPTION") {
      optionRegistrations += 1;
      optionTravellers += travellers;

      cell.optionRegistrations += 1;
      cell.optionTravellers += travellers;
    }

    if (status === "CONFIRMED") {
      confirmedRegistrations += 1;
      confirmedTravellers += travellers;

      cell.confirmedRegistrations += 1;
      cell.confirmedTravellers += travellers;
    }
  }

  return {
    statuses,
    allocation: {
      allocatedRegistrations,
      allocatedTravellers,
      optionRegistrations,
      optionTravellers,
      confirmedRegistrations,
      confirmedTravellers,
      followUpsDue,
      matrix,
    },
  };
}

const buckets = new Map();

function clean(value, max = 300) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function limited(req) {
  const now = Date.now();
  const key = clean(
    req.headers["x-forwarded-for"] || req.ip || "unknown",
    100
  ).split(",")[0];

  let bucket = buckets.get(key);

  if (!bucket || now - bucket.start > 900000) {
    bucket = { start: now, count: 0 };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return bucket.count > 10;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate(body) {
  const name = clean(body.name, 120);
  const email = clean(body.email, 180).toLowerCase();
  const phone = clean(body.phone, 50);

  if (clean(body.website, 100)) return "SPAM";
  if (name.length < 2) return "INVALID_NAME";
  if (!validEmail(email)) return "INVALID_EMAIL";

  if (phone && phone.replace(/\D/g, "").length < 8) {
    return "INVALID_PHONE";
  }

  const adults = Number(body.adults || 0);
  const children = Number(body.children || 0);
  const infants = Number(body.infants || 0);

  if (
    adults < 1 ||
    adults > 20 ||
    children < 0 ||
    children > 20 ||
    infants < 0 ||
    infants > 20
  ) {
    return "INVALID_TRAVELLERS";
  }

  const origins = Array.isArray(body.origins) ? body.origins : [];
  const departures = Array.isArray(body.departures)
    ? body.departures
    : [];

  if (
    !origins.length ||
    origins.some((origin) => !CAMPAIGN.origins.includes(origin))
  ) {
    return "INVALID_ORIGINS";
  }

  if (
    !departures.length ||
    departures.some(
      (departure) => !CAMPAIGN.departures.includes(departure)
    )
  ) {
    return "INVALID_DEPARTURES";
  }

  if (
    body.preferredDeparture &&
    !departures.includes(body.preferredDeparture)
  ) {
    return "INVALID_PREFERRED_DEPARTURE";
  }

  if (!["HIGH", "MEDIUM", "INFO"].includes(body.intent)) {
    return "INVALID_INTENT";
  }

  if (body.projectContactConsent !== true) {
    return "PROJECT_CONTACT_CONSENT_REQUIRED";
  }

  return null;
}

function emptyDateBucket() {
  return {
    registrations: 0,
    travellers: 0,
    highIntentTravellers: 0,
    preferredRegistrations: 0,
    preferredTravellers: 0,
    origins: Object.fromEntries(
      CAMPAIGN.origins.map((origin) => [
        origin,
        {
          registrations: 0,
          travellers: 0,
          highIntentTravellers: 0,
          preferredTravellers: 0,
        },
      ])
    ),
  };
}

function buildAnalytics(rows) {
  const dates = Object.fromEntries(
    CAMPAIGN.departures.map((date) => [
      date,
      emptyDateBucket(),
    ])
  );

  const origins = Object.fromEntries(
    CAMPAIGN.origins.map((origin) => [
      origin,
      {
        registrations: 0,
        travellers: 0,
      },
    ])
  );

  const intent = {
    HIGH: { registrations: 0, travellers: 0 },
    MEDIUM: { registrations: 0, travellers: 0 },
    INFO: { registrations: 0, travellers: 0 },
  };

  const sources = {};

  let travellers = 0;
  let flexibleDateRegistrations = 0;
  let flexibleDateTravellers = 0;
  let multiOriginRegistrations = 0;
  let multiOriginTravellers = 0;

  for (const row of rows) {
    const count = Number(row.travellerCount || 0);

    const rowOrigins = Array.isArray(row.origins)
      ? [...new Set(row.origins)].filter((origin) =>
          CAMPAIGN.origins.includes(origin)
        )
      : [];

    const rowDates = Array.isArray(row.departures)
      ? [...new Set(row.departures)].filter((date) =>
          CAMPAIGN.departures.includes(date)
        )
      : [];

    travellers += count;

    if (intent[row.intent]) {
      intent[row.intent].registrations += 1;
      intent[row.intent].travellers += count;
    }

    const source = clean(row.source, 120) || "Direct";

    if (!sources[source]) {
      sources[source] = {
        registrations: 0,
        travellers: 0,
      };
    }

    sources[source].registrations += 1;
    sources[source].travellers += count;

    if (rowDates.length > 1 || !row.preferredDeparture) {
      flexibleDateRegistrations += 1;
      flexibleDateTravellers += count;
    }

    if (rowOrigins.length > 1) {
      multiOriginRegistrations += 1;
      multiOriginTravellers += count;
    }

    for (const origin of rowOrigins) {
      origins[origin].registrations += 1;
      origins[origin].travellers += count;
    }

    for (const date of rowDates) {
      const bucket = dates[date];

      bucket.registrations += 1;
      bucket.travellers += count;

      if (row.intent === "HIGH") {
        bucket.highIntentTravellers += count;
      }

      if (row.preferredDeparture === date) {
        bucket.preferredRegistrations += 1;
        bucket.preferredTravellers += count;
      }

      for (const origin of rowOrigins) {
        const cell = bucket.origins[origin];

        cell.registrations += 1;
        cell.travellers += count;

        if (row.intent === "HIGH") {
          cell.highIntentTravellers += count;
        }

        if (row.preferredDeparture === date) {
          cell.preferredTravellers += count;
        }
      }
    }
  }

  /*
   * Important:
   * dates[].travellers and dates[].origins[].travellers represent
   * COMPATIBILITY, not allocated/unique network totals.
   *
   * A traveller selecting several dates and/or origins legitimately
   * appears in several compatibility buckets.
   *
   * summary.travellers remains the unique funnel volume because each
   * registration is counted exactly once there.
   */

  return {
    ok: true,
    campaign: {
      slug: CAMPAIGN.slug,
      title: CAMPAIGN.title,
      origins: CAMPAIGN.origins,
      departures: CAMPAIGN.departures,
    },
    summary: {
      registrations: rows.length,
      travellers,
      highIntentRegistrations: intent.HIGH.registrations,
      highIntentTravellers: intent.HIGH.travellers,
      flexibleDateRegistrations,
      flexibleDateTravellers,
      multiOriginRegistrations,
      multiOriginTravellers,
    },
    intent,
    origins,
    sources,
    dates,
    operations: buildOperationalAnalytics(rows),
  };
}

function routes({ prisma } = {}) {
  const router = express.Router();

  router.get(
    "/api/public/group-campaigns/:slug",
    (req, res) => {
      if (req.params.slug !== CAMPAIGN.slug) {
        return res
          .status(404)
          .json({
            ok: false,
            error: "CAMPAIGN_NOT_FOUND",
          });
      }

      return res.json({
        ok: true,
        campaign: CAMPAIGN,
      });
    }
  );

  router.post(
    "/api/public/group-campaigns/:slug/pre-register",
    async (req, res) => {
      if (req.params.slug !== CAMPAIGN.slug) {
        return res
          .status(404)
          .json({
            ok: false,
            error: "CAMPAIGN_NOT_FOUND",
          });
      }

      if (limited(req)) {
        return res
          .status(429)
          .json({
            ok: false,
            error: "RATE_LIMITED",
          });
      }

      const error = validate(req.body || {});

      if (error === "SPAM") {
        return res.status(202).json({ ok: true });
      }

      if (error) {
        return res
          .status(400)
          .json({
            ok: false,
            error,
          });
      }

      if (!prisma) {
        return res
          .status(503)
          .json({
            ok: false,
            error: "PERSISTENCE_UNAVAILABLE",
          });
      }

      try {
        const body = req.body;
        const id =
          "gpr_" + randomUUID().replaceAll("-", "");

        const source =
          clean(body.source, 120) || null;

        const total =
          Number(body.adults || 0) +
          Number(body.children || 0) +
          Number(body.infants || 0);

        const email =
          clean(body.email, 180).toLowerCase();

        const duplicate =
          await prisma.$queryRawUnsafe(
            `
              SELECT "id"
              FROM "GroupPreRegistration"
              WHERE "campaignSlug" = $1
                AND lower("email") = $2
                AND "createdAt" >
                    NOW() - INTERVAL '15 minutes'
              LIMIT 1
            `,
            CAMPAIGN.slug,
            email
          );

        if (duplicate[0]) {
          return res.json({
            ok: true,
            id: duplicate[0].id,
            duplicate: true,
          });
        }

        await prisma.$executeRawUnsafe(
          `
            INSERT INTO "GroupPreRegistration" (
              "id",
              "campaignSlug",
              "name",
              "email",
              "phone",
              "adults",
              "children",
              "infants",
              "travellerCount",
              "origins",
              "departures",
              "preferredDeparture",
              "intent",
              "source",
              "emailMarketingConsent",
              "projectContactConsent",
              "consentVersion",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,
              $10::jsonb,$11::jsonb,$12,$13,$14,
              $15,$16,$17,NOW(),NOW()
            )
          `,
          id,
          CAMPAIGN.slug,
          clean(body.name, 120),
          email,
          clean(body.phone, 50) || null,
          Number(body.adults || 0),
          Number(body.children || 0),
          Number(body.infants || 0),
          total,
          JSON.stringify(body.origins),
          JSON.stringify(body.departures),
          body.preferredDeparture || null,
          body.intent,
          source,
          body.emailMarketingConsent === true,
          true,
          "2026-09-groups-v1"
        );

        return res.status(201).json({
          ok: true,
          id,
          duplicate: false,
          travellerCount: total,
        });
      } catch (error) {
        console.error(
          "[group-pre-registration]",
          error
        );

        return res
          .status(500)
          .json({
            ok: false,
            error: "GROUP_PRE_REGISTRATION_FAILED",
          });
      }
    }
  );

  router.get(
    "/api/group-campaigns/:slug/pre-registrations",
    async (req, res) => {
      if (req.params.slug !== CAMPAIGN.slug) {
        return res
          .status(404)
          .json({
            ok: false,
            error: "CAMPAIGN_NOT_FOUND",
          });
      }

      try {
        const rows =
          await prisma.$queryRawUnsafe(
            `
              SELECT
                "id",
                "name",
                "email",
                "phone",
                "adults",
                "children",
                "infants",
                "travellerCount",
                "origins",
                "departures",
                "preferredDeparture",
                "intent",
                "source",
                "status",
                "assignedTo",
                "nextActionAt",
                "allocatedDeparture",
                "allocatedOrigin",
                "lastNote",
                "lastNoteAt",
                "createdAt"
              FROM "GroupPreRegistration"
              WHERE "campaignSlug" = $1
              ORDER BY "createdAt" DESC
            `,
            CAMPAIGN.slug
          );

        return res.json({
          ok: true,
          items: rows,
        });
      } catch (error) {
        console.error(
          "[group-pre-registration:list]",
          error
        );

        return res
          .status(500)
          .json({
            ok: false,
            error: "GROUP_PRE_REGISTRATIONS_FAILED",
          });
      }
    }
  );

  router.get(
    "/api/group-campaigns/:slug/analytics",
    async (req, res) => {
      if (req.params.slug !== CAMPAIGN.slug) {
        return res
          .status(404)
          .json({
            ok: false,
            error: "CAMPAIGN_NOT_FOUND",
          });
      }

      try {
        const rows =
          await prisma.$queryRawUnsafe(
            `
              SELECT
                "origins",
                "departures",
                "preferredDeparture",
                "intent",
                "travellerCount",
                "source",
                "status",
                "nextActionAt",
                "allocatedDeparture",
                "allocatedOrigin"
              FROM "GroupPreRegistration"
              WHERE "campaignSlug" = $1
            `,
            CAMPAIGN.slug
          );

        return res.json(buildAnalytics(rows));
      } catch (error) {
        console.error(
          "[group-pre-registration:analytics]",
          error
        );

        return res
          .status(500)
          .json({
            ok: false,
            error: "GROUP_ANALYTICS_FAILED",
          });
      }
    }
  );


  router.patch(
    "/api/group-campaigns/:slug/pre-registrations/:id/operations",
    async (req, res) => {
      if (req.params.slug !== CAMPAIGN.slug) {
        return res.status(404).json({
          ok: false,
          error: "CAMPAIGN_NOT_FOUND",
        });
      }

      if (!prisma) {
        return res.status(503).json({
          ok: false,
          error: "PERSISTENCE_UNAVAILABLE",
        });
      }

      const id = clean(req.params.id, 160);

      try {
        const currentRows =
          await prisma.$queryRawUnsafe(
            `
              SELECT
                "id",
                "campaignSlug",
                "origins",
                "departures",
                "allocatedDeparture",
                "allocatedOrigin"
              FROM "GroupPreRegistration"
              WHERE "id" = $1
                AND "campaignSlug" = $2
              LIMIT 1
            `,
            id,
            CAMPAIGN.slug
          );

        const current = currentRows[0];

        if (!current) {
          return res.status(404).json({
            ok: false,
            error:
              "PRE_REGISTRATION_NOT_FOUND",
          });
        }

        const body = req.body || {};
        const updates = [];
        const values = [];

        function setColumn(column, value) {
          values.push(value);
          updates.push(
            `"${column}" = $${values.length}`
          );
        }

        if (
          Object.prototype.hasOwnProperty.call(
            body,
            "status"
          )
        ) {
          const status =
            normalizeOperationalStatus(body.status);

          if (!status) {
            return res.status(400).json({
              ok: false,
              error:
                "INVALID_OPERATIONAL_STATUS",
            });
          }

          setColumn("status", status);
        }

        if (
          Object.prototype.hasOwnProperty.call(
            body,
            "assignedTo"
          )
        ) {
          setColumn(
            "assignedTo",
            normalizeOptional(
              body.assignedTo,
              120
            )
          );
        }

        if (
          Object.prototype.hasOwnProperty.call(
            body,
            "nextActionAt"
          )
        ) {
          const parsed =
            normalizeDateTime(body.nextActionAt);

          if (!parsed.ok) {
            return res.status(400).json({
              ok: false,
              error:
                "INVALID_NEXT_ACTION_AT",
            });
          }

          setColumn(
            "nextActionAt",
            parsed.value
          );
        }

        const hasDeparture =
          Object.prototype.hasOwnProperty.call(
            body,
            "allocatedDeparture"
          );

        const hasOrigin =
          Object.prototype.hasOwnProperty.call(
            body,
            "allocatedOrigin"
          );

        if (hasDeparture || hasOrigin) {
          const departure = hasDeparture
            ? normalizeOptional(
                body.allocatedDeparture,
                20
              )
            : current.allocatedDeparture;

          const origin = hasOrigin
            ? normalizeOptional(
                body.allocatedOrigin,
                20
              )
            : current.allocatedOrigin;

          const allocation =
            validateAllocation(
              current,
              departure,
              origin
            );

          if (!allocation.ok) {
            return res.status(400).json(
              allocation
            );
          }

          setColumn(
            "allocatedDeparture",
            departure
          );

          setColumn(
            "allocatedOrigin",
            origin
          );
        }

        if (updates.length === 0) {
          return res.status(400).json({
            ok: false,
            error: "NO_OPERATIONAL_CHANGE",
          });
        }

        values.push(id);
        const idPosition = values.length;

        values.push(CAMPAIGN.slug);
        const campaignPosition =
          values.length;

        const rows =
          await prisma.$queryRawUnsafe(
            `
              UPDATE "GroupPreRegistration"
              SET
                ${updates.join(", ")},
                "updatedAt" = NOW()
              WHERE "id" = $${idPosition}
                AND "campaignSlug" =
                    $${campaignPosition}
              RETURNING
                "id",
                "status",
                "assignedTo",
                "nextActionAt",
                "allocatedDeparture",
                "allocatedOrigin",
                "lastNote",
                "lastNoteAt",
                "updatedAt"
            `,
            ...values
          );

        return res.json({
          ok: true,
          item: rows[0],
        });
      } catch (error) {
        console.error(
          "[group-pre-registration:operations]",
          error
        );

        return res.status(500).json({
          ok: false,
          error:
            "GROUP_OPERATIONS_UPDATE_FAILED",
        });
      }
    }
  );

  router.get(
    "/api/group-campaigns/:slug/pre-registrations/:id/notes",
    async (req, res) => {
      if (req.params.slug !== CAMPAIGN.slug) {
        return res.status(404).json({
          ok: false,
          error: "CAMPAIGN_NOT_FOUND",
        });
      }

      if (!prisma) {
        return res.status(503).json({
          ok: false,
          error: "PERSISTENCE_UNAVAILABLE",
        });
      }

      const id = clean(req.params.id, 160);

      try {
        const exists =
          await prisma.$queryRawUnsafe(
            `
              SELECT "id"
              FROM "GroupPreRegistration"
              WHERE "id" = $1
                AND "campaignSlug" = $2
              LIMIT 1
            `,
            id,
            CAMPAIGN.slug
          );

        if (!exists[0]) {
          return res.status(404).json({
            ok: false,
            error:
              "PRE_REGISTRATION_NOT_FOUND",
          });
        }

        const notes =
          await prisma.$queryRawUnsafe(
            `
              SELECT
                "id",
                "content",
                "author",
                "createdAt"
              FROM "GroupPreRegistrationNote"
              WHERE "preRegistrationId" = $1
              ORDER BY "createdAt" DESC
              LIMIT 100
            `,
            id
          );

        return res.json({
          ok: true,
          notes,
        });
      } catch (error) {
        console.error(
          "[group-pre-registration:notes]",
          error
        );

        return res.status(500).json({
          ok: false,
          error: "GROUP_NOTES_FAILED",
        });
      }
    }
  );

  router.post(
    "/api/group-campaigns/:slug/pre-registrations/:id/notes",
    async (req, res) => {
      if (req.params.slug !== CAMPAIGN.slug) {
        return res.status(404).json({
          ok: false,
          error: "CAMPAIGN_NOT_FOUND",
        });
      }

      if (!prisma) {
        return res.status(503).json({
          ok: false,
          error: "PERSISTENCE_UNAVAILABLE",
        });
      }

      const id = clean(req.params.id, 160);
      const content =
        clean(req.body?.content, 4000);
      const author =
        normalizeOptional(
          req.body?.author,
          120
        );

      if (content.length < 2) {
        return res.status(400).json({
          ok: false,
          error: "INVALID_NOTE",
        });
      }

      try {
        const exists =
          await prisma.$queryRawUnsafe(
            `
              SELECT "id"
              FROM "GroupPreRegistration"
              WHERE "id" = $1
                AND "campaignSlug" = $2
              LIMIT 1
            `,
            id,
            CAMPAIGN.slug
          );

        if (!exists[0]) {
          return res.status(404).json({
            ok: false,
            error:
              "PRE_REGISTRATION_NOT_FOUND",
          });
        }

        const noteId =
          "gprn_" +
          randomUUID().replaceAll("-", "");

        const note =
          await prisma.$transaction(
            async (tx) => {
              const notes =
                await tx.$queryRawUnsafe(
                  `
                    INSERT INTO
                      "GroupPreRegistrationNote" (
                        "id",
                        "preRegistrationId",
                        "content",
                        "author",
                        "createdAt"
                      )
                    VALUES (
                      $1,
                      $2,
                      $3,
                      $4,
                      NOW()
                    )
                    RETURNING
                      "id",
                      "content",
                      "author",
                      "createdAt"
                  `,
                  noteId,
                  id,
                  content,
                  author
                );

              await tx.$executeRawUnsafe(
                `
                  UPDATE "GroupPreRegistration"
                  SET
                    "lastNote" = $1,
                    "lastNoteAt" =
                      $2::timestamp,
                    "updatedAt" = NOW()
                  WHERE "id" = $3
                    AND "campaignSlug" = $4
                `,
                content,
                notes[0].createdAt,
                id,
                CAMPAIGN.slug
              );

              return notes[0];
            }
          );

        return res.status(201).json({
          ok: true,
          note,
        });
      } catch (error) {
        console.error(
          "[group-pre-registration:note-create]",
          error
        );

        return res.status(500).json({
          ok: false,
          error:
            "GROUP_NOTE_CREATE_FAILED",
        });
      }
    }
  );

  return router;
}

module.exports = {
  CAMPAIGN,
  OPERATIONAL_STATUSES,
  buildAnalytics,
  buildOperationalAnalytics,
  validateAllocation,
  routes,
};
