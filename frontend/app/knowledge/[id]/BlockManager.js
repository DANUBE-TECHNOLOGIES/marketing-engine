"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const BLOCK_TYPES = [
  ["text", "Texte"],
  ["heading", "Titre"],
  ["list", "Liste"],
  ["quote", "Citation"],
  ["faq", "FAQ"],
  ["callout", "Encadré"],
  ["cta", "Appel à l’action"],
  ["html", "HTML"],
];

const BLOCK_STATUSES = [
  ["draft", "Brouillon"],
  ["review", "À valider"],
  ["published", "Publié"],
  ["archived", "Archivé"],
];

const CONTENT_TEMPLATES = {
  text: {
    text: "",
  },

  heading: {
    text: "",
    level: 2,
  },

  list: {
    items: [
      "Premier élément",
    ],
    ordered: false,
  },

  quote: {
    text: "",
    author: "",
  },

  faq: {
    question: "",
    answer: "",
  },

  callout: {
    text: "",
    tone: "information",
  },

  cta: {
    label: "En savoir plus",
    url: "",
  },

  html: {
    html: "<p></p>",
  },
};

const emptyForm = {
  type: "text",
  title: "",
  status: "draft",
  language: "fr",
  content: JSON.stringify(
    CONTENT_TEMPLATES.text,
    null,
    2
  ),
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
    gap: "16px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  body: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.65fr) minmax(320px, 0.85fr)",
    gap: "20px",
    padding: "20px",
  },

  block: {
    padding: "16px",
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

  textarea: {
    width: "100%",
    minHeight: "210px",
    padding: "11px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "monospace",
    background: "#0f172a",
    color: "#e2e8f0",
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

  warning: {
    background: "#fef3c7",
    color: "#92400e",
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

  badge: {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#e2e8f0",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 700,
  },
};

function getTypeLabel(type) {
  return (
    BLOCK_TYPES.find(([value]) => value === type)?.[1] ||
    type
  );
}

function getStatusLabel(status) {
  return (
    BLOCK_STATUSES.find(
      ([value]) => value === status
    )?.[1] || status
  );
}

function summarizeContent(block) {
  const content = block.content || {};

  if (block.type === "text") {
    return content.text || "";
  }

  if (block.type === "heading") {
    return content.text || "";
  }

  if (block.type === "faq") {
    return `${content.question || ""} — ${
      content.answer || ""
    }`;
  }

  if (block.type === "list") {
    return Array.isArray(content.items)
      ? content.items.join(" · ")
      : "";
  }

  if (block.type === "cta") {
    return `${content.label || ""} → ${
      content.url || ""
    }`;
  }

  if (block.type === "quote") {
    return `${content.text || ""}${
      content.author ? ` — ${content.author}` : ""
    }`;
  }

  if (block.type === "callout") {
    return content.text || "";
  }

  if (block.type === "html") {
    return content.html || "";
  }

  return JSON.stringify(content);
}

export default function BlockManager({
  entityId,
  onChanged,
}) {
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const editingBlock = useMemo(
    () =>
      blocks.find(
        (block) => block.id === editingId
      ) || null,
    [blocks, editingId]
  );

  const loadBlocks = useCallback(async () => {
    if (!entityId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/blocks`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "Impossible de charger les blocs."
        );
      }

      setBlocks(result.data || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function changeBlockType(type) {
    setForm((current) => ({
      ...current,
      type,
      content: JSON.stringify(
        CONTENT_TEMPLATES[type] || {},
        null,
        2
      ),
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function editBlock(block) {
    setEditingId(block.id);

    setForm({
      type: block.type,
      title: block.title || "",
      status: block.status || "draft",
      language: block.language || "fr",
      content: JSON.stringify(
        block.content || {},
        null,
        2
      ),
    });

    setError("");
    setSuccess("");
  }

  async function saveBlock(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let content;

      try {
        content = JSON.parse(form.content);
      } catch {
        throw new Error(
          "Le contenu du bloc n’est pas un JSON valide."
        );
      }

      const payload = {
        type: form.type,
        title: form.title || null,
        status: form.status,
        language: form.language,
        content,
      };

      const response = await fetch(
        editingId
          ? `/api/knowledge/${entityId}/blocks/${editingId}`
          : `/api/knowledge/${entityId}/blocks`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "L’enregistrement du bloc a échoué."
        );
      }

      setSuccess(
        editingId
          ? "Bloc modifié."
          : "Bloc créé."
      );

      resetForm();
      await loadBlocks();
      await onChanged?.();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBlock(block) {
    if (
      !window.confirm(
        `Supprimer le bloc « ${
          block.title || getTypeLabel(block.type)
        } » ?`
      )
    ) {
      return;
    }

    setDeletingId(block.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/blocks/${block.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La suppression du bloc a échoué."
        );
      }

      if (editingId === block.id) {
        resetForm();
      }

      setSuccess("Bloc supprimé.");

      await loadBlocks();
      await onChanged?.();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function moveBlock(index, direction) {
    const targetIndex = index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= blocks.length
    ) {
      return;
    }

    setMovingId(blocks[index].id);
    setError("");
    setSuccess("");

    const reordered = [...blocks];
    const [moved] = reordered.splice(index, 1);

    reordered.splice(targetIndex, 0, moved);

    const payload = {
      blocks: reordered.map((block, position) => ({
        id: block.id,
        position,
      })),
    };

    try {
      const response = await fetch(
        `/api/knowledge/${entityId}/blocks/reorder`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La réorganisation a échoué."
        );
      }

      setBlocks(result.data || []);
      setSuccess("Ordre des blocs mis à jour.");

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
            Blocs de contenu
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              lineHeight: 1.45,
            }}
          >
            Composez cette connaissance avec des blocs
            réutilisables par les futurs mini-sites,
            newsletters et moteurs de publication.
          </p>
        </div>

        <span style={styles.badge}>
          {blocks.length} bloc
          {blocks.length > 1 ? "s" : ""}
        </span>
      </header>

      <div style={styles.body}>
        <div>
          {error ? (
            <div style={styles.error}>{error}</div>
          ) : null}

          {success ? (
            <div style={styles.success}>
              {success}
            </div>
          ) : null}

          {loading ? (
            <div>Chargement des blocs…</div>
          ) : blocks.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#64748b",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
              }}
            >
              Aucun bloc pour cette connaissance.
            </div>
          ) : (
            blocks.map((block, index) => (
              <article
                key={block.id}
                style={styles.block}
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
                        {getTypeLabel(block.type)}
                      </span>

                      <span style={styles.badge}>
                        {getStatusLabel(block.status)}
                      </span>

                      <span style={styles.badge}>
                        Position {block.position}
                      </span>
                    </div>

                    <strong>
                      {block.title ||
                        getTypeLabel(block.type)}
                    </strong>

                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#475569",
                        lineHeight: 1.45,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {summarizeContent(block)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "7px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        index === 0 ||
                        movingId === block.id
                      }
                      onClick={() =>
                        moveBlock(index, -1)
                      }
                      style={{
                        ...styles.button,
                        ...styles.secondary,
                        opacity:
                          index === 0 ? 0.45 : 1,
                      }}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      disabled={
                        index === blocks.length - 1 ||
                        movingId === block.id
                      }
                      onClick={() =>
                        moveBlock(index, 1)
                      }
                      style={{
                        ...styles.button,
                        ...styles.secondary,
                        opacity:
                          index === blocks.length - 1
                            ? 0.45
                            : 1,
                      }}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => editBlock(block)}
                      style={{
                        ...styles.button,
                        ...styles.warning,
                      }}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingId === block.id
                      }
                      onClick={() =>
                        deleteBlock(block)
                      }
                      style={{
                        ...styles.button,
                        ...styles.danger,
                        opacity:
                          deletingId === block.id
                            ? 0.55
                            : 1,
                      }}
                    >
                      {deletingId === block.id
                        ? "Suppression…"
                        : "Supprimer"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <aside>
          <form
            onSubmit={saveBlock}
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
              {editingBlock
                ? "Modifier le bloc"
                : "Ajouter un bloc"}
            </h3>

            <div style={styles.field}>
              <label style={styles.label}>
                Type
              </label>

              <select
                value={form.type}
                onChange={(event) =>
                  changeBlockType(event.target.value)
                }
                style={styles.input}
              >
                {BLOCK_TYPES.map(
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

            <div style={styles.field}>
              <label style={styles.label}>
                Titre facultatif
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
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
                  {BLOCK_STATUSES.map(
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

              <div style={styles.field}>
                <label style={styles.label}>
                  Langue
                </label>

                <input
                  value={form.language}
                  onChange={(event) =>
                    updateForm(
                      "language",
                      event.target.value
                    )
                  }
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Contenu JSON
              </label>

              <textarea
                value={form.content}
                onChange={(event) =>
                  updateForm(
                    "content",
                    event.target.value
                  )
                }
                style={styles.textarea}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.button,
                ...styles.primary,
                width: "100%",
                opacity: saving ? 0.55 : 1,
              }}
            >
              {saving
                ? "Enregistrement…"
                : editingBlock
                  ? "Enregistrer le bloc"
                  : "Ajouter le bloc"}
            </button>

            {editingBlock ? (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  ...styles.button,
                  ...styles.secondary,
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
