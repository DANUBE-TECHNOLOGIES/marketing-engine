"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BlockManager from "./BlockManager";
import RelationManager from "./RelationManager";
import MediaManager from "./MediaManager";
import KnowledgeComposer from "./KnowledgeComposer";

const TYPES = [
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
  ["draft", "Brouillon"],
  ["review", "À valider"],
  ["published", "Publié"],
  ["archived", "Archivé"],
];

const emptyForm = {
  type: "destination",
  title: "",
  slug: "",
  summary: "",
  status: "draft",
  language: "fr",
  metadata: "{}",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    color: "#17202a",
    padding: "32px",
  },
  container: {
    maxWidth: "1180px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },
  form: {
    padding: "24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
  },
  field: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    fontWeight: 700,
    fontSize: "13px",
    marginBottom: "7px",
    color: "#334155",
  },
  input: {
    width: "100%",
    minHeight: "44px",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff",
    color: "#17202a",
  },
  textarea: {
    width: "100%",
    minHeight: "130px",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#fff",
    color: "#17202a",
  },
  codeArea: {
    width: "100%",
    minHeight: "190px",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontFamily: "monospace",
    fontSize: "13px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#0f172a",
    color: "#e2e8f0",
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
  primary: {
    background: "#0f766e",
    color: "#fff",
  },
  secondary: {
    background: "#e2e8f0",
    color: "#1e293b",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  },
  danger: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  alertError: {
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    marginBottom: "18px",
  },
  alertSuccess: {
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    marginBottom: "18px",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginTop: "22px",
  },
  stat: {
    padding: "16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
  },
};

export default function KnowledgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [entity, setEntity] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadEntity = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "Impossible de charger cette connaissance."
        );
      }

      const item = result.data;

      setEntity(item);
      setForm({
        type: item.type || "destination",
        title: item.title || "",
        slug: item.slug || "",
        summary: item.summary || "",
        status: item.status || "draft",
        language: item.language || "fr",
        metadata: JSON.stringify(item.metadata || {}, null, 2),
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEntity();
  }, [loadEntity]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveEntity(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let metadata;

      try {
        metadata = JSON.parse(form.metadata || "{}");
      } catch {
        throw new Error(
          "Les métadonnées ne contiennent pas un JSON valide."
        );
      }

      const response = await fetch(`/api/knowledge/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          slug: form.slug,
          summary: form.summary || null,
          status: form.status,
          language: form.language,
          metadata,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La modification a échoué."
        );
      }

      setSuccess("La connaissance a été enregistrée.");
      await loadEntity();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntity() {
    if (
      !window.confirm(
        `Supprimer définitivement « ${entity?.title || "cette connaissance"} » ?`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "La suppression a échoué."
        );
      }

      router.push("/knowledge");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          Chargement de la connaissance…
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <Link
              href="/knowledge"
              style={{
                color: "#0f766e",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              ← Retour au Knowledge Studio
            </Link>

            <h1
              style={{
                margin: "12px 0 6px",
                fontSize: "34px",
              }}
            >
              {entity?.title || "Connaissance"}
            </h1>

            <div style={{ color: "#64748b" }}>
              {entity?.type} · /{entity?.slug} · {entity?.language}
            </div>
          </div>

          <button
            type="button"
            onClick={deleteEntity}
            disabled={deleting}
            style={{
              ...styles.button,
              ...styles.danger,
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </header>

        {error ? (
          <div style={styles.alertError}>{error}</div>
        ) : null}

        {success ? (
          <div style={styles.alertSuccess}>{success}</div>
        ) : null}

        <section style={styles.card}>
          <form onSubmit={saveEntity} style={styles.form}>
            <h2 style={{ marginTop: 0 }}>Informations générales</h2>

            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Type</label>

                <select
                  value={form.type}
                  onChange={(event) =>
                    updateField("type", event.target.value)
                  }
                  style={styles.input}
                >
                  {TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Statut</label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  style={styles.input}
                >
                  {STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Titre</label>

                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Slug</label>

                <input
                  required
                  maxLength={220}
                  value={form.slug}
                  onChange={(event) =>
                    updateField("slug", event.target.value)
                  }
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Langue</label>

              <input
                required
                value={form.language}
                onChange={(event) =>
                  updateField("language", event.target.value)
                }
                style={{
                  ...styles.input,
                  maxWidth: "180px",
                }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Résumé</label>

              <textarea
                value={form.summary}
                onChange={(event) =>
                  updateField("summary", event.target.value)
                }
                style={styles.textarea}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Métadonnées JSON
              </label>

              <textarea
                value={form.metadata}
                onChange={(event) =>
                  updateField("metadata", event.target.value)
                }
                style={styles.codeArea}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.button,
                ...styles.primary,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Enregistrement…"
                : "Enregistrer les modifications"}
            </button>
          </form>
        </section>




        <KnowledgeComposer
          entityId={id}
        />

        <MediaManager
          entityId={id}
          onChanged={loadEntity}
        />

        <BlockManager
          entityId={id}
          onChanged={loadEntity}
        />


        <RelationManager
          entityId={id}
          onChanged={loadEntity}
        />

        <section style={styles.stats}>
          <div style={styles.stat}>
            <strong>Blocs de contenu</strong>
            <div
              style={{
                marginTop: "8px",
                fontSize: "28px",
              }}
            >
              {entity?.contentBlocks?.length || 0}
            </div>
          </div>

          <div style={styles.stat}>
            <strong>Médias</strong>
            <div
              style={{
                marginTop: "8px",
                fontSize: "28px",
              }}
            >
              {entity?.mediaAssets?.length || 0}
            </div>
          </div>

          <div style={styles.stat}>
            <strong>Relations</strong>
            <div
              style={{
                marginTop: "8px",
                fontSize: "28px",
              }}
            >
              {entity?.relations?.length || 0}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
