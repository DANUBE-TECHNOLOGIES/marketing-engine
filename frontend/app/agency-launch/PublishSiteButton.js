"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function jsonResponse(response) {
  const text = await response.text();

  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {
      message: text || "Réponse invalide du service de publication.",
    };
  }

  if (!response.ok) {
    const error = new Error(
      payload.message || `Publication HTTP ${response.status}`
    );
    error.code = payload.error || "SITE_PUBLICATION_ERROR";
    error.details = payload.details || {};
    throw error;
  }

  return payload;
}

export default function PublishSiteButton({
  siteId,
  disabled = false,
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function publish() {
    if (!siteId || busy || disabled) return;

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const plan = await jsonResponse(
        await fetch(`/api/site-publication/sites/${encodeURIComponent(siteId)}/plan`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
      );

      if (!plan.executable) {
        const blocker = Array.isArray(plan.blockers)
          ? plan.blockers.map((item) => item.message).filter(Boolean).join(" ")
          : "";

        throw new Error(
          blocker || "Le mini-site n’est pas encore prêt à être publié."
        );
      }

      const result = await jsonResponse(
        await fetch(`/api/site-publication/sites/${encodeURIComponent(siteId)}/publish`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            force: false,
            planToken: plan.planToken,
          }),
        })
      );

      setMessage(
        result?.site?.status === "published"
          ? "Mini-site publié."
          : "Publication terminée."
      );
      router.refresh();
    } catch (publishError) {
      setError(publishError.message || "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 lg:items-end">
      <button
        type="button"
        onClick={publish}
        disabled={disabled || busy}
        className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Publication…" : "Publier"}
      </button>

      {message ? (
        <span className="text-xs font-medium text-emerald-700">{message}</span>
      ) : null}

      {error ? (
        <span className="max-w-72 text-xs text-red-700">{error}</span>
      ) : null}
    </div>
  );
}
