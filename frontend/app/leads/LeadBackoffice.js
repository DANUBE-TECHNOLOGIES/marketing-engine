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
  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value || "—";
  }
}

function statusClass(status) {
  if (status === "NEW") return "bg-sky-100 text-sky-800";
  if (status === "CONTACTED") return "bg-amber-100 text-amber-800";
  if (status === "CONVERTED") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

export default function LeadBackoffice() {
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [project, setProject] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (project) params.set("projectType", project);
      params.set("limit", "250");
      const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Impossible de charger les demandes");
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setCounts(Array.isArray(data.counts) ? data.counts : []);
    } catch (err) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status, project]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-FR");
    if (!needle) return leads;
    return leads.filter((lead) => [lead.name, lead.email, lead.phone, lead.destination, lead.agencyName, lead.agencyCity, lead.siteSlug]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr-FR")
      .includes(needle));
  }, [leads, query]);

  const countMap = useMemo(() => Object.fromEntries(counts.map((item) => [item.status, Number(item.count || 0)])), [counts]);

  async function changeStatus(lead, nextStatus) {
    if (lead.status === nextStatus) return;
    setSaving(lead.id);
    setError("");
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Mise à jour impossible");
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status: nextStatus, updatedAt: data.lead?.updatedAt || item.updatedAt } : item));
      setSelected((current) => current?.id === lead.id ? { ...current, status: nextStatus } : current);
      await load();
    } catch (err) {
      setError(err.message || "Mise à jour impossible");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setStatus(status === key ? "" : key)} className={`text-left rounded-2xl border p-4 transition ${status === key ? "border-[#42c7cc] bg-cyan-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <span className="text-sm text-slate-500">{label}</span>
            <strong className="block text-2xl mt-1 text-slate-900">{countMap[key] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un client, une agence, une destination…" className="flex-1 rounded-xl border border-slate-300 px-4 py-3" />
        <select value={project} onChange={(e) => setProject(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 bg-white">
          <option value="">Tous les projets</option>
          <option value="leisure">Voyage & vacances</option>
          <option value="group">Voyage en groupe</option>
          <option value="business">Business Travel</option>
        </select>
        <button type="button" onClick={load} className="rounded-xl bg-[#073653] text-white px-5 py-3 font-semibold">Actualiser</button>
      </div>

      {error ? <div className="rounded-xl bg-red-50 text-red-800 px-4 py-3">{error}</div> : null}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Agence</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Projet</th>
                <th className="text-left px-4 py-3">Destination / besoin</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">Chargement des demandes…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">Aucune demande pour ces filtres.</td></tr>
              ) : visible.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-4 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-4"><strong>{lead.agencyCity || lead.agencyName || lead.siteSlug}</strong><span className="block text-xs text-slate-500 mt-1">{lead.siteSlug}</span></td>
                  <td className="px-4 py-4"><strong>{lead.name}</strong><a className="block text-sky-700" href={`mailto:${lead.email}`}>{lead.email}</a><a className="block text-sky-700" href={`tel:${String(lead.phone || "").replace(/\s+/g, "")}`}>{lead.phone}</a></td>
                  <td className="px-4 py-4">{PROJECT_LABELS[lead.projectType] || lead.projectType}</td>
                  <td className="px-4 py-4 max-w-xs"><strong>{lead.destination}</strong><span className="block text-slate-500 mt-1">{lead.travelDates} · {lead.travellers}</span></td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 font-medium ${statusClass(lead.status)}`}>{STATUS_LABELS[lead.status] || lead.status}</span></td>
                  <td className="px-4 py-4 text-right"><button type="button" onClick={() => setSelected(lead)} className="font-semibold text-[#073653] hover:underline">Ouvrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 flex justify-end" onClick={() => setSelected(null)}>
          <aside className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto p-6 lg:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm text-slate-500">Demande {selected.id}</p><h2 className="text-2xl font-bold text-slate-900 mt-1">{selected.name}</h2></div>
              <button type="button" className="text-2xl text-slate-500" onClick={() => setSelected(null)} aria-label="Fermer">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-7 text-sm">
              <div><span className="text-slate-500">Agence</span><strong className="block mt-1">{selected.agencyName || selected.agencyCity || selected.siteSlug}</strong></div>
              <div><span className="text-slate-500">Reçue le</span><strong className="block mt-1">{formatDate(selected.createdAt)}</strong></div>
              <div><span className="text-slate-500">Projet</span><strong className="block mt-1">{PROJECT_LABELS[selected.projectType] || selected.projectType}</strong></div>
              <div><span className="text-slate-500">Source</span><strong className="block mt-1">{selected.source}</strong></div>
            </div>

            <div className="mt-7 rounded-2xl bg-slate-50 p-5 space-y-4">
              <div><span className="text-sm text-slate-500">Destination / besoin</span><p className="font-semibold mt-1">{selected.destination}</p></div>
              <div><span className="text-sm text-slate-500">Dates / période</span><p className="mt-1">{selected.travelDates}</p></div>
              <div><span className="text-sm text-slate-500">Voyageurs</span><p className="mt-1">{selected.travellers}</p></div>
              <div><span className="text-sm text-slate-500">Budget</span><p className="mt-1">{selected.budget || "Non précisé"}</p></div>
              <div><span className="text-sm text-slate-500">Précisions</span><p className="mt-1 whitespace-pre-wrap">{selected.wishes || "Aucune précision complémentaire."}</p></div>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <a href={`tel:${String(selected.phone || "").replace(/\s+/g, "")}`} className="rounded-xl bg-[#073653] text-white px-4 py-3 font-semibold">Appeler</a>
              <a href={`mailto:${selected.email}`} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold">Écrire</a>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="font-semibold mb-3">Suivi de la demande</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <button key={key} type="button" disabled={saving === selected.id || selected.status === key} onClick={() => changeStatus(selected, key)} className={`rounded-xl px-4 py-3 text-sm font-semibold border ${selected.status === key ? "border-[#42c7cc] bg-cyan-50 text-[#073653]" : "border-slate-300 bg-white hover:bg-slate-50"}`}>
                    {saving === selected.id ? "Mise à jour…" : label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">Synchronisation ERP désactivée. Le suivi reste entièrement dans Marketing Engine.</p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export { PROJECT_LABELS, STATUS_LABELS, formatDate };
