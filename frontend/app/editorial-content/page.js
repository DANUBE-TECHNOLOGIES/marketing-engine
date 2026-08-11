import { revalidatePath } from "next/cache";

import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:4000";
const TENANT_SLUG = process.env.TENANT_SLUG || process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";
const COCKPIT_PATH = "/editorial-content";

async function api(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      "x-tenant-slug": TENANT_SLUG,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Erreur éditoriale (${response.status}).`);
    error.code = payload?.code || "EDITORIAL_CONTENT_REQUEST_FAILED";
    throw error;
  }

  return payload;
}

async function loadContents() {
  const items = await api("/ai-content/contents?limit=60");
  return Array.isArray(items) ? items : [];
}

async function loadAgencies() {
  try {
    const payload = await api("/agency-launch/network");
    return (payload?.items || [])
      .map((item) => item?.agency
        ? {
            ...item.agency,
            site: item.site || null,
            launchState: item.launchState || null,
          }
        : null)
      .filter((agency) => agency?.id !== undefined && agency?.id !== null)
      .sort((a, b) => String(a.name || a.city || "").localeCompare(String(b.name || b.city || ""), "fr"));
  } catch (error) {
    console.error("[EDITORIAL_AGENCIES]", error);
    return [];
  }
}

async function generateInspiration(formData) {
  "use server";
  await requireRole(["admin", "manager"]);

  const topic = String(formData.get("topic") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const keywords = String(formData.get("keywords") || "")
    .split(",").map((value) => value.trim()).filter(Boolean).slice(0, 20);

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

  const scope = String(formData.get("targetScope") || "network").trim();
  const agencyIds = formData.getAll("agencyIds").map(String).map((value) => value.trim()).filter(Boolean);
  const indexAgencyId = String(formData.get("indexAgencyId") || "").trim() || null;

  await api(`/ai-content/contents/${encodeURIComponent(contentId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: String(formData.get("title") || "").trim(),
      excerpt: String(formData.get("excerpt") || "").trim(),
      editorialTargeting: scope === "agencies"
        ? { scope: "agencies", agencyIds, indexAgencyId }
        : { scope: "network", agencyIds: [], indexAgencyId: null },
    }),
  });

  revalidatePath(COCKPIT_PATH);
}

async function publishContent(contentId) {
  "use server";
  await requireRole(["admin", "manager"]);
  await api(`/ai-content/contents/${encodeURIComponent(contentId)}/publish`, { method: "POST" });
  revalidatePath(COCKPIT_PATH);
}

async function unpublishContent(contentId) {
  "use server";
  await requireRole(["admin", "manager"]);
  await api(`/ai-content/contents/${encodeURIComponent(contentId)}/unpublish`, { method: "POST" });
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
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch { return String(value); }
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

function targeting(content) {
  const value = content?.seo?.editorialTargeting;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { scope: "network", agencyIds: [], indexAgencyId: null };
  }
  return {
    scope: value.scope === "agencies" ? "agencies" : "network",
    agencyIds: Array.isArray(value.agencyIds) ? value.agencyIds.map(String) : [],
    indexAgencyId: value.indexAgencyId ? String(value.indexAgencyId) : null,
  };
}

function TargetingSummary({ content, agencies }) {
  const value = targeting(content);
  if (value.scope === "network") {
    return <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">Réseau · non indexé localement</span>;
  }

  const names = value.agencyIds
    .map((id) => agencies.find((agency) => String(agency.id) === id)?.city || agencies.find((agency) => String(agency.id) === id)?.name || `#${id}`)
    .join(", ");
  const indexName = agencies.find((agency) => String(agency.id) === value.indexAgencyId)?.city
    || agencies.find((agency) => String(agency.id) === value.indexAgencyId)?.name
    || value.indexAgencyId;

  return (
    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
      {names || "Agences ciblées"} · SEO : {indexName || "à définir"}
    </span>
  );
}

