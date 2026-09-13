"use client";

import { useEffect, useMemo, useState } from "react";
import "./web-callback.css";

const API = process.env.NEXT_PUBLIC_API_URL || "";
const TRAVEL_TYPES = [
  ["sejour", "Séjour"],
  ["circuit", "Circuit"],
  ["croisiere", "Croisière"],
  ["vol", "Vol / billetterie"],
  ["sur-mesure", "Voyage sur mesure"],
  ["groupe", "Voyage en groupe"],
  ["business", "Voyage d’affaires"],
  ["autre", "Autre projet"],
];
const SLOTS = [
  ["09-12", "9h – 12h"],
  ["12-14", "12h – 14h"],
  ["14-16", "14h – 16h"],
  ["16-18", "16h – 18h"],
];

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WebCallback({ siteSlug }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    callbackMode: "asap",
    requestedDate: tomorrowIso(),
    requestedSlot: "09-12",
    travelType: "sejour",
    destination: "",
    details: "",
    marketingPhone: false,
    website: "",
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const destinationHint = useMemo(() => {
    if (typeof window === "undefined") return "";
    const parts = window.location.pathname.split("/").filter(Boolean);
    const destinationIndex = parts.indexOf("destination");
    return destinationIndex >= 0 && parts[destinationIndex + 1]
      ? decodeURIComponent(parts[destinationIndex + 1]).replaceAll("-", " ")
      : "";
  }, [open]);

  function patch(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setError("");
    try {
      const q = new URLSearchParams(window.location.search);
      const response = await fetch(`${API}/api/public/web-callback/${encodeURIComponent(siteSlug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          destination: form.destination || destinationHint,
          context: {
            sourcePath: window.location.pathname,
            sourcePage: document.title,
            referrer: document.referrer,
            utmSource: q.get("utm_source"),
            utmMedium: q.get("utm_medium"),
            utmCampaign: q.get("utm_campaign"),
            utmContent: q.get("utm_content"),
            utmTerm: q.get("utm_term"),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "WEB_CALLBACK_FAILED");
      setState("done");
      if (typeof window !== "undefined") {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "web_callback_submit", site_slug: siteSlug, callback_mode: form.callbackMode, travel_type: form.travelType });
      }
    } catch (submitError) {
      setError("Votre demande n’a pas pu être transmise. Vous pouvez réessayer dans quelques instants.");
      setState("error");
    }
  }

  function close() {
    setOpen(false);
    if (state === "done") setState("idle");
  }

  return (
    <>
      <button className="webcallback-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="webcallback-trigger-icon" aria-hidden="true">☎</span>
        <span><strong>Être rappelé</strong><small>gratuitement</small></span>
      </button>

      {open && <div className="webcallback-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="webcallback-dialog" role="dialog" aria-modal="true" aria-labelledby="webcallback-title">
          <button className="webcallback-close" type="button" onClick={close} aria-label="Fermer">×</button>

          {state === "done" ? <div className="webcallback-success">
            <div className="webcallback-success-icon" aria-hidden="true">✓</div>
            <p className="webcallback-kicker">Demande transmise</p>
            <h2 id="webcallback-title">Merci {form.firstName}.</h2>
            <p>{form.callbackMode === "asap" ? "Votre agence a reçu votre demande et vous rappellera dès que possible." : "Votre agence a reçu votre demande ainsi que le créneau que vous avez choisi."}</p>
            <p className="webcallback-proof">Votre demande de rappel est horodatée et rattachée à cette démarche. Vos préférences de contact sont conservées avec la demande.</p>
            <button className="webcallback-primary" type="button" onClick={close}>Fermer</button>
          </div> : <>
            <header className="webcallback-header">
              <span className="webcallback-phone" aria-hidden="true">☎</span>
              <div><p className="webcallback-kicker">Un conseil humain, simplement</p><h2 id="webcallback-title">Votre agence vous rappelle</h2><p>Une question, une destination en tête ou un projet à construire ? Laissez votre numéro et choisissez le moment qui vous convient.</p></div>
            </header>

            <form className="webcallback-form" onSubmit={submit}>
              <div className="webcallback-grid">
                <label>Prénom *<input required autoComplete="given-name" value={form.firstName} onChange={(e) => patch("firstName", e.target.value)} placeholder="Votre prénom" /></label>
                <label>Nom <input autoComplete="family-name" value={form.lastName} onChange={(e) => patch("lastName", e.target.value)} placeholder="Votre nom" /></label>
              </div>
              <div className="webcallback-grid">
                <label>Téléphone *<input required type="tel" autoComplete="tel" value={form.phone} onChange={(e) => patch("phone", e.target.value)} placeholder="06 12 34 56 78" /></label>
                <label>E-mail <span>(facultatif)</span><input type="email" autoComplete="email" value={form.email} onChange={(e) => patch("email", e.target.value)} placeholder="vous@exemple.fr" /></label>
              </div>

              <fieldset className="webcallback-choice">
                <legend>Quand souhaitez-vous être rappelé ?</legend>
                <div className="webcallback-mode-row">
                  <button type="button" className={form.callbackMode === "asap" ? "active" : ""} onClick={() => patch("callbackMode", "asap")}><strong>Dès que possible</strong><small>Votre demande devient prioritaire</small></button>
                  <button type="button" className={form.callbackMode === "later" ? "active" : ""} onClick={() => patch("callbackMode", "later")}><strong>Choisir un créneau</strong><small>Jour et plage horaire</small></button>
                </div>
              </fieldset>

              {form.callbackMode === "later" && <div className="webcallback-grid webcallback-schedule">
                <label>Jour<input required type="date" min={todayIso()} value={form.requestedDate} onChange={(e) => patch("requestedDate", e.target.value)} /></label>
                <label>Créneau<select required value={form.requestedSlot} onChange={(e) => patch("requestedSlot", e.target.value)}>{SLOTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>}

              <div className="webcallback-grid">
                <label>Votre projet<select value={form.travelType} onChange={(e) => patch("travelType", e.target.value)}>{TRAVEL_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Destination <input value={form.destination} onChange={(e) => patch("destination", e.target.value)} placeholder={destinationHint || "Ex. Japon, Majorque…"} /></label>
              </div>
              <label>Une précision ? <span>(facultatif)</span><textarea rows="2" value={form.details} onChange={(e) => patch("details", e.target.value)} placeholder="Dates envisagées, nombre de voyageurs, question particulière…" /></label>

              <input className="webcallback-hp" tabIndex="-1" autoComplete="off" value={form.website} onChange={(e) => patch("website", e.target.value)} aria-hidden="true" />

              <p className="webcallback-consent">En cliquant sur « Demander mon rappel », vous demandez à votre agence de vous contacter par téléphone afin de répondre à cette demande et à votre projet de voyage.</p>
              <label className="webcallback-optin"><input type="checkbox" checked={form.marketingPhone} onChange={(e) => patch("marketingPhone", e.target.checked)} /><span>J’accepte également de recevoir ultérieurement par téléphone des offres et conseils voyage de Mondescale Voyages. <strong>Facultatif.</strong></span></label>

              {error && <p className="webcallback-error" role="alert">{error}</p>}
              <button className="webcallback-primary" disabled={state === "loading"} type="submit">{state === "loading" ? "Transmission…" : "Demander mon rappel"}</button>
              <p className="webcallback-footnote">Votre demande est transmise directement à l’agence concernée. Le consentement marketing, s’il est donné, reste distinct de cette demande de rappel.</p>
            </form>
          </>}
        </section>
      </div>}
    </>
  );
}
