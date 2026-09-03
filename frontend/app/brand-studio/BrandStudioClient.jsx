"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AssetLibrary,
  AssetUploader,
  BrandProfileForm,
  BrandStudioDiagnostic,
  LegalProfileForm,
} from "../../components/brand-studio/index.js";

import styles from "./brand-studio-v2.module.css";

const TENANT_SLUG =
  "mondescale";

const TABS = [
  {
    id:
      "identity",

    label:
      "Identité visuelle",
  },

  {
    id:
      "media",

    label:
      "Médiathèque",
  },

  {
    id:
      "legal",

    label:
      "Informations juridiques",
  },

  {
    id:
      "diagnostic",

    label:
      "Diagnostic",
  },
];

const MEDIA_KINDS = [
  {
    id:
      "logo-primary",

    label:
      "Logos principaux",
  },

  {
    id:
      "logo-light",

    label:
      "Logos clairs",
  },

  {
    id:
      "logo-dark",

    label:
      "Logos sombres",
  },

  {
    id:
      "favicon",

    label:
      "Favicons",
  },

  {
    id:
      "hero",

    label:
      "Images Hero",
  },

  {
    id:
      "cover",

    label:
      "Images de couverture",
  },

  {
    id:
      "open-graph",

    label:
      "Images OpenGraph",
  },

  {
    id:
      "gallery",

    label:
      "Galerie",
  },

  {
    id:
      "document",

    label:
      "Documents",
  },
];

function normalizeSites(
  payload
) {
  const candidates = [
    payload,
    payload?.sites,
    payload?.data,
    payload?.items,
  ];

  const list =
    candidates.find(
      Array.isArray
    ) ||
    [];

  const agencies =
    list
      .map(
        (
          site
        ) => {
          const agency =
            site.agency ||
            {};

          const agencyId =
            Number(
              site.agencyId ??
              agency.id
            );

          if (
            !Number.isInteger(
              agencyId
            )
          ) {
            return null;
          }

          return {
            id:
              agencyId,

            name:
              agency.name ||
              site.name ||
              `Agence ${agencyId}`,

            city:
              agency.city ||
              "",

            siteSlug:
              site.slug ||
              "",
          };
        }
      )
      .filter(Boolean);

  const deduplicated =
    new Map();

  for (
    const agency
    of agencies
  ) {
    deduplicated.set(
      agency.id,
      agency
    );
  }

  return [
    ...deduplicated
      .values(),
  ].sort(
    (
      left,
      right
    ) =>
      left.name.localeCompare(
        right.name,
        "fr"
      )
  );
}