export default async function EditorialContentPage() {
  await requireRole(["admin", "manager"]);

  const [contents, agencies] = await Promise.all([loadContents(), loadAgencies()]);
  const published = contents.filter((item) => item.status === "published").length;
  const review = contents.filter((item) => item.status === "review").length;
  const drafts = contents.filter((item) => item.status === "draft").length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Studio éditorial Inspirations"
          subtitle="Générez, contrôlez, ciblez et publiez les contenus qui alimentent automatiquement les mini-sites Mondescale."
          action={<div className="flex flex-wrap gap-2"><ButtonLink href="/website-builder">Website Designer</ButtonLink><ButtonLink href="/agency-launch">Mise en ligne</ButtonLink><ButtonLink href="/">Dashboard</ButtonLink></div>}
        />

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">À valider</p><strong className="mt-2 block text-3xl">{review}</strong></article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Publiés</p><strong className="mt-2 block text-3xl text-emerald-700">{published}</strong></article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Brouillons</p><strong className="mt-2 block text-3xl">{drafts}</strong></article>
        </section>

        <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Nouvelle inspiration</p>
            <h2 className="mt-2 text-2xl font-bold">Créer un contenu voyage</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Le contenu généré arrive d’abord en validation. Définissez ensuite son ciblage local avant de le publier.</p>
          </div>
          <form action={generateInspiration} className="grid gap-4 lg:grid-cols-[2fr_1fr_2fr_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-semibold">Sujet ou destination<input name="topic" required placeholder="Ex. Sicile hors saison" className="min-h-11 rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-500" /></label>
            <label className="grid gap-2 text-sm font-semibold">Ville cible<input name="city" placeholder="Ex. Bois-Colombes" className="min-h-11 rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-500" /></label>
            <label className="grid gap-2 text-sm font-semibold">Mots-clés complémentaires<input name="keywords" placeholder="voyage, conseil, séjour, départ Paris" className="min-h-11 rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-500" /></label>
            <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-blue-800">Générer</button>
          </form>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Workflow éditorial</p><h2 className="mt-2 text-2xl font-bold">Contenus générés</h2></div><p className="text-sm text-slate-500">{contents.length} contenu(s)</p></div>

          {!contents.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><strong className="block text-lg">Aucune inspiration pour le moment</strong><p className="mt-2 text-sm text-slate-600">Générez le premier article ci-dessus. Après validation, ciblage et publication, les blocs Inspirations automatiques pourront l’afficher.</p></div>
          ) : (
            <div className="grid gap-5">
              {contents.map((content) => {
                const preview = bodyPreview(content);
                const currentTargeting = targeting(content);
                const isPublished = content.status === "published";
                const publishableStatus = ["review", "draft", "approved"].includes(content.status);
                const canonicalAgency = currentTargeting.scope === "agencies"
                  ? agencies.find((agency) => String(agency.id) === currentTargeting.indexAgencyId)
                  : null;
                const canonicalSiteReady = currentTargeting.scope !== "agencies"
                  || Boolean(canonicalAgency?.site?.published && canonicalAgency?.site?.slug);
                const canPublish = publishableStatus && canonicalSiteReady;
                const canEdit = publishableStatus && !content.campaignId;

                return (
                  <article key={content.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0 max-w-4xl flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses(content.status)}`}>{statusLabel(content.status)}</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{content.channel}</span>
                          <TargetingSummary content={content} agencies={agencies} />
                          {Number.isFinite(content.qualityScore) ? <span className="text-xs font-semibold text-slate-500">Qualité {content.qualityScore}/100</span> : null}
                        </div>

                        <h3 className="text-xl font-bold leading-tight">{content.title}</h3>
                        {content.excerpt ? <p className="mt-2 text-sm leading-6 text-slate-600">{content.excerpt}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>Slug : {content.slug || "—"}</span><span>Révision : {content.revision || 1}</span><span>Mis à jour : {formatDate(content.updatedAt)}</span>{content.publishedAt ? <span>Publié : {formatDate(content.publishedAt)}</span> : null}</div>

                        {publishableStatus && currentTargeting.scope === "agencies" && !canonicalSiteReady ? (
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <strong className="block">Publication locale bloquée</strong>
                            <p className="mt-1">L’agence propriétaire de l’indexation SEO doit disposer d’un mini-site publié avant que cette inspiration puisse être mise en ligne.</p>
                            <a href="/agency-launch" className="mt-2 inline-flex font-bold underline underline-offset-2">Ouvrir la mise en ligne des agences</a>
                          </div>
                        ) : null}

                        {canEdit ? (
                          <details className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                            <summary className="cursor-pointer text-sm font-bold text-blue-900">Corriger et cibler avant publication</summary>
                            <form action={updateContent.bind(null, content.id)} className="mt-4 grid gap-5">
                              <label className="grid gap-2 text-sm font-semibold text-slate-800">Titre éditorial<input name="title" required defaultValue={content.title || ""} maxLength={90} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" /></label>
                              <label className="grid gap-2 text-sm font-semibold text-slate-800">Extrait de la carte Inspiration<textarea name="excerpt" defaultValue={content.excerpt || ""} maxLength={240} rows={4} className="rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>

                              <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
                                <legend className="px-2 text-sm font-bold text-slate-900">Diffusion sur les mini-sites</legend>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="flex gap-3 rounded-xl border p-3 text-sm"><input type="radio" name="targetScope" value="network" defaultChecked={currentTargeting.scope !== "agencies"} /><span><strong className="block">Tout le réseau</strong><small className="text-slate-500">Visible sur toutes les agences. Non indexé sur une URL locale pour éviter le contenu dupliqué.</small></span></label>
                                  <label className="flex gap-3 rounded-xl border p-3 text-sm"><input type="radio" name="targetScope" value="agencies" defaultChecked={currentTargeting.scope === "agencies"} /><span><strong className="block">Agences sélectionnées</strong><small className="text-slate-500">Visible uniquement sur les mini-sites choisis.</small></span></label>
                                </div>

                                {agencies.length ? (
                                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {agencies.map((agency) => {
                                      const id = String(agency.id);
                                      return <label key={id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" name="agencyIds" value={id} defaultChecked={currentTargeting.agencyIds.includes(id)} /><span>{agency.name || agency.city}</span></label>;
                                    })}
                                  </div>
                                ) : <p className="mt-4 text-sm text-amber-700">La liste des agences n’est pas disponible. Le contenu peut rester en diffusion réseau.</p>}

                                <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-800">
                                  Agence propriétaire de l’indexation SEO
                                  <select name="indexAgencyId" defaultValue={currentTargeting.indexAgencyId || ""} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal">
                                    <option value="">Première agence sélectionnée</option>
                                    {agencies.map((agency) => <option key={agency.id} value={String(agency.id)}>{agency.name || agency.city}</option>)}
                                  </select>
                                  <small className="font-normal text-slate-500">Une seule URL locale entre dans Google et le sitemap, même si plusieurs agences affichent l’article.</small>
                                </label>
                              </fieldset>

                              <button type="submit" className="w-fit rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-900">Enregistrer les corrections et le ciblage</button>
                            </form>
                          </details>
                        ) : null}

                        {preview ? (
                          <details className="mt-4 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-bold text-slate-800">Relire le contenu généré</summary><div className="mt-4 grid gap-4 text-sm leading-6 text-slate-700">{preview.introduction ? <p>{preview.introduction}</p> : null}{preview.sections.map((section, index) => <section key={section.id || index} className="border-l-2 border-slate-200 pl-4">{section.title ? <strong>{section.title}</strong> : null}<p>{section.text || section.content || section.body || ""}</p></section>)}{preview.faq.length ? <div><strong>FAQ générée : {preview.faq.length} question(s)</strong></div> : null}</div></details>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {canPublish ? <form action={publishContent.bind(null, content.id)}><button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Publier</button></form> : null}
                        {publishableStatus && !canonicalSiteReady ? <button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500">Publication bloquée</button> : null}
                        {isPublished ? <form action={unpublishContent.bind(null, content.id)}><button type="submit" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Dépublier</button></form> : null}
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