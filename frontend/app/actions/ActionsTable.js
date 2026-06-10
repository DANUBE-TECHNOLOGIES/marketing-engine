"use client";

import { useState } from "react";

export default function ActionsTable({ actions }) {
  const [search, setSearch] = useState("");
  const [agency, setAgency] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const agencies = [...new Set(actions.map((a) => a.agencyName))];

  const filtered = actions.filter((action) => {
    const text = `${action.agencyName} ${action.city} ${action.directoryName} ${action.problem} ${action.action}`.toLowerCase();

    return (
      text.includes(search.toLowerCase()) &&
      (agency === "all" || action.agencyName === agency) &&
      (status === "all" || action.status === status) &&
      (priority === "all" || String(action.priority) === priority)
    );
  });

  return (
    <>
      <div className="bg-white rounded-xl shadow p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche..."
          className="border rounded-lg p-3"
        />

        <select
          value={agency}
          onChange={(e) => setAgency(e.target.value)}
          className="border rounded-lg p-3"
        >
          <option value="all">Toutes les agences</option>
          {agencies.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-lg p-3"
        >
          <option value="all">Tous les statuts</option>
          <option value="todo">À vérifier</option>
          <option value="missing">Absent</option>
          <option value="to_correct">À corriger</option>
          <option value="pending">En attente</option>
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border rounded-lg p-3"
        >
          <option value="all">Toutes priorités</option>
          <option value="1">Priorité 1</option>
          <option value="2">Priorité 2</option>
          <option value="3">Priorité 3</option>
          <option value="4">Priorité 4</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <p className="text-sm text-gray-500">Actions affichées</p>
        <p className="text-3xl font-bold">{filtered.length}</p>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="text-left p-4">Agence</th>
              <th className="text-left p-4">Annuaire</th>
              <th className="text-left p-4">Impact</th>
              <th className="text-left p-4">Priorité</th>
              <th className="text-left p-4">Problème</th>
              <th className="text-left p-4">Action</th>
              <th className="text-left p-4">Modifier</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((action, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="p-4 font-semibold">
                  {action.agencyName}
                  <div className="text-xs text-gray-500">{action.city}</div>
                </td>
                <td className="p-4">{action.directoryName}</td>
                <td className="p-4">{action.impactScore}/5</td>
                <td className="p-4">{action.priority}</td>
                <td className="p-4">{action.problem}</td>
                <td className="p-4 font-medium">{action.action}</td>
                <td className="p-4">
                  <a
                    href={`/agency/${action.agencyId}/directory/${action.directoryId}`}
                    className="inline-block bg-gray-900 text-white px-3 py-2 rounded-lg"
                  >
                    Traiter
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Aucune action ne correspond aux filtres.
          </div>
        )}
      </div>
    </>
  );
}
