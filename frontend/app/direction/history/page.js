import { requireRole } from "../../lib/access";
import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getHistory() {
  const res = await fetch("http://backend:4000/direction/monthly-history", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement historique");

  return res.json();
}

export default async function DirectionHistoryPage() {
  await requireRole(["admin", "manager"]);

  const data = await getHistory();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Historique Direction"
          subtitle="Évolution mensuelle SEO local, Google Posts et réputation."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/direction">Direction</ButtonLink>
              <ButtonLink href="/direction/reputation">Réputation</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Mois</th>
                <th className="text-left p-4">Score SEO</th>
                <th className="text-left p-4">Score Réputation</th>
                <th className="text-left p-4">Posts</th>
                <th className="text-left p-4">Publiés</th>
                <th className="text-left p-4">Demandes avis</th>
                <th className="text-left p-4">Avis restants</th>
              </tr>
            </thead>

            <tbody>
              {data.history.map((row) => (
                <tr key={row.month} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{row.month}</td>
                  <td className="p-4 font-bold">{row.seoScore}%</td>
                  <td className="p-4 font-bold">{row.reputationScore}%</td>
                  <td className="p-4">{row.posts}</td>
                  <td className="p-4">{row.published}</td>
                  <td className="p-4">{row.reviewsSent}</td>
                  <td className="p-4">{row.remainingReviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <div className="font-bold mb-2">Lecture rapide</div>
          <div className="text-sm text-gray-700">
            Cette page permet de suivre la progression mensuelle du réseau :
            publications Google, validations, avis demandés et score global.
          </div>
        </div>
      </div>
    </main>
  );
}
