"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const RELATION_TYPES = [
  ["located_in", "Situé dans"],
  ["contains", "Contient"],
  ["part_of", "Fait partie de"],
  ["related_to", "Lié à"],
  ["features", "Met en avant"],
  ["recommends", "Recommande"],
  ["available_in", "Disponible dans"],
  ["belongs_to", "Appartient à"],
  ["near", "À proximité de"],
  ["served_by", "Desservi par"],
];

const styles = {
  card: {
    marginTop: "24px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow:
      "0 8px 24px rgba(15, 23, 42, 0.05)",
  },

  header: {
    padding: "20px 22px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  body: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.6fr) minmax(320px, 0.85fr)",
    gap: "20px",
    padding: "20px",
  },

  relation: {
    padding: "15px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "12px",
    background: "#f8fafc",
  },

  input: {
    width: "100%",
    minHeight: "42px",
    padding: "9px 11px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#17202a",
  },

  button: {
    minHeight: "38px",
    padding: "8px 12px",
    border: 0,
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  primary: {
    background: "#0f766e",
    color: "#ffffff",
  },

  secondary: {
    background: "#e2e8f0",
    color: "#1e293b",
  },

  danger: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  label: {
    display: "block",
    fontWeight: 700,
    fontSize: "13px",
    marginBottom: "6px",
    color: "#334155",
  },

  field: {
    marginBottom: "14px",
  },

  badge: {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#e2e8f0",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 700,
  },

  error: {
    padding: "11px 13px",
    marginBottom: "14px",
    borderRadius: "9px",
    background: "#fee2e2",
    color: "#991b1b",
  },

  success: {
    padding: "11px 13px",
    marginBottom: "14px",
    borderRadius: "9px",
    background: "#dcfce7",
    color: "#166534",
  },

  result: {
    padding: "11px",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    marginBottom: "8px",
    background: "#ffffff",
    cursor: "pointer",
  },
};

function relationTypeLabel(type) {
  return (
    RELATION_TYPES.find(
      ([value]) => value === type
    )?.[1] || type
  );
}

export default function RelationManager({
  entityId,
  onChanged,
}) {
  const [relations, setRelations] = useState({
    outgoing: [],
    incoming: [],
    all: [],
  });

  const [totals, setTotals] = useState({
    outgoing: 0,
    incoming: 0,
    all: 0,
  });

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] =
    useState([]);

  const [selectedTarget, setSelectedTarget] =
    useState(null);

  const [relationType, setRelationType] =
    useState("located_in");

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const outgoing = useMemo(
    () => relations.outgoing || [],
    [relations]
  );

  const incoming = useMemo(
    () => relations.incoming || [],
    [relations]
  );

  const loadRelations = useCallback(async () => {
    if (!entityId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/relations`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "Impossible de charger les relations."
        );
      }

      setRelations(
        result.data || {
          outgoing: [],
          incoming: [],
          all: [],
        }
      );

      setTotals(
        result.totals || {
          outgoing: 0,
          incoming: 0,
          all: 0,
        }
      );
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    loadRelations();
  }, [loadRelations]);

  async function searchKnowledge(event) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams({
        search: query,
        page: "1",
        pageSize: "20",
      });

      const response = await fetch(
        `/api/knowledge?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La recherche a échoué."
        );
      }

      setSearchResults(
        (result.data || []).filter(
          (item) => item.id !== entityId
        )
      );
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  }

  async function createRelation(event) {
    event.preventDefault();

    if (!selectedTarget) {
      setError(
        "Sélectionne une connaissance cible."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/relations`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            targetId: selectedTarget.id,
            relationType,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La création de la relation a échoué."
        );
      }

      setSuccess(
        `Relation créée avec « ${selectedTarget.title} ».`
      );

      setSelectedTarget(null);
      setSearch("");
      setSearchResults([]);

      await loadRelations();
      await onChanged?.();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelation(relation) {
    if (
      !window.confirm(
        `Supprimer la relation avec « ${
          relation.relatedEntity?.title ||
          "cette connaissance"
        } » ?`
      )
    ) {
      return;
    }

    setDeletingId(relation.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/relations/${relation.id}`,
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

      setSuccess("Relation supprimée.");

      await loadRelations();
      await onChanged?.();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  function relationCard(
    relation,
    canDelete
  ) {
    return (
      <article
        key={`${relation.direction}-${relation.id}`}
        style={styles.relation}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: "7px",
                flexWrap: "wrap",
                marginBottom: "8px",
              }}
            >
              <span style={styles.badge}>
                {relation.label ||
                  relationTypeLabel(
                    relation.relationType
                  )}
              </span>

              <span style={styles.badge}>
                {relation.direction === "outgoing"
                  ? "Sortante"
                  : "Entrante"}
              </span>

              <span style={styles.badge}>
                {relation.relatedEntity?.type}
              </span>
            </div>

            <a
              href={`/knowledge/${relation.relatedEntity?.id}`}
              style={{
                color: "#0f766e",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              {relation.relatedEntity?.title ||
                "Connaissance liée"}
            </a>

            <div
              style={{
                marginTop: "5px",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              /{relation.relatedEntity?.slug}
            </div>
          </div>

          {canDelete ? (
            <button
              type="button"
              disabled={
                deletingId === relation.id
              }
              onClick={() =>
                deleteRelation(relation)
              }
              style={{
                ...styles.button,
                ...styles.danger,
                opacity:
                  deletingId === relation.id
                    ? 0.55
                    : 1,
              }}
            >
              {deletingId === relation.id
                ? "Suppression…"
                : "Supprimer"}
            </button>
          ) : (
            <span style={styles.badge}>
              Gérée depuis la source
            </span>
          )}
        </div>
      </article>
    );
  }

  return (
    <section style={styles.card}>
      <header style={styles.header}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
            }}
          >
            Relations Knowledge
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              lineHeight: 1.45,
            }}
          >
            Reliez cette connaissance à son pays,
            ses activités, ses offres et ses autres
            objets métier.
          </p>
        </div>

        <span style={styles.badge}>
          {totals.all} relation
          {totals.all > 1 ? "s" : ""}
        </span>
      </header>

      <div style={styles.body}>
        <div>
          {error ? (
            <div style={styles.error}>
              {error}
            </div>
          ) : null}

          {success ? (
            <div style={styles.success}>
              {success}
            </div>
          ) : null}

          {loading ? (
            <div>Chargement des relations…</div>
          ) : (
            <>
              <h3>
                Relations sortantes ({totals.outgoing})
              </h3>

              {outgoing.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                    border:
                      "1px dashed #cbd5e1",
                    borderRadius: "12px",
                    marginBottom: "22px",
                  }}
                >
                  Aucune relation sortante.
                </div>
              ) : (
                outgoing.map((relation) =>
                  relationCard(relation, true)
                )
              )}

              <h3
                style={{
                  marginTop: "26px",
                }}
              >
                Relations entrantes ({totals.incoming})
              </h3>

              {incoming.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                    border:
                      "1px dashed #cbd5e1",
                    borderRadius: "12px",
                  }}
                >
                  Aucune relation entrante.
                </div>
              ) : (
                incoming.map((relation) =>
                  relationCard(relation, false)
                )
              )}
            </>
          )}
        </div>

        <aside>
          <div
            style={{
              padding: "18px",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#f8fafc",
              position: "sticky",
              top: "20px",
            }}
          >
            <h3
              style={{
                marginTop: 0,
              }}
            >
              Ajouter une relation
            </h3>

            <form onSubmit={searchKnowledge}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Rechercher une connaissance
                </label>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Ex. Hongrie, Danube…"
                  style={styles.input}
                />
              </div>

              <button
                type="submit"
                disabled={searching}
                style={{
                  ...styles.button,
                  ...styles.secondary,
                  width: "100%",
                }}
              >
                {searching
                  ? "Recherche…"
                  : "Rechercher"}
              </button>
            </form>

            {searchResults.length > 0 ? (
              <div
                style={{
                  marginTop: "14px",
                }}
              >
                {searchResults.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() =>
                      setSelectedTarget(item)
                    }
                    style={{
                      ...styles.result,
                      width: "100%",
                      textAlign: "left",
                      background:
                        selectedTarget?.id === item.id
                          ? "#ccfbf1"
                          : "#ffffff",
                    }}
                  >
                    <strong>{item.title}</strong>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {item.type} · /{item.slug}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={createRelation}
              style={{
                marginTop: "18px",
              }}
            >
              <div style={styles.field}>
                <label style={styles.label}>
                  Cible sélectionnée
                </label>

                <div
                  style={{
                    padding: "11px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "9px",
                    background: "#ffffff",
                    color: selectedTarget
                      ? "#17202a"
                      : "#94a3b8",
                  }}
                >
                  {selectedTarget
                    ? selectedTarget.title
                    : "Aucune connaissance sélectionnée"}
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Type de relation
                </label>

                <select
                  value={relationType}
                  onChange={(event) =>
                    setRelationType(
                      event.target.value
                    )
                  }
                  style={styles.input}
                >
                  {RELATION_TYPES.map(
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

              <button
                type="submit"
                disabled={
                  saving || !selectedTarget
                }
                style={{
                  ...styles.button,
                  ...styles.primary,
                  width: "100%",
                  opacity:
                    saving || !selectedTarget
                      ? 0.55
                      : 1,
                }}
              >
                {saving
                  ? "Création…"
                  : "Créer la relation"}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}
