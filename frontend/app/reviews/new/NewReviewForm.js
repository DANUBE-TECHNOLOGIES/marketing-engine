"use client";

import { useState } from "react";

export default function NewReviewForm({ agencies }) {
  const [form, setForm] = useState({
    agencyId: agencies[0]?.id || "",
    authorName: "",
    rating: 5,
    comment: "",
    publishedAt: new Date().toISOString().slice(0, 10)
  });

  const [message, setMessage] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("Enregistrement...");

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setMessage("Avis ajouté ✅");
      setForm((prev) => ({
        ...prev,
        authorName: "",
        rating: 5,
        comment: ""
      }));
    } else {
      setMessage("Erreur lors de l’ajout");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
      <div>
        <label className="block font-semibold mb-2">Agence</label>
        <select
          value={form.agencyId}
          onChange={(e) => updateField("agencyId", e.target.value)}
          className="w-full border rounded-lg p-3"
        >
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name} — {agency.city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold mb-2">Nom du client</label>
        <input
          value={form.authorName}
          onChange={(e) => updateField("authorName", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="Ex : Client Google"
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">Note</label>
        <select
          value={form.rating}
          onChange={(e) => updateField("rating", Number(e.target.value))}
          className="w-full border rounded-lg p-3"
        >
          <option value={5}>5 étoiles</option>
          <option value={4}>4 étoiles</option>
          <option value={3}>3 étoiles</option>
          <option value={2}>2 étoiles</option>
          <option value={1}>1 étoile</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold mb-2">Date</label>
        <input
          type="date"
          value={form.publishedAt}
          onChange={(e) => updateField("publishedAt", e.target.value)}
          className="w-full border rounded-lg p-3"
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">Commentaire</label>
        <textarea
          value={form.comment}
          onChange={(e) => updateField("comment", e.target.value)}
          className="w-full border rounded-lg p-3 min-h-32"
          placeholder="Texte de l’avis..."
        />
      </div>

      <button className="bg-gray-900 text-white px-5 py-3 rounded-lg">
        Ajouter l’avis
      </button>

      {message && <p className="font-semibold">{message}</p>}
    </form>
  );
}
