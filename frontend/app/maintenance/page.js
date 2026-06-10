import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const commands = [
  {
    title: "Vérifier la plateforme",
    command: "./scripts/check-platform.sh"
  },
  {
    title: "Créer une sauvegarde",
    command: "./scripts/backup-platform.sh"
  },
  {
    title: "Compresser la dernière sauvegarde",
    command: "./scripts/archive-backup.sh"
  },
  {
    title: "Lister les sauvegardes",
    command: "ls -lah backups"
  },
  {
    title: "Restaurer une sauvegarde",
    command: "./scripts/restore-backup.sh backups/DATE"
  }
];

export default async function MaintenancePage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Maintenance"
          subtitle="Commandes d’exploitation, vérification, sauvegarde et restauration."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/production">Production</ButtonLink>
              <ButtonLink href="/backups">Sauvegardes</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="space-y-4">
          {commands.map((item) => (
            <div key={item.title} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold mb-3">{item.title}</div>
              <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
{`cd ~/mondescale-local-engine

${item.command}`}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
