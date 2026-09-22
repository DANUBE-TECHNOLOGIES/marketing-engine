"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "";

const SLUG = "gloire-des-pharaons-2027";

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

const STATUS_LABELS = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  QUALIFIED: "Qualifié",
  OPTION: "Option",
  CONFIRMED: "Confirmé",
  CLOSED: "Clos",
};

const STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "OPTION",
  "CONFIRMED",
  "CLOSED",
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(date);
}

function toLocalInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local
    .toISOString()
    .slice(0, 16);
}

function toIso(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function Metric({
  value,
  label,
  note,
}) {
  return (
    <div style={S.metric}>
      <strong style={S.metricValue}>
        {value ?? 0}
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
    new: {
      background: "#f1f5f9",
      color: "#475569",
    },
    contacted: {
      background: "#e0f2fe",
      color: "#075985",
    },
    qualified: {
      background: "#ede9fe",
      color: "#5b21b6",
    },
    option: {
      background: "#fef3c7",
      color: "#92400e",
    },
    confirmed: {
      background: "#dcfce7",
      color: "#166534",
    },
    closed: {
      background: "#e5e7eb",
      color: "#374151",
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
        ...(palette[tone] ||
          palette.neutral),
      }}
    >
      {children}
    </span>
  );
}

function statusTone(status) {
  return String(
    status || "NEW"
  ).toLowerCase();
}

