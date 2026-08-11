"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkSeoActionDoneButton({ agencyId, action }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!agencyId || busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/agency-launch/agencies/${encodeURIComponent(agencyId)}/seo-actions/executed`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: action?.title,
            detail: action?.detail,
            source: action?.source,
            code: action?.code,
            priority: action?.priority,
            keywordId: action?.keywordId ?? null,
            keyword: action?.keyword ?? null,
            city: action?.city ?? null,
            targetPage: action?.targetPage ?? null,
            executedAt: new Date().toISOString(),
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || `Enregistrement HTTP ${response.status}`);
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError?.message || "Impossible d'enregistrer cette action.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Enregistrement…" : "Marquer comme réalisée"}
      </button>
      {error ? <div className="mt-2 text-xs text-red-700">{error}</div> : null}
    </div>
  );
}
