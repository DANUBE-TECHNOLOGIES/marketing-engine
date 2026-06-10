"use client";

import { useState } from "react";

export default function DirectoryForm({ agencyId, directoryId, listing }) {
  const [form, setForm] = useState({
    listingUrl: listing?.listingUrl || "",
    status: listing?.status || "todo",
    nameCorrect: Boolean(listing?.nameCorrect),
    addressCorrect: Boolean(listing?.addressCorrect),
    phoneCorrect: Boolean(listing?.phoneCorrect),
    websiteCorrect: Boolean(listing?.websiteCorrect),
    hoursCorrect: Boolean(listing?.hoursCorrect),
    categoryCorrect: Boolean(listing?.categoryCorrect),
    notes: listing?.notes || ""
  });

  const [message, setMessage] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }
function quickStatus(status) {
  setForm((prev) => ({
    ...prev,
    status,
    nameCorrect: status === "ok",
    addressCorrect: status === "ok",
    phoneCorrect: status === "ok",
    websiteCorrect: status === "ok",
    hoursCorrect: status === "ok",
    categoryCorrect: status === "ok"
  }));
}
  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("Enregistrement en cours...");

    const payload = {
      agencyId: Number(agencyId),
      directoryId: Number(directoryId),
      ...form
    };

    try {
      const res = await fetch("/api/directory-listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();

      if (!res.ok) {
        setMessage(`Erreur ${res.status} : ${text}`);
        return;
      }

      setMessage("Modifications enregistrées ✅");
    } catch (error) {
      setMessage(`Erreur réseau : ${error.message}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
      <div className="bg-gray-100 rounded p-3 text-sm">
        Agence ID : {agencyId} | Annuaire ID : {directoryId}
      </div>
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  <button
    type="button"
    onClick={() => quickStatus("ok")}
    className="bg-green-700 text-white px-4 py-2 rounded-lg"
  >
    Marquer OK
  </button>

  <button
    type="button"
    onClick={() => quickStatus("missing")}
    className="bg-red-700 text-white px-4 py-2 rounded-lg"
  >
    Absent
  </button>

  <button
    type="button"
    onClick={() => quickStatus("to_correct")}
    className="bg-orange-600 text-white px-4 py-2 rounded-lg"
  >
    À corriger
  </button>

  <button
    type="button"
    onClick={() => quickStatus("pending")}
    className="bg-blue-700 text-white px-4 py-2 rounded-lg"
  >
    En attente
  </button>
</div>

      <div>
        <label className="block font-semibold mb-2">URL de la fiche annuaire</label>
        <input
          value={form.listingUrl}
          onChange={(e) => updateField("listingUrl", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">Statut</label>
        <select
          value={form.status}
          onChange={(e) => updateField("status", e.target.value)}
          className="w-full border rounded-lg p-3"
        >
          <option value="todo">À vérifier</option>
          <option value="missing">Absent / à créer</option>
          <option value="to_correct">À corriger</option>
          <option value="pending">Correction demandée</option>
          <option value="ok">Correct</option>
          <option value="ignored">Ignoré / non pertinent</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["nameCorrect", "Nom correct"],
          ["addressCorrect", "Adresse correcte"],
          ["phoneCorrect", "Téléphone correct"],
          ["websiteCorrect", "Site web correct"],
          ["hoursCorrect", "Horaires corrects"],
          ["categoryCorrect", "Catégorie correcte"]
        ].map(([field, label]) => (
          <label key={field} className="flex items-center gap-3 border rounded-lg p-3">
            <input
              type="checkbox"
              checked={form[field]}
              onChange={(e) => updateField(field, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      <div>
        <label className="block font-semibold mb-2">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          className="w-full border rounded-lg p-3 min-h-32"
          placeholder="Exemple : correction demandée, fiche à créer, validation en attente..."
        />
      </div>

      <button type="submit" className="bg-gray-900 text-white px-5 py-3 rounded-lg">
        Enregistrer
      </button>
<a
  href={`/agency/${agencyId}`}
  className="inline-block ml-3 bg-gray-200 text-gray-900 px-5 py-3 rounded-lg"
>
  Retour à l’agence
</a>

      {message && (
        <p className="font-semibold text-gray-700">
          {message}
        </p>
      )}
    </form>
  );
}
