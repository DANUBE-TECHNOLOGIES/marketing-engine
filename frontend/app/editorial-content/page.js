import { revalidatePath } from "next/cache";

import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:4000";
const COCKPIT_PATH = "/editorial-content";

async function api(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || `Erreur éditoriale (${response.status}).`
    );
    error.code = payload?.code || "EDITORIAL_CONTENT_REQUEST_FAILED";
    throw error;
  }

  return payload;
}

async function loadContents() {
  const items = await api("/ai-content/contents?limit=60");
  return Array.isArray(items) ? items : [];
}

async function generateInspiration(formData) {
  "use server";

  await requireRole(["admin", "manager"]);

  const topic = String(formData.get("topic") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const keywords = String(formData.get("keywords") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!topic) throw new Error("Le sujet ou la destination est obligatoire.");

  await api("/ai-content/generate", {
    method: "POST",
    body: JSON.stringify({
      channel: "article",
      locale: "fr-FR",
      topic,
      city,
      keywords,
      agencyName: "Mondescale Voyages",
      tone: "expert, chaleureux, inspirant et rassurant",
      requestedBy: "editorial-content-cockpit",
    }),
  });

  revalidatePath(COCKPIT_PATH);
}

async function updateContent(contentId, formData) {
  "use server";

  await requireRole(["admin", "manager"]);

  await api(`/ai-content/contents/${encodeURIComponent(contentId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: String(formData.get("title") || "").trim(),
      excerpt: String(formData.get("excerpt") || "").trim(),
    }),
  });

  revalidatePath(COCKPIT_PATH);
}

async function publishContent(contentId) {
  "use server";

  await requireRole(["admin", "manager"]);
  await api(`/ai-content/contents/${encodeURIComponent(contentId)}/publish`, {
    method: "POST",
  });
  revalidatePath(COCKPIT_PATH);
}

async function unpublishContent(contentId) {
  "use server";

  await requireRole(["admin", "manager"]);
  await api(`/ai-content/contents/${encodeURIComponent(contentId)}/unpublish`, {
    method: "POST",
  });
  revalidatePath(COCKPIT_PATH);
}

function statusClasses(status) {
  switch (String(status || "").toLowerCase()) {
    case "published": return "bg-emerald-100 text-emerald-800";
    case "review": return "bg-amber-100 text-amber-800";
    case "draft": return "bg-slate-100 text-slate-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function statusLabel(status) {
  switch (String(status || "").toLowerCase()) {
    case "published": return "Publié";
    case "review": return "À valider";
    case "draft": return "Brouillon";
    default: return status || "Inconnu";
  }
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function bodyPreview(content) {
  const body = content?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  return {
    introduction: body.introduction || body.summary || "",
    sections: Array.isArray(body.sections) ? body.sections : [],
    faq: Array.isArray(body.faq) ? body.faq : [],
  };
}

export default async function EditorialContentPage() {
  await requireRole(["admin", "manager"]);

  const contents = await loadContents();
  const published = contents.filter((item) => item.status === "published").length;
  const review = contents.filter((item) => item.status === "review").length;
  const drafts = contents.filter((item) => item.status === "draft").length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Studio éditorial Inspirations"
          subtitle="Générez, contrôlez, corrigez et publiez les contenus qui alimentent automatiquement les mini-sites Mondescale."
          action={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/website-builder">Website Designer</ButtonLink>
              <ButtonLink href="/agency-launch">Mise en ligne</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">À valider</p>
            <strong className="mt-2 block text-3xl">{review}</strong>
          </article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Publiés</p>
            <strong className="mt-2 block text-3xl text-emerald-700">{published}</strong>
          </article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Brouillons</p>
            <strong className="mt-2 block text-3xl">{drafts}</strong>
          </article>
        </section>

        <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Nouvelle inspiration</p>
            <h2 className="mt-2 text-2xl font-bold">Créer un contenu voyage</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Le contenu généré arrive d’abord en validation. Il ne peut apparaître sur aucun mini-site tant que vous n’avez pas cliqué sur Publier.
            </p>
          </div>

          <form action={generateInspiration} className="grid gap-4 lg:grid-cols-[2fr_1fr_2fr_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-semibold">
              Sujet ou destination
              <input name="topic" required placeholder="Ex. Sicile hors saison" className="min-h-11 rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Ville cible
              <input name="city" placeholder="Ex. Bois-Colombes" className="min-h-11 rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Mots-clés complémentaires
              <input name="keywords" placeholder="voyage, conseil, séjour, départ Paris" className="min-h-11 rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-blue-800">Générer</button>
          </form>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Workflow éditorial</p>
              <h2 className="mt-2 text-2xl font-bold">Contenus générés</h2>
            </div>
            <p className="text-sm text-slate-500">{contents.length} contenu(s)</p>
          </div>

          {!contents.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <strong className="block text-lg">Aucune inspiration pour le moment</strong>
              <p className="mt-2 text-sm text-slate-600">Générez le premier article ci-dessus. Après validation et publication, les blocs Inspirations configurés en mode automatique pourront l’afficher.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {contents.map((content) => {
                const preview = bodyPreview(content);
                const isPublished = content.status === "published";
                const canPublish = ["review", "draft", "approved"].includes(content.status);
                const canEdit = canPublish && !content.campaignId;

                return (
                  <article key={content.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0 max-w-4xl flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses(content.status)}`}>{statusLabel(content.status)}</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{content.channel}</span>
                          {Number.isFinite(content.qualityScore) ? <span className="text-xs font-semibold text-slate-500">Qualité {content.qualityScore}/100</span> : null}
                        </div>

                        <h3 className="text-xl font-bold leading-tight">{content.title}</h3>
                        {content.excerpt ? <p className="mt-2 text-sm leading-6 text-slate-600">{content.excerpt}</p> : null}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                          <span>Slug : {content.slug || "—"}</span>
                          <span>Révision : {content.revision || 1}</span>
                          <span>Mis à jour : {formatDate(content.updatedAt)}</span>
                          {content.publishedAt ? <span>Publié : {formatDate(content.publishedAt)}</span> : null}
                        </div>

                        {canEdit ? (
                          <details className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                            <summary className="cursor-pointer text-sm font-bold text-blue-900">Corriger avant publication</summary>
                            <form action={updateContent.bind(null, content.id)} className="mt-4 grid gap-4">
                              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                                Titre éditorial
                                <input name="title" required defaultValue={content.title || ""} maxLength={90} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                                Extrait de la carte Inspiration
                                <textarea name="excerpt" defaultValue={content.excerpt || ""} maxLength={240} rows={4} className="rounded-xl border border-slate-300 bg-white p-3 font-normal" />
                              </label>
                              <button type="submit" className="w-fit rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-900">Enregistrer les corrections</button>
                            </form>
                          </details>
                        ) : null}

                        {preview ? (
                          <details className="mt-4 rounded-xl bg-slate-50 p-4">
                            <summary className="cursor-pointer text-sm font-bold text-slate-800">Relire le contenu généré</summary>
                            <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-700">
                              {preview.introduction ? <p>{preview.introduction}</p> : null}
                              {preview.sections.map((section, index) => (
                                <section key={section.id || index} className="border-l-2 border-slate-200 pl-4">
                                  {section.title ? <strong>{section.title}</strong> : null}
                                  <p>{section.text || section.content || section.body || ""}</p>
                                </section>
                              ))}
                              {preview.faq.length ? <div><strong>FAQ générée : {preview.faq.length} question(s)</strong></div> : null}
                            </div>
                          </details>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {canPublish ? (
                          <form action={publishContent.bind(null, content.id)}>
                            <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Publier</button>
                          </form>
                        ) : null}
                        {isPublished ? (
                          <form action={unpublishContent.bind(null, content.id)}>
                            <button type="submit" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Dépublier</button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
