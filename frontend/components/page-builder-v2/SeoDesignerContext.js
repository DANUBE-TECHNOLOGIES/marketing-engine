"use client";

import { useEffect, useState } from "react";
import {
  fetchPageDetails,
  fetchSite,
} from "../../lib/page-builder-v2/page-builder-api";
import { saveLocalDraft } from "../../lib/page-builder-v2/draft-storage";
import { buildSeoDraftProposal } from "../../lib/page-builder-v2/seo-draft-proposal";

const MODE_LABELS = {
  reinforce_existing: "Renforcer la page existante",
  enrich_existing: "Enrichir la page existante",
  consider_new_page: "Nouvelle page à valider",
  monitor: "Surveillance SEO",
};

export default function SeoDesignerContext({ siteId, pageSlug, keyword, mode, brief }) {
  const [pageOpened, setPageOpened] = useState(false);
  const [expanded, setExpanded] = useState(Boolean(brief));
  const [preparing, setPreparing] = useState(false);
  const [proposalNotice, setProposalNotice] = useState("");
  const [proposalError, setProposalError] = useState("");

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

  async function prepareDraftProposal() {
    if (!siteId || !pageSlug || !brief) return;

    if (
      !window.confirm(
        "Préparer les sections recommandées dans un brouillon local de cette page ? Rien ne sera publié automatiquement."
      )
    ) {
      return;
    }

    setPreparing(true);
    setProposalError("");
    setProposalNotice("");

    try {
      const site = await fetchSite(siteId);
      const target = site.pages.find(
        (page) => String(page.slug || "") === String(pageSlug || "")
      );

      if (!target) {
        throw new Error(`La page cible /${pageSlug} n'existe pas dans ce mini-site.`);
      }

      const detailedPage = await fetchPageDetails(site, target);
      const proposal = buildSeoDraftProposal(detailedPage, brief, mode);

      if (proposal.duplicate) {
        setProposalNotice(proposal.note);
        return;
      }

      const savedAt = saveLocalDraft(site.id, proposal.page);

      if (!savedAt) {
        throw new Error("Impossible d'enregistrer le brouillon local SEO.");
      }

      setProposalNotice(
        `${proposal.note} Le Designer va restaurer ce brouillon local.`
      );

      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setProposalError(
        error?.message || "Impossible de préparer la proposition SEO."
      );
    } finally {
      setPreparing(false);
    }
  }

  if (!keyword && !pageSlug && !brief) return null;

  const canPrepareExistingDraft =
    Boolean(siteId && pageSlug && brief) &&
    mode !== "consider_new_page" &&
    mode !== "monitor";

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

      {canPrepareExistingDraft ? (
        <button
          type="button"
          disabled={preparing}
          onClick={prepareDraftProposal}
          style={{marginTop:14,width:"100%",border:0,borderRadius:9,background:"#312e81",color:"white",padding:"10px 12px",fontWeight:800,cursor:preparing?"wait":"pointer",opacity:preparing?.7:1}}
        >
          {preparing ? "Préparation du brouillon…" : "Préparer les blocs SEO en brouillon"}
        </button>
      ) : null}

      {mode === "consider_new_page" ? (
        <div style={{marginTop:12,padding:10,borderRadius:8,background:"#fff7ed",color:"#9a3412",fontSize:12,lineHeight:1.5}}>
          La création d'une nouvelle page reste volontairement bloquée ici : elle devra d'abord être validée explicitement, puis créée en brouillon non publié.
        </div>
      ) : null}

      {proposalNotice ? <div style={{marginTop:10,padding:9,borderRadius:8,background:"#ecfdf5",color:"#166534",fontSize:12}}>{proposalNotice}</div> : null}
      {proposalError ? <div style={{marginTop:10,padding:9,borderRadius:8,background:"#fef2f2",color:"#991b1b",fontSize:12}}>{proposalError}</div> : null}

      <div style={{marginTop:12,fontSize:12,lineHeight:1.5,opacity:.75}}>Le brief sert d’aide à l’édition. Les blocs préparés restent en statut brouillon et aucune publication automatique n’est déclenchée : la validation humaine reste obligatoire.</div>
    </aside>
  );
}
