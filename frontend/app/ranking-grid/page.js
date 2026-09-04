import Link from "next/link";
import { requireRole } from "../lib/access";
import MainLayout from "../components/MainLayout";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:4000";
const TENANT_SLUG = process.env.TENANT_SLUG || process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";

async function getJson(path) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    cache: "no-store",
    headers: { "x-tenant-slug": TENANT_SLUG },
  });
  if (!response.ok) throw new Error(`Ranking grid API ${response.status} for ${path}`);
  return response.json();
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percent(value) {
  const number = numberOrNull(value);
  return number == null ? "—" : `${Math.round(number * 100)} %`;
}

function rank(value) {
  const number = numberOrNull(value);
  return number == null || number <= 0 ? "—" : `#${number}`;
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function bandClasses(band) {
  if (band === "top3") return "bg-emerald-100 border-emerald-300 text-emerald-950";
  if (band === "top10") return "bg-lime-100 border-lime-300 text-lime-950";
  if (band === "top20") return "bg-amber-100 border-amber-300 text-amber-950";
  if (band === "beyond20") return "bg-orange-100 border-orange-300 text-orange-950";
  return "bg-rose-100 border-rose-300 text-rose-900";
}

function deltaLabel(value, { position = false } = {}) {
  const number = numberOrNull(value);
  if (number == null) return "—";
  if (number === 0) return "stable";
  if (position) return number < 0 ? `${Math.abs(number)} place(s) gagnée(s)` : `${number} place(s) perdue(s)`;
  return `${number > 0 ? "+" : ""}${Math.round(number * 100)} pt`;
}

function Kpi({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-[#0f2e46]">{value}</div>
      {note ? <div className="mt-2 text-xs text-slate-500">{note}</div> : null}
    </div>
  );
}

function Heatmap({ heatmap }) {
  const center = Math.floor(Number(heatmap.gridSize) / 2);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Carte de visibilité Google Maps</h2>
          <p className="mt-1 text-sm text-slate-500">
            Grille {heatmap.gridSize} × {heatmap.gridSize} · pas de {heatmap.spacingKm} km · centre agence encadré.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-950">Top 3</span>
          <span className="rounded-full bg-lime-100 px-3 py-1 text-lime-950">4–10</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950">11–20</span>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-950">21+</span>
          <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-900">Non trouvé</span>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-xl">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${heatmap.gridSize}, minmax(0, 1fr))` }}>
          {heatmap.rows.flat().map((cell) => {
            const isCenter = cell.row === center && cell.col === center;
            return (
              <div
                key={`${cell.row}:${cell.col}`}
                className={`relative flex aspect-square items-center justify-center rounded-xl border text-lg font-black ${bandClasses(cell.band)} ${isCenter ? "ring-4 ring-[#0f2e46] ring-offset-2" : ""}`}
                title={`${cell.latitude}, ${cell.longitude} · ${cell.rank == null ? "non trouvé" : `#${cell.rank}`}`}
              >
                {cell.rank == null ? "—" : cell.rank}
                {isCenter ? <span className="absolute -bottom-6 text-[10px] font-bold uppercase tracking-wide text-slate-600">agence</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Comparison({ comparison }) {
  if (!comparison) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-xl font-bold">Évolution</h2>
        <p className="mt-2 text-sm text-slate-600">Le premier relevé sert de référence. La comparaison apparaîtra dès qu’un second snapshot aura été mesuré.</p>
      </section>
    );
  }

  const d = comparison.summaryDelta || {};
  const m = comparison.movement || {};
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Évolution depuis le relevé précédent</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Présence" value={deltaLabel(d.presenceRate)} />
        <Kpi label="Top 10" value={deltaLabel(d.top10Rate)} />
        <Kpi label="Position moyenne" value={deltaLabel(d.averagePosition, { position: true })} />
        <Kpi label="Points trouvés" value={d.foundPoints == null ? "—" : `${Number(d.foundPoints) > 0 ? "+" : ""}${d.foundPoints}`} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-center text-sm md:grid-cols-5">
        <div className="rounded-xl bg-emerald-50 p-3"><strong>{m.improved || 0}</strong><br />améliorés</div>
        <div className="rounded-xl bg-red-50 p-3"><strong>{m.declined || 0}</strong><br />dégradés</div>
        <div className="rounded-xl bg-slate-50 p-3"><strong>{m.unchanged || 0}</strong><br />stables</div>
        <div className="rounded-xl bg-cyan-50 p-3"><strong>{m.gainedPresence || 0}</strong><br />présences gagnées</div>
        <div className="rounded-xl bg-orange-50 p-3"><strong>{m.lostPresence || 0}</strong><br />présences perdues</div>
      </div>
    </section>
  );
}

export default async function RankingGridPage({ searchParams }) {
  await requireRole(["admin", "manager"]);
  const params = await searchParams;
  const agencyId = Number(params?.agencyId) > 0 ? Number(params.agencyId) : 6;
  const keywordId = Number(params?.keywordId) > 0 ? Number(params.keywordId) : 2;

  const historyPayload = await getJson(`/rankings/grid/history?agencyId=${agencyId}&keywordId=${keywordId}&limit=12`);
  const history = Array.isArray(historyPayload.history) ? historyPayload.history : [];
  const completed = history.filter((campaign) => campaign.status === "completed");
  const latest = completed[0] || history[0] || null;

  let heatmap = null;
  let comparison = null;
  if (latest) heatmap = await getJson(`/rankings/grid/campaigns/${latest.id}/heatmap`);
  if (completed.length >= 2) {
    comparison = await getJson(`/rankings/grid/compare?fromCampaignId=${completed[1].id}&toCampaignId=${completed[0].id}`);
  }

  if (!latest || !heatmap) {
    return (
      <MainLayout title="Visibilité locale Maps" subtitle="Pilotage géographique des positions Google Maps.">
        <div className="rounded-2xl border border-dashed bg-white p-8 text-slate-600">Aucune campagne de grille disponible pour cette agence et ce mot-clé.</div>
      </MainLayout>
    );
  }

  const summary = heatmap.summary || {};
  const center = Math.floor(Number(heatmap.gridSize) / 2);
  const centerCell = heatmap.rows?.[center]?.[center] || null;

  return (
    <MainLayout
      title="Visibilité locale Maps"
      subtitle="Mesure géographique de la visibilité Google Maps — consultation uniquement, aucun appel DataForSEO depuis cet écran."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0f2e46] p-5 text-white">
        <div>
          <div className="text-sm text-cyan-100">{latest.agencyName || `Agence #${latest.agencyId}`}</div>
          <div className="mt-1 text-2xl font-black">{latest.keyword}</div>
          <div className="mt-1 text-sm text-slate-300">{latest.city} · relevé du {dateLabel(latest.completedAt || latest.createdAt)}</div>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/rankings" className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">Rankings</Link>
          <Link href="/rankings-history" className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">Historique classique</Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Présence" value={percent(summary.presenceRate)} note={`${summary.foundPoints ?? 0}/${summary.totalPoints ?? 0} points`} />
        <Kpi label="Top 3" value={percent(summary.top3Rate)} note={`${summary.top3Points ?? 0} point(s)`} />
        <Kpi label="Top 10" value={percent(summary.top10Rate)} note={`${summary.top10Points ?? 0} point(s)`} />
        <Kpi label="Position moyenne" value={rank(summary.averagePosition)} note={`Meilleure ${rank(summary.bestPosition)}`} />
        <Kpi label="Position agence" value={rank(centerCell?.rank)} note="Point central de la grille" />
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <Heatmap heatmap={heatmap} />
        <Comparison comparison={comparison} />
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-xl font-bold">Historique des relevés</h2>
          <p className="mt-1 text-sm text-slate-500">Les snapshots successifs permettent de mesurer l’effet des optimisations locales sans modifier le relevé de référence.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="p-4">Relevé</th><th className="p-4">Statut</th><th className="p-4">Présence</th><th className="p-4">Top 10</th><th className="p-4">Moyenne</th><th className="p-4">Trouvé</th></tr>
            </thead>
            <tbody>
              {history.map((campaign) => (
                <tr key={campaign.id} className="border-t">
                  <td className="p-4 font-semibold">#{campaign.id} · {dateLabel(campaign.completedAt || campaign.createdAt)}</td>
                  <td className="p-4">{campaign.status}</td>
                  <td className="p-4">{percent(campaign.summary?.presenceRate)}</td>
                  <td className="p-4">{percent(campaign.summary?.top10Rate)}</td>
                  <td className="p-4">{rank(campaign.summary?.averagePosition)}</td>
                  <td className="p-4">{campaign.summary?.foundPoints ?? "—"}/{campaign.summary?.totalPoints ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </MainLayout>
  );
}
