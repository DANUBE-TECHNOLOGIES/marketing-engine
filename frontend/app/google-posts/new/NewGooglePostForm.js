"use client";

import { useState } from "react";

export default function NewGooglePostForm({ agencies }) {
  const [form, setForm] = useState({
    agencyId: agencies[0]?.id || "",
    title: "",
    content: "",
    ctaLabel: "Appeler",
    ctaUrl: "",
    plannedAt: new Date().toISOString().slice(0, 10)
  });

  const [msg, setMsg] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("Création...");

    const res = await fetch("/api/google-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (res.ok) {
      window.location.href = `/google-posts/${data.id}`;
    } else {
      setMsg("Erreur lors de la création");
    }
  }

  function generateTemplate() {
    setForm((prev) => ({
      ...prev,
      title: "Préparez vos prochaines vacances avec votre agence Mondescale",
      content:
        "Envie de partir l’esprit tranquille ? Votre agence Mondescale vous accompagne pour trouver le séjour adapté à vos envies, votre budget et vos dates de départ. Conseils personnalisés, réservation sécurisée et accompagnement avant, pendant et après le voyage : passez nous voir en agence pour préparer vos prochaines vacances.",
      ctaLabel: "Prendre rendez-vous"
    }));
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow p-6 space-y-5">
      <button
        type="button"
        onClick={generateTemplate}
        className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg"
      >
        Générer modèle vacances
      </button>

      <div>
        <label className="block font-semibold mb-2">Agence</label>
        <select
          value={form.agencyId}
          onChange={(e) => update("agencyId", e.target.value)}
          className="w-full border rounded-lg p-3"
        >
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name} — {agency.city}
            </option>
          ))}
        </select>
      </div>

      <input
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        className="w-full border rounded-lg p-3"
        placeholder="Titre"
      />

      <textarea
        value={form.content}
        onChange={(e) => update("content", e.target.value)}
        className="w-full border rounded-lg p-3 min-h-40"
        placeholder="Contenu du post..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          value={form.ctaLabel}
          onChange={(e) => update("ctaLabel", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="CTA"
        />

        <input
          value={form.ctaUrl}
          onChange={(e) => update("ctaUrl", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="Lien CTA"
        />
      </div>

      <input
        type="date"
        value={form.plannedAt}
        onChange={(e) => update("plannedAt", e.target.value)}
        className="w-full border rounded-lg p-3"
      />

      <button className="bg-gray-900 text-white px-5 py-3 rounded-lg">
        Créer le post
      </button>

      {msg && <p className="font-semibold">{msg}</p>}
    </form>
  );
}
