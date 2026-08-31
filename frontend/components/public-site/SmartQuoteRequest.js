"use client";

import { useMemo, useState } from "react";

import styles from "./SmartQuoteRequest.module.css";

const PROJECTS = [
  { id: "leisure", label: "Voyage & vacances", hint: "Séjour, circuit, croisière ou voyage sur mesure" },
  { id: "group", label: "Voyage en groupe", hint: "Association, CSE, famille, amis, club ou scolaire" },
  { id: "business", label: "Business Travel", hint: "Déplacements professionnels et politique voyages" },
];

function initialProject(source) {
  if (source === "group") return "group";
  if (source === "business") return "business";
  return "leisure";
}

function agencyCity(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function agencyEmail(site) {
  return String(site?.agency?.email || "").trim();
}

function encodeMailto(email, subject, body) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function line(label, value) {
  const clean = String(value || "").trim();
  return clean ? `${label} : ${clean}` : null;
}

export default function SmartQuoteRequest({ site, source = "general" }) {
  const city = agencyCity(site);
  const email = agencyEmail(site);
  const [project, setProject] = useState(initialProject(source));
  const [sent, setSent] = useState(false);

  const projectLabel = useMemo(
    () => PROJECTS.find((item) => item.id === project)?.label || "Projet de voyage",
    [project]
  );

  function submit(event) {
    event.preventDefault();
    if (!email) return;

    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(data.entries());
    const subject = `[Demande de devis web] ${projectLabel}${city ? ` - ${city}` : ""}`;
    const details = [
      `Type de projet : ${projectLabel}`,
      line(project === "business" ? "Entreprise" : "Destination / idée", values.destination),
      line("Dates / période", values.dates),
      line(project === "group" ? "Nombre de participants" : project === "business" ? "Nombre de voyageurs concernés" : "Voyageurs", values.travellers),
      line(project === "business" ? "Budget / politique voyages" : "Budget envisagé", values.budget),
      line(project === "business" ? "Besoins professionnels" : "Envies et priorités", values.wishes),
      "",
      line("Nom", values.name),
      line("Téléphone", values.phone),
      line("E-mail", values.email),
      "",
      `Source : ${source}`,
      `Mini-site : ${site?.slug || ""}`,
    ].filter((value) => value !== null);

    setSent(true);
    window.location.href = encodeMailto(email, subject, details.join("\n"));
  }

  return (
    <section className={styles.section} id="demande-devis">
      <div className={`public-site-container ${styles.shell}`}>
        <div className={styles.intro}>
          <p className="public-site-section-kicker">Votre projet commence ici</p>
          <h2>Parlez-nous de votre prochain voyage</h2>
          <p>
            Quelques informations suffisent pour permettre à votre conseiller{city ? ` à ${city}` : ""} de comprendre votre projet et de revenir vers vous avec une réponse réellement adaptée.
          </p>
          <div className={styles.promise}>
            <strong>Une demande courte, un échange humain.</strong>
            <span>Nous vous demandons uniquement les éléments utiles pour préparer le premier échange.</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <fieldset className={styles.projectPicker}>
            <legend>Quel voyage préparez-vous ?</legend>
            <div className={styles.projectGrid}>
              {PROJECTS.map((item) => (
                <label className={project === item.id ? styles.projectActive : styles.project} key={item.id}>
                  <input type="radio" name="project" value={item.id} checked={project === item.id} onChange={() => setProject(item.id)} />
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.fields}>
            <label>
              <span>{project === "business" ? "Votre entreprise / organisation" : "Où souhaitez-vous partir ?"}</span>
              <input name="destination" required placeholder={project === "business" ? "Nom de l’entreprise ou destinations habituelles" : "Une destination, une région… ou simplement une envie"} />
            </label>
            <label>
              <span>Quand souhaitez-vous partir ?</span>
              <input name="dates" required placeholder="Dates précises ou période flexible" />
            </label>
            <label>
              <span>{project === "group" ? "Combien de participants ?" : project === "business" ? "Combien de voyageurs sont concernés ?" : "Combien de voyageurs ?"}</span>
              <input name="travellers" required placeholder={project === "group" ? "Ex. 24 adultes" : "Ex. 2 adultes et 2 enfants"} />
            </label>
            <label>
              <span>{project === "business" ? "Budget ou cadre de votre politique voyages" : "Quel budget souhaitez-vous consacrer au projet ?"}</span>
              <input name="budget" placeholder={project === "group" ? "Budget par personne ou budget global" : "Une fourchette suffit"} />
            </label>
            <label className={styles.full}>
              <span>{project === "business" ? "Quels sont vos besoins prioritaires ?" : "Qu’est-ce qui rendrait ce voyage réussi pour vous ?"}</span>
              <textarea name="wishes" rows="4" placeholder={project === "business" ? "Réservations, assistance, reporting, paiement centralisé, contraintes internes…" : "Ambiance, rythme, hébergement, expériences indispensables, contraintes particulières…"} />
            </label>
          </div>

          <div className={styles.identity}>
            <label><span>Votre nom</span><input name="name" autoComplete="name" required /></label>
            <label><span>Votre téléphone</span><input name="phone" type="tel" autoComplete="tel" required /></label>
            <label><span>Votre e-mail</span><input name="email" type="email" autoComplete="email" required /></label>
          </div>

          <div className={styles.submitRow}>
            <div>
              <strong>Votre demande sera adressée à votre agence{city ? ` de ${city}` : ""}.</strong>
              <span>Vos coordonnées sont utilisées uniquement pour répondre à votre projet.</span>
            </div>
            {email ? <button className="public-site-button" type="submit">Envoyer mon projet</button> : <span>Contact par formulaire momentanément indisponible.</span>}
          </div>
          {sent ? <p className={styles.sent}>Votre messagerie va s’ouvrir avec votre demande déjà préparée.</p> : null}
        </form>
      </div>
    </section>
  );
}

export { PROJECTS, agencyCity, agencyEmail, encodeMailto, initialProject };
