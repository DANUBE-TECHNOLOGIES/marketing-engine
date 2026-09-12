"use client";

import { useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const steps = [
  ["departureWindow", "Quand aimeriez-vous retrouver le soleil ?", "Choisissez la période qui vous fait le plus envie.", [["decembre", "Décembre", "Fêtes au soleil"], ["janvier", "Janvier", "Commencer l'année ailleurs"], ["fevrier", "Février", "Couper avec l'hiver"], ["mars", "Mars", "Prendre de l'avance sur le printemps"], ["pas-encore-decide", "Je ne sais pas encore", "Je préfère être conseillé(e)"]]],
  ["travellers", "Avec qui partez-vous ?", "Cela nous aide à imaginer le bon rythme et les bonnes expériences.", [["1", "En solo", "1 voyageur"], ["2", "À deux", "2 voyageurs"], ["3-4", "En famille ou entre amis", "3 à 4 voyageurs"], ["5-plus", "En tribu", "5 voyageurs ou plus"]]],
  ["budgetPerPerson", "Quelle enveloppe imaginez-vous par personne ?", "Une indication suffit. Elle nous permet de rester dans un projet réaliste.", [["moins-2000", "Moins de 2 000 €", "L'essentiel, bien choisi"], ["2000-3000", "2 000 à 3 000 €", "Confort & belles expériences"], ["3000-5000", "3 000 à 5 000 €", "Voyage premium"], ["5000-plus", "Plus de 5 000 €", "Projet d'exception"], ["a-definir", "À définir", "Je veux d'abord explorer"]]],
  ["travelStyle", "Quel voyage vous ressemble le plus ?", "Ne réfléchissez pas trop : choisissez celui qui vous attire spontanément.", [["plage", "Plage & détente", "Soleil, mer et lâcher-prise"], ["circuit", "Circuit", "Découvrir plusieurs facettes d'un pays"], ["safari", "Safari", "Nature et émotions fortes"], ["croisiere", "Croisière", "Plusieurs escales, un seul voyage"], ["combine", "Combiné", "Deux expériences en un voyage"], ["a-decouvrir", "Surprenez-moi", "Je veux être inspiré(e)"]]],
  ["departureAirport", "D'où aimeriez-vous partir ?", "Nous privilégierons les solutions les plus simples pour votre départ.", [["paris", "Paris", "Départ depuis les aéroports parisiens"], ["autre", "Un autre aéroport", "Nous chercherons l'alternative adaptée"], ["a-definir", "À définir", "À voir avec votre conseiller"]]],
  ["maturity", "Où en est votre projet aujourd'hui ?", "Dernière question : elle nous aide à adapter notre accompagnement.", [["idees", "Je cherche des idées", "J'ai envie de partir, destination ouverte"], ["comparaison", "Je compare déjà", "J'ai quelques pistes en tête"], ["reservation-prochaine", "Je souhaite réserver prochainement", "Mon projet devient concret"]]],
];

const destinationIdeas = {
  plage: ["Océan Indien", "Caraïbes", "Cap-Vert"],
  circuit: ["Asie", "Amérique latine", "Afrique australe"],
  safari: ["Tanzanie", "Kenya", "Afrique du Sud"],
  croisiere: ["Caraïbes", "Océan Indien", "Méditerranée"],
  combine: ["Île Maurice & Dubaï", "Sri Lanka & Maldives", "Safari & Zanzibar"],
  "a-decouvrir": ["Océan Indien", "Caraïbes", "Afrique"],
};

function profileFor(answers) {
  const style = answers.travelStyle;
  if (style === "safari") return "Aventure & grands espaces";
  if (style === "circuit") return "Découverte & rencontres";
  if (style === "croisiere") return "Évasion au fil de l'eau";
  if (style === "combine") return "Deux voyages en un";
  if (style === "plage") return "Évasion soleil & douceur";
  return "Évasion sur mesure";
}

function track(event, data = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, funnel_id: "bois-colombes-soleil-hiver", ...data });
}

