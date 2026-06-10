"use client";

import { useState } from "react";

export default function GoogleMapping({ agencyId, existingId }) {
  const [value, setValue] = useState(existingId || "");
  const [msg, setMsg] = useState("");

  async function save() {
    setMsg("Enregistrement...");

    const res = await fetch(`/api/agency/${agencyId}/google-location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ googleLocationId: value })
    });

    if (res.ok) {
      setMsg("Sauvegardé ✅");
    } else {
      setMsg("Erreur lors de l’enregistrement");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-5 mt-6 mb-6">
      <h3 className="font-bold mb-3">Google Business Profile</h3>

      <p className="text-sm text-gray-500 mb-3">
        Associe cette agence à son identifiant Google Location ID.
      </p>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border p-3 rounded-lg"
        placeholder="ex : locations/123456789"
      />

      <button
        type="button"
        onClick={save}
        className="mt-3 bg-gray-900 text-white px-4 py-2 rounded-lg"
      >
        Enregistrer
      </button>

      {msg && <p className="text-sm mt-2">{msg}</p>}
    </div>
  );
}
