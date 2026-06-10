"use client";

import { useMemo, useState } from "react";

export default function ReviewsAiClient({ initialReviews }) {
  const [reviews, setReviews] = useState(Array.isArray(initialReviews) ? initialReviews : []);
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const agencies = useMemo(() => {
    return Array.from(
      new Set((reviews ?? []).map((r) => r.agency).filter(Boolean))
    ).sort();
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return (reviews ?? []).filter((r) => {
      const okAgency =
        agencyFilter === "all" || r.agency === agencyFilter;

      const okStatus =
        statusFilter === "all" ||
        (statusFilter === "new" && r.status === "new") ||
        (statusFilter === "pending" && r.status === "pending_validation") ||
        (statusFilter === "urgent" && r.rating <= 3);

      return okAgency && okStatus;
    });
  }, [reviews, agencyFilter, statusFilter]);

  async function action(id, type) {
    const endpoint =
      type === "approve"
        ? `/api/reviews/${id}/approve`
        : `/api/reviews/${id}/publish`;

    const res = await fetch(endpoint, {
      method: "POST"
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Erreur");
      return;
    }

    setReviews((current) =>
      current
        .map((r) => {
          if (r.id !== id) return r;

          return {
            ...r,
            status: type === "approve" ? "pending_validation" : "replied"
          };
        })
        .filter((r) => r.status !== "replied")
    );
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow p-5 mb-6 flex flex-wrap gap-4 items-center">
        <div className="font-bold">Filtres :</div>

        <select
          value={agencyFilter}
          onChange={(e) => setAgencyFilter(e.target.value)}
          className="border rounded-xl px-4 py-2"
        >
          <option value="all">Toutes les agences</option>

          {agencies.map((agency) => (
            <option key={agency} value={agency}>
              {agency}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-xl px-4 py-2"
        >
          <option value="all">Tous les statuts</option>
          <option value="new">À traiter</option>
          <option value="pending">À publier</option>
          <option value="urgent">Urgents ≤ 3⭐</option>
        </select>

        <div className="text-sm text-gray-500">
          {filteredReviews.length} avis affiché(s)
        </div>
      </div>

      <div className="space-y-5">
        {filteredReviews.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucun avis à traiter pour ce filtre.
          </div>
        )}

        {filteredReviews.map((r) => (
          <div
            key={r.id}
            id={`review-${r.id}`}
            className={`
              p-6 rounded-2xl shadow
              ${r.rating <= 2 ? "bg-red-50" : r.rating === 3 ? "bg-orange-50" : "bg-white"}
            `}
          >
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {r.agency}
                </div>

                <strong>{r.author}</strong>

                <div className="text-sm text-gray-500">
                  ⭐ {r.rating} ·{" "}
                  {r.rating <= 2
                    ? "🔴 Urgent"
                    : r.rating === 3
                    ? "🟠 Sensible"
                    : "🟢 Normal"}
                </div>
              </div>

              <div className="font-semibold">
                {r.status === "new" && "⚠ À traiter"}
                {r.status === "pending_validation" && "🟠 À publier"}
                {r.status === "replied" && "🟢 Publié"}
              </div>
            </div>

            <div className="mt-4">
              {r.comment || "Aucun commentaire"}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mt-4">
              <div className="font-bold mb-2">Réponse proposée</div>
              {r.proposedReply}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => action(r.id, "approve")}
                disabled={r.status !== "new"}
                className="px-4 py-2 rounded-xl bg-orange-100 disabled:opacity-40"
              >
                Valider
              </button>

              <button
                onClick={() => action(r.id, "publish")}
                disabled={r.status !== "pending_validation"}
                className="px-4 py-2 rounded-xl bg-green-100 disabled:opacity-40"
              >
                Publier
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