export default function Funnel() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [form, setForm] = useState({ name: "", email: "", postalCode: "", phone: "", website: "", emailMarketing: false, phoneProjectContact: false });
  const [state, setState] = useState("idle");
  const [result, setResult] = useState(null);
  const contact = step >= steps.length;
  const progress = Math.round((Math.min(step, steps.length) / steps.length) * 100);
  const current = steps[step];
  const profile = profileFor(answers);
  const ideas = destinationIdeas[answers.travelStyle] || destinationIdeas["a-decouvrir"];

  const begin = () => { setStarted(true); track("acquisition_quiz_start"); };
  const setAnswer = (key, value) => {
    setAnswers((old) => ({ ...old, [key]: value }));
    track("acquisition_question_answer", { question: key, answer: value, question_number: step + 1 });
    setTimeout(() => setStep((s) => Math.min(s + 1, steps.length)), 140);
  };

  async function submit(e) {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    try {
      const q = new URLSearchParams(location.search);
      const r = await fetch(`${API}/api/public/acquisition-funnels/bois-colombes/soleil-hiver/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, answers, consents: { emailMarketing: form.emailMarketing, phoneProjectContact: form.phoneProjectContact }, context: { sourcePath: location.pathname, referrer: document.referrer, utmSource: q.get("utm_source"), utmMedium: q.get("utm_medium"), utmCampaign: q.get("utm_campaign"), utmContent: q.get("utm_content"), utmTerm: q.get("utm_term") } }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erreur");
      setResult(data);
      setState("done");
      track("acquisition_lead_submit", { temperature: data?.qualification?.temperature, score: data?.qualification?.score });
    } catch (err) {
      setResult({ error: err.message });
      setState("error");
    }
  }

  const action = useMemo(() => result?.qualification?.temperature === "HOT" ? "Votre projet est déjà bien avancé : l'équipe de Bois-Colombes le reçoit en priorité." : "Votre projet est enregistré. L'équipe dispose maintenant des éléments utiles pour vous conseiller.", [result]);

  if (state === "done") return (
    <main style={S.main}>
      <div style={S.shell}>
        <Brand />
        <section style={S.resultCard}>
          <p style={S.eyebrow}>Votre projet est transmis</p>
          <h1 style={S.resultTitle}>Merci {form.name.split(" ")[0]}.</h1>
          <p style={S.resultLead}>{action}</p>
          <div style={S.profileBox}><span style={S.profileLabel}>Votre profil voyage</span><strong style={S.profileName}>{profile}</strong><p style={S.profileText}>Des pistes comme {ideas.join(", ")} peuvent correspondre à vos envies. Votre conseiller affinera ces inspirations selon les disponibilités et votre projet.</p></div>
          <div style={S.humanBox}><div style={S.avatar}>BC</div><div><strong>Une vraie équipe à Bois-Colombes</strong><p style={S.mini}>Votre demande arrive directement à l'agence Mondescale. Pas de centre d'appels, pas de projet standardisé.</p></div></div>
          {result?.lead?.duplicate && <p style={S.mini}>Nous avions déjà reçu cette demande récemment : elle n'a pas été créée une seconde fois.</p>}
          <p style={S.privacy}>Vos préférences de contact sont respectées. Aucun rappel téléphonique sans votre accord explicite.</p>
        </section>
      </div>
    </main>
  );

  if (!started) return (
    <main style={S.heroMain}>
      <div style={S.heroShade} />
      <div style={S.heroShell}>
        <Brand light />
        <section style={S.heroContent}>
          <div style={S.localPill}>Votre agence voyage à Bois-Colombes</div>
          <p style={S.heroKicker}>Hiver 2026 · 2027</p>
          <h1 style={S.heroTitle}>Et si votre prochain hiver se passait <em style={S.heroEm}>au soleil ?</em></h1>
          <p style={S.heroLead}>En 6 questions, précisez vos envies et laissez notre équipe imaginer les pistes de voyage qui vous correspondent vraiment.</p>
          <button type="button" style={S.heroCta} onClick={begin}>Trouver mon voyage <span>→</span></button>
          <div style={S.trustRow}><span>✓ 2 minutes</span><span>✓ Sans engagement</span><span>✓ Conseil humain à Bois-Colombes</span></div>
        </section>
        <div style={S.heroFoot}>Mondescale Voyages · Des voyages pensés avec vous</div>
      </div>
    </main>
  );

  return (
    <main style={S.main}>
      <div style={S.shell}>
        <Brand />
        <section style={S.quizCard}>
          <div style={S.topline}><span>{contact ? "Votre profil est prêt" : `Question ${step + 1} sur ${steps.length}`}</span><span>{contact ? "100" : progress}%</span></div>
          <div style={S.track}><div style={{ ...S.bar, width: `${contact ? 100 : progress}%` }} /></div>
          {!contact ? <div style={S.questionWrap}>
            <p style={S.eyebrow}>Votre voyage, vos envies</p>
            <h1 style={S.question}>{current[1]}</h1>
            <p style={S.questionLead}>{current[2]}</p>
            <div style={S.options}>{current[3].map(([value, label, sub]) => <button type="button" key={value} style={{ ...S.option, ...(answers[current[0]] === value ? S.selected : {}) }} onClick={() => setAnswer(current[0], value)}><span style={S.optionTitle}>{label}</span><span style={S.optionSub}>{sub}</span><span style={S.optionArrow}>→</span></button>)}</div>
            {step > 0 && <button type="button" style={S.back} onClick={() => setStep((s) => s - 1)}>← Revenir à la question précédente</button>}
          </div> : <form onSubmit={submit} style={S.questionWrap}>
            <p style={S.eyebrow}>Votre profil est prêt</p>
            <h1 style={S.question}>{profile}</h1>
            <p style={S.questionLead}>Quelques informations et l'équipe Mondescale Bois-Colombes pourra transformer vos réponses en premières pistes concrètes.</p>
            <div style={S.teaser}><span style={S.teaserLabel}>Premières inspirations</span><div style={S.ideaRow}>{ideas.map((idea) => <span key={idea} style={S.idea}>{idea}</span>)}</div><p style={S.teaserNote}>Inspirations indicatives · prix et disponibilités vérifiés par votre conseiller</p></div>
            <div style={S.fields}><label style={S.fieldLabel}>Prénom et nom<input style={S.input} required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label style={S.fieldLabel}>E-mail<input style={S.input} required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label style={S.fieldLabel}>Code postal<input style={S.input} required inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })} /></label><label style={S.fieldLabel}>Téléphone <span style={S.optional}>(facultatif)</span><input style={S.input} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value, phoneProjectContact: e.target.value ? form.phoneProjectContact : false })} /></label><input tabIndex="-1" autoComplete="off" aria-hidden="true" style={S.honeypot} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            {form.phone && <label style={S.check}><input type="checkbox" checked={form.phoneProjectContact} onChange={(e) => setForm({ ...form, phoneProjectContact: e.target.checked })} /> Je souhaite être contacté(e) par téléphone par Mondescale Voyages au sujet de ce projet de voyage.</label>}
            <label style={S.check}><input type="checkbox" checked={form.emailMarketing} onChange={(e) => setForm({ ...form, emailMarketing: e.target.checked })} /> J'accepte de recevoir par e-mail des idées, conseils et offres de Mondescale Voyages.</label>
            {state === "error" && <p style={S.error}>Impossible d'enregistrer votre demande : {result?.error}</p>}
            <button style={S.cta} disabled={state === "loading" || Boolean(form.phone && !form.phoneProjectContact)}>{state === "loading" ? "Préparation de votre profil…" : "Recevoir mes premières recommandations →"}</button>
            <button type="button" style={S.back} onClick={() => setStep(steps.length - 1)}>← Modifier mes réponses</button>
          </form>}
        </section>
        <div style={S.reassure}><span>Conseillers voyage</span><i>·</i><span>Agence locale</span><i>·</i><span>Projet sans engagement</span></div>
      </div>
    </main>
  );
}

function Brand({ light = false }) {
  return (
    <header style={S.brand}>
      <div>
        <div style={S.logoCrop}>
          <img
            src="/brand/logo-mondescale.png"
            alt="Mondescale Voyages"
            style={S.logoImage}
          />
        </div>
        <span
          style={{
            ...S.brandLocation,
            color: light ? "rgba(255,255,255,.72)" : "#61736d",
          }}
        >
          Agence de Bois-Colombes
        </span>
      </div>
    </header>
  );
}

const S = {
  heroMain: { minHeight: "100svh", position: "relative", overflow: "hidden", fontFamily: "Arial,sans-serif", color: "white", backgroundImage: "linear-gradient(110deg,rgba(5,35,31,.92) 0%,rgba(8,45,39,.72) 48%,rgba(8,45,39,.18) 100%),url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2200&q=88')", backgroundSize: "cover", backgroundPosition: "center" },
  heroShade: { position: "absolute", inset: 0, background: "radial-gradient(circle at 78% 30%,rgba(255,215,140,.16),transparent 34%)", pointerEvents: "none" },
  heroShell: { minHeight: "100svh", maxWidth: 1240, margin: "0 auto", padding: "34px clamp(22px,5vw,64px) 28px", display: "flex", flexDirection: "column", position: "relative", zIndex: 1, boxSizing: "border-box" },
  brand: {
    display: "flex",
    alignItems: "center",
    minHeight: 72,
  },

  logoCrop: {
    width: 178,
    height: 64,
    overflow: "hidden",
    borderRadius: 10,
    background: "#fff",
    position: "relative",
  },

  logoImage: {
    position: "absolute",
    width: 260,
    height: 145,
    objectFit: "cover",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
  },

  brandLocation: {
    display: "block",
    marginTop: 7,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".12em",
    textTransform: "uppercase",
  },
  heroContent: { margin: "auto 0", maxWidth: 780, padding: "70px 0" }, localPill: { display: "inline-block", border: "1px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.09)", backdropFilter: "blur(10px)", padding: "9px 14px", borderRadius: 99, fontSize: 13 }, heroKicker: { textTransform: "uppercase", letterSpacing: ".2em", fontSize: 12, fontWeight: 700, margin: "30px 0 12px", color: "#f0d8a8" }, heroTitle: { fontFamily: "Georgia,serif", fontWeight: 400, fontSize: "clamp(48px,7vw,88px)", lineHeight: .94, letterSpacing: "-.045em", margin: 0, maxWidth: 820 }, heroEm: { fontWeight: 400, color: "#f0d8a8" }, heroLead: { fontSize: "clamp(17px,2vw,21px)", lineHeight: 1.55, maxWidth: 650, color: "rgba(255,255,255,.86)", margin: "28px 0" }, heroCta: { border: 0, background: "#f2d8a5", color: "#173b34", borderRadius: 99, padding: "17px 24px", fontSize: 16, fontWeight: 800, cursor: "pointer", display: "inline-flex", gap: 26, alignItems: "center" }, trustRow: { display: "flex", flexWrap: "wrap", gap: "10px 24px", marginTop: 26, color: "rgba(255,255,255,.75)", fontSize: 12 }, heroFoot: { fontSize: 11, letterSpacing: ".08em", color: "rgba(255,255,255,.55)" },
  main: { minHeight: "100svh", background: "radial-gradient(circle at 8% 5%,#f5ead7 0,transparent 30%),linear-gradient(145deg,#f8f5ef,#edf4f0)", padding: "30px 18px 50px", fontFamily: "Arial,sans-serif", color: "#173b34", boxSizing: "border-box" }, shell: { maxWidth: 920, margin: "0 auto" }, quizCard: { marginTop: 30, background: "rgba(255,255,255,.94)", border: "1px solid rgba(23,59,52,.08)", borderRadius: 30, padding: "clamp(24px,5vw,56px)", boxShadow: "0 30px 90px rgba(23,59,52,.11)" }, topline: { display: "flex", justifyContent: "space-between", color: "#73827e", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }, track: { height: 4, background: "#e7ece9", borderRadius: 99, overflow: "hidden", marginTop: 12 }, bar: { height: "100%", background: "#c69b57", transition: "width .3s ease" }, questionWrap: { maxWidth: 760, margin: "42px auto 0" }, eyebrow: { color: "#a5793d", textTransform: "uppercase", letterSpacing: ".17em", fontSize: 11, fontWeight: 800, margin: "0 0 12px" }, question: { fontFamily: "Georgia,serif", fontWeight: 400, fontSize: "clamp(34px,5vw,52px)", lineHeight: 1.05, letterSpacing: "-.035em", margin: 0 }, questionLead: { fontSize: 17, color: "#667771", lineHeight: 1.55, margin: "15px 0 28px", maxWidth: 650 }, options: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }, option: { position: "relative", minHeight: 96, padding: "19px 48px 19px 19px", border: "1px solid #dce5e1", background: "#fff", borderRadius: 18, textAlign: "left", cursor: "pointer", color: "#173b34", boxShadow: "0 5px 18px rgba(23,59,52,.035)" }, selected: { border: "1px solid #a5793d", background: "#fbf7ef" }, optionTitle: { display: "block", fontSize: 16, fontWeight: 800 }, optionSub: { display: "block", fontSize: 12, color: "#71817c", marginTop: 6, lineHeight: 1.35 }, optionArrow: { position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#a5793d", fontSize: 20 }, back: { border: 0, background: "transparent", padding: "22px 0 0", color: "#71817c", cursor: "pointer", fontSize: 13 }, teaser: { padding: 20, borderRadius: 18, background: "#f7f3ea", border: "1px solid #eee4d2", marginBottom: 24 }, teaserLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: "#8c6b38", fontWeight: 800 }, ideaRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }, idea: { padding: "8px 11px", background: "#fff", borderRadius: 99, fontSize: 13, border: "1px solid #eadfc9" }, teaserNote: { fontSize: 11, color: "#847e73", margin: "12px 0 0" }, fields: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }, fieldLabel: { fontSize: 12, fontWeight: 800, color: "#4c615b" }, optional: { fontWeight: 400, color: "#89958f" }, input: { display: "block", width: "100%", boxSizing: "border-box", marginTop: 7, padding: "15px 14px", border: "1px solid #d3ded9", borderRadius: 12, fontSize: 16, color: "#173b34", background: "#fff" }, honeypot: { position: "absolute", left: -10000, width: 1, height: 1, opacity: 0 }, check: { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, lineHeight: 1.5, marginTop: 16, color: "#667771" }, cta: { width: "100%", marginTop: 24, padding: "17px 20px", border: 0, borderRadius: 99, background: "#173b34", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }, error: { color: "#9b2c2c", fontSize: 13 }, reassure: { display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, color: "#7a8884", fontSize: 11, marginTop: 22 }, resultCard: { marginTop: 40, background: "#fff", borderRadius: 30, padding: "clamp(28px,6vw,64px)", boxShadow: "0 30px 90px rgba(23,59,52,.11)" }, resultTitle: { fontFamily: "Georgia,serif", fontSize: "clamp(42px,6vw,64px)", fontWeight: 400, margin: 0 }, resultLead: { fontSize: 18, lineHeight: 1.55, color: "#60736d", maxWidth: 650 }, profileBox: { background: "#173b34", color: "#fff", padding: "24px", borderRadius: 20, marginTop: 28 }, profileLabel: { display: "block", color: "#e5c68f", fontSize: 11, textTransform: "uppercase", letterSpacing: ".13em" }, profileName: { display: "block", fontFamily: "Georgia,serif", fontSize: 30, fontWeight: 400, marginTop: 8 }, profileText: { color: "rgba(255,255,255,.75)", lineHeight: 1.55, marginBottom: 0 }, humanBox: { display: "flex", gap: 15, alignItems: "center", marginTop: 22, padding: 18, border: "1px solid #e0e7e4", borderRadius: 18 }, avatar: { flex: "0 0 48px", width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", background: "#f1e4ce", color: "#7b5a2e", fontWeight: 800 }, mini: { fontSize: 12, lineHeight: 1.5, color: "#73827e", margin: "5px 0 0" }, privacy: { fontSize: 11, color: "#85918d", marginTop: 22 },
};
