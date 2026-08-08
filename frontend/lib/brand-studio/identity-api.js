const DEFAULT_IDENTITY = Object.freeze({
  primaryColor:
    "#111827",

  secondaryColor:
    "#374151",

  accentColor:
    "#d4a017",

  backgroundColor:
    "#ffffff",

  textColor:
    "#111827",

  headingFont:
    "Arial",

  bodyFont:
    "Arial",
});

const FONT_OPTIONS = Object.freeze([
  "Arial",
  "Georgia",
  "Helvetica",
  "Inter",
  "Montserrat",
  "Open Sans",
  "Poppins",
  "Roboto",
  "Times New Roman",
]);

function normalizeAgencyId(
  value
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      "L’identifiant agence est invalide."
    );
  }

  return parsed;
}

function tenantHeaders() {
  return {
    Accept:
      "application/json",

    "x-tenant-slug":
      "mondescale",
  };
}

async function parseJsonResponse(
  response
) {
  const text =
    await response.text();

  let payload = null;

  if (text) {
    try {
      payload =
        JSON.parse(text);
    } catch {
      payload = {
        error:
          "INVALID_JSON",

        message:
          text.slice(
            0,
            500
          ),
      };
    }
  }

  if (!response.ok) {
    const error =
      new Error(
        payload?.message ||
        payload?.error ||
        `Erreur HTTP ${response.status}`
      );

    error.status =
      response.status;

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

function validHexColor(
  value
) {
  return /^#[0-9a-f]{6}$/i.test(
    String(
      value || ""
    ).trim()
  );
}

function normalizeColor(
  value,
  fallback
) {
  const candidate =
    String(
      value || ""
    ).trim();

  return validHexColor(
    candidate
  )
    ? candidate.toLowerCase()
    : fallback;
}

function profileSource(
  payload
) {
  return (
    payload?.profile ||
    payload?.data?.profile ||
    payload?.data ||
    payload ||
    {}
  );
}

function normalizeBrandIdentity(
  payload
) {
  const source =
    profileSource(
      payload
    );

  const values =
    source.values ||
    source.theme ||
    source.identity ||
    source;

  return {
    ...source,

    primaryColor:
      normalizeColor(
        values.primaryColor ||
        values.primary ||
        values.colors?.primary,
        DEFAULT_IDENTITY.primaryColor
      ),

    secondaryColor:
      normalizeColor(
        values.secondaryColor ||
        values.secondary ||
        values.colors?.secondary,
        DEFAULT_IDENTITY.secondaryColor
      ),

    accentColor:
      normalizeColor(
        values.accentColor ||
        values.accent ||
        values.colors?.accent,
        DEFAULT_IDENTITY.accentColor
      ),

    backgroundColor:
      normalizeColor(
        values.backgroundColor ||
        values.background ||
        values.colors?.background,
        DEFAULT_IDENTITY.backgroundColor
      ),

    textColor:
      normalizeColor(
        values.textColor ||
        values.text ||
        values.colors?.text,
        DEFAULT_IDENTITY.textColor
      ),

    headingFont:
      String(
        values.headingFont ||
        values.titleFont ||
        values.fonts?.heading ||
        DEFAULT_IDENTITY.headingFont
      ),

    bodyFont:
      String(
        values.bodyFont ||
        values.contentFont ||
        values.fonts?.body ||
        DEFAULT_IDENTITY.bodyFont
      ),
  };
}

async function fetchBrandIdentity(
  agencyId
) {
  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  const candidates = [
    `/api/brand-profile/agencies/${normalizedAgencyId}`,
    `/api/brand-profile?agencyId=${normalizedAgencyId}`,
  ];

  for (
    const url
    of candidates
  ) {
    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          headers:
            tenantHeaders(),

          cache:
            "no-store",
        }
      );

    if (
      response.status === 404
    ) {
      continue;
    }

    return normalizeBrandIdentity(
      await parseJsonResponse(
        response
      )
    );
  }

  return {
    agencyId:
      normalizedAgencyId,

    ...DEFAULT_IDENTITY,
  };
}

