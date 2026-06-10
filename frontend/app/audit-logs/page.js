import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getLogs() {

  const res = await fetch(
    "http://backend:4000/audit-logs",
    {
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error("Erreur audit logs");
  }

  return res.json();
}

export default async function AuditLogsPage() {

  await requireRole(["admin"]);

  const data = await getLogs();

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-6xl mx-auto">

        <PageHeader
          title="Audit logs"
          subtitle="Historique des actions critiques."
          action={
            <div className="flex gap-2">

              <ButtonLink href="/production">
                Production
              </ButtonLink>

              <ButtonLink href="/admin-network">
                Admin réseau
              </ButtonLink>

            </div>
          }
        />

        <div className="bg-white rounded-xl shadow overflow-hidden">

          <table className="w-full text-sm">

            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">
                  Type
                </th>

                <th className="text-left p-4">
                  Utilisateur
                </th>

                <th className="text-left p-4">
                  Message
                </th>

                <th className="text-left p-4">
                  Date
                </th>
              </tr>
            </thead>

            <tbody>

              {data.logs.map((log) => (

                <tr
                  key={log.id}
                  className="border-b hover:bg-gray-50"
                >

                  <td className="p-4">
                    {log.type}
                  </td>

                  <td className="p-4">
                    {log.user}
                  </td>

                  <td className="p-4">
                    {log.message}
                  </td>

                  <td className="p-4">
                    {new Date(log.createdAt).toLocaleString()}
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
