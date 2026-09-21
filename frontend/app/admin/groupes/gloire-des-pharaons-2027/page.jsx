"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "";

const DATE_LABELS = {
  "2027-01-02": "02/01",
  "2027-01-09": "09/01",
  "2027-01-16": "16/01",
  "2027-01-23": "23/01",
  "2027-01-30": "30/01",
  "2027-02-06": "06/02",
};

const INTENT_LABELS = {
  HIGH: "Forte",
  MEDIUM: "À confirmer",
  INFO: "Information",
};

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

function Metric({
  value,
  label,
  note,
}) {
  return (
    <div style={S.metric}>
      <strong style={S.metricValue}>
        {value}
      </strong>
      <span style={S.metricLabel}>
        {label}
      </span>
      {note ? (
        <small style={S.metricNote}>
          {note}
        </small>
      ) : null}
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}) {
  const palette = {
    high: {
      background: "#fee2e2",
      color: "#991b1b",
    },
    medium: {
      background: "#fef3c7",
      color: "#92400e",
    },
    info: {
      background: "#e0f2fe",
      color: "#075985",
    },
    neutral: {
      background: "#f1f5f9",
      color: "#475569",
    },
  };

  return (
    <span
      style={{
        ...S.badge,
        ...palette[tone],
      }}
    >
      {children}
    </span>
  );
}