function buildBrandProfilePayload({
  agencyId,
  profile,
  identity,
}) {
  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  const values = {
    ...(
      profile.values ||
      {}
    ),

    primaryColor:
      identity.primaryColor,

    secondaryColor:
      identity.secondaryColor,

    accentColor:
      identity.accentColor,

    backgroundColor:
      identity.backgroundColor,

    textColor:
      identity.textColor,

    headingFont:
      identity.headingFont,

    bodyFont:
      identity.bodyFont,

    colors: {
      ...(
        profile.values
          ?.colors ||
        {}
      ),

      primary:
        identity.primaryColor,

      secondary:
        identity.secondaryColor,

      accent:
        identity.accentColor,

      background:
        identity.backgroundColor,

      text:
        identity.textColor,
    },

    fonts: {
      ...(
        profile.values
          ?.fonts ||
        {}
      ),

      heading:
        identity.headingFont,

      body:
        identity.bodyFont,
    },
  };

  return {
    ...profile,

    agencyId:
      normalizedAgencyId,

    primaryColor:
      identity.primaryColor,

    secondaryColor:
      identity.secondaryColor,

    accentColor:
      identity.accentColor,

    backgroundColor:
      identity.backgroundColor,

    textColor:
      identity.textColor,

    headingFont:
      identity.headingFont,

    bodyFont:
      identity.bodyFont,

    values,

    theme: {
      ...(
        profile.theme ||
        {}
      ),

      primaryColor:
        identity.primaryColor,

      secondaryColor:
        identity.secondaryColor,

      accentColor:
        identity.accentColor,

      backgroundColor:
        identity.backgroundColor,

      textColor:
        identity.textColor,

      headingFont:
        identity.headingFont,

      bodyFont:
        identity.bodyFont,
    },
  };
}

async function saveBrandIdentity({
  agencyId,
  profile,
  identity,
}) {
  const payload =
    buildBrandProfilePayload({
      agencyId,
      profile,
      identity,
    });

  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  const candidates = [
    {
      url:
        `/api/brand-profile/agencies/${normalizedAgencyId}`,

      method:
        "PUT",
    },

    {
      url:
        "/api/brand-profile",

      method:
        "PUT",
    },

    {
      url:
        "/api/brand-profile",

      method:
        "POST",
    },
  ];

  let lastError = null;

  for (
    const candidate
    of candidates
  ) {
    const response =
      await fetch(
        candidate.url,
        {
          method:
            candidate.method,

          headers: {
            ...tenantHeaders(),

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    if (
      response.status === 404 ||
      response.status === 405
    ) {
      continue;
    }

    try {
      return normalizeBrandIdentity(
        await parseJsonResponse(
          response
        )
      );
    } catch (error) {
      lastError =
        error;

      if (
        error.status === 404 ||
        error.status === 405
      ) {
        continue;
      }

      throw error;
    }
  }

  throw (
    lastError ||
    new Error(
      "Aucun contrat d’enregistrement du Brand Profile n’est disponible."
    )
  );
}

function validateBrandIdentity(
  identity
) {
  const errors = {};

  for (
    const field
    of [
      "primaryColor",
      "secondaryColor",
      "accentColor",
      "backgroundColor",
      "textColor",
    ]
  ) {
    if (
      !validHexColor(
        identity[field]
      )
    ) {
      errors[field] =
        "La couleur doit utiliser le format #RRGGBB.";
    }
  }

  if (
    !String(
      identity.headingFont ||
      ""
    ).trim()
  ) {
    errors.headingFont =
      "La police des titres est obligatoire.";
  }

  if (
    !String(
      identity.bodyFont ||
      ""
    ).trim()
  ) {
    errors.bodyFont =
      "La police du texte est obligatoire.";
  }

  return errors;
}

export {
  DEFAULT_IDENTITY,
  FONT_OPTIONS,
  buildBrandProfilePayload,
  fetchBrandIdentity,
  normalizeAgencyId,
  normalizeBrandIdentity,
  saveBrandIdentity,
  validHexColor,
  validateBrandIdentity,
};
