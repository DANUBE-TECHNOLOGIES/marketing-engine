"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchBrandStudioAgencies,
} from "../../lib/brand-studio/agencies-api";

function statusLabel(
  agency
) {
  if (
    agency.published ||
    agency.siteStatus ===
      "published"
  ) {
    return "Mini-site publié";
  }

  if (
    agency.siteStatus ===
    "draft"
  ) {
    return "Mini-site en brouillon";
  }

  if (
    agency.siteSlug
  ) {
    return "Mini-site configuré";
  }

  return "Mini-site non configuré";
}

export default function BrandAgencySelector({
  value,
  onChange,
  fallbackAgencyId = 6,
}) {
  const [
    agencies,
    setAgencies,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState(null);

  const [
    search,
    setSearch,
  ] =
    useState("");

  useEffect(
    () => {
      let active =
        true;

      async function load() {
        setLoading(true);
        setError(null);

        try {
          const result =
            await fetchBrandStudioAgencies();

          if (!active) {
            return;
          }

          setAgencies(
            result
          );

          const selectedExists =
            result.some(
              (agency) =>
                agency.id ===
                Number(value)
            );

          if (
            !selectedExists &&
            result.length
          ) {
            const fallback =
              result.find(
                (agency) =>
                  agency.id ===
                  Number(
                    fallbackAgencyId
                  )
              ) ||
              result[0];

            onChange(
              fallback.id,
              fallback
            );
          }
        } catch (loadError) {
          if (!active) {
            return;
          }

          setError(
            loadError.message
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      load();

      return () => {
        active =
          false;
      };
    },
    [
      fallbackAgencyId,
      onChange,
      value,
    ]
  );

  const filteredAgencies =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return agencies;
        }

        return agencies.filter(
          (agency) =>
            [
              agency.name,
              agency.city,
              agency.postalCode,
              agency.siteSlug,
            ]
              .filter(Boolean)
              .some(
                (field) =>
                  String(field)
                    .toLowerCase()
                    .includes(
                      query
                    )
              )
        );
      },
      [
        agencies,
        search,
      ]
    );

  const selectedAgency =
    agencies.find(
      (agency) =>
        agency.id ===
        Number(value)
    ) ||
    null;

  function selectAgency(
    event
  ) {
    const agencyId =
      Number(
        event.target.value
      );

    const agency =
      agencies.find(
        (item) =>
          item.id ===
          agencyId
      ) ||
      null;

    onChange(
      agencyId,
      agency
    );
  }

  return (
    <section className="brand-agency-selector">
      <div className="brand-agency-selector__fields">
        <label>
          <span>
            Rechercher une agence
          </span>

          <input
            type="search"
            value={
              search
            }
            onChange={
              (event) =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Nom, ville ou code postal"
            disabled={
              loading
            }
          />
        </label>

        <label>
          <span>
            Agence sélectionnée
          </span>

          <select
            value={
              value ||
              ""
            }
            onChange={
              selectAgency
            }
            disabled={
              loading ||
              !filteredAgencies.length
            }
          >
            {!filteredAgencies.length ? (
              <option value="">
                {loading
                  ? "Chargement des agences…"
                  : "Aucune agence disponible"}
              </option>
            ) : null}

            {filteredAgencies.map(
              (agency) => (
                <option
                  key={
                    agency.id
                  }
                  value={
                    agency.id
                  }
                >
                  {agency.label}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      {error ? (
        <div className="brand-agency-selector__error">
          <strong>
            Liste nominative indisponible
          </strong>

          <span>
            {error}
          </span>

          <label>
            <span>
              Identifiant de repli
            </span>

            <input
              type="number"
              min="1"
              value={
                value ||
                fallbackAgencyId
              }
              onChange={
                (event) =>
                  onChange(
                    Number(
                      event.target.value
                    ),
                    null
                  )
              }
            />
          </label>
        </div>
      ) : null}

      {selectedAgency ? (
        <article className="brand-agency-selector__summary">
          <div>
            <strong>
              {selectedAgency.name}
            </strong>

            <span>
              {[
                selectedAgency.postalCode,
                selectedAgency.city,
              ]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>

          <div>
            <span
              className={
                selectedAgency.published
                  ? "brand-agency-selector__status brand-agency-selector__status--published"
                  : "brand-agency-selector__status"
              }
            >
              {statusLabel(
                selectedAgency
              )}
            </span>

            {selectedAgency.siteSlug ? (
              <a
                href={
                  `/sites/${selectedAgency.siteSlug}`
                }
                target="_blank"
                rel="noreferrer"
              >
                Voir le mini-site
              </a>
            ) : null}
          </div>
        </article>
      ) : null}

      <style jsx>{`
        .brand-agency-selector {
          display: grid;
          gap: 14px;
          min-width: min(100%, 420px);
        }

        .brand-agency-selector__fields {
          display: grid;
          grid-template-columns: minmax(180px, 0.8fr) minmax(240px, 1.2fr);
          gap: 12px;
        }

        label {
          display: grid;
          gap: 7px;
          font-weight: 700;
        }

        input,
        select {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid #cfd4dc;
          border-radius: 9px;
          background: #fff;
          font: inherit;
        }

        .brand-agency-selector__summary {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 13px 15px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          background: #f7f8fa;
        }

        .brand-agency-selector__summary > div {
          display: grid;
          gap: 5px;
        }

        .brand-agency-selector__summary > div:last-child {
          justify-items: end;
        }

        .brand-agency-selector__summary span {
          color: #626a77;
          font-size: 13px;
        }

        .brand-agency-selector__summary a {
          color: #17191f;
          font-size: 13px;
          font-weight: 750;
        }

        .brand-agency-selector__status {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          background: #e9ebef;
          color: #525a66;
          font-weight: 700;
        }

        .brand-agency-selector__status--published {
          background: #dff3e5;
          color: #175d2d;
        }

        .brand-agency-selector__error {
          display: grid;
          gap: 7px;
          padding: 13px;
          border-radius: 9px;
          background: #fdeaea;
          color: #851e1e;
        }

        .brand-agency-selector__error label {
          margin-top: 5px;
        }

        @media (max-width: 780px) {
          .brand-agency-selector__fields {
            grid-template-columns: 1fr;
          }

          .brand-agency-selector__summary {
            display: grid;
          }

          .brand-agency-selector__summary > div:last-child {
            justify-items: start;
          }
        }
      `}</style>
    </section>
  );
}
