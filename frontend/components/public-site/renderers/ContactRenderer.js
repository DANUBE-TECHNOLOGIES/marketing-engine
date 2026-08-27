import Link from "next/link";
import { getSectionContent, getSectionTitle } from "./helpers";
import { buildGoogleMapsSearchUrl } from "../../../lib/public-agency-location";
import { resolvedTargetCities } from "../../../lib/seo/local-area-config";

function phoneHref(phone){return `tel:${String(phone||"").replace(/\s+/g,"")}`;}
function siteHref(site,slug){const root=String(site?.basePath||`/agence/${encodeURIComponent(site?.slug||"")}`).replace(/\/$/,"");return `${root}/${slug}`;}
function joinCities(values){if(!values.length)return"";if(values.length===1)return values[0];if(values.length===2)return`${values[0]} et ${values[1]}`;return`${values.slice(0,-1).join(", ")} et ${values[values.length-1]}`;}
function localContactIntro(site){const agency=site?.agency||{};const city=String(agency.city||site?.city||"").trim();const nearby=resolvedTargetCities(site,{limit:3});if(!city)return"Contactez votre agence pour échanger avec un conseiller et préparer votre prochain voyage.";const area=nearby.length?` L’équipe accompagne également les voyageurs de ${joinCities(nearby)}.`:"";return`Contactez directement votre agence de voyages à ${city} pour préparer votre projet avec un conseiller local.${area}`;}

export default function ContactRenderer({section,site}){
 const content=getSectionContent(section);const agency=site?.agency||{};const mapUrl=buildGoogleMapsSearchUrl(agency);const city=String(agency.city||site?.city||"").trim();const agencyName=agency.name||site.name;
 return <section id="contact" className="public-site-section public-site-contact"><div className="public-site-container">
  <p className="public-site-section-kicker">Votre agence</p><h2>{getSectionTitle(section,city?`Contactez votre agence de voyages à ${city}`:"Contactez votre agence")}</h2><p className="public-site-section-intro">{content.text||content.description||localContactIntro(site)}</p>
  <div className="public-site-agency-profile">
   <article className="public-site-agency-card"><span className="public-site-agency-icon">⌖</span><div><small>{city?`Adresse de notre agence à ${city}`:"Adresse"}</small><strong>{agencyName}</strong>{agency.address?<address>{agency.address}<br/>{agency.postalCode} {agency.city}</address>:<p>Adresse en cours de mise à jour.</p>}{mapUrl?<a href={mapUrl} target="_blank" rel="noopener noreferrer">{city?`Itinéraire vers l’agence de ${city} →`:"Calculer l’itinéraire →"}</a>:null}</div></article>
   <article className="public-site-agency-card"><span className="public-site-agency-icon">☎</span><div><small>{city?`Téléphone de l’agence de ${city}`:"Téléphone"}</small>{agency.phone?<a className="public-site-agency-value" href={phoneHref(agency.phone)}>{agency.phone}</a>:<p>Numéro en cours de mise à jour.</p>}<small>E-mail</small>{agency.email?<a href={`mailto:${agency.email}`}>{agency.email}</a>:null}</div></article>
   <article className="public-site-agency-card"><span className="public-site-agency-icon">★</span><div><small>Votre expérience</small><strong>Vous avez voyagé avec nous ?</strong><p>{city?`Votre avis aide les voyageurs du secteur de ${city} à choisir leur agence de voyages.`:"Votre avis aide les futurs voyageurs à choisir leur agence."}</p>{agency.googleReviewUrl?<a href={agency.googleReviewUrl} target="_blank" rel="noopener noreferrer">{city?`Déposer un avis Google sur l’agence de ${city} →`:"Déposer un avis Google →"}</a>:null}</div></article>
  </div>
  <div className="public-site-agency-actions">{agency.phone?<a className="public-site-button" href={phoneHref(agency.phone)}>{city?`Appeler l’agence de ${city}`:"Appeler l’agence"}</a>:null}{agency.email?<a className="public-site-button public-site-button-outline" href={`mailto:${agency.email}`}>{city?`Écrire à l’agence de ${city}`:"Envoyer un e-mail"}</a>:null}</div>
  <div className="public-site-related-links" aria-label={city?`Continuer à préparer votre voyage avec l’agence de ${city}`:"Continuer à préparer votre voyage"}><Link href={siteHref(site,"services")}>{city?`Services de notre agence de voyages à ${city}`:"Découvrir nos services voyage"}</Link><Link href={siteHref(site,"destinations")}>{city?`Destinations conseillées par notre agence à ${city}`:"Explorer nos destinations"}</Link><Link href={siteHref(site,"inspirations")}>{city?`Conseils et inspirations voyage depuis ${city}`:"Lire nos inspirations voyage"}</Link></div>
 </div></section>;
}
export{joinCities,localContactIntro,phoneHref,siteHref};
