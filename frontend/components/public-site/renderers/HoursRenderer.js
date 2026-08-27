import Link from "next/link";
import { getSectionTitle } from "./helpers";
import { getPublicHours } from "../../../lib/public-hours-api";

const DAY_LABELS={MONDAY:"Lundi",TUESDAY:"Mardi",WEDNESDAY:"Mercredi",THURSDAY:"Jeudi",FRIDAY:"Vendredi",SATURDAY:"Samedi",SUNDAY:"Dimanche"};
function formatPeriods(periods){if(!Array.isArray(periods)||!periods.length)return"Fermé";return periods.map((period)=>`${period.openTime} – ${period.closeTime}`).join(" / ");}
function formatSyncedAt(value){if(!value)return null;try{return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}catch{return null;}}
function defaultHoursTitle(site){const city=String(site?.agency?.city||site?.city||"").trim();return city?`Horaires de notre agence à ${city}`:"Horaires de l’agence";}
function siteRoot(site){return String(site?.basePath||`/agence/${encodeURIComponent(site?.slug||"")}`).replace(/\/$/,"");}

export default async function HoursRenderer({section,site}){
  let data=null;try{data=await getPublicHours(site.slug);}catch{data=null;}if(!data)return null;
  const weekly=Array.isArray(data.weekly)?data.weekly:[];const syncedLabel=formatSyncedAt(data.syncedAt);const city=String(site?.agency?.city||site?.city||"").trim();const root=siteRoot(site);
  return <section className="public-site-section public-site-hours"><div className="public-site-container">
    <p className="public-site-section-kicker">Informations pratiques</p><h2>{getSectionTitle(section,defaultHoursTitle(site))}</h2><p className="public-site-section-intro">{city?`Consultez les horaires de votre agence de voyages à ${city} avant votre visite. Pour un projet nécessitant du temps de conseil, contactez l’équipe afin de préparer votre échange.`:"Consultez les horaires de votre agence avant votre visite."}</p>
    <div className="public-site-hours-layout"><div className="public-site-hours-status-card"><span className={["public-site-hours-status-dot",data.status?.isOpen?"is-open":"is-closed"].join(" ")}/><div><small>Statut actuel</small><strong>{data.status?.label||"Horaires indisponibles"}</strong><p>{city?`Agence de ${city}`:`Fuseau horaire : ${data.timezone||"Europe/Paris"}`}</p></div></div><div className="public-site-hours-table">{weekly.map((day)=><div className="public-site-hours-row" key={day.day}><strong>{DAY_LABELS[day.day]||day.day}</strong><span>{formatPeriods(day.periods)}</span></div>)}</div></div>
    {data.syncedAt&&syncedLabel?<p className="public-site-hours-sync">Horaires synchronisés avec Google Business Profile le <time dateTime={data.syncedAt}>{syncedLabel}</time></p>:<p className="public-site-hours-sync">Horaires en attente de synchronisation Google Business Profile.</p>}
    <nav className="public-site-related-links" aria-label="Préparer votre visite"><Link href={`${root}/contact`}>Contacter votre agence</Link><Link href={`${root}/equipe`}>Découvrir notre équipe</Link><Link href={`${root}/services`}>Préparer votre projet voyage</Link></nav>
  </div></section>;
}
export{defaultHoursTitle,siteRoot};
