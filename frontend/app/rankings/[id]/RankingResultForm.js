"use client";

import { useState } from "react";

export default function RankingResultForm({ keywordId }) {
  const [form, setForm] = useState({
    position: "",
    found: true
  });

  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();

    const res = await fetch("/api/rankings/results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        keywordId,
        position: form.found ? form.position : null,
        found: form.found,
        source: "manual"
      })
    });

    if (res.ok) {
      setMsg("Position enregistrée ✅");
    } else {
      setMsg("Erreur");
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow p-6 space-y-5">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={form.found}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, found: e.target.checked }))
          }
        />
        Agence trouvée
      </label>

      {form.found && (
        <input
          type="number"
          value={form.position}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, position: e.target.value }))
          }
          className="w-full border rounded-lg p-3"
          placeholder="Position Google Maps"
        />
      )}

      <button className="bg-gray-900 text-white px-5 py-3 rounded-lg">
        Enregistrer la position
      </button>

      {msg && <p className="font-semibold">{msg}</p>}
    </form>
  );
}