export default function BrandStudioClient() {
  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "identity"
  );

  const [
    scope,
    setScope,
  ] = useState(
    "tenant"
  );

  const [
    agencyId,
    setAgencyId,
  ] = useState(
    null
  );

  const [
    agencies,
    setAgencies,
  ] = useState([]);

  const [
    loadingAgencies,
    setLoadingAgencies,
  ] = useState(true);

  const [
    agencyError,
    setAgencyError,
  ] = useState("");

  const [
    mediaKind,
    setMediaKind,
  ] = useState(
    "logo-primary"
  );

  const [
    mediaRefresh,
    setMediaRefresh,
  ] = useState(0);

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        setLoadingAgencies(
          true
        );

        setAgencyError("");

        try {
          const response =
            await fetch(
              "/api/website-builder/sites",
              {
                headers: {
                  Accept:
                    "application/json",

                  "x-tenant-slug":
                    TENANT_SLUG,
                },

                cache:
                  "no-store",
              }
            );

          if (!response.ok) {
            throw new Error(
              `Impossible de charger les agences — HTTP ${response.status}`
            );
          }

          const payload =
            await response.json();

          const normalized =
            normalizeSites(
              payload
            );

          if (!cancelled) {
            setAgencies(
              normalized
            );

            if (
              normalized.length &&
              agencyId ===
                null
            ) {
              setAgencyId(
                normalized[0]
                  .id
              );
            }
          }
        } catch (error) {
          if (!cancelled) {
            setAgencyError(
              error.message
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingAgencies(
              false
            );
          }
        }
      }

      load();

      return () => {
        cancelled =
          true;
      };
    },
    []
  );

  const effectiveAgencyId =
    scope ===
    "agency"
      ? agencyId
      : null;

  const selectedAgency =
    useMemo(
      () =>
        agencies.find(
          (
            agency
          ) =>
            agency.id ===
            agencyId
        ) ||
        null,
      [
        agencies,
        agencyId,
      ]
    );

  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.header
        }
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            Mondescale Platform
          </p>

          <h1>
            Brand Studio
          </h1>

          <p
            className={
              styles.introduction
            }
          >
            Gérez l’identité visuelle, les médias et
            les informations juridiques utilisées par
            les mini-sites du réseau.
          </p>
        </div>

        <div
          className={
            styles.scopeCard
          }
        >
          <label>
            Niveau de configuration

            <select
              value={
                scope
              }
              onChange={
                (
                  event
                ) =>
                  setScope(
                    event
                      .target
                      .value
                  )
              }
            >
              <option
                value="tenant"
              >
                Société — paramètres communs
              </option>

              <option
                value="agency"
              >
                Agence — surcharge locale
              </option>
            </select>
          </label>

          {scope ===
          "agency" ? (
            <label>
              Agence

              <select
                value={
                  agencyId ??
                  ""
                }
                disabled={
                  loadingAgencies
                }
                onChange={
                  (
                    event
                  ) =>
                    setAgencyId(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                }
              >
                {agencies.map(
                  (
                    agency
                  ) => (
                    <option
                      key={
                        agency.id
                      }
                      value={
                        agency.id
                      }
                    >
                      {agency.name}
                      {agency.city
                        ? ` — ${agency.city}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>
          ) : null}

          {agencyError ? (
            <p
              role="alert"
              className={
                styles.error
              }
            >
              {agencyError}
            </p>
          ) : null}

          <p
            className={
              styles.scopeSummary
            }
          >
            {scope ===
            "tenant"
              ? "Les paramètres sont hérités par toutes les agences."
              : selectedAgency
                ? `Surcharge locale : ${selectedAgency.name}.`
                : "Sélectionnez une agence."}
          </p>
        </div>
      </header>

      <nav
        className={
          styles.tabs
        }
        aria-label="Sections du Brand Studio"
      >
        {TABS.map(
          (
            tab
          ) => (
            <button
              key={
                tab.id
              }
              type="button"
              className={
                activeTab ===
                tab.id
                  ? styles.activeTab
                  : styles.tab
              }
              onClick={
                () =>
                  setActiveTab(
                    tab.id
                  )
              }
            >
              {tab.label}
            </button>
          )
        )}
      </nav>

      <section
        className={
          styles.content
        }
      >
        {activeTab ===
        "identity" ? (
          <BrandProfileForm
            key={
              `brand-${
                effectiveAgencyId ??
                "tenant"
              }`
            }
            tenantSlug={
              TENANT_SLUG
            }
            agencyId={
              effectiveAgencyId
            }
          />
        ) : null}

        {activeTab ===
        "media" ? (
          <div
            className={
              styles.mediaSection
            }
          >
            <aside
              className={
                styles.mediaKinds
              }
            >
              <h2>
                Catégories
              </h2>

              {MEDIA_KINDS.map(
                (
                  kind
                ) => (
                  <button
                    key={
                      kind.id
                    }
                    type="button"
                    className={
                      mediaKind ===
                        kind.id
                        ? styles.activeKind
                        : styles.kind
                    }
                    onClick={
                      () =>
                        setMediaKind(
                          kind.id
                        )
                    }
                  >
                    {kind.label}
                  </button>
                )
              )}
            </aside>

            <div
              className={
                styles.mediaContent
              }
            >
              <AssetUploader
                tenantSlug={
                  TENANT_SLUG
                }
                agencyId={
                  effectiveAgencyId
                }
                kind={
                  mediaKind
                }
                onUploaded={
                  () =>
                    setMediaRefresh(
                      (
                        current
                      ) =>
                        current +
                        1
                    )
                }
              />

              <AssetLibrary
                tenantSlug={
                  TENANT_SLUG
                }
                agencyId={
                  effectiveAgencyId
                }
                kind={
                  mediaKind
                }
                refreshKey={
                  mediaRefresh
                }
              />
            </div>
          </div>
        ) : null}

        {activeTab ===
        "legal" ? (
          <LegalProfileForm
            key={
              `legal-${
                effectiveAgencyId ??
                "tenant"
              }`
            }
            tenantSlug={
              TENANT_SLUG
            }
            agencyId={
              effectiveAgencyId
            }
          />
        ) : null}

        {activeTab ===
        "diagnostic" ? (
          <BrandStudioDiagnostic
            tenantSlug={
              TENANT_SLUG
            }
          />
        ) : null}
      </section>
    </main>
  );
}
