export default function SeoHealthGoal({ goal = {} }) {
  if (goal.current == null || goal.target == null) return null;
  const recommended = Array.isArray(goal.recommendedSteps) ? goal.recommendedSteps : [];
  return (
    <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="border-b border-emerald-200 px-6 py-5">
        <h2 className="text-xl font-bold text-emerald-950">Prochain palier de santé SEO</h2>
        <p className="mt-1 text-sm text-emerald-800">Objectif progressif calculé à partir du score actuel et des leviers réellement actionnables.</p>
      </div>
      <div className="grid gap-5 p-6 lg:grid-cols-[0.8fr_1.4fr]">
        <div className="rounded-xl bg-white/80 p-5">
          <div className="text-sm font-medium text-emerald-800">Palier cible</div>
          <div className="mt-2 text-4xl font-black text-emerald-950">{goal.current} → {goal.target}</div>
          <div className="mt-2 text-sm text-emerald-800">+{goal.requiredGain || 0} point{Number(goal.requiredGain || 0) > 1 ? "s" : ""} à récupérer</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full bg-emerald-700" style={{ width: `${Math.min(100, Number(goal.progress || 0))}%` }} /></div>
          <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${goal.reachable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{goal.reachable ? "Palier atteignable" : "Palier partiellement actionnable"}</div>
          <p className="mt-3 text-xs leading-5 text-emerald-800">{goal.note}</p>
        </div>
        <div>
          <div className="text-sm font-semibold text-emerald-950">Leviers recommandés pour atteindre ce palier</div>
          <div className="mt-3 space-y-3">{recommended.map((step, index) => <div key={`${step.component}-${index}`} className="rounded-xl bg-white/80 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wide text-emerald-700">#{index + 1} · {step.label}</div><div className="mt-1 font-semibold text-emerald-950">{step.action?.title || "Action à définir"}</div></div><div className="text-sm font-black text-emerald-950">+{Number(step.potentialGain || 0).toFixed(1)}</div></div>{step.action?.detail ? <p className="mt-2 text-sm text-emerald-800">{step.action.detail}</p> : null}</div>)}{!recommended.length ? <div className="rounded-xl bg-white/70 p-4 text-sm text-emerald-800">Aucune action supplémentaire n’est nécessaire pour le palier actuel.</div> : null}</div>
        </div>
      </div>
    </section>
  );
}
