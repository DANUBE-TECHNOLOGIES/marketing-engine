"use client";

import React, {
  useEffect,
  useState,
} from "react";

import {
  BRAND_PROFILE_ASSET_FIELDS,
  deleteBrandProfileOverride,
  fetchBrandProfile,
  saveBrandProfile,
  validateBrandProfile,
} from "../../lib/brand-studio/index.js";

import {
  AssetPicker,
} from "./AssetPicker.jsx";

import {
  InheritanceNotice,
} from "./InheritanceNotice.jsx";

const EMPTY_PROFILE = {
  name: "",
  primaryColor: "",
  secondaryColor: "",
  accentColor: "",
  backgroundColor: "",
  textColor: "",
  headingFont: "",
  bodyFont: "",
  buttonRadius: 8,
  logoPrimaryId: null,
  logoLightId: null,
  logoDarkId: null,
  faviconId: null,
  heroDefaultId: null,
  openGraphId: null,
};

export function BrandProfileForm({
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
        await fetchBrandProfile({
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
      validateBrandProfile(
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
      await saveBrandProfile({
        tenantId,
        tenantSlug,
        agencyId,
        profile,
        baseUrl,
      });

      setMessage(
        "Identité visuelle enregistrée."
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

    await deleteBrandProfileOverride({
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
        Chargement de l’identité visuelle…
      </p>
    );
  }

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

      <label>
        Nom du profil
        <input
          value={
            profile.name ||
            ""
          }
          onChange={
            (event) =>
              setProfile({
                ...profile,
                name:
                  event.target
                    .value,
              })
          }
        />
      </label>

      {[
        [
          "primaryColor",
          "Couleur principale",
        ],
        [
          "secondaryColor",
          "Couleur secondaire",
        ],
        [
          "accentColor",
          "Couleur d’accent",
        ],
        [
          "backgroundColor",
          "Arrière-plan",
        ],
        [
          "textColor",
          "Texte",
        ],
      ].map(
        ([
          field,
          label,
        ]) => (
          <label key={field}>
            {label}
            <input
              type="color"
              value={
                profile[field] ||
                "#000000"
              }
              onChange={
                (event) =>
                  setProfile({
                    ...profile,
                    [field]:
                      event.target
                        .value
                        .toUpperCase(),
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

      <label>
        Police des titres
        <input
          value={
            profile.headingFont ||
            ""
          }
          onChange={
            (event) =>
              setProfile({
                ...profile,
                headingFont:
                  event.target
                    .value,
              })
          }
        />
      </label>

      <label>
        Police du texte
        <input
          value={
            profile.bodyFont ||
            ""
          }
          onChange={
            (event) =>
              setProfile({
                ...profile,
                bodyFont:
                  event.target
                    .value,
              })
          }
        />
      </label>

      {Object.entries(
        BRAND_PROFILE_ASSET_FIELDS
      ).map(
        ([
          field,
          kind,
        ]) => (
          <AssetPicker
            key={field}
            tenantId={
              tenantId
            }
            tenantSlug={
              tenantSlug
            }
            agencyId={
              agencyId
            }
            kind={kind}
            baseUrl={
              baseUrl
            }
            value={
              profile[field]
            }
            onChange={
              (assetId) =>
                setProfile({
                  ...profile,
                  [field]:
                    assetId,
                })
            }
          />
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
          : "Enregistrer l’identité visuelle"}
      </button>
    </form>
  );
}
