"use client";

import React, {
  useEffect,
  useState,
} from "react";

import {
  deleteLegalProfileOverride,
  fetchLegalProfile,
  saveLegalProfile,
  validateLegalProfile,
} from "../../lib/brand-studio/index.js";

import {
  InheritanceNotice,
} from "./InheritanceNotice.jsx";

const EMPTY_PROFILE = {
  name: "",
  legalName: "",
  legalForm: "",
  shareCapital: "",
  registeredOffice: "",
  registrationNumber: "",
  vatNumber: "",
  travelRegistration: "",
  financialGuarantee: "",
  professionalInsurance: "",
  publicationDirector: "",
  hostingProvider: "",
  hostingAddress: "",
  hostingPhone: "",
  dataController: "",
  privacyContactEmail: "",
  dataProtectionOfficer: "",
  mediatorName: "",
  mediatorAddress: "",
  mediatorWebsite: "",
  legalNoticeContent: "",
  privacyPolicyContent: "",
  cookiePolicyContent: "",
  termsContent: "",
};

export function LegalProfileForm({
  tenantId,
  tenantSlug,
  agencyId = null,
  baseUrl = "",
}) {
  const [
    profile,
    setProfile,
  ] = useState(
    EMPTY_PROFILE
  );

  const [
    inherited,
    setInherited,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    message,
    setMessage,
  ] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const result =
        await fetchLegalProfile({
          tenantId,
          tenantSlug,
          agencyId,
          baseUrl,
        });

      setProfile({
        ...EMPTY_PROFILE,
        ...(result.resolved ||
          {}),
      });

      setInherited(
        result.inherited ===
        true
      );
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    () => {
      load();
    },
    [
      tenantId,
      tenantSlug,
      agencyId,
      baseUrl,
    ]
  );

  async function submit(
    event
  ) {
    event.preventDefault();

    const validation =
      validateLegalProfile(
        profile
      );

    setErrors(
      validation
    );

    if (
      Object.keys(
        validation
      ).length
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await saveLegalProfile({
        tenantId,
        tenantSlug,
        agencyId,
        profile,
        baseUrl,
      });

      setMessage(
        "Profil juridique enregistré."
      );

      await load();
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeOverride() {
    if (
      agencyId === null
    ) {
      return;
    }

    await deleteLegalProfileOverride({
      tenantId,
      tenantSlug,
      agencyId,
      baseUrl,
    });

    await load();
  }

  if (loading) {
    return (
      <p>
        Chargement du profil juridique…
      </p>
    );
  }

  const shortFields = [
    [
      "name",
      "Nom du profil",
    ],
    [
      "legalName",
      "Raison sociale",
    ],
    [
      "legalForm",
      "Forme juridique",
    ],
    [
      "shareCapital",
      "Capital social",
    ],
    [
      "registeredOffice",
      "Siège social",
    ],
    [
      "registrationNumber",
      "Immatriculation",
    ],
    [
      "vatNumber",
      "Numéro de TVA",
    ],
    [
      "travelRegistration",
      "Immatriculation tourisme",
    ],
    [
      "financialGuarantee",
      "Garantie financière",
    ],
    [
      "professionalInsurance",
      "Assurance professionnelle",
    ],
    [
      "publicationDirector",
      "Directeur de publication",
    ],
    [
      "hostingProvider",
      "Hébergeur",
    ],
    [
      "hostingAddress",
      "Adresse de l’hébergeur",
    ],
    [
      "hostingPhone",
      "Téléphone de l’hébergeur",
    ],
    [
      "dataController",
      "Responsable du traitement",
    ],
    [
      "privacyContactEmail",
      "Email confidentialité",
    ],
    [
      "dataProtectionOfficer",
      "Délégué à la protection des données",
    ],
    [
      "mediatorName",
      "Médiateur",
    ],
    [
      "mediatorAddress",
      "Adresse du médiateur",
    ],
    [
      "mediatorWebsite",
      "Site du médiateur",
    ],
  ];

  const contentFields = [
    [
      "legalNoticeContent",
      "Mentions légales",
    ],
    [
      "privacyPolicyContent",
      "Politique de confidentialité",
    ],
    [
      "cookiePolicyContent",
      "Politique de cookies",
    ],
    [
      "termsContent",
      "Conditions générales",
    ],
  ];

  return (
    <form onSubmit={submit}>
      <InheritanceNotice
        inherited={
          inherited
        }
        scope={
          agencyId === null
            ? "tenant"
            : "agency"
        }
        onRemoveOverride={
          agencyId === null
            ? null
            : removeOverride
        }
      />

      {shortFields.map(
        ([
          field,
          label,
        ]) => (
          <label key={field}>
            {label}

            <input
              value={
                profile[field] ||
                ""
              }
              onChange={
                (event) =>
                  setProfile({
                    ...profile,
                    [field]:
                      event.target
                        .value,
                  })
              }
            />

            {errors[field] ? (
              <span>
                {errors[field]}
              </span>
            ) : null}
          </label>
        )
      )}

      {contentFields.map(
        ([
          field,
          label,
        ]) => (
          <label key={field}>
            {label}

            <textarea
              rows={12}
              value={
                profile[field] ||
                ""
              }
              onChange={
                (event) =>
                  setProfile({
                    ...profile,
                    [field]:
                      event.target
                        .value,
                  })
              }
            />
          </label>
        )
      )}

      {message ? (
        <p aria-live="polite">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={
          saving
        }
      >
        {saving
          ? "Enregistrement…"
          : "Enregistrer le profil juridique"}
      </button>
    </form>
  );
}
