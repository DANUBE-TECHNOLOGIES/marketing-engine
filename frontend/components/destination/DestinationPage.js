import styles from './DestinationPage.module.css';
import Link from 'next/link';
function JsonLd({ data }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />; }
function Section({ section }) {
  const c = section.content || {};
  if (section.type === 'cards') return <section className={styles['de-section']}><div className={styles['de-shell']}><h2>{section.title}</h2><div className={styles['de-cards']}>{(c.items || []).map((x, i) => <article key={i}><span>{String(i + 1).padStart(2, '0')}</span><h3>{x.title}</h3><p>{x.text}</p></article>)}</div></div></section>;
  if (section.type === 'feature') return <section className={styles['de-feature']}><div className={styles['de-shell']}><p className={styles['de-kicker']}>{c.eyebrow}</p><h2>{section.title}</h2><p>{c.text}</p></div></section>;
  if (section.type === 'timeline') return <section className={`${styles['de-section']} ${styles['de-soft']}`}><div className={styles['de-shell']}><h2>{section.title}</h2><div className={styles['de-timeline']}>{(c.items || []).map((x, i) => <article key={i}><strong>{x.day}</strong><div><h3>{x.title}</h3><p>{x.text}</p></div></article>)}</div></div></section>;
  if (section.type === 'tips') return <section className={styles['de-section']}><div className={`${styles['de-shell']} ${styles['de-two']}`}><div><p className={styles['de-kicker']}>L’expertise Mondescale</p><h2>{section.title}</h2></div><ul>{(c.items || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div></section>;
  return <section className={styles['de-section']}><div className={`${styles['de-shell']} ${styles['de-prose']}`}><h2>{section.title}</h2>{(c.paragraphs || []).map((x, i) => <p key={i}>{x}</p>)}</div></section>;
}
export default function DestinationPage({ data }) {
  const { destination: d, site } = data;
  const schema = { '@context': 'https://schema.org', '@type': 'TouristDestination', name: d.name, description: d.summary, image: d.heroImageUrl, geo: d.latitude && d.longitude ? { '@type': 'GeoCoordinates', latitude: d.latitude, longitude: d.longitude } : undefined, containedInPlace: { '@type': 'Country', name: d.country } };
  return <div className={styles['de-page']}>
    <JsonLd data={schema}/>
    <header className={styles['de-nav']}><div className={styles['de-shell']}><Link href={site.basePath} className={styles['de-brand']}>{site.name}</Link><nav><Link href={site.basePath}>Accueil</Link><Link href={`${site.basePath}/contact`} className={styles['de-nav-cta']}>Demander un devis</Link></nav></div></header>
    <main>
      <section className={styles['de-hero']} style={{ backgroundImage: `linear-gradient(90deg,rgba(9,25,37,.88),rgba(9,25,37,.28)),url("${d.heroImageUrl}")` }}><div className={styles['de-shell']}><p className={styles['de-kicker']}>{d.country} · {d.type}</p><h1>Voyage à {d.name}</h1><p>{d.tagline}</p><div className={styles['de-actions']}><Link href={data.quotePath}>Construire mon voyage</Link><a href="#decouvrir">Découvrir Budapest</a></div></div></section>
      <section className={styles['de-facts']}><div className={styles['de-shell']}><div><span>Meilleure période</span><strong>{d.bestTime}</strong></div><div><span>Durée idéale</span><strong>{d.idealDuration}</strong></div><div><span>Monnaie</span><strong>{d.currency}</strong></div><div><span>Langue</span><strong>{d.language}</strong></div></div></section>
      <section id="decouvrir" className={styles['de-intro']}><div className={styles['de-shell']}><p className={styles['de-kicker']}>Votre prochain city-break</p><h2>{d.summary}</h2><div className={styles['de-pills']}>{(d.highlights || []).map(x => <span key={x}>{x}</span>)}</div></div></section>
      {(d.sections || []).map(s => <Section section={s} key={s.id}/>) }
      <section className={styles['de-faq']}><div className={styles['de-shell']}><p className={styles['de-kicker']}>Bien préparer votre séjour</p><h2>Questions fréquentes</h2><div>{(d.faqs || []).map(f => <details key={f.id}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div></div></section>
      <section className={styles['de-final']}><div className={styles['de-shell']}><p className={styles['de-kicker']}>Un voyage conçu pour vous</p><h2>Prêt à découvrir {d.name} ?</h2><p>Votre agence {site.name} construit un séjour adapté à vos envies, à votre rythme et à votre budget.</p><Link href={data.quotePath}>Demander mon devis personnalisé</Link></div></section>
    </main>
    <footer className={styles['de-footer']}><div className={styles['de-shell']}><strong>{site.name}</strong><span>Votre agence de voyages de proximité</span></div></footer>
  </div>;
}
