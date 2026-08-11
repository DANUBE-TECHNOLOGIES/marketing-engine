export default function SeoHealthActionPlan({ plan }) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (!steps.length) return null;

  return (
    <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="border-b border-emerald-200 px-6 py-5">
        <h2 className="text-xl font-bold text-emerald-950">Plan d’action SEO priorisé</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Ordre calculé selon les points réellement perdus dans la santé SEO, puis relié aux recommandations disponibles.
        </p>
      </div>
      <div className="divide-y divide-emerald-100">
        {steps.map((step) => (
          <div key={step.component} className="grid gap-4 px-6 py-4 lg:grid-cols-[0.3fr_1fr_0.45fr] lg:items-center">
            <div className="text-3xl font-black text-emerald-900">#{step.order}</div>
            <div>
              <div className="font-bold text-emerald-950">{step.label}</div>
              <div className="mt-1 text-sm text-emerald-800">{step.detail}</div>
              {step.action ? (
                <div className="mt-2 rounded-lg bg-white/80 p-3 text-sm text-emerald-950">
                  <strong>Action recommandée :</strong> {step.action.title}
                  {step.action.detail ? <div className="mt-1 text-emerald-800">{step.action.detail}</div> : null}
                </div>
              ) : (
                <div className="mt-2 text-xs font-medium text-emerald-700">À surveiller : aucune action fiable supplémentaire à générer actuellement.</div>
              )}
            </div>
            <div className="rounded-xl bg-white/80 p-4 text-center">
              <div className="text-xs text-emerald-700">Potentiel récupérable</div>
              <div className="mt-1 text-2xl font-black text-emerald-950">+{Number(step.lostPoints || 0).toFixed(1)}</div>
              <div className="text-xs text-emerald-700">points santé SEO</div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-emerald-200 px-6 py-4 text-sm text-emerald-900">
        Potentiel théorique total : <strong>+{Number(plan.totalLostPoints || 0).toFixed(1)} points</strong> · {plan.actionableSteps || 0} étape{plan.actionableSteps === 1 ? "" : "s"} directement actionnable{plan.actionableSteps === 1 ? "" : "s"}.
      </div>
    </section>
  );
}