function operationalCell(
  analytics,
  date,
  airport
) {
  return (
    analytics?.operations?.allocation?.matrix?.[date]
      ?.origins?.[airport] || {}
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

  const [refreshing, setRefreshing] =
    useState(false);

  const [intent, setIntent] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [origin, setOrigin] =
    useState("ALL");

  const [departure, setDeparture] =
    useState("ALL");

  const [search, setSearch] =
    useState("");

  const [drafts, setDrafts] =
    useState({});

  const [savingId, setSavingId] =
    useState("");

  const [rowError, setRowError] =
    useState({});

  const [expandedId, setExpandedId] =
    useState("");

  const [notes, setNotes] =
    useState({});

  const [notesLoading, setNotesLoading] =
    useState({});

  const [noteDraft, setNoteDraft] =
    useState({});

  const [noteAuthor, setNoteAuthor] =
    useState({});

  const [noteSaving, setNoteSaving] =
    useState({});

  const [capacityDrafts, setCapacityDrafts] =
    useState({});
  const [capacitySaving, setCapacitySaving] =
    useState("");

  const [campaignSettings, setCampaignSettings] = useState({ status: "DRAFT", objectiveTravellers: "", minimumTravellers: "", decisionDeadline: "" });
  const [campaignSaving, setCampaignSaving] = useState(false);

  const loadData = useCallback(
    async ({ quiet = false } = {}) => {
      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          analyticsResponse,
          listResponse,
          capacityResponse,
          settingsResponse,
        ] = await Promise.all([
          fetch(
            `${API}/api/group-campaigns/${SLUG}/analytics`,
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
          fetch(
            `${API}/api/group-campaigns/${SLUG}/pre-registrations`,
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
          fetch(
            `${API}/api/group-campaigns/${SLUG}/capacities`,
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
          fetch(
            `${API}/api/group-campaigns/${SLUG}/settings`,
            { credentials: "include", cache: "no-store" }
          ),
        ]);

        if (
          !analyticsResponse.ok ||
          !listResponse.ok ||
          !capacityResponse.ok ||
          !settingsResponse.ok
        ) {
          throw new Error("API");
        }

        const analyticsPayload =
          await analyticsResponse.json();

        const listPayload =
          await listResponse.json();

        const capacityPayload =
          await capacityResponse.json();
        const settingsPayload = await settingsResponse.json();
        const settings = settingsPayload.item || {};
        setCampaignSettings({
          status: settings.status || "DRAFT",
          objectiveTravellers: settings.objectiveTravellers == null ? "" : String(settings.objectiveTravellers),
          minimumTravellers: settings.minimumTravellers == null ? "" : String(settings.minimumTravellers),
          decisionDeadline: toLocalInput(settings.decisionDeadline),
        });

        const capacityMap = {};
        for (const item of capacityPayload.items || []) {
          capacityMap[`${item.departure}::${item.origin}`] = {
            capacity: String(item.capacity ?? 0),
            target: item.target == null ? "" : String(item.target),
          };
        }
        setCapacityDrafts(capacityMap);

        const nextItems =
          listPayload.items || [];

        setAnalytics(analyticsPayload);
        setItems(nextItems);

        setDrafts((current) => {
          const next = {
            ...current,
          };

          for (const item of nextItems) {
            if (!next[item.id]) {
              next[item.id] =
                makeDraft(item);
            }
          }

          return next;
        });
      } catch {
        setError(
          "Impossible de charger les données du groupe."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        statusFilter !== "ALL" &&
        (item.status || "NEW") !==
          statusFilter
      ) {
        return false;
      }

      if (
        origin !== "ALL" &&
        !(item.origins || []).includes(
          origin
        )
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
          item.assignedTo,
          item.status,
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
    statusFilter,
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

  function patchDraft(id, patch) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        ...patch,
      },
    }));
  }

  async function saveOperations(item) {
    const draft =
      drafts[item.id] ||
      makeDraft(item);

    setSavingId(item.id);

    setRowError((current) => ({
      ...current,
      [item.id]: "",
    }));

    try {
      const allocatedDeparture =
        draft.allocatedDeparture ||
        null;

      const allocatedOrigin =
        draft.allocatedOrigin ||
        null;

      if (
        Boolean(allocatedDeparture) !==
        Boolean(allocatedOrigin)
      ) {
        throw new Error(
          "Choisissez ensemble une date et un aéroport, ou videz les deux."
        );
      }

      if (
        allocatedDeparture &&
        !(item.departures || []).includes(
          allocatedDeparture
        )
      ) {
        throw new Error(
          "Cette date n'est pas compatible avec cette préinscription."
        );
      }

      if (
        allocatedOrigin &&
        !(item.origins || []).includes(
          allocatedOrigin
        )
      ) {
        throw new Error(
          "Cet aéroport n'est pas compatible avec cette préinscription."
        );
      }

      const response = await fetch(
        `${API}/api/group-campaigns/${SLUG}/pre-registrations/${item.id}/operations`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status:
              draft.status || "NEW",
            assignedTo:
              draft.assignedTo.trim() ||
              null,
            nextActionAt: toIso(
              draft.nextActionAt
            ),
            allocatedDeparture,
            allocatedOrigin,
          }),
        }
      );

      const payload =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "La mise à jour a échoué."
        );
      }

      await loadData({
        quiet: true,
      });
    } catch (saveError) {
      setRowError((current) => ({
        ...current,
        [item.id]:
          saveError.message ||
          "La mise à jour a échoué.",
      }));
    } finally {
      setSavingId("");
    }
  }

  function clearAllocation(item) {
    patchDraft(item.id, {
      allocatedDeparture: "",
      allocatedOrigin: "",
    });
  }

  async function loadNotes(item) {
    setNotesLoading((current) => ({
      ...current,
      [item.id]: true,
    }));

    setRowError((current) => ({
      ...current,
      [item.id]: "",
    }));

    try {
      const response = await fetch(
        `${API}/api/group-campaigns/${SLUG}/pre-registrations/${item.id}/notes`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const payload =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Impossible de charger les notes."
        );
      }

      setNotes((current) => ({
        ...current,
        [item.id]:
          payload.items ||
          payload.notes ||
          [],
      }));
    } catch (notesError) {
      setRowError((current) => ({
        ...current,
        [item.id]:
          notesError.message ||
          "Impossible de charger les notes.",
      }));
    } finally {
      setNotesLoading((current) => ({
        ...current,
        [item.id]: false,
      }));
    }
  }

  async function toggleNotes(item) {
    if (expandedId === item.id) {
      setExpandedId("");
      return;
    }

    setExpandedId(item.id);

    await loadNotes(item);
  }

  async function addNote(item) {
    const content =
      (noteDraft[item.id] || "")
        .trim();

    if (!content) {
      setRowError((current) => ({
        ...current,
        [item.id]:
          "Saisissez une note avant de l'ajouter.",
      }));
      return;
    }

    setNoteSaving((current) => ({
      ...current,
      [item.id]: true,
    }));

    setRowError((current) => ({
      ...current,
      [item.id]: "",
    }));

    try {
      const response = await fetch(
        `${API}/api/group-campaigns/${SLUG}/pre-registrations/${item.id}/notes`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            content,
            author:
              (
                noteAuthor[item.id] ||
                drafts[item.id]
                  ?.assignedTo ||
                item.assignedTo ||
                ""
              ).trim() ||
              null,
          }),
        }
      );

      const payload =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Impossible d'ajouter la note."
        );
      }

      setNoteDraft((current) => ({
        ...current,
        [item.id]: "",
      }));

      await Promise.all([
        loadNotes(item),
        loadData({
          quiet: true,
        }),
      ]);
    } catch (noteError) {
      setRowError((current) => ({
        ...current,
        [item.id]:
          noteError.message ||
          "Impossible d'ajouter la note.",
      }));
    } finally {
      setNoteSaving((current) => ({
        ...current,
        [item.id]: false,
      }));
    }
  }

  const operations =
    analytics?.operations || {};

  const operationalSummary =
    operations.summary || operations;

  async function saveCapacity(departureValue, originValue) {
    const key = `${departureValue}::${originValue}`;
    const draft = capacityDrafts[key] || { capacity: "0", target: "" };
    setCapacitySaving(key);
    setError("");
    try {
      const response = await fetch(
        `${API}/api/group-campaigns/${SLUG}/capacities`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departure: departureValue,
            origin: originValue,
            capacity: Number(draft.capacity || 0),
            target: draft.target === "" ? null : Number(draft.target),
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Enregistrement de capacité impossible.");
      await loadData({ quiet: true });
    } catch (capacityError) {
      setError(capacityError.message || "Enregistrement de capacité impossible.");
    } finally {
      setCapacitySaving("");
    }
  }


  async function saveCampaignSettings() {
    setCampaignSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API}/api/group-campaigns/${SLUG}/settings`,
        {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: campaignSettings.status,
            objectiveTravellers: campaignSettings.objectiveTravellers === "" ? null : Number(campaignSettings.objectiveTravellers),
            minimumTravellers: campaignSettings.minimumTravellers === "" ? null : Number(campaignSettings.minimumTravellers),
            decisionDeadline: toIso(campaignSettings.decisionDeadline),
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Enregistrement du pilotage impossible.");
      await loadData({ quiet: true });
    } catch (campaignError) {
      setError(campaignError.message || "Enregistrement du pilotage impossible.");
    } finally {
      setCampaignSaving(false);
    }
  }

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
            Cockpit commercial :
            préinscriptions, compatibilités,
            suivi CRM et allocation réelle.
          </p>
        </div>

        <div style={S.headerActions}>
          <button
            type="button"
            style={S.secondaryButton}
            onClick={() =>
              loadData({
                quiet: true,
              })
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Actualisation…"
              : "Actualiser"}
          </button>

          <a
            href="/groupes/gloire-des-pharaons-2027"
            style={S.publicLink}
            target="_blank"
            rel="noreferrer"
          >
            Voir le tunnel ↗
          </a>
        </div>
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

      <section style={S.section}>
        <div style={S.sectionHead}>
          <div>
            <h2 style={S.h2}>Pilotage de la campagne</h2>
            <p style={S.help}>Objectif global, seuil de réalisation et alertes commerciales.</p>
          </div>
          <button type="button" style={S.secondaryButton} onClick={saveCampaignSettings} disabled={campaignSaving}>
            {campaignSaving ? "Enregistrement…" : "Enregistrer le pilotage"}
          </button>
        </div>
        <div style={S.secondaryMetrics}>
          <Metric value={analytics?.campaignPilot?.confirmedTravellers || 0} label="Confirmés" />
          <Metric value={analytics?.campaignPilot?.optionTravellers || 0} label="Options" />
          <Metric value={analytics?.campaignPilot?.committedTravellers || 0} label="Engagés" />
          <Metric value={analytics?.campaignPilot?.totalCapacity || 0} label="Capacité totale" />
          <Metric value={analytics?.campaignPilot?.remainingCapacity || 0} label="Places restantes" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginTop: 16 }}>
          <select style={S.input} value={campaignSettings.status} onChange={(e) => setCampaignSettings((v) => ({ ...v, status: e.target.value }))}>
            {["DRAFT","OPEN","GUARANTEED","FULL","CLOSED"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input style={S.input} type="number" min="0" placeholder="Objectif voyageurs" value={campaignSettings.objectiveTravellers} onChange={(e) => setCampaignSettings((v) => ({ ...v, objectiveTravellers: e.target.value }))} />
          <input style={S.input} type="number" min="0" placeholder="Seuil minimum" value={campaignSettings.minimumTravellers} onChange={(e) => setCampaignSettings((v) => ({ ...v, minimumTravellers: e.target.value }))} />
          <input style={S.input} type="datetime-local" value={campaignSettings.decisionDeadline} onChange={(e) => setCampaignSettings((v) => ({ ...v, decisionDeadline: e.target.value }))} />
        </div>
        {(analytics?.campaignPilot?.alerts || []).length ? (
          <div style={{ marginTop: 14 }}>
            {(analytics.campaignPilot.alerts || []).map((alert) => <div key={alert.code} style={S.help}><strong>{alert.code}</strong> — {alert.message}</div>)}
          </div>
        ) : <p style={S.help}>Aucune alerte commerciale active.</p>}
      </section>

          
      <section style={S.section}>
        <div style={S.sectionHead}>
          <div>
            <h2 style={S.h2}>Pilotage du remplissage</h2>
            <p style={S.help}>
              Capacité commerciale par départ et aéroport. Seuls OPTION et CONFIRMÉ consomment la capacité.
            </p>
          </div>
        </div>

        <div style={S.secondaryMetrics}>
          <Metric value={analytics?.operations?.attention?.overdueNextActions || 0} label="Relances en retard" />
          <Metric value={analytics?.operations?.attention?.unassignedRegistrations || 0} label="Non affectés" />
          <Metric value={analytics?.operations?.attention?.unallocatedQualifiedOrLater || 0} label="Qualifiés+ non alloués" />
        </div>

        <div style={{ ...S.tableWrap, marginTop: 16 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Départ</th>
                {(analytics?.campaign?.origins || []).map((airport) => (
                  <th key={airport} style={S.th}>{airport}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(analytics?.campaign?.departures || []).map((date) => (
                <tr key={date}>
                  <td style={S.td}><strong>{DATE_LABELS[date] || date}</strong></td>
                  {(analytics?.campaign?.origins || []).map((airport) => {
                    const key = `${date}::${airport}`;
                    const cell = analytics?.operations?.allocation?.matrix?.[date]?.[airport] || {};
                    const draft = capacityDrafts[key] || {
                      capacity: String(cell.capacity ?? 0),
                      target: cell.target == null ? "" : String(cell.target),
                    };
                    return (
                      <td key={key} style={S.td}>
                        <div><strong>{cell.confirmedTravellers || 0}</strong> confirmés · <strong>{cell.optionTravellers || 0}</strong> options</div>
                        <small style={S.cellNote}>
                          {cell.committedTravellers || 0} / {cell.capacity || 0} engagés · {cell.remainingCapacity ?? 0} restantes · {cell.fillRate == null ? "—" : `${Math.round(cell.fillRate * 100)} %`}
                        </small>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, marginTop: 8 }}>
                          <input
                            style={S.input}
                            type="number"
                            min="0"
                            aria-label={`Capacité ${date} ${airport}`}
                            value={draft.capacity}
                            onChange={(event) => setCapacityDrafts((current) => ({
                              ...current,
                              [key]: { ...draft, capacity: event.target.value },
                            }))}
                          />
                          <input
                            style={S.input}
                            type="number"
                            min="0"
                            placeholder="Objectif"
                            aria-label={`Objectif ${date} ${airport}`}
                            value={draft.target}
                            onChange={(event) => setCapacityDrafts((current) => ({
                              ...current,
                              [key]: { ...draft, target: event.target.value },
                            }))}
                          />
                          <button
                            type="button"
                            style={S.secondaryButton}
                            disabled={capacitySaving === key}
                            onClick={() => saveCapacity(date, airport)}
                          >
                            {capacitySaving === key ? "…" : "Enregistrer"}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
                  Pilotage opérationnel
                </h2>

                <p style={S.help}>
                  Ces volumes correspondent
                  aux décisions commerciales
                  réellement enregistrées. Une
                  allocation n'est comptée
                  qu'une seule fois, sur une
                  date et un aéroport précis.
                </p>
              </div>
            </div>

            <div
              style={S.secondaryMetrics}
            >
              <Metric
                value={
                  operationalSummary
                    .allocatedTravellers ??
                  operationalSummary
                    .allocated ??
                  0
                }
                label="Voyageurs alloués"
                note="date + aéroport décidés"
              />

              <Metric
                value={
                  operationalSummary
                    .optionTravellers ??
                  0
                }
                label="En option"
                note="capacité opérationnelle OPTION"
              />

              <Metric
                value={
                  operationalSummary
                    .confirmedTravellers ??
                  0
                }
                label="Confirmés"
                note="capacité opérationnelle CONFIRMED"
              />

              <Metric
                value={
                  operationalSummary
                    .followUpsDue ??
                  operationalSummary
                    .followUpsDueRegistrations ??
                  0
                }
                label="Relances dues"
                note="prochaine action arrivée à échéance"
              />
            </div>
          </section>

          <section style={S.section}>
            <div style={S.sectionHead}>
              <div>
                <h2 style={S.h2}>
                  Matrice opérationnelle
                </h2>

                <p style={S.help}>
                  Contrairement à la matrice
                  de compatibilité, cette
                  matrice représente les
                  allocations effectivement
                  décidées. Les cellules
                  peuvent donc être
                  additionnées.
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
                  {(analytics.campaign
                    ?.departures ||
                    Object.keys(
                      analytics.dates || {}
                    )
                  ).map((date) => (
                    <tr key={date}>
                      <td style={S.td}>
                        <strong>
                          {DATE_LABELS[
                            date
                          ] || date}
                        </strong>
                      </td>

                      {(analytics.campaign
                        ?.origins || []).map(
                        (airport) => {
                          const cell =
                            operationalCell(
                              analytics,
                              date,
                              airport
                            );

                          return (
                            <td
                              key={airport}
                              style={S.td}
                            >
                              <strong>
                                {cell.travellers ||
                                  0}
                              </strong>

                              <small
                                style={
                                  S.cellNote
                                }
                              >
                                {cell.optionTravellers ||
                                  0}{" "}
                                option ·{" "}
                                {cell.confirmedTravellers ||
                                  0}{" "}
                                confirmé
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
            <div style={S.sectionHead}>
              <div>
                <h2 style={S.h2}>
                  Matrice de compatibilité
                </h2>

                <p style={S.help}>
                  Chaque cellule indique des
                  voyageurs compatibles. Un
                  voyageur flexible peut
                  apparaître dans plusieurs
                  cellules. Ces valeurs ne
                  doivent jamais être
                  additionnées pour calculer
                  le volume réel.
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

            <div
              style={S.secondaryMetrics}
            >
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
              Préinscriptions & CRM
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
            placeholder="Nom, email, téléphone, conseiller, source…"
          />

          <select
            style={S.input}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              Tous statuts
            </option>

            {STATUSES.map((value) => (
              <option
                key={value}
                value={value}
              >
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>

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
            ).map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>
        </div>

        <div style={S.cards}>
          {filtered.map((item) => {
            const draft =
              drafts[item.id] ||
              makeDraft(item);

            const status =
              item.status || "NEW";

            const allocationComplete =
              item.allocatedDeparture &&
              item.allocatedOrigin;

            return (
              <article
                key={item.id}
                style={S.contactCard}
              >
                <div
                  style={
                    S.contactCardHeader
                  }
                >
                  <div>
                    <div
                      style={
                        S.contactTitleLine
                      }
                    >
                      <strong
                        style={
                          S.contactName
                        }
                      >
                        {item.name}
                      </strong>

                      <Badge
                        tone={statusTone(
                          status
                        )}
                      >
                        {STATUS_LABELS[
                          status
                        ] || status}
                      </Badge>

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
                    </div>

                    <div
                      style={
                        S.contactMeta
                      }
                    >
                      <span>
                        {item.email}
                      </span>

                      {item.phone ? (
                        <span>
                          {item.phone}
                        </span>
                      ) : null}

                      <span>
                        {
                          item.travellerCount
                        }{" "}
                        voyageur
                        {Number(
                          item.travellerCount
                        ) > 1
                          ? "s"
                          : ""}
                      </span>

                      <span>
                        Source :{" "}
                        {item.source ||
                          "Direct"}
                      </span>

                      <span>
                        Créée :{" "}
                        {formatDate(
                          item.createdAt
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={
                      S.secondaryButton
                    }
                    onClick={() =>
                      toggleNotes(item)
                    }
                  >
                    {expandedId ===
                    item.id
                      ? "Masquer notes"
                      : "Notes / historique"}
                  </button>
                </div>

                <div
                  style={
                    S.compatibilityBox
                  }
                >
                  <div>
                    <small
                      style={S.fieldLabel}
                    >
                      Aéroports compatibles
                    </small>

                    <strong>
                      {(item.origins || [])
                        .join(" / ") ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <small
                      style={S.fieldLabel}
                    >
                      Dates compatibles
                    </small>

                    <strong>
                      {(item.departures || [])
                        .map(
                          (date) =>
                            DATE_LABELS[
                              date
                            ] || date
                        )
                        .join(", ") ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <small
                      style={S.fieldLabel}
                    >
                      Préférence
                    </small>

                    <strong>
                      {item.preferredDeparture
                        ? DATE_LABELS[
                            item
                              .preferredDeparture
                          ] ||
                          item.preferredDeparture
                        : "Flexible"}
                    </strong>
                  </div>
                </div>

                <div
                  style={S.crmGrid}
                >
                  <label
                    style={S.field}
                  >
                    <span
                      style={
                        S.fieldLabel
                      }
                    >
                      Statut CRM
                    </span>

                    <select
                      style={S.input}
                      value={
                        draft.status
                      }
                      onChange={(
                        event
                      ) =>
                        patchDraft(
                          item.id,
                          {
                            status:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    >
                      {STATUSES.map(
                        (value) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {
                              STATUS_LABELS[
                                value
                              ]
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label
                    style={S.field}
                  >
                    <span
                      style={
                        S.fieldLabel
                      }
                    >
                      Conseiller
                    </span>

                    <input
                      style={S.input}
                      value={
                        draft.assignedTo
                      }
                      onChange={(
                        event
                      ) =>
                        patchDraft(
                          item.id,
                          {
                            assignedTo:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                      placeholder="Nom du conseiller"
                    />
                  </label>

                  <label
                    style={S.field}
                  >
                    <span
                      style={
                        S.fieldLabel
                      }
                    >
                      Prochaine action
                    </span>

                    <input
                      style={S.input}
                      type="datetime-local"
                      value={
                        draft.nextActionAt
                      }
                      onChange={(
                        event
                      ) =>
                        patchDraft(
                          item.id,
                          {
                            nextActionAt:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    />
                  </label>
                </div>

                <div
                  style={
                    S.allocationPanel
                  }
                >
                  <div>
                    <strong>
                      Allocation
                      opérationnelle
                    </strong>

                    <small
                      style={S.blockHelp}
                    >
                      La date et
                      l'aéroport sont
                      enregistrés
                      ensemble. Seules
                      les compatibilités
                      déclarées par ce
                      prospect sont
                      proposées.
                    </small>
                  </div>

                  <div
                    style={
                      S.allocationGrid
                    }
                  >
                    <label
                      style={S.field}
                    >
                      <span
                        style={
                          S.fieldLabel
                        }
                      >
                        Date allouée
                      </span>

                      <select
                        style={S.input}
                        value={
                          draft
                            .allocatedDeparture
                        }
                        onChange={(
                          event
                        ) =>
                          patchDraft(
                            item.id,
                            {
                              allocatedDeparture:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                      >
                        <option value="">
                          Non allouée
                        </option>

                        {(
                          item.departures ||
                          []
                        ).map(
                          (date) => (
                            <option
                              key={
                                date
                              }
                              value={
                                date
                              }
                            >
                              {DATE_LABELS[
                                date
                              ] ||
                                date}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label
                      style={S.field}
                    >
                      <span
                        style={
                          S.fieldLabel
                        }
                      >
                        Aéroport alloué
                      </span>

                      <select
                        style={S.input}
                        value={
                          draft
                            .allocatedOrigin
                        }
                        onChange={(
                          event
                        ) =>
                          patchDraft(
                            item.id,
                            {
                              allocatedOrigin:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                      >
                        <option value="">
                          Non alloué
                        </option>

                        {(
                          item.origins ||
                          []
                        ).map(
                          (airport) => (
                            <option
                              key={
                                airport
                              }
                              value={
                                airport
                              }
                            >
                              {
                                airport
                              }
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>

                  <div
                    style={
                      S.allocationActions
                    }
                  >
                    <button
                      type="button"
                      style={
                        S.secondaryButton
                      }
                      onClick={() =>
                        clearAllocation(
                          item
                        )
                      }
                    >
                      Vider
                      l'allocation
                    </button>

                    {allocationComplete ? (
                      <Badge tone="confirmed">
                        {DATE_LABELS[
                          item
                            .allocatedDeparture
                        ] ||
                          item
                            .allocatedDeparture}{" "}
                        ·{" "}
                        {
                          item
                            .allocatedOrigin
                        }
                      </Badge>
                    ) : (
                      <Badge tone="neutral">
                        Non alloué
                      </Badge>
                    )}
                  </div>
                </div>

                <div
                  style={S.saveRow}
                >
                  <div>
                    {item.nextActionAt ? (
                      <small
                        style={
                          S.blockHelp
                        }
                      >
                        Prochaine action
                        enregistrée :{" "}
                        {formatDate(
                          item.nextActionAt
                        )}
                      </small>
                    ) : null}

                    {item.lastNote ? (
                      <small
                        style={
                          S.blockHelp
                        }
                      >
                        Dernière note :{" "}
                        {item.lastNote}
                      </small>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    style={
                      S.primaryButton
                    }
                    disabled={
                      savingId ===
                      item.id
                    }
                    onClick={() =>
                      saveOperations(
                        item
                      )
                    }
                  >
                    {savingId ===
                    item.id
                      ? "Enregistrement…"
                      : "Enregistrer le suivi"}
                  </button>
                </div>

                {rowError[item.id] ? (
                  <div
                    style={
                      S.inlineError
                    }
                  >
                    {
                      rowError[
                        item.id
                      ]
                    }
                  </div>
                ) : null}

                {expandedId ===
                item.id ? (
                  <div
                    style={
                      S.notesPanel
                    }
                  >
                    <div
                      style={
                        S.notesHeader
                      }
                    >
                      <strong>
                        Historique des
                        notes
                      </strong>

                      <button
                        type="button"
                        style={
                          S.textButton
                        }
                        onClick={() =>
                          loadNotes(
                            item
                          )
                        }
                      >
                        Actualiser
                      </button>
                    </div>

                    {notesLoading[
                      item.id
                    ] ? (
                      <div
                        style={
                          S.loading
                        }
                      >
                        Chargement des
                        notes…
                      </div>
                    ) : null}

                    {!notesLoading[
                      item.id
                    ] &&
                    !(
                      notes[item.id] ||
                      []
                    ).length ? (
                      <div
                        style={
                          S.emptyNotes
                        }
                      >
                        Aucune note pour
                        le moment.
                      </div>
                    ) : null}

                    <div
                      style={
                        S.notesList
                      }
                    >
                      {(
                        notes[item.id] ||
                        []
                      ).map((note) => (
                        <div
                          key={
                            note.id
                          }
                          style={
                            S.note
                          }
                        >
                          <div
                            style={
                              S.noteMeta
                            }
                          >
                            <strong>
                              {note.author ||
                                "Agence"}
                            </strong>

                            <span>
                              {formatDate(
                                note.createdAt
                              )}
                            </span>
                          </div>

                          <div
                            style={
                              S.noteContent
                            }
                          >
                            {
                              note.content
                            }
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={
                        S.noteComposer
                      }
                    >
                      <input
                        style={S.input}
                        value={
                          noteAuthor[
                            item.id
                          ] || ""
                        }
                        onChange={(
                          event
                        ) =>
                          setNoteAuthor(
                            (
                              current
                            ) => ({
                              ...current,
                              [item.id]:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder={
                          draft.assignedTo
                            ? `Auteur (défaut : ${draft.assignedTo})`
                            : "Auteur / conseiller"
                        }
                      />

                      <textarea
                        style={
                          S.textarea
                        }
                        value={
                          noteDraft[
                            item.id
                          ] || ""
                        }
                        onChange={(
                          event
                        ) =>
                          setNoteDraft(
                            (
                              current
                            ) => ({
                              ...current,
                              [item.id]:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="Compte rendu d'appel, demande client, relance, option posée…"
                        rows={3}
                      />

                      <button
                        type="button"
                        style={
                          S.primaryButton
                        }
                        disabled={
                          noteSaving[
                            item.id
                          ]
                        }
                        onClick={() =>
                          addNote(item)
                        }
                      >
                        {noteSaving[
                          item.id
                        ]
                          ? "Ajout…"
                          : "Ajouter la note"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}

          {!filtered.length ? (
            <div style={S.empty}>
              Aucune préinscription
              correspondant aux filtres.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function makeDraft(item) {
  return {
    status:
      item.status || "NEW",
    assignedTo:
      item.assignedTo || "",
    nextActionAt:
      toLocalInput(
        item.nextActionAt
      ),
    allocatedDeparture:
      item.allocatedDeparture || "",
    allocatedOrigin:
      item.allocatedOrigin || "",
  };
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

  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
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

  primaryButton: {
    padding: "11px 15px",
    border: 0,
    borderRadius: 10,
    background: "#17212b",
    color: "#fff",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "10px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    color: "#17212b",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },

  textButton: {
    padding: 0,
    border: 0,
    background: "transparent",
    color: "#9a6a22",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
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
    border:
      "1px solid #e2e8f0",
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
      "minmax(260px,2fr) repeat(4,minmax(145px,1fr))",
    gap: 10,
    marginBottom: 16,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    font: "inherit",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    font: "inherit",
    resize: "vertical",
  },

  tableWrap: {
    overflowX: "auto",
    border:
      "1px solid #e2e8f0",
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

  cards: {
    display: "grid",
    gap: 14,
  },

  contactCard: {
    border:
      "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
  },

  contactCardHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 18,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  contactTitleLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  contactName: {
    fontSize: 19,
  },

  contactMeta: {
    display: "flex",
    gap: "6px 14px",
    flexWrap: "wrap",
    marginTop: 7,
    color: "#64748b",
    fontSize: 13,
  },

  compatibilityBox: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
    marginTop: 16,
    padding: 14,
    background: "#f8fafc",
    borderRadius: 12,
  },

  crmGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: 12,
    marginTop: 16,
  },

  allocationPanel: {
    marginTop: 16,
    padding: 15,
    border:
      "1px solid #e2e8f0",
    borderRadius: 12,
  },

  allocationGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: 12,
    marginTop: 12,
  },

  allocationActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
  },

  field: {
    display: "grid",
    gap: 6,
  },

  fieldLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
  },

  blockHelp: {
    display: "block",
    color: "#64748b",
    lineHeight: 1.5,
    marginTop: 5,
  },

  saveRow: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 16,
    alignItems: "flex-end",
    flexWrap: "wrap",
    marginTop: 16,
  },

  inlineError: {
    marginTop: 12,
    padding: 10,
    borderRadius: 9,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 13,
  },

  notesPanel: {
    marginTop: 18,
    paddingTop: 18,
    borderTop:
      "1px solid #e2e8f0",
  },

  notesHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    alignItems: "center",
  },

  notesList: {
    display: "grid",
    gap: 9,
    marginTop: 12,
  },

  note: {
    padding: 12,
    background: "#f8fafc",
    borderRadius: 10,
  },

  noteMeta: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 10,
    color: "#64748b",
    fontSize: 12,
  },

  noteContent: {
    marginTop: 7,
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },

  noteComposer: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },

  emptyNotes: {
    marginTop: 12,
    color: "#64748b",
  },

  empty: {
    padding: 30,
    textAlign: "center",
    color: "#64748b",
    border:
      "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#fff",
  },

  error: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 10,
    background: "#fee2e2",
    color: "#991b1b",
  },

  loading: {
    marginTop: 10,
    marginBottom: 10,
    color: "#64748b",
  },
};
