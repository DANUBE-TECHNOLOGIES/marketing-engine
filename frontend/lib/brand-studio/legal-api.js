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

function normalizeLegalProfile(
  payload
) {
  const source =
    payload?.profile ||
    payload?.data ||
    payload ||
    {};

  const pages =
    source.pages ||
    source.content ||
    {};

  return {
    id:
      source.id ||
      null,

    agencyId:
      source.agencyId ||
      null,

    companyName:
      source.companyName ||
      source.legalName ||
      "",

    legalForm:
      source.legalForm ||
      "",

    shareCapital:
      source.shareCapital ||
      "",

    registrationNumber:
      source.registrationNumber ||
      source.siret ||
      "",

    vatNumber:
      source.vatNumber ||
      "",

    registeredOffice:
      source.registeredOffice ||
      source.address ||
      "",

    publicationDirector:
      source.publicationDirector ||
      "",

    hostingProvider:
      source.hostingProvider ||
      "",

    legalEmail:
      source.legalEmail ||
      "",

    dpoEmail:
      source.dpoEmail ||
      "",

    phone:
      source.phone ||
      "",

    legalNotice:
      pages.legalNotice ||
      source.legalNotice ||
      "",

    privacyPolicy:
      pages.privacyPolicy ||
      source.privacyPolicy ||
      "",

    cookiePolicy:
      pages.cookiePolicy ||
      source.cookiePolicy ||
      "",

    terms:
      pages.terms ||
      source.terms ||
      "",
  };
}

async function fetchLegalProfile(
  agencyId
) {
  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  const candidates = [
    `/api/legal-profile/agencies/${normalizedAgencyId}`,
    `/api/legal-profile?agencyId=${normalizedAgencyId}`,
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

    return normalizeLegalProfile(
      await parseJsonResponse(
        response
      )
    );
  }

  return normalizeLegalProfile(
    {}
  );
}

async function saveLegalProfile({
  agencyId,
  profile,
}) {
  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  const payload = {
    agencyId:
      normalizedAgencyId,

    companyName:
      profile.companyName,

    legalName:
      profile.companyName,

    legalForm:
      profile.legalForm,

    shareCapital:
      profile.shareCapital,

    registrationNumber:
      profile.registrationNumber,

    siret:
      profile.registrationNumber,

    vatNumber:
      profile.vatNumber,

    registeredOffice:
      profile.registeredOffice,

    address:
      profile.registeredOffice,

    publicationDirector:
      profile.publicationDirector,

    hostingProvider:
      profile.hostingProvider,

    legalEmail:
      profile.legalEmail,

    dpoEmail:
      profile.dpoEmail,

    phone:
      profile.phone,

    legalNotice:
      profile.legalNotice,

    privacyPolicy:
      profile.privacyPolicy,

    cookiePolicy:
      profile.cookiePolicy,

    terms:
      profile.terms,

    pages: {
      legalNotice:
        profile.legalNotice,

      privacyPolicy:
        profile.privacyPolicy,

      cookiePolicy:
        profile.cookiePolicy,

      terms:
        profile.terms,
    },
  };

  const candidates = [
    {
      url:
        `/api/legal-profile/agencies/${normalizedAgencyId}`,

      method:
        "PUT",
    },

    {
      url:
        "/api/legal-profile",

      method:
        "PUT",
    },

    {
      url:
        "/api/legal-profile",

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
      return normalizeLegalProfile(
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
      "Aucun contrat d’enregistrement du Legal Profile n’est disponible."
    )
  );
}

function validateLegalProfile(
  profile
) {
  const errors = {};

  if (
    !String(
      profile.companyName ||
      ""
    ).trim()
  ) {
    errors.companyName =
      "La raison sociale est obligatoire.";
  }

  if (
    profile.legalEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      profile.legalEmail
    )
  ) {
    errors.legalEmail =
      "L’adresse juridique est invalide.";
  }

  if (
    profile.dpoEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      profile.dpoEmail
    )
  ) {
    errors.dpoEmail =
      "L’adresse du DPO est invalide.";
  }

  if (
    !String(
      profile.legalNotice ||
      ""
    ).trim()
  ) {
    errors.legalNotice =
      "Les mentions légales sont obligatoires.";
  }

  if (
    !String(
      profile.privacyPolicy ||
      ""
    ).trim()
  ) {
    errors.privacyPolicy =
      "La politique de confidentialité est obligatoire.";
  }

  return errors;
}

export {
  fetchLegalProfile,
  normalizeAgencyId,
  normalizeLegalProfile,
  saveLegalProfile,
  validateLegalProfile,
};
