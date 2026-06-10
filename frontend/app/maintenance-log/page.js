import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const logs = [
  {
    date: "2026-06",
    type: "MVP",
    title: "Structuration SEO Direction",
    details: "Ajout SEO Today, rapport mensuel SEO, priorités SEO et calendrier clusters."
  },
  {
    date: "2026-06",
    type: "Référentiel",
    title: "Centralisation agences",
    details: "Séparation du référentiel agences dans backend/src/data/agencyDirectory.js."
  },
  {
    date: "2026-06",
    type: "Maintenance",
    title: "Scripts backup et check plateforme",
    details: "Ajout scripts/check-platform.sh, backup-platform.sh, archive-backup.sh et restore-backup.sh."
  }
];

export default async function MaintenanceLogPage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Journal de maintenance"
          subtitle="Historique des évolutions et opérations importantes."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/maintenance">Maintenance</ButtonLink>
              <ButtonLink href="/production">Production</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">
              <div className="text-sm text-gray-500 mb-1">{log.date} · {log.type}</div>
              <div className="font-bold text-lg mb-2">{log.title}</div>
              <div className="text-sm text-gray-700">{log.details}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
