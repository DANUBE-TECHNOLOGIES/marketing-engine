"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const TYPES = [
  ["", "Tous les types"],
  ["country", "Pays"],
  ["region", "Région"],
  ["destination", "Destination"],
  ["city", "Ville"],
  ["island", "Île"],
  ["hotel", "Hôtel"],
  ["activity", "Activité"],
  ["restaurant", "Restaurant"],
  ["circuit", "Circuit"],
  ["cruise", "Croisière"],
  ["travel_product", "Produit de voyage"],
  ["travel_theme", "Thématique"],
  ["offer", "Offre"],
  ["article", "Article"],
  ["faq", "FAQ"],
  ["advice", "Conseil"],
  ["media", "Média"],
  ["other", "Autre"],
];

const STATUSES = [
  ["", "Tous les statuts"],
  ["draft", "Brouillon"],
  ["review", "À valider"],
  ["published", "Publié"],
  ["archived", "Archivé"],
];

const INITIAL_FORM = {
  type: "destination",
  title: "",
  slug: "",
  summary: "",
  status: "draft",
  language: "fr",
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f4f6f8",
    color: "#17202a",
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    alignItems: "flex-start",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.15,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    maxWidth: "760px",
    lineHeight: 1.5,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },
  filters: {
    display: "grid",
    gridTemplateColumns:
      "minmax(220px, 2fr) minmax(170px, 1fr) minmax(170px, 1fr) auto",
    gap: "12px",
    padding: "18px",
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    minHeight: "44px",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#17202a",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#17202a",
    fontSize: "14px",
    boxSizing: "border-box",
    resize: "vertical",
  },
  button: {
    minHeight: "44px",
    padding: "10px 16px",
    border: 0,
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
  },
  primaryButton: {
    background: "#0f766e",
    color: "#ffffff",
  },
  secondaryButton: {
    background: "#e2e8f0",
    color: "#1e293b",
  },
  dangerButton: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
  },
  th: {
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "12px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#64748b",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "16px",
    borderBottom: "1px solid #edf2f7",
    verticalAlign: "top",
    fontSize: "14px",
  },
  form: {
    padding: "20px",
    position: "sticky",
    top: "20px",
  },
  field: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: 700,
    fontSize: "13px",
    color: "#334155",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    background: "#e2e8f0",
    color: "#334155",
  },
  error: {
    padding: "12px 14px",
    marginBottom: "16px",
    borderRadius: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
  success: {
    padding: "12px 14px",
    marginBottom: "16px",
    borderRadius: "10px",
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  empty: {
    padding: "48px 24px",
    textAlign: "center",
    color: "#64748b",
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    flexWrap: "wrap",
  },
};

function getStatusLabel(status) {
  return (
    STATUSES.find(([value]) => value === status)?.[1] ||
    status
  );
}

function getTypeLabel(type) {
  return (
    TYPES.find(([value]) => value === type)?.[1] ||
    type
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function KnowledgePage() {
  const [entities, setEntities] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    type: "",
    status: "",
  });

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(pagination.page));
    params.set("pageSize", String(pagination.pageSize));

    if (appliedFilters.search) {
      params.set("search", appliedFilters.search);
    }

    if (appliedFilters.type) {
      params.set("type", appliedFilters.type);
    }

    if (appliedFilters.status) {
      params.set("status", appliedFilters.status);
    }

    return params.toString();
  }, [
    appliedFilters,
    pagination.page,
    pagination.pageSize,
  ]);

  const loadEntities = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/knowledge?${queryString}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "Impossible de charger les connaissances."
        );
      }

      setEntities(result.data || []);
      setPagination((current) => ({
        ...current,
        ...(result.pagination || {}),
      }));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setAppliedFilters({
      search: filters.search.trim(),
      type: filters.type,
      status: filters.status,
    });
  }

  function clearFilters() {
    const emptyFilters = {
      search: "",
      type: "",
      status: "",
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  async function createEntity(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        type: form.type,
        title: form.title,
        summary: form.summary || null,
        status: form.status,
        language: form.language,
      };

      if (form.slug.trim()) {
        payload.slug = form.slug.trim();
      }

      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La création a échoué."
        );
      }

      setForm(INITIAL_FORM);
      setSuccess(
        `« ${result.data.title} » a été créé avec succès.`
      );

      setPagination((current) => ({
        ...current,
        page: 1,
      }));

      await loadEntities();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntity(entity) {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${entity.title} » ?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(entity.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/knowledge/${entity.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La suppression a échoué."
        );
      }

      setSuccess(
        `« ${entity.title} » a été supprimé.`
      );

      await loadEntities();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Marketing Knowledge Graph
            </h1>

            <p style={styles.subtitle}>
              Centralisez les destinations, villes, conseils,
              offres et contenus réutilisables par les
              mini-sites, newsletters, Google Posts et futures
              campagnes Mondescale.
            </p>
          </div>

          <div style={styles.badge}>
            {pagination.total} connaissance
            {pagination.total > 1 ? "s" : ""}
          </div>
        </header>

        {error ? (
          <div style={styles.error}>{error}</div>
        ) : null}

        {success ? (
          <div style={styles.success}>{success}</div>
        ) : null}

        <form
          onSubmit={applyFilters}
          style={{
            ...styles.card,
            ...styles.filters,
          }}
        >
          <input
            type="search"
            placeholder="Rechercher un titre, résumé ou slug…"
            value={filters.search}
            onChange={(event) =>
              updateFilter("search", event.target.value)
            }
            style={styles.input}
          />

          <select
            value={filters.type}
            onChange={(event) =>
              updateFilter("type", event.target.value)
            }
            style={styles.input}
          >
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) =>
              updateFilter("status", event.target.value)
            }
            style={styles.input}
          >
            {STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              type="submit"
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
            >
              Filtrer
            </button>

            <button
              type="button"
              onClick={clearFilters}
              style={{
                ...styles.button,
                ...styles.secondaryButton,
              }}
            >
              Effacer
            </button>
          </div>
        </form>

        <div style={styles.layout}>
          <section style={styles.card}>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Connaissance</th>
                    <th style={styles.th}>Langue</th>
                    <th style={styles.th}>Statut</th>
                    <th style={styles.th}>
                      Modification
                    </th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={styles.empty}
                      >
                        Chargement…
                      </td>
                    </tr>
                  ) : entities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={styles.empty}
                      >
                        Aucune connaissance ne correspond aux
                        critères.
                      </td>
                    </tr>
                  ) : (
                    entities.map((entity) => (
                      <tr key={entity.id}>
                        <td style={styles.td}>
                          <span style={styles.badge}>
                            {getTypeLabel(entity.type)}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <a
                              href={`/knowledge/${entity.id}`}
                              style={{
                                color: "#0f766e",
                                fontWeight: 800,
                                textDecoration: "none",
                              }}
                            >
                              {entity.title}
                            </a>

                          <div
                            style={{
                              color: "#64748b",
                              marginTop: "5px",
                              fontSize: "13px",
                            }}
                          >
                            /{entity.slug}
                          </div>

                          {entity.summary ? (
                            <div
                              style={{
                                marginTop: "8px",
                                color: "#475569",
                                lineHeight: 1.4,
                              }}
                            >
                              {entity.summary}
                            </div>
                          ) : null}
                        </td>

                        <td style={styles.td}>
                          {entity.language}
                        </td>

                        <td style={styles.td}>
                          <span style={styles.badge}>
                            {getStatusLabel(entity.status)}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {formatDate(entity.updatedAt)}
                        </td>

                        <td style={styles.td}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <a
                              href={`/api/knowledge/${entity.id}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                ...styles.button,
                                ...styles.secondaryButton,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              JSON
                            </a>

                            <button
                              type="button"
                              disabled={
                                deletingId === entity.id
                              }
                              onClick={() =>
                                deleteEntity(entity)
                              }
                              style={{
                                ...styles.button,
                                ...styles.dangerButton,
                                opacity:
                                  deletingId === entity.id
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              {deletingId === entity.id
                                ? "Suppression…"
                                : "Supprimer"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.pagination}>
              <span>
                Page {pagination.page}
                {pagination.totalPages > 0
                  ? ` sur ${pagination.totalPages}`
                  : ""}
              </span>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  disabled={
                    loading || pagination.page <= 1
                  }
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: Math.max(
                        1,
                        current.page - 1
                      ),
                    }))
                  }
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    opacity:
                      loading || pagination.page <= 1
                        ? 0.5
                        : 1,
                  }}
                >
                  Précédent
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    pagination.totalPages === 0 ||
                    pagination.page >=
                      pagination.totalPages
                  }
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    opacity:
                      loading ||
                      pagination.totalPages === 0 ||
                      pagination.page >=
                        pagination.totalPages
                        ? 0.5
                        : 1,
                  }}
                >
                  Suivant
                </button>
              </div>
            </div>
          </section>

          <aside
            style={{
              ...styles.card,
              ...styles.form,
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "6px",
              }}
            >
              Nouvelle connaissance
            </h2>

            <p
              style={{
                marginTop: 0,
                marginBottom: "20px",
                color: "#64748b",
                lineHeight: 1.4,
                fontSize: "14px",
              }}
            >
              Créez la base éditoriale qui pourra ensuite être
              enrichie de blocs, médias et relations.
            </p>

            <form onSubmit={createEntity}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Type
                </label>

                <select
                  value={form.type}
                  onChange={(event) =>
                    updateForm("type", event.target.value)
                  }
                  style={styles.input}
                >
                  {TYPES.filter(
                    ([value]) => value
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Titre
                </label>

                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  placeholder="Ex. Budapest"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Slug facultatif
                </label>

                <input
                  maxLength={220}
                  value={form.slug}
                  onChange={(event) =>
                    updateForm("slug", event.target.value)
                  }
                  placeholder="Généré automatiquement"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Résumé
                </label>

                <textarea
                  value={form.summary}
                  onChange={(event) =>
                    updateForm(
                      "summary",
                      event.target.value
                    )
                  }
                  placeholder="Présentation synthétique de cette connaissance…"
                  style={styles.textarea}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div style={styles.field}>
                  <label style={styles.label}>
                    Statut
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  >
                    {STATUSES.filter(
                      ([value]) => value
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Langue
                  </label>

                  <input
                    required
                    value={form.language}
                    onChange={(event) =>
                      updateForm(
                        "language",
                        event.target.value
                      )
                    }
                    placeholder="fr"
                    style={styles.input}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  width: "100%",
                  opacity: saving ? 0.65 : 1,
                }}
              >
                {saving
                  ? "Création…"
                  : "Créer la connaissance"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
