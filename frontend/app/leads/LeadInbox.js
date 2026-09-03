"use client";

import { useEffect, useMemo, useState } from "react";

const STATUS_LABELS = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  CONVERTED: "Converti",
  CLOSED: "Clos",
};

const PROJECT_LABELS = {
  leisure: "Voyage & vacances",
  group: "Voyage en groupe",
  business: "Business Travel",
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function displaySource(lead) {
  const source = lead?.source || "general";
  if (source === "group") return "Groupe";
  if (source === "business") return "Business";
  return "Général";
}

function attributionLines(lead) {
  return [
    lead?.sourcePage ? `Page : ${lead.sourcePage}` : null,
    lead?.sourcePath ? `Chemin : ${lead.sourcePath}` : null,
    lead?.sourceReferrer ? `Référent : ${lead.sourceReferrer}` : null,
    lead?.utmSource ? `utm_source : ${lead.utmSource}` : null,
    lead?.utmMedium ? `utm_medium : ${lead.utmMedium}` : null,
    lead?.utmCampaign ? `utm_campaign : ${lead.utmCampaign}` : null,
    lead?.utmContent ? `utm_content : ${lead.utmContent}` : null,
    lead?.utmTerm ? `utm_term : ${lead.utmTerm}` : null,
  ].filter(Boolean);
}

export default function LeadInbox() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "250" });
      if (project) params.set("projectType", project);
      const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Impossible de charger les demandes");
      const next = Array.isArray(data.leads) ? data.leads : [];
      setLeads(next);
      setSelected((current) => current ? (next.find((lead) => lead.id === current.id) || current) : current);
    } catch (err) {
      setError(err?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [project]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-FR");
    if (!needle) return leads;
    return leads.filter((lead) => [
      lead.name,
      lead.email,
      lead.phone,
      lead.destination,
      lead.agencyName,
      lead.agencyCity,
      lead.siteSlug,
      lead.projectType,
      lead.source,
      lead.sourcePage,
      lead.sourcePath,
      lead.utmSource,
      lead.utmCampaign,
    ].filter(Boolean).join(" ").toLocaleLowerCase("fr-FR").includes(needle));
  }, [leads, query]);

  async function changeStatus(lead, status) {
    if (!lead || lead.status === status) return;
    setSaving(lead.id);
    setError("");
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Mise à jour impossible");
      await load();
    } catch (err) {
      setError(err?.message || "Mise à jour impossible");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-4 flex flex-col lg:flex-row gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher client, agence, destination ou origine…"
          className="flex-1 rounded-xl border px-4 py-3"
        />
        <select value={project} onChange={(event) => setProject(event.target.value)} className="rounded-xl border px-4 py-3">
          <option value="">Tous les projets</option>
          <option value="leisure">Voyage & vacances</option>
          <option value="group">Voyage en groupe</option>
          <option value="business">Business Travel</option>
        </select>
        <button onClick={load} className="rounded-xl bg-[#073653] text-white px-5 py-3 font-semibold">Actualiser</button>
      </div>

      {error ? <div className="rounded-xl bg-red-50 text-red-800 px-4 py-3">{error}</div> : null}

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Agence</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Projet</th>
                <th className="text-left px-4 py-3">Origine</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="7" className="p-10 text-center">Chargement…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="7" className="p-10 text-center">Aucune demande.</td></tr>
              ) : visible.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-4 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-4"><strong>{lead.agencyCity || lead.agencyName || lead.siteSlug}</strong></td>
                  <td className="px-4 py-4">
                    <strong>{lead.name}</strong>
                    <span className="block text-xs text-slate-600">{lead.phone || "—"}</span>
                    <span className="block text-xs text-slate-600">{lead.email || "—"}</span>
                  </td>
                  <td className="px-4 py-4">
                    <strong>{PROJECT_LABELS[lead.projectType] || lead.projectType || "—"}</strong>
                    <span className="block text-xs text-slate-500">{lead.destination || "—"}</span>
                  </td>
                  <td className="px-4 py-4">
                    <strong>{displaySource(lead)}</strong>
                    <span className="block text-xs text-slate-500 max-w-xs truncate">{lead.sourcePage || lead.sourcePath || "Origine directe"}</span>
                  </td>
                  <td className="px-4 py-4">{STATUS_LABELS[lead.status] || lead.status || "—"}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => setSelected(lead)} className="font-semibold text-[#073653]">Ouvrir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 flex justify-end" onClick={() => setSelected(null)}>
          <aside className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto p-6 lg:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Demande {selected.id}</p>
                <h2 className="text-2xl font-bold">{selected.name}</h2>
                <p className="text-sm text-slate-600 mt-1">{selected.agencyName || selected.agencyCity || selected.siteSlug}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl" aria-label="Fermer">×</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-7 text-sm">
              <div><span className="text-slate-500">Reçue le</span><strong className="block">{formatDate(selected.createdAt)}</strong></div>
              <div><span className="text-slate-500">Projet</span><strong className="block">{PROJECT_LABELS[selected.projectType] || selected.projectType}</strong></div>
              <div><span className="text-slate-500">Téléphone</span><strong className="block">{selected.phone || "—"}</strong></div>
              <div><span className="text-slate-500">Email</span><strong className="block break-all">{selected.email || "—"}</strong></div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 space-y-2 text-sm">
              <p><strong>{selected.destination || "Destination non précisée"}</strong></p>
              <p>{selected.travelDates || "Dates non précisées"} · {selected.travellers || "Voyageurs non précisés"}</p>
              <p>Budget : {selected.budget || "Non précisé"}</p>
              <p className="whitespace-pre-wrap">{selected.wishes || "Aucune précision complémentaire."}</p>
            </div>

            <div className="mt-7 border-t pt-6">
              <h3 className="font-bold text-lg">Origine de la demande</h3>
              <p className="mt-3 text-sm"><span className="text-slate-500">Source : </span><strong>{displaySource(selected)}</strong></p>
              <div className="mt-3 space-y-2 text-sm break-all">
                {attributionLines(selected).length ? attributionLines(selected).map((line) => <p key={line}>{line}</p>) : <p className="text-slate-500">Aucune attribution complémentaire.</p>}
              </div>
            </div>

            <div className="mt-7 border-t pt-6">
              <h3 className="font-bold text-lg">Statut</h3>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    disabled={saving === selected.id || selected.status === key}
                    onClick={() => changeStatus(selected, key)}
                    className={`rounded-xl px-4 py-3 border font-semibold ${selected.status === key ? "bg-cyan-50 border-[#42c7cc]" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">Synchronisation ERP désactivée.</p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export { PROJECT_LABELS, STATUS_LABELS, attributionLines, displaySource, formatDate };
