import Link from "next/link";
import MainLayout from "../../components/MainLayout";

export const dynamic = "force-dynamic";

function backendOrigin() {
  return String(process.env.BACKEND_INTERNAL_URL || process.env.API_INTERNAL_URL || process.env.INTERNAL_API_URL || "http://backend:4000").replace(/\/+$/g, "");
}

const tenantHeaders = { Accept: "application/json", "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale" };

async function fetchJson(path, { allow503 = false } = {}) {
  const response = await fetch(`${backendOrigin()}${path}`, { headers: tenantHeaders, cache: "no-store" });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text || `HTTP ${response.status}` }; }
  if (!response.ok && !(allow503 && response.status === 503)) throw new Error(payload?.message || `HTTP ${response.status}`);
  return payload;
}

async function loadOperationalStatus() { return fetchJson("/minisite-semantic-engine/operational-status", { allow503: true }); }
async function loadIndexationCoverage() { return fetchJson("/search-console-submissions/indexation-coverage"); }
async function loadPublicIndexability() { return fetchJson("/search-console-submissions/public-indexability?limit=300"); }

function Value({ children }) { return <div className="mt-1 text-2xl font-black text-slate-950">{children}</div>; }
function Card({ label, children, hint }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">{label}</div><Value>{children}</Value>{hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}</div>; }
function stateClass(status) { if (status === "healthy" || status === "SEARCH_CONSOLE_ANALYTICS_AVAILABLE" || status === "PUBLIC_INDEXABILITY_OK") return "border-emerald-300 bg-emerald-50 text-emerald-950"; if (status === "attention" || status === "LOCAL_COVERAGE_OK_WAITING_FOR_GOOGLE") return "border-amber-300 bg-amber-50 text-amber-950"; if (status === "error" || status === "LOCAL_INDEXATION_ISSUES_FOUND" || status === "PUBLIC_INDEXABILITY_ISSUES_FOUND") return "border-red-300 bg-red-50 text-red-950"; return "border-slate-300 bg-slate-50 text-slate-950"; }

const reasonLabel = {
  MISSING_FROM_SITEMAP: "Absente du sitemap",
  NOT_INDEXABLE: "Non indexable par contrat local",
  ROBOTS_BLOCKED: "Directive noindex/robots locale",
  CANONICAL_MISMATCH: "Canonical locale incohérente",
  OBSERVED_BY_SEARCH_CONSOLE: "Observée dans Search Console",
  NOT_OBSERVED_BY_SEARCH_CONSOLE: "Pas observée dans la période",
  SITEMAP_EXPOSED_WAITING_FOR_GOOGLE: "Sitemap OK · en attente de données Google",
};

const publicReasonLabel = {
  PUBLIC_INDEXABILITY_OK: "HTTP public OK",
  PUBLIC_FETCH_UNAVAILABLE: "Observation HTTP indisponible",
  PUBLIC_HTTP_ERROR: "Erreur HTTP publique",
  PUBLIC_URL_REDIRECTED: "URL redirigée",
  PUBLIC_ROBOTS_TXT_BLOCKED: "Bloquée par robots.txt",
  PUBLIC_META_NOINDEX: "meta robots noindex",
  PUBLIC_X_ROBOTS_NOINDEX: "X-Robots-Tag noindex",
  PUBLIC_CANONICAL_MISMATCH: "Canonical HTML incohérente",
};

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/g, "");
    return `${url.protocol}//${url.host}${path}`;
  } catch { return String(value || "").replace(/[?#].*$/g, "").replace(/\/+$/g, ""); }
}

function PublicObservation({ observation }) {
  if (!observation) return <span className="text-slate-400">Non auditée</span>;
  return <div><div className="font-semibold">{publicReasonLabel[observation.reason] || observation.reason}</div><div className="mt-1 text-xs text-slate-500">HTTP {observation.status ?? "—"}{observation.publicCanonical ? ` · canonical ${observation.canonicalMatchesExpected ? "OK" : "différente"}` : " · canonical absente"}{observation.robotsTxtAllowed === false ? " · robots.txt bloquant" : ""}</div></div>;
}

function CoverageTable({ sites = [], publicObservations = [] }) {
  const publicByUrl = new Map(publicObservations.map((item) => [normalizeUrl(item.expectedUrl), item]));
  const rows = sites.flatMap((site) => (site.pages || []).map((page) => ({ ...page, siteSlug: site.siteSlug, agencyName: site.agencyName })));
  if (!rows.length) return <div className="mt-4 text-sm text-slate-500">Aucune AgencySitePage publiée détectée.</div>;
  return <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Mini-site</th><th className="px-3 py-3">Page</th><th className="px-3 py-3">Sitemap</th><th className="px-3 py-3">Contrat local</th><th className="px-3 py-3">HTTP public</th><th className="px-3 py-3">Search Console</th><th className="px-3 py-3">Diagnostic local</th></tr></thead><tbody>{rows.map((page) => { const publicObservation = publicByUrl.get(normalizeUrl(page.url)); return <tr key={`${page.siteSlug}:${page.pageId || page.url}`} className="border-b border-slate-100 align-top"><td className="px-3 py-3 font-semibold">{page.agencyName || page.siteSlug}</td><td className="px-3 py-3"><div className="font-semibold">{page.pageSlug || "accueil"}</div><div className="mt-1 max-w-md break-all text-xs text-slate-500">{page.url}</div></td><td className="px-3 py-3">{page.inSitemap ? "Oui" : "Non"}</td><td className="px-3 py-3">{page.indexableByLocalContract ? "Indexable" : "Bloquée"}<div className="mt-1 text-xs text-slate-500">canonical {page.canonicalMatchesPublicUrl ? "OK" : "à corriger"}</div></td><td className="px-3 py-3"><PublicObservation observation={publicObservation} /></td><td className="px-3 py-3">{page.observedBySearchConsoleAnalytics ? "Observée" : "Non observée"}</td><td className="px-3 py-3 font-semibold">{reasonLabel[page.reason] || page.reason || "—"}</td></tr>; })}</tbody></table></div>;
}

export default async function OperationalSeoPage() {
  const [operationalResult, coverageResult, publicResult] = await Promise.allSettled([loadOperationalStatus(), loadIndexationCoverage(), loadPublicIndexability()]);
  const payload = operationalResult.status === "fulfilled" ? operationalResult.value : null;
  const error = operationalResult.status === "rejected" ? operationalResult.reason : null;
  const coverage = coverageResult.status === "fulfilled" ? coverageResult.value : null;
  const coverageError = coverageResult.status === "rejected" ? coverageResult.reason : null;
  const publicAudit = publicResult.status === "fulfilled" ? publicResult.value : null;
  const publicError = publicResult.status === "rejected" ? publicResult.reason : null;
  const search = payload?.searchConsole || {};
  const pipeline = payload?.pipeline || {};
  const safety = payload?.safety || {};
  const runtime = payload?.runtimeEnv || {};
  const cover = coverage?.summary || {};
  const liveSearch = coverage?.searchConsole || {};
  const publicSummary = publicAudit?.summary || {};
  const publicStatus = publicSummary.publicIssueCount > 0 ? "PUBLIC_INDEXABILITY_ISSUES_FOUND" : publicAudit ? "PUBLIC_INDEXABILITY_OK" : "PUBLIC_INDEXABILITY_UNAVAILABLE";

  return <MainLayout title="Opérations d'indexation" subtitle="Couverture réelle des mini-sites : contrat local, sitemap, réponse HTTP publique, robots/canonical et observations Search Console. Cette vue est strictement en lecture seule.">
    <div className="mb-5 flex flex-wrap gap-4 text-sm font-semibold"><Link href="/seo-cockpit" className="text-slate-600 hover:underline">← Retour au cockpit SEO</Link><Link href="/seo-cockpit/runtime" className="text-slate-600 hover:underline">Runtime rollback →</Link></div>

    {coverageError ? <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"><div className="font-black">Diagnostic de couverture indisponible</div><div className="mt-2 text-sm">{coverageError.message}</div></section> : coverage ? <>
      <section className={`rounded-2xl border p-6 shadow-sm ${stateClass(cover.status)}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-xs font-bold uppercase tracking-wide opacity-70">Couverture d'indexation locale · MSE-25.69</div><h2 className="mt-1 text-2xl font-black">{cover.status || "—"}</h2><p className="mt-2 max-w-4xl text-sm opacity-85">{coverage.explanation}</p></div><div className="rounded-xl bg-white/70 px-4 py-3 text-sm">Mini-sites publiés : <strong>{coverage.publishedSiteCount ?? 0}</strong> · URLs sitemap : <strong>{coverage.sitemapUrlCount ?? 0}</strong></div></div></section>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"><Card label="Pages publiées">{cover.publishedPageCount ?? 0}</Card><Card label="Dans le sitemap">{cover.sitemapExposedPageCount ?? 0}</Card><Card label="Indexables localement">{cover.locallyIndexablePageCount ?? 0}</Card><Card label="Anomalies locales">{cover.localIssueCount ?? 0}</Card><Card label="Observées Google">{cover.observedBySearchConsoleAnalyticsCount ?? 0}</Card><Card label="En attente Google">{cover.waitingForGoogleCount ?? 0}</Card></div>
    </> : null}

    <section className={`mt-6 rounded-2xl border p-6 shadow-sm ${stateClass(publicStatus)}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-xs font-bold uppercase tracking-wide opacity-70">Observation HTTP publique · MSE-25.70</div><h2 className="mt-1 text-2xl font-black">{publicStatus}</h2>{publicError ? <p className="mt-2 text-sm">Observation indisponible : {publicError.message}</p> : <p className="mt-2 max-w-4xl text-sm opacity-85">Vérification réelle des réponses servies publiquement : HTTP, redirections, robots.txt, meta robots, X-Robots-Tag et canonical HTML.</p>}</div>{publicAudit ? <div className="rounded-xl bg-white/70 px-4 py-3 text-sm">URLs auditées : <strong>{publicAudit.auditedUrlCount ?? 0}</strong>{publicAudit.truncated ? " · audit tronqué" : ""}</div> : null}</div>
    </section>

    {publicAudit ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"><Card label="HTTP accessibles">{publicSummary.reachableCount ?? 0}</Card><Card label="Erreurs HTTP">{publicSummary.httpErrorCount ?? 0}</Card><Card label="robots.txt bloquées">{publicSummary.robotsBlockedCount ?? 0}</Card><Card label="noindex public">{publicSummary.noindexCount ?? 0}</Card><Card label="Canonical incohérente">{publicSummary.canonicalMismatchCount ?? 0}</Card><Card label="Redirections">{publicSummary.redirectedCount ?? 0}</Card></div> : null}

    {coverage ? <>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Explication du zéro Search Console</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 text-sm"><div><div className="text-slate-500">Propriété</div><div className="font-black break-all">{liveSearch.siteUrl || "—"}</div></div><div><div className="text-slate-500">Périmètre</div><div className="font-black break-all">{liveSearch.pagePrefix || "—"}</div></div><div><div className="text-slate-500">État Analytics</div><div className="font-black">{liveSearch.analyticsState || "—"}</div></div><div><div className="text-slate-500">Lignes observées</div><div className="font-black">{liveSearch.rowCount ?? 0}</div></div><div><div className="text-slate-500">Causes locales</div><div className="font-black">{cover.localIssueCount ?? 0}</div></div></div><p className="mt-4 text-sm text-slate-600">{liveSearch.semantics}</p>{liveSearch.error ? <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>{liveSearch.error.code}</strong> · {liveSearch.error.message}</div> : null}</section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black">Couverture par page</h2><p className="mt-1 text-sm text-slate-500">AgencySitePage publiée → sitemap → contrat local → HTTP public réel → Search Console.</p></div><div className="text-xs text-slate-500">{publicAudit?.observedAt ? `HTTP observé ${new Date(publicAudit.observedAt).toLocaleString("fr-FR")}` : coverage.observedAt ? `Observé ${new Date(coverage.observedAt).toLocaleString("fr-FR")}` : ""}</div></div><CoverageTable sites={coverage.sites} publicObservations={publicAudit?.observations || []} /><p className="mt-4 text-xs text-slate-500">Le contrôle HTTP est une observation en lecture seule. Une indisponibilité temporaire est distinguée d'une anomalie locale de configuration et ne déclenche aucune correction automatique.</p></section>
    </> : null}

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">État certifié du moteur de demande</h2>{error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"><div className="font-black">État opérationnel indisponible</div><div className="mt-2 text-sm">{error.message}</div></div> : <><div className={`mt-4 rounded-xl border p-5 ${stateClass(payload?.status)}`}><div className="font-black">{payload?.nextAction || payload?.reason || "En attente"}</div><div className="mt-1 text-sm">{payload?.state || "—"}</div></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6"><Card label="Search Console">{search.dataState || "—"}</Card><Card label="Cycle de demande">{search.lifecycleState || payload?.state || "—"}</Card><Card label="Signaux à revoir">{pipeline.reviewItemCount ?? 0}</Card><Card label="Priorisés">{pipeline.prioritizedReviewItemCount ?? 0}</Card><Card label="Dossiers décision">{pipeline.decisionPacketCount ?? 0}</Card><Card label="Gate humain">{payload?.humanGate?.required ? "REQUIS" : "NON"}</Card></div></>}</section>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Runtime Search Console</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 text-sm"><div><div className="text-slate-500">DATABASE_URL chargé</div><div className="font-black">{runtime.databaseConfigured == null ? "—" : runtime.databaseConfigured ? "Oui" : "Non"}</div></div><div><div className="text-slate-500">Hôte base</div><div className="font-black break-all">{runtime.databaseHost || "—"}</div></div><div><div className="text-slate-500">Credentials Google</div><div className="font-black">{runtime.googleClientConfigured == null ? "—" : runtime.googleClientConfigured ? "Oui" : "Non"}</div></div><div><div className="text-slate-500">Redirect OAuth</div><div className="font-black">{runtime.googleRedirectUriConfigured == null ? "—" : runtime.googleRedirectUriConfigured ? "Oui" : "Non"}</div></div><div><div className="text-slate-500">Override DB host</div><div className="font-black">{runtime.hostDatabaseOverrideApplied ? "Oui" : "Non"}</div></div></div></section>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Garde-fous</h2><div className="mt-4 grid gap-3 md:grid-cols-5 text-sm"><div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Exécutables</div><div className="font-black">{safety.executableCount ?? 0}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Écritures auto</div><div className="font-black">{safety.automaticWriteCount ?? 0}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Pages créées</div><div className="font-black">{safety.pageCreationCount ?? 0}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Publications</div><div className="font-black">{safety.publicationCount ?? 0}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Mutations Designer</div><div className="font-black">{safety.websiteDesignerMutationCount ?? 0}</div></div></div></section>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600"><div><strong>Rapport :</strong> {payload?.reportPath || "aucun rapport certifié"}</div>{payload?.generatedAt ? <div className="mt-2"><strong>Observation certifiée :</strong> {new Date(payload.generatedAt).toLocaleString("fr-FR")}</div> : null}{payload?.statusFingerprint ? <div className="mt-2 break-all"><strong>Fingerprint :</strong> {payload.statusFingerprint}</div> : null}</section>
  </MainLayout>;
}
