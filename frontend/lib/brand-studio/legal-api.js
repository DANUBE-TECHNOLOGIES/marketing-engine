function normalizeAgencyId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("L’identifiant agence est invalide.");
  }
  return parsed;
}

function tenantHeaders() {
  return {
    Accept: "application/json",
    "x-tenant-slug": "mondescale",
  };
}

async function parseJsonResponse(response) {
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        error: "INVALID_JSON",
        message: text.slice(0, 500),
      };
    }
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || `Erreur HTTP ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function profileSource(payload) {
  return (
    payload?.resolved ||
    payload?.profile ||
    payload?.data?.resolved ||
    payload?.data?.profile ||
    payload?.data ||
    payload ||
    {}
  );
}

function normalizeLegalProfile(payload) {
  const source = profileSource(payload);
  const pages = source.pages || source.content || {};

  return {
    id: source.id || null,
    agencyId: source.agencyId || null,
    companyName:
      source.companyName || source.legalName || source.publisherName || "",
    legalForm:
      source.legalForm || source.companyForm || source.publisherLegalForm || "",
    shareCapital:
      source.shareCapital || source.capital || source.publisherShareCapital || "",
    registrationNumber:
      source.registrationNumber || source.siret || source.publisherRegistration || "",
    vatNumber:
      source.vatNumber || source.vatId || source.publisherVatNumber || "",
    registeredOffice:
      source.registeredOffice || source.address || source.publisherAddress || "",
    publicationDirector: source.publicationDirector || "",
    hostingProvider:
      source.hostingProvider || source.hostName || source.hostingName || "",
    legalEmail:
      source.legalEmail || source.contactEmail || source.publisherEmail || "",
    dpoEmail:
      source.dpoEmail || source.dataProtectionEmail || source.privacyContactEmail || "",
    phone: source.phone || source.publisherPhone || "",
    legalNotice:
      pages.legalNotice ||
      source.legalNotice ||
      source.legalNoticeText ||
      source.legalNoticeContent ||
      "",
    privacyPolicy:
      pages.privacyPolicy ||
      source.privacyPolicy ||
      source.privacyText ||
      source.privacyPolicyContent ||
      "",
    cookiePolicy:
      pages.cookiePolicy ||
      source.cookiePolicy ||
      source.cookiesPolicyContent ||
      "",
    terms:
      pages.terms || source.terms || source.termsContent || "",
  };
}

async function fetchLegalProfile(agencyId) {
  const normalizedAgencyId = normalizeAgencyId(agencyId);
  const candidates = [
    `/api/legal-profile/agencies/${normalizedAgencyId}`,
    `/api/legal-profile?agencyId=${normalizedAgencyId}`,
  ];

  for (const url of candidates) {
    const response = await fetch(url, {
      method: "GET",
      headers: tenantHeaders(),
      cache: "no-store",
    });

    if (response.status === 404) continue;
    return normalizeLegalProfile(await parseJsonResponse(response));
  }

  return normalizeLegalProfile({});
}

function buildLegalProfilePayload(agencyId, profile) {
  return {
    agencyId,
    publisherName: profile.companyName || null,
    publisherLegalForm: profile.legalForm || null,
    publisherShareCapital: profile.shareCapital || null,
    publisherRegistration: profile.registrationNumber || null,
    publisherVatNumber: profile.vatNumber || null,
    publisherAddress: profile.registeredOffice || null,
    publisherPhone: profile.phone || null,
    publisherEmail: profile.legalEmail || null,
    publicationDirector: profile.publicationDirector || null,
    hostingProvider: profile.hostingProvider || null,
    dataProtectionOfficer: profile.dpoEmail ? "DPO" : null,
    privacyContactEmail: profile.dpoEmail || profile.legalEmail || null,
    legalNoticeContent: profile.legalNotice || null,
    privacyPolicyContent: profile.privacyPolicy || null,
    cookiesPolicyContent: profile.cookiePolicy || null,
    termsContent: profile.terms || null,
  };
}

async function saveLegalProfile({ agencyId, profile }) {
  const normalizedAgencyId = normalizeAgencyId(agencyId);
  const payload = buildLegalProfilePayload(normalizedAgencyId, profile);
  const candidates = [
    {
      url: `/api/legal-profile/agencies/${normalizedAgencyId}`,
      method: "PUT",
    },
    {
      url: `/api/legal-profile?agencyId=${normalizedAgencyId}`,
      method: "PUT",
    },
    {
      url: `/api/legal-profile?agencyId=${normalizedAgencyId}`,
      method: "POST",
    },
  ];

  let lastError = null;

  for (const candidate of candidates) {
    const response = await fetch(candidate.url, {
      method: candidate.method,
      headers: {
        ...tenantHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (response.status === 404 || response.status === 405) continue;

    try {
      await parseJsonResponse(response);
      return await fetchLegalProfile(normalizedAgencyId);
    } catch (error) {
      lastError = error;
      if (error.status === 404 || error.status === 405) continue;
      throw error;
    }
  }

  throw (
    lastError ||
    new Error("Aucun contrat d’enregistrement du Legal Profile n’est disponible.")
  );
}

function validateLegalProfile(profile) {
  const errors = {};

  if (!String(profile.companyName || "").trim()) {
    errors.companyName = "La raison sociale est obligatoire.";
  }

  if (
    profile.legalEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.legalEmail)
  ) {
    errors.legalEmail = "L’adresse juridique est invalide.";
  }

  if (
    profile.dpoEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.dpoEmail)
  ) {
    errors.dpoEmail = "L’adresse du DPO est invalide.";
  }

  if (!String(profile.legalNotice || "").trim()) {
    errors.legalNotice = "Les mentions légales sont obligatoires.";
  }

  if (!String(profile.privacyPolicy || "").trim()) {
    errors.privacyPolicy = "La politique de confidentialité est obligatoire.";
  }

  return errors;
}

export {
  buildLegalProfilePayload,
  fetchLegalProfile,
  normalizeAgencyId,
  normalizeLegalProfile,
  saveLegalProfile,
  validateLegalProfile,
};
