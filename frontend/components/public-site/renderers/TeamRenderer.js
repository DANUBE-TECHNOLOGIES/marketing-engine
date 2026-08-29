import Link from "next/link";
import { getSectionContent, getSectionTitle } from "./helpers";
import styles from "./TeamRenderer.module.css";

function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function initials(value) { return String(value || "Équipe").trim().split(/\s+/).slice(0,2).map((part)=>part.charAt(0).toUpperCase()).join(""); }
function localTeamTitle(site) { const city=clean(site?.agency?.city||site?.city); return city?`L’équipe de votre agence de voyages à ${city}`:"L’équipe de votre agence de voyages"; }
function localTeamIntro(site) { const city=clean(site?.agency?.city||site?.city); return city?`Des conseillers qui connaissent vos projets, vos envies et les solutions disponibles pour construire votre voyage depuis ${city}.`:"Des conseillers disponibles pour écouter votre projet et construire avec vous un voyage réellement adapté."; }
function siteHref(site,slug){const root=String(site?.basePath||`/agence/${encodeURIComponent(site?.slug||"")}`).replace(/\/$/,"");return `${root}/${slug}`;}
function memberPresentation(member){return clean(member.description||member.bio);}

function assetUrl(value){
 if(!value)return null;
 if(typeof value==="string")return value.trim()||null;
 if(Array.isArray(value)){
  for(const candidate of value){const resolved=assetUrl(candidate);if(resolved)return resolved;}
  return null;
 }
 if(typeof value!=="object")return null;
 return assetUrl(
  value.publicUrl||
  value.url||
  value.src||
  value.path||
  value.href||
  value.assetUrl||
  value.fileUrl||
  value.file||
  value.asset||
  null
 );
}

function memberImage(member){
 if(!member||typeof member!=="object")return null;
 const candidates=[
  member.image,
  member.imageUrl,
  member.photo,
  member.photoUrl,
  member.photoAsset,
  member.avatar,
  member.avatarUrl,
  member.portrait,
  member.portraitUrl,
  member.portraitAsset,
  member.media,
  member.asset,
  member.picture,
  member.pictureUrl,
  member.profileImage,
  member.profileImageUrl,
  member.profilePhoto,
  member.profilePhotoUrl,
 ];
 for(const candidate of candidates){const resolved=assetUrl(candidate);if(resolved)return resolved;}
 return null;
}
function memberImageAlt(member,name){return clean(member?.imageAlt||member?.photoAlt||member?.avatarAlt||member?.media?.altText||member?.media?.alt)||`Portrait de ${name}`;}

function memberCollection(content,site){
 const candidates=[
  content.members,
  content.items,
  content.team,
  content.teamMembers,
  site?.team,
  site?.teamMembers,
  site?.agency?.team,
  site?.agency?.teamMembers,
  site?.agency?.members,
 ];
 return candidates.flatMap((value)=>Array.isArray(value)?value:[]).filter(Boolean);
}

export default function TeamRenderer({section,site}){
 const content=getSectionContent(section); const city=clean(site?.agency?.city||site?.city);
 const members=memberCollection(content,site);
 const uniqueMembers=members.filter((member,index,list)=>{const key=String(member.id||member.email||member.name||member.title||index);return list.findIndex((candidate,candidateIndex)=>String(candidate.id||candidate.email||candidate.name||candidate.title||candidateIndex)===key)===index;});
 if(!uniqueMembers.length&&content.showWhenEmpty!==true)return null; const singleMember=uniqueMembers.length===1;
 return <section className={`public-site-section public-site-team ${styles.section}`} data-team-size={uniqueMembers.length}>
  <div className="public-site-container">
   <header className={styles.heading}><div><p className="public-site-section-kicker">Votre équipe</p><h2>{getSectionTitle(section,localTeamTitle(site))}</h2></div><p className={styles.intro}>{content.text||content.description||localTeamIntro(site)}</p></header>
   {uniqueMembers.length?<div className={`${styles.grid} ${singleMember?styles.single:""}`}>{uniqueMembers.map((member,index)=>{const name=clean(member.name||member.title)||"Conseiller voyage";const role=clean(member.role||member.jobTitle||member.subtitle)||"Conseiller voyage";const image=memberImage(member);const presentation=memberPresentation(member);return <article className={styles.card} key={member.id||member.email||name||index}><div className={styles.portrait}>{image?<img src={image} alt={memberImageAlt(member,name)} loading="lazy" decoding="async" fetchPriority="low" width="720" height="720"/>:<span>{initials(name)}</span>}</div><div className={styles.copy}><h3>{name}</h3><p className={styles.role}>{city?`${role} à ${city}`:role}</p>{presentation?<p>{presentation}</p>:null}</div></article>})}</div>:null}
   <nav className={styles.links} aria-label={city?`Préparer votre voyage avec l’équipe de ${city}`:"Préparer votre voyage avec notre équipe"}><Link href={siteHref(site,"services")}>Découvrir nos services</Link><Link href={siteHref(site,"destinations")}>Explorer nos destinations</Link><Link href={siteHref(site,"contact")}>Échanger avec un conseiller</Link></nav>
  </div>
 </section>;
}
export {assetUrl,localTeamIntro,localTeamTitle,memberCollection,memberImage,memberImageAlt,memberPresentation,siteHref};