export default function GroupsAdmin() {
  const [analytics, setAnalytics] =
    useState(null);

  const [items, setItems] =
    useState([]);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [intent, setIntent] =
    useState("ALL");

  const [origin, setOrigin] =
    useState("ALL");

  const [departure, setDeparture] =
    useState("ALL");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(
        API +
          "/api/group-campaigns/gloire-des-pharaons-2027/analytics",
        {
          credentials: "include",
          cache: "no-store",
        }
      ),
      fetch(
        API +
          "/api/group-campaigns/gloire-des-pharaons-2027/pre-registrations",
        {
          credentials: "include",
          cache: "no-store",
        }
      ),
    ])
      .then(async ([analyticsResponse, listResponse]) => {
        if (
          !analyticsResponse.ok ||
          !listResponse.ok
        ) {
          throw new Error("API");
        }

        const analyticsPayload =
          await analyticsResponse.json();

        const listPayload =
          await listResponse.json();

        if (!active) return;

        setAnalytics(analyticsPayload);
        setItems(listPayload.items || []);
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger les données du groupe."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle =
      search.trim().toLowerCase();

    return items.filter((item) => {
      if (
        intent !== "ALL" &&
        item.intent !== intent
      ) {
        return false;
      }

      if (
        origin !== "ALL" &&
        !(item.origins || []).includes(origin)
      ) {
        return false;
      }

      if (
        departure !== "ALL" &&
        !(item.departures || []).includes(
          departure
        )
      ) {
        return false;
      }

      if (needle) {
        const haystack = [
          item.name,
          item.email,
          item.phone,
          item.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(needle)) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    intent,
    origin,
    departure,
    search,
  ]);

  const filteredTravellers =
    useMemo(
      () =>
        filtered.reduce(
          (sum, item) =>
            sum +
            Number(
              item.travellerCount || 0
            ),
          0
        ),
      [filtered]
    );

  const bestCompatibility =
    useMemo(() => {
      if (!analytics?.dates) {
        return null;
      }

      return Object.entries(
        analytics.dates
      ).sort(
        (left, right) =>
          right[1].travellers -
          left[1].travellers
      )[0];
    }, [analytics]);

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <div style={S.kicker}>
            GROUPES · MONDESCALE
          </div>

          <h1 style={S.h1}>
            Gloire des Pharaons 2027
          </h1>

          <p style={S.lead}>
            Cockpit des préinscriptions et
            compatibilités de départ.
          </p>
        </div>

        <a
          href="/groupes/gloire-des-pharaons-2027"
          style={S.publicLink}
          target="_blank"
          rel="noreferrer"
        >
          Voir le tunnel ↗
        </a>
      </header>

      {error ? (
        <div style={S.error}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={S.loading}>
          Chargement du cockpit…
        </div>
      ) : null}

      {analytics ? (
        <>
          <section style={S.metrics}>
            <Metric
              value={
                analytics.summary
                  .registrations
              }
              label="Préinscriptions"
              note="contacts uniques enregistrés"
            />

            <Metric
              value={
                analytics.summary
                  .travellers
              }
              label="Voyageurs uniques"
              note="volume réel du funnel"
            />

            <Metric
              value={
                analytics.summary
                  .highIntentTravellers
              }
              label="Intention forte"
              note="voyageurs HIGH"
            />

            <Metric
              value={
                bestCompatibility
                  ? DATE_LABELS[
                      bestCompatibility[0]
                    ]
                  : "—"
              }
              label="Date la + compatible"
              note={
                bestCompatibility
                  ? `${bestCompatibility[1].travellers} voyageurs compatibles`
                  : "aucune donnée"
              }
            />
          </section>

          <section style={S.section}>
            <div style={S.sectionHead}>
              <div>
                <h2 style={S.h2}>
                  Matrice date × aéroport
                </h2>

                <p style={S.help}>
                  Chaque cellule indique des
                  voyageurs compatibles. Un
                  voyageur flexible peut donc
                  apparaître dans plusieurs
                  cellules. Ces valeurs ne
                  doivent pas être additionnées
                  pour calculer le volume réseau.
                </p>
              </div>
            </div>

            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>
                      Date
                    </th>
                    <th style={S.th}>
                      Compatibles
                    </th>
                    <th style={S.th}>
                      Préférence
                    </th>
                    <th style={S.th}>
                      Intention forte
                    </th>

                    {(analytics.campaign
                      ?.origins || []).map(
                      (airport) => (
                        <th
                          key={airport}
                          style={S.th}
                        >
                          {airport}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(
                    analytics.dates || {}
                  ).map(([date, row]) => (
                    <tr key={date}>
                      <td style={S.td}>
                        <strong>
                          {DATE_LABELS[
                            date
                          ] || date}
                        </strong>
                      </td>

                      <td style={S.td}>
                        <strong>
                          {row.travellers}
                        </strong>
                      </td>

                      <td style={S.td}>
                        {
                          row.preferredTravellers
                        }
                      </td>

                      <td style={S.td}>
                        {
                          row.highIntentTravellers
                        }
                      </td>

                      {(analytics.campaign
                        ?.origins || []).map(
                        (airport) => {
                          const cell =
                            row.origins?.[
                              airport
                            ];

                          return (
                            <td
                              key={airport}
                              style={S.td}
                            >
                              <strong>
                                {cell
                                  ?.travellers ||
                                  0}
                              </strong>

                              <small
                                style={
                                  S.cellNote
                                }
                              >
                                {cell
                                  ?.preferredTravellers ||
                                  0}{" "}
                                préf.
                              </small>
                            </td>
                          );
                        }
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>
              Lecture du portefeuille
            </h2>

            <div style={S.secondaryMetrics}>
              <Metric
                value={
                  analytics.summary
                    .flexibleDateTravellers
                }
                label="Flexibles sur la date"
              />

              <Metric
                value={
                  analytics.summary
                    .multiOriginTravellers
                }
                label="Flexibles aéroport"
              />

              <Metric
                value={
                  analytics.intent
                    ?.MEDIUM
                    ?.travellers || 0
                }
                label="À confirmer"
              />

              <Metric
                value={
                  analytics.intent
                    ?.INFO
                    ?.travellers || 0
                }
                label="Information"
              />
            </div>
          </section>
        </>
      ) : null}

      <section style={S.section}>
        <div style={S.sectionHead}>
          <div>
            <h2 style={S.h2}>
              Préinscriptions
            </h2>

            <p style={S.help}>
              {filtered.length} contact
              {filtered.length > 1
                ? "s"
                : ""}{" "}
              · {filteredTravellers} voyageur
              {filteredTravellers > 1
                ? "s"
                : ""}
            </p>
          </div>
        </div>

        <div style={S.filters}>
          <input
            style={S.input}
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Nom, email, téléphone, source…"
          />

          <select
            style={S.input}
            value={intent}
            onChange={(event) =>
              setIntent(
                event.target.value
              )
            }
          >
            <option value="ALL">
              Toutes intentions
            </option>
            <option value="HIGH">
              Intention forte
            </option>
            <option value="MEDIUM">
              À confirmer
            </option>
            <option value="INFO">
              Information
            </option>
          </select>

          <select
            style={S.input}
            value={origin}
            onChange={(event) =>
              setOrigin(
                event.target.value
              )
            }
          >
            <option value="ALL">
              Tous aéroports
            </option>
            <option value="PARIS">
              Paris
            </option>
            <option value="LYON">
              Lyon
            </option>
          </select>

          <select
            style={S.input}
            value={departure}
            onChange={(event) =>
              setDeparture(
                event.target.value
              )
            }
          >
            <option value="ALL">
              Toutes dates
            </option>

            {Object.entries(
              DATE_LABELS
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </div>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>
                  Contact
                </th>
                <th style={S.th}>
                  Voy.
                </th>
                <th style={S.th}>
                  Aéroport
                </th>
                <th style={S.th}>
                  Dates possibles
                </th>
                <th style={S.th}>
                  Préférence
                </th>
                <th style={S.th}>
                  Intention
                </th>
                <th style={S.th}>
                  Source
                </th>
                <th style={S.th}>
                  Créée
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td style={S.td}>
                    <strong>
                      {item.name}
                    </strong>
                    <small
                      style={S.contact}
                    >
                      {item.email}
                      {item.phone
                        ? ` · ${item.phone}`
                        : ""}
                    </small>
                  </td>

                  <td style={S.td}>
                    <strong>
                      {
                        item.travellerCount
                      }
                    </strong>
                  </td>

                  <td style={S.td}>
                    {(item.origins || [])
                      .join(" / ")}
                  </td>

                  <td style={S.td}>
                    {(item.departures || [])
                      .map(
                        (date) =>
                          DATE_LABELS[
                            date
                          ] || date
                      )
                      .join(", ")}
                  </td>

                  <td style={S.td}>
                    {item.preferredDeparture
                      ? DATE_LABELS[
                          item
                            .preferredDeparture
                        ] ||
                        item.preferredDeparture
                      : "Flexible"}
                  </td>

                  <td style={S.td}>
                    <Badge
                      tone={
                        item.intent ===
                        "HIGH"
                          ? "high"
                          : item.intent ===
                            "MEDIUM"
                          ? "medium"
                          : "info"
                      }
                    >
                      {INTENT_LABELS[
                        item.intent
                      ] ||
                        item.intent}
                    </Badge>
                  </td>

                  <td style={S.td}>
                    {item.source ||
                      "Direct"}
                  </td>

                  <td style={S.td}>
                    {formatDate(
                      item.createdAt
                    )}
                  </td>
                </tr>
              ))}

              {!filtered.length ? (
                <tr>
                  <td
                    style={S.empty}
                    colSpan={8}
                  >
                    Aucune préinscription
                    correspondant aux
                    filtres.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const S = {
  main: {
    padding: "34px 28px 70px",
    maxWidth: 1500,
    margin: "0 auto",
    fontFamily:
      "Arial, sans-serif",
    color: "#17212b",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 24,
    flexWrap: "wrap",
    marginBottom: 26,
  },

  kicker: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 2,
    color: "#9a6a22",
  },

  h1: {
    fontFamily:
      "Georgia, serif",
    fontSize: 42,
    margin: "8px 0 8px",
  },

  lead: {
    margin: 0,
    color: "#64748b",
  },

  publicLink: {
    padding: "12px 16px",
    borderRadius: 10,
    background: "#17212b",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  },

  metrics: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: 12,
  },

  secondaryMetrics: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
  },

  metric: {
    padding: 20,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
  },

  metricValue: {
    display: "block",
    fontSize: 32,
    color: "#9a6a22",
    marginBottom: 6,
  },

  metricLabel: {
    display: "block",
    fontWeight: 700,
  },

  metricNote: {
    display: "block",
    marginTop: 5,
    color: "#64748b",
  },

  section: {
    marginTop: 36,
  },

  sectionHead: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 20,
    alignItems: "flex-end",
    flexWrap: "wrap",
  },

  h2: {
    fontFamily:
      "Georgia, serif",
    fontSize: 27,
    margin: "0 0 8px",
  },

  help: {
    maxWidth: 850,
    margin: "0 0 14px",
    color: "#64748b",
    lineHeight: 1.55,
  },

  filters: {
    display: "grid",
    gridTemplateColumns:
      "minmax(260px,2fr) repeat(3,minmax(150px,1fr))",
    gap: 10,
    marginBottom: 14,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    font: "inherit",
  },

  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#fff",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 14,
  },

  th: {
    padding: "13px 14px",
    borderBottom:
      "1px solid #e2e8f0",
    background: "#f8fafc",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom:
      "1px solid #eef2f7",
    verticalAlign: "top",
  },

  contact: {
    display: "block",
    marginTop: 4,
    color: "#64748b",
    whiteSpace: "nowrap",
  },

  cellNote: {
    display: "block",
    marginTop: 3,
    color: "#64748b",
  },

  badge: {
    display: "inline-flex",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  empty: {
    padding: 30,
    textAlign: "center",
    color: "#64748b",
  },

  error: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 10,
    background: "#fee2e2",
    color: "#991b1b",
  },

  loading: {
    marginBottom: 20,
    color: "#64748b",
  },
};
