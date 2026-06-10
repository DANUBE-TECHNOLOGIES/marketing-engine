"use client";

import { useState } from "react";

export default function NewKeywordForm({ agencies }) {
  const [form, setForm] = useState({
    agencyId: agencies[0]?.id || "",
    keyword: "",
    city: ""
  });

  const [msg, setMsg] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();

    const res = await fetch("/api/rankings/keywords", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      window.location.href = "/rankings";
    } else {
      setMsg("Erreur");
    }
  }

  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow space-y-4">
      <select
        value={form.agencyId}
        onChange={(e) => update("agencyId", e.target.value)}
        className="w-full border p-3 rounded-lg"
      >
        {agencies.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <input
        placeholder="Mot-clé"
        value={form.keyword}
        onChange={(e) => update("keyword", e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      <input
        placeholder="Ville"
        value={form.city}
        onChange={(e) => update("city", e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      <button className="bg-gray-900 text-white px-5 py-3 rounded-lg">
        Ajouter
      </button>

      {msg && <p>{msg}</p>}
    </form>
  );
}
