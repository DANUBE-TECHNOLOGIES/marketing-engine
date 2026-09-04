import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getRankings() {
  const res = await fetch("http://backend:4000/rankings", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement rankings");

  return res.json();
}

async function getRankingGridCampaigns() {
  try {
    const res = await fetch("http://backend:4000/rankings/grid/campaigns?limit=6", {
      cache: "no-store"
    });

    if (!res.ok) return { campaigns: [], unavailable: true };
    const data = await res.json();
    return {
      campaigns: Array.isArray(data.campaigns) ? data.campaigns : [],
      unavailable: false,
    };
  } catch {
    return { campaigns: [], unavailable: true };
  }
}

function trendBadge(trend) {
  if (trend === "up") {
    return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">↑</span>;
  }

  if (trend === "down") {
    return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">↓</span>;
  }

  return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">→</span>;
}

function gridCellClasses(point) {
  if (point?.status === "error") return "bg-red-50 text-red-800 border-red-200";
  if (point?.status !== "success") return "bg-gray-100 text-gray-500 border-gray-200";
  if (!point?.found || !Number.isFinite(Number(point?.position))) return "bg-red-100 text-red-900 border-red-200";

  const position = Number(point.position);
  if (position <= 3) return "bg-green-100 text-green-900 border-green-200";
  if (position <= 10) return "bg-lime-100 text-lime-900 border-lime-200";
  if (position <= 20) return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-orange-100 text-orange-900 border-orange-200";
}

function gridCellLabel(point) {
  if (!point) return "—";
  if (point.status === "error") return "!";
  if (point.status !== "success") return "…";
  if (!point.found || !Number.isFinite(Number(point.position))) return "N/T";
  return `#${Number(point.position)}`;
}

function formatCampaignDate(value) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function campaignStatusLabel(status) {
  if (status === "completed") return "Mesure terminée";
  if (status === "partial") return "Mesure partielle";
  if (status === "running") return "Mesure en cours";
  return "En attente";
}

function RankingGridCard({ campaign }) {
  const gridSize = Number(campaign.gridSize) || 5;
  const center = Math.floor(gridSize / 2);
  const byCell = new Map(
    (Array.isArray(campaign.points) ? campaign.points : []).map((point) => [
      `${Number(point.row)}:${Number(point.col)}`,
      point,
    ])
  );
  const cells = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const point = byCell.get(`${row}:${col}`) || null;
      const isCenter = row === center && col === center;
      cells.push(
        <div
          key={`${row}:${col}`}
          className={`relative flex aspect-square items-center justify-center rounded-lg border text-xs font-bold sm:text-sm ${gridCellClasses(point)} ${isCenter ? "ring-2 ring-gray-900 ring-offset-1" : ""}`}
          title={point ? `Point ${row + 1}-${col + 1} · ${gridCellLabel(point)}` : `Point ${row + 1}-${col + 1} · sans donnée`}
        >
          {gridCellLabel(point)}
          {isCenter ? (
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-gray-500">
              centre
            </span>
          ) : null}
        </div>
      );
    }
  }

  const summary = campaign.summary && typeof campaign.summary === "object" ? campaign.summary : {};

  return (
    <article className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {campaign.agencyName || `Agence #${campaign.agencyId}`}
          </div>
          <h3 className="mt-1 text-lg font-bold">{campaign.keyword}</h3>
          <div className="mt-1 text-sm text-gray-500">
            {campaign.city || "Ville non renseignée"} · {formatCampaignDate(campaign.completedAt || campaign.createdAt)}
          </div>
        </div>
        <div className="text-right">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {gridSize} × {gridSize}
          </div>
          <div className="mt-2 text-xs text-gray-500">{campaignStatusLabel(campaign.status)}</div>
        </div>
      </div>

      <div className="mx-auto max-w-sm pb-5">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          aria-label={`Grille locale ${gridSize} par ${gridSize} pour ${campaign.keyword}`}
        >
          {cells}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t pt-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-gray-500">Présence</div>
          <div className="font-bold">{Number.isFinite(Number(summary.presenceRate)) ? `${Math.round(Number(summary.presenceRate) * 100)} %` : "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Top 3</div>
          <div className="font-bold">{Number.isFinite(Number(summary.top3Rate)) ? `${Math.round(Number(summary.top3Rate) * 100)} %` : "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Top 10</div>
          <div className="font-bold">{Number.isFinite(Number(summary.top10Rate)) ? `${Math.round(Number(summary.top10Rate) * 100)} %` : "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Position moy.</div>
          <div className="font-bold">{Number.isFinite(Number(summary.averagePosition)) ? `#${Number(summary.averagePosition)}` : "—"}</div>
        </div>
      </div>
    </article>
  );
}

function RankingGridSection({ campaigns, unavailable }) {
  return (
    <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Couverture locale Google Maps</h2>
          <p className="mt-1 text-sm text-gray-500">
            Dernières grilles géographiques enregistrées. Cet écran est en lecture seule et ne lance aucune mesure DataForSEO.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-900">1–3</span>
          <span className="rounded-full bg-lime-100 px-3 py-1 text-lime-900">4–10</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">11–20</span>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-900">21+</span>
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-900">Non trouvé / erreur</span>
        </div>
      </div>

      {unavailable ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Les grilles enregistrées sont temporairement indisponibles. Le suivi historique ci-dessous reste accessible.
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-5 text-sm text-gray-600">
          Aucune campagne géographique enregistrée pour le moment. Aucun appel fournisseur n’est déclenché depuis cet écran.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {campaigns.map((campaign) => (
            <RankingGridCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function RankingsPage() {
  await requireRole(["admin", "manager"]);

  const [data, gridData] = await Promise.all([
    getRankings(),
    getRankingGridCampaigns(),
  ]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Positions locales"
          subtitle="Suivi des mots-clés SEO locaux du réseau."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/global-scores">Scores globaux</ButtonLink>
              <ButtonLink href="/direction">Direction</ButtonLink>
              <a href="http://localhost:4000/rankings/export" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <RankingGridSection campaigns={gridData.campaigns} unavailable={gridData.unavailable} />

        <div className="space-y-6">
          {data.rankings.map((agency) => (
            <div key={agency.agencyId} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-lg">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                </div>

                <div className="flex gap-2 items-center">
                  <ButtonLink href={`/rankings/${agency.agencyId}`}>Voir détail ranking</ButtonLink>
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-lg">
                  Position moyenne : {agency.averagePosition}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agency.keywords.map((keyword) => (
                  <div key={keyword.keyword} className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">
                        {keyword.keyword}
                      </div>

                      {trendBadge(keyword.trend)}
                    </div>

                    <div className="text-2xl font-bold">
                      #{keyword.position}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
