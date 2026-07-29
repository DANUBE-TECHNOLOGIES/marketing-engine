import Link from "next/link";

function Action({ action, secondary = false }) {
  if (!action?.href || !action?.label) return null;
  const external = /^(https?:|tel:|mailto:)/.test(action.href);
  const className = secondary ? "as-btn as-btn-secondary" : "as-btn";
  return external ? <a className={className} href={action.href}>{action.label}</a> : <Link className={className} href={action.href}>{action.label}</Link>;
}
function Cards({ items = [] }) { return <div className="as-grid">{items.map((item,i)=>{const v=typeof item==="string"?{title:item}:item;return <article className="as-card" key={`${v.title}-${i}`}><h3>{v.title}</h3>{v.text&&<p>{v.text}</p>}{v.href&&<Action action={{href:v.href,label:v.label||"Découvrir"}} secondary/>}</article>})}</div>; }
function Faq({ items=[] }) { return <div className="as-faq">{items.map((item,i)=><details key={`${item.question}-${i}`}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>; }
export default function SectionRenderer({ section }) {
  const c=section?.jsonContent||section?.content||{}; const type=section?.sectionType||section?.type;
  if(type==="hero") return <section className="as-hero" style={c.imageUrl?{backgroundImage:`linear-gradient(120deg,rgba(19,36,58,.88),rgba(33,87,119,.72)),url(${c.imageUrl})`}:undefined}><div className="as-shell"><p className="as-eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="as-lead">{c.text}</p><div className="as-actions"><Action action={c.primaryCta}/><Action action={c.secondaryCta} secondary/></div></div></section>;
  if(type==="page-header") return <section className="as-page-head"><div className="as-shell"><h1>{c.title}</h1><p>{c.introduction}</p></div></section>;
  if(type==="faq") return <section className="as-section"><div className="as-shell"><h2>{c.title||"Questions fréquentes"}</h2>{c.text&&<p className="as-intro">{c.text}</p>}<Faq items={c.items||[]}/></div></section>;
  if(type==="contact-details"||type==="agency-details") return <section className="as-section"><div className="as-shell"><h2>{c.title}</h2><div className="as-contact"><p>{[c.address,c.postalCode,c.city].filter(Boolean).join(" ")}</p>{c.phone&&<p><a href={`tel:${c.phone.replace(/\s+/g,"")}`}>{c.phone}</a></p>}{c.email&&<p><a href={`mailto:${c.email}`}>{c.email}</a></p>}</div></div></section>;
  if(type==="contact-cta") return <section className="as-cta"><div className="as-shell"><h2>{c.title}</h2><p>{c.text}</p><div className="as-actions">{(c.actions||[]).map((a,i)=><Action action={a} secondary={i>0} key={a.href}/>)}</div></div></section>;
  if(type==="map-placeholder") return <section className="as-section"><div className="as-shell"><h2>{c.title}</h2><div className="as-map"><span>{c.address||"Adresse à renseigner"}</span></div></div></section>;
  if(type==="legal-notice"||type==="privacy-notice") return <section className="as-section"><div className="as-shell as-prose"><h2>{c.title}</h2><p>{c.text}</p>{c.status?.startsWith("requires-")&&<p className="as-warning">Contenu à valider avant publication.</p>}</div></section>;
  const items=c.items||[]; return <section className="as-section"><div className="as-shell">{c.title&&<h2>{c.title}</h2>}{c.text&&<p className="as-intro">{c.text}</p>}{c.paragraphs?.map((p,i)=><p key={i}>{p}</p>)}{items.length>0&&<Cards items={items}/>} {c.link&&<div className="as-section-link"><Action action={c.link} secondary/></div>}{c.url&&<p><a href={c.url} target="_blank" rel="noreferrer">Consulter les avis Google</a></p>}</div></section>;
}
