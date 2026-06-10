"use client";

import { useState } from "react";

export default function NewReviewRequestForm({ agencies }) {
  const [form, setForm] = useState({
    agencyId: agencies[0]?.id || "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    channel: "whatsapp",
    reviewUrl: ""
  });

  const [message, setMessage] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function submit(e) {
    e.preventDefault();

    setMessage("Création...");

    const res = await fetch("/api/review-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (res.ok) {
      window.location.href = `/review-requests/${data.id}`;
    } else {
      setMessage("Erreur lors de la création");
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow p-6 space-y-5">
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
          value={form.clientName}
          onChange={(e) => updateField("clientName", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="Ex : Madame Dupont"
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">Téléphone</label>
        <input
          value={form.clientPhone}
          onChange={(e) => updateField("clientPhone", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="Ex : 06..."
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">Email</label>
        <input
          value={form.clientEmail}
          onChange={(e) => updateField("clientEmail", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="client@email.fr"
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">Canal</label>
        <select
          value={form.channel}
          onChange={(e) => updateField("channel", e.target.value)}
          className="w-full border rounded-lg p-3"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold mb-2">Lien avis Google</label>
        <input
          value={form.reviewUrl}
          onChange={(e) => updateField("reviewUrl", e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="https://g.page/r/..."
        />
      </div>

      <button className="bg-gray-900 text-white px-5 py-3 rounded-lg">
        Générer la demande
      </button>

      {message && <p className="font-semibold">{message}</p>}
    </form>
  );
}
