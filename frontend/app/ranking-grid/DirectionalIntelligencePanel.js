function rank(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `#${number}`
    : "—";
}

function position(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `#${number}`
    : "—";
}

const LABELS = {
  north: "Nord",
  north_east: "Nord-est",
  east: "Est",
  south_east: "Sud-est",
  south: "Sud",
  south_west: "Sud-ouest",
  west: "Ouest",
  north_west: "Nord-ouest",
};

function severityClasses(severity) {
  if (severity === "critical") {
    return "border-red-200 bg-red-50 text-red-950";
  }

  if (severity === "watch") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

export default function DirectionalIntelligencePanel({
  intelligence,
}) {
  if (!intelligence) return null;

  const profile = intelligence.profile || {};
  const decay = intelligence.decay || {};
  const asymmetry = intelligence.asymmetry || {};
  const directions = intelligence.directions || {};
  const recommendations =
    Array.isArray(intelligence.recommendations)
      ? intelligence.recommendations
      : [];

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Ranking Intelligence V2
          </div>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            Profil d’autorité géographique
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Analyse automatique de la décroissance et des asymétries de visibilité.
          </p>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${severityClasses(
            profile.severity
          )}`}
        >
          {profile.label || "Diagnostic indisponible"}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs uppercase text-slate-500">
            Centre
          </div>
          <div className="mt-1 text-2xl font-black">
            {rank(decay.centerRank)}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs uppercase text-slate-500">
            Périphérie
          </div>
          <div className="mt-1 text-2xl font-black">
            {position(decay.peripheralAveragePosition)}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs uppercase text-slate-500">
            Décroissance
          </div>
          <div className="mt-1 text-2xl font-black">
            {decay.peripheralMinusCenter == null
              ? "—"
              : `+${decay.peripheralMinusCenter}`}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs uppercase text-slate-500">
            Zone la plus faible
          </div>
          <div className="mt-1 text-xl font-black">
            {asymmetry.worstQuadrant?.label || "—"}
          </div>
          <div className="text-xs text-slate-500">
            {position(
              asymmetry.worstQuadrant?.averagePosition
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-bold text-slate-900">
          Autorité par direction
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          {Object.entries(LABELS).map(([key, label]) => {
            const item = directions[key] || {};

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-200 p-3 text-center"
              >
                <div className="text-xs font-semibold text-slate-500">
                  {label}
                </div>

                <div className="mt-1 text-lg font-black">
                  {position(item.averagePosition)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {recommendations.length ? (
        <div className="mt-6">
          <h3 className="font-bold text-slate-900">
            Recommandations automatiques
          </h3>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {recommendations.map((item) => (
              <div
                key={item.code}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{item.title}</strong>

                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase">
                    {item.priority}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  {item.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-5 text-xs text-slate-400">
        Analyse calculée exclusivement depuis les mesures déjà persistées :
        aucun appel DataForSEO et aucune écriture en base.
      </p>
    </section>
  );
}
