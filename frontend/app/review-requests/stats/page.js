import { requireRole } from "../../lib/access";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ButtonLink from "../../components/ButtonLink";

async function getSummary() {
  const res = await fetch("http://backend:4000/review-requests/summary", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement statistiques");

  return res.json();
}

function priorityLabel(remaining) {
  if (remaining >= 3) return "Haute";
  if (remaining >= 1) return "Moyenne";
  return "OK";
}

function priorityClass(remaining) {
  if (remaining >= 3) return "bg-red-100 text-red-800";
  if (remaining >= 1) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function ReviewRequestStatsPage() {
  await requireRole(["admin", "manager"]);

  const summary = await getSummary();

  const monthlyTarget = 3;

  const enrichedSummary = summary.map((agency) => {
    const achieved = agency.sent || 0;
    const remaining = Math.max(monthlyTarget - achieved, 0);
    const progress = Math.min(Math.round((achieved / monthlyTarget) * 100), 100);

    return {
      ...agency,
      monthlyTarget,
      achieved,
      remaining,
      progress
    };
  });

  const total = enrichedSummary.reduce((sum, a) => sum + a.total, 0);
  const sent = enrichedSummary.reduce((sum, a) => sum + a.sent, 0);
  const drafts = enrichedSummary.reduce((sum, a) => sum + a.drafts, 0);
  const totalRemaining = enrichedSummary.reduce((sum, a) => sum + a.remaining, 0);
  const agenciesOk = enrichedSummary.filter((a) => a.remaining === 0).length;

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Statistiques demandes d’avis"
          subtitle="Objectif réseau : 3 demandes d’avis Google envoyées par mois et par agence."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/review-requests">Demandes</ButtonLink>
              <ButtonLink href="/review-requests/actions">Actions avis</ButtonLink>
              <ButtonLink href="/review-requests/new">Nouvelle demande</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Demandes totales" value={total} />
          <StatCard label="Envoyées" value={sent} />
          <StatCard label="Brouillons" value={drafts} />
          <StatCard label="Reste à envoyer" value={totalRemaining} />
          <StatCard label="Agences OK" value={`${agenciesOk}/${enrichedSummary.length}`} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Objectif</th>
                <th className="text-left p-4">Envoyées</th>
                <th className="text-left p-4">Reste</th>
                <th className="text-left p-4">Progression</th>
                <th className="text-left p-4">Priorité</th>
                <th className="text-left p-4">Canaux</th>
              </tr>
            </thead>

            <tbody>
              {enrichedSummary.map((agency) => (
                <tr key={agency.agencyId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{agency.agencyName}</td>
                  <td className="p-4">{agency.city}</td>
                  <td className="p-4">{agency.monthlyTarget}</td>
                  <td className="p-4 font-bold">{agency.achieved}</td>
                  <td className="p-4">{agency.remaining}</td>
                  <td className="p-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-900 h-2 rounded-full"
                        style={{ width: `${agency.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {agency.progress}%
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${priorityClass(agency.remaining)}`}>
                      {priorityLabel(agency.remaining)}
                    </span>
                  </td>
                  <td className="p-4 text-xs">
                    WhatsApp: {agency.whatsapp} / SMS: {agency.sms} / Email: {agency.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
