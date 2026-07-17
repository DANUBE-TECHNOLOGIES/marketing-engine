"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const EMPTY_FORM = {
  url: "",
  type: "image",
  title: "",
  altText: "",
  width: "",
  height: "",
  mimeType: "",
  isPrimary: false,
};

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
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },

  body: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.65fr) minmax(320px, 0.85fr)",
    gap: "20px",
    padding: "20px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "15px",
  },

  mediaCard: {
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#f8fafc",
  },

  preview: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    display: "block",
    background: "#e2e8f0",
  },

  mediaBody: {
    padding: "14px",
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

  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#334155",
  },

  field: {
    marginBottom: "14px",
  },

  button: {
    minHeight: "38px",
    padding: "8px 12px",
    border: 0,
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  primaryButton: {
    background: "#0f766e",
    color: "#ffffff",
  },

  secondaryButton: {
    background: "#e2e8f0",
    color: "#1e293b",
  },

  warningButton: {
    background: "#fef3c7",
    color: "#92400e",
  },

  dangerButton: {
    background: "#fee2e2",
    color: "#991b1b",
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

  primaryBadge: {
    background: "#ccfbf1",
    color: "#115e59",
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
};

function numericValue(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return Number(value);
}

export default function MediaManager({
  entityId,
  onChanged,
}) {
  const [media, setMedia] = useState([]);
  const [primary, setPrimary] = useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [editingId, setEditingId] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [movingId, setMovingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const editingMedia = useMemo(
    () =>
      media.find(
        (item) => item.id === editingId
      ) || null,
    [media, editingId]
  );

  const loadMedia = useCallback(async () => {
    if (!entityId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/media`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "Impossible de charger la médiathèque."
        );
      }

      setMedia(result.data || []);
      setPrimary(result.primary || null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function editMedia(item) {
    setEditingId(item.id);

    setForm({
      url: item.url || "",
      type: item.type || "image",
      title: item.title || "",
      altText: item.altText || "",
      width: item.width || "",
      height: item.height || "",
      mimeType: item.mimeType || "",
      isPrimary:
        item.isPrimary || false,
    });

    setError("");
    setSuccess("");
  }

  async function saveMedia(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        url: form.url,
        type: form.type,
        title:
          form.title || null,
        altText:
          form.altText || null,
        width:
          numericValue(form.width),
        height:
          numericValue(form.height),
        mimeType:
          form.mimeType || null,
        isPrimary:
          Boolean(form.isPrimary),
      };

      const response = await fetch(
        editingId
          ? `/api/knowledge/${entityId}/media/${editingId}`
          : `/api/knowledge/${entityId}/media`,
        {
          method:
            editingId ? "PATCH" : "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "L’enregistrement du média a échoué."
        );
      }

      setSuccess(
        editingId
          ? "Média modifié."
          : "Média ajouté."
      );

      resetForm();

      await loadMedia();
      await onChanged?.();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function setAsPrimary(item) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/media/${item.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            isPrimary: true,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "Impossible de définir le média principal."
        );
      }

      setSuccess(
        "Média principal mis à jour."
      );

      await loadMedia();
      await onChanged?.();
    } catch (primaryError) {
      setError(primaryError.message);
    }
  }

  async function deleteMedia(item) {
    if (
      !window.confirm(
        `Supprimer le média « ${
          item.title ||
          item.altText ||
          item.url
        } » ?`
      )
    ) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/media/${item.id}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La suppression du média a échoué."
        );
      }

      if (editingId === item.id) {
        resetForm();
      }

      setSuccess("Média supprimé.");

      await loadMedia();
      await onChanged?.();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function moveMedia(
    index,
    direction
  ) {
    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= media.length
    ) {
      return;
    }

    const reordered = [...media];

    const [moved] =
      reordered.splice(index, 1);

    reordered.splice(
      targetIndex,
      0,
      moved
    );

    setMovingId(moved.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/media/reorder`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            media: reordered.map(
              (item, position) => ({
                id: item.id,
                position,
              })
            ),
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La réorganisation des médias a échoué."
        );
      }

      setMedia(result.data || []);
      setPrimary(result.primary || null);
      setSuccess(
        "Ordre des médias mis à jour."
      );

      await onChanged?.();
    } catch (moveError) {
      setError(moveError.message);
    } finally {
      setMovingId(null);
    }
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
            Médiathèque
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              lineHeight: 1.45,
            }}
          >
            Gérez les images et médias utilisés
            dans les mini-sites, les contenus SEO
            et les futures publications.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span style={styles.badge}>
            {media.length} média
            {media.length > 1 ? "s" : ""}
          </span>

          {primary ? (
            <span
              style={{
                ...styles.badge,
                ...styles.primaryBadge,
              }}
            >
              Média principal défini
            </span>
          ) : null}
        </div>
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
            <div>
              Chargement de la médiathèque…
            </div>
          ) : media.length === 0 ? (
            <div
              style={{
                padding: "30px",
                border:
                  "1px dashed #cbd5e1",
                borderRadius: "12px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Aucun média pour cette connaissance.
            </div>
          ) : (
            <div style={styles.grid}>
              {media.map((item, index) => (
                <article
                  key={item.id}
                  style={styles.mediaCard}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt={
                        item.altText ||
                        item.title ||
                        ""
                      }
                      style={styles.preview}
                      onError={(event) => {
                        event.currentTarget.style.opacity =
                          "0.25";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        ...styles.preview,
                        display: "grid",
                        placeItems: "center",
                        color: "#64748b",
                      }}
                    >
                      {item.type}
                    </div>
                  )}

                  <div style={styles.mediaBody}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        marginBottom: "9px",
                      }}
                    >
                      <span style={styles.badge}>
                        {item.type}
                      </span>

                      <span style={styles.badge}>
                        Position {item.position}
                      </span>

                      {item.isPrimary ? (
                        <span
                          style={{
                            ...styles.badge,
                            ...styles.primaryBadge,
                          }}
                        >
                          Principal
                        </span>
                      ) : null}
                    </div>

                    <strong>
                      {item.title ||
                        "Média sans titre"}
                    </strong>

                    {item.altText ? (
                      <p
                        style={{
                          margin:
                            "7px 0 0",
                          color: "#475569",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.altText}
                      </p>
                    ) : null}

                    <div
                      style={{
                        marginTop: "8px",
                        color: "#64748b",
                        fontSize: "12px",
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {item.url}
                    </div>

                    {item.width &&
                    item.height ? (
                      <div
                        style={{
                          marginTop: "5px",
                          color: "#64748b",
                          fontSize: "12px",
                        }}
                      >
                        {item.width} ×{" "}
                        {item.height}
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        gap: "7px",
                        flexWrap: "wrap",
                        marginTop: "13px",
                      }}
                    >
                      <button
                        type="button"
                        disabled={
                          index === 0 ||
                          movingId === item.id
                        }
                        onClick={() =>
                          moveMedia(index, -1)
                        }
                        style={{
                          ...styles.button,
                          ...styles.secondaryButton,
                          opacity:
                            index === 0
                              ? 0.45
                              : 1,
                        }}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={
                          index ===
                            media.length - 1 ||
                          movingId === item.id
                        }
                        onClick={() =>
                          moveMedia(index, 1)
                        }
                        style={{
                          ...styles.button,
                          ...styles.secondaryButton,
                          opacity:
                            index ===
                            media.length - 1
                              ? 0.45
                              : 1,
                        }}
                      >
                        ↓
                      </button>

                      {!item.isPrimary ? (
                        <button
                          type="button"
                          onClick={() =>
                            setAsPrimary(item)
                          }
                          style={{
                            ...styles.button,
                            ...styles.primaryButton,
                          }}
                        >
                          Définir principal
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          editMedia(item)
                        }
                        style={{
                          ...styles.button,
                          ...styles.warningButton,
                        }}
                      >
                        Modifier
                      </button>

                      <button
                        type="button"
                        disabled={
                          deletingId === item.id
                        }
                        onClick={() =>
                          deleteMedia(item)
                        }
                        style={{
                          ...styles.button,
                          ...styles.dangerButton,
                          opacity:
                            deletingId === item.id
                              ? 0.55
                              : 1,
                        }}
                      >
                        {deletingId === item.id
                          ? "Suppression…"
                          : "Supprimer"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside>
          <form
            onSubmit={saveMedia}
            style={{
              padding: "18px",
              border:
                "1px solid #e2e8f0",
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
              {editingMedia
                ? "Modifier le média"
                : "Ajouter un média"}
            </h3>

            <div style={styles.field}>
              <label style={styles.label}>
                URL du média
              </label>

              <input
                type="url"
                required
                value={form.url}
                onChange={(event) =>
                  updateForm(
                    "url",
                    event.target.value
                  )
                }
                placeholder="https://..."
                style={styles.input}
              />
            </div>

            {form.url ? (
              <div
                style={{
                  marginBottom: "14px",
                }}
              >
                <img
                  src={form.url}
                  alt=""
                  style={{
                    ...styles.preview,
                    borderRadius: "9px",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              </div>
            ) : null}

            <div style={styles.field}>
              <label style={styles.label}>
                Type
              </label>

              <select
                value={form.type}
                onChange={(event) =>
                  updateForm(
                    "type",
                    event.target.value
                  )
                }
                style={styles.input}
              >
                <option value="image">
                  Image
                </option>

                <option value="video">
                  Vidéo
                </option>

                <option value="document">
                  Document
                </option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Titre
              </label>

              <input
                value={form.title}
                onChange={(event) =>
                  updateForm(
                    "title",
                    event.target.value
                  )
                }
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Texte alternatif SEO
              </label>

              <input
                value={form.altText}
                onChange={(event) =>
                  updateForm(
                    "altText",
                    event.target.value
                  )
                }
                placeholder="Description précise de l’image"
                style={styles.input}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "10px",
              }}
            >
              <div style={styles.field}>
                <label style={styles.label}>
                  Largeur
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.width}
                  onChange={(event) =>
                    updateForm(
                      "width",
                      event.target.value
                    )
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Hauteur
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.height}
                  onChange={(event) =>
                    updateForm(
                      "height",
                      event.target.value
                    )
                  }
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Type MIME
              </label>

              <input
                value={form.mimeType}
                onChange={(event) =>
                  updateForm(
                    "mimeType",
                    event.target.value
                  )
                }
                placeholder="image/jpeg"
                style={styles.input}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                marginBottom: "16px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(event) =>
                  updateForm(
                    "isPrimary",
                    event.target.checked
                  )
                }
              />

              Définir comme média principal
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                width: "100%",
                opacity: saving ? 0.55 : 1,
              }}
            >
              {saving
                ? "Enregistrement…"
                : editingMedia
                  ? "Enregistrer le média"
                  : "Ajouter le média"}
            </button>

            {editingMedia ? (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  width: "100%",
                  marginTop: "8px",
                }}
              >
                Annuler la modification
              </button>
            ) : null}
          </form>
        </aside>
      </div>
    </section>
  );
}
