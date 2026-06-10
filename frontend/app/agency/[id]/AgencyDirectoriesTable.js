"use client";

import { useState } from "react";

function getStatusLabel(status) {
  const labels = {
    todo: "À vérifier",
    missing: "Absent",
    to_correct: "À corriger",
    pending: "En attente",
    ok: "Correct",
    ignored: "Ignoré"
  };

  return labels[status] || status;
}

function getAction(status) {
  if (status === "ok") return "Aucune action";
  if (status === "missing") return "Créer la fiche";
  if (status === "to_correct") return "Corriger les infos";
  if (status === "pending") return "Relancer / vérifier";
  if (status === "ignored") return "Non prioritaire";
  return "Vérifier la présence";
}

export default function AgencyDirectoriesTable({ agencyId, rows }) {
  const [filter, setFilter] = useState("todo");

  const filteredRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "todo") return row.status !== "ok" && row.status !== "ignored";
    if (filter === "critical") return row.directory.priority === 1 || row.directory.impactScore >= 5;
    if (filter === "ok") return row.status === "ok";
    return true;
  });

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setFilter("todo")}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg"
        >
          À traiter
        </button>

        <button
          onClick={() => setFilter("critical")}
          className="bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Critiques
        </button>

        <button
          onClick={() => setFilter("ok")}
          className="bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          OK
        </button>

        <button
          onClick={() => setFilter("all")}
          className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg"
        >
          Tout
        </button>

        <span className="ml-auto text-sm text-gray-600 self-center">
          {filteredRows.length} ligne(s)
        </span>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="text-left p-4">Annuaire</th>
              <th className="text-left p-4">Impact</th>
              <th className="text-left p-4">Statut</th>
              <th className="text-left p-4">Action recommandée</th>
              <th className="text-left p-4">Lien</th>
              <th className="text-left p-4">Modifier</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map(({ directory, listing, status }) => (
              <tr key={directory.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-semibold">
                  {directory.name}
                  <div className="text-xs text-gray-500">
                    {directory.category} · priorité {directory.priority}
                  </div>
                </td>

                <td className="p-4">{directory.impactScore}/5</td>
                <td className="p-4">{getStatusLabel(status)}</td>
                <td className="p-4 font-medium">{getAction(status)}</td>

                <td className="p-4">
                  {listing?.listingUrl ? (
                    <a
                      href={listing.listingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      Ouvrir
                    </a>
                  ) : (
                    <span className="text-gray-400">Aucun lien</span>
                  )}
                </td>

                <td className="p-4">
                  <a
                    href={`/agency/${agencyId}/directory/${directory.id}`}
                    className="inline-block bg-gray-900 text-white px-3 py-2 rounded-lg"
                  >
                    Modifier
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRows.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Aucune ligne pour ce filtre.
          </div>
        )}
      </div>
    </>
  );
}
