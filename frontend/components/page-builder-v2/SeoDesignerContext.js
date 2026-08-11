"use client";

import { useEffect, useState } from "react";

const MODE_LABELS = {
  reinforce_existing: "Renforcer la page existante",
  enrich_existing: "Enrichir la page existante",
  consider_new_page: "Nouvelle page à valider",
  monitor: "Surveillance SEO",
};

export default function SeoDesignerContext({ pageSlug, keyword, mode, brief }) {
  const [pageOpened, setPageOpened] = useState(false);
  const [expanded, setExpanded] = useState(Boolean(brief));

  useEffect(() => {
    if (!pageSlug || pageOpened) return undefined;

    const normalizedTarget = `/${String(pageSlug).replace(/^\/+|\/+$/g, "")}`;

    const openTargetPage = () => {
      const buttons = Array.from(document.querySelectorAll("nav button"));
      const target = buttons.find((button) => {
        const slug = button.querySelector("small")?.textContent?.trim();
        return slug === normalizedTarget;
      });

      if (!target) return false;

      target.click();
      setPageOpened(true);
      return true;
    };

    if (openTargetPage()) return undefined;

    const observer = new MutationObserver(() => {
      if (openTargetPage()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 8000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [pageSlug, pageOpened]);

  if (!keyword && !pageSlug && !brief) return null;

  return (
    <aside style={{position:"fixed",right:20,bottom:20,zIndex:120,width:"min(430px, calc(100vw - 40px))",maxHeight:"calc(100vh - 110px)",overflow:"auto",border:"1px solid #c7d2fe",borderRadius:14,background:"#eef2ff",color:"#1e1b4b",padding:16,boxShadow:"0 16px 40px rgba(30, 41, 59, .18)"}}>
      <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em",opacity:.65}}>Contexte SEO local</div>
      <strong style={{display:"block",marginTop:6,fontSize:16}}>{keyword || brief?.proposedH1 || "Opportunité éditoriale"}</strong>
      <div style={{marginTop:6,fontSize:13,lineHeight:1.5}}>{MODE_LABELS[mode] || MODE_LABELS.monitor}{pageSlug ? ` · page cible /${pageSlug}` : " · page cible à valider"}</div>

      {brief ? <>
        <button type="button" onClick={()=>setExpanded(value=>!value)} style={{marginTop:12,border:"1px solid #a5b4fc",borderRadius:8,background:"white",padding:"7px 10px",fontWeight:700,color:"#312e81",cursor:"pointer"}}>{expanded?"Masquer le brief":"Afficher le brief SEO"}</button>
        {expanded ? <div style={{marginTop:12,borderTop:"1px solid #c7d2fe",paddingTop:12,fontSize:12,lineHeight:1.55}}>
          <div style={{fontWeight:800}}>H1 proposé</div><div>{brief.proposedH1}</div>
          {brief.angle ? <><div style={{fontWeight:800,marginTop:10}}>Angle éditorial</div><div>{brief.angle}</div></> : null}
          {brief.sections?.length ? <><div style={{fontWeight:800,marginTop:10}}>Sections à traiter</div><ol style={{paddingLeft:20,margin:"5px 0 0"}}>{brief.sections.map((section,index)=><li key={section.code||index} style={{marginBottom:6}}><strong>{section.title}</strong>{section.purpose?` — ${section.purpose}`:""}</li>)}</ol></> : null}
          {brief.localProofsRequired?.length ? <><div style={{fontWeight:800,marginTop:10}}>Preuves locales nécessaires</div><ul style={{paddingLeft:20,margin:"5px 0 0"}}>{brief.localProofsRequired.map((item,index)=><li key={index}>{item}</li>)}</ul></> : null}
          {brief.editorialGuardrails?.length ? <><div style={{fontWeight:800,marginTop:10}}>Garde-fous</div><ul style={{paddingLeft:20,margin:"5px 0 0"}}>{brief.editorialGuardrails.map((item,index)=><li key={index}>{item}</li>)}</ul></> : null}
        </div> : null}
      </> : null}

      <div style={{marginTop:12,fontSize:12,lineHeight:1.5,opacity:.75}}>Le brief sert d’aide à l’édition. Aucune création ni publication automatique n’est déclenchée : la validation humaine reste obligatoire.</div>
    </aside>
  );
}
