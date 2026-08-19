"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./VisualPageBuilder.module.css";
import MediaPicker from "./MediaPicker";
import { fetchPublishedMediaImages } from "../../lib/page-builder-v2/media-library-api";
import { getCommonPartners } from "../page-builder/shared/commonPartners";
import { FULL_PARTNERS, PARTNER_DIRECTORY_CATEGORIES } from "../page-builder/shared/fullPartners";
import { getPartnerProfile } from "../page-builder/shared/partnerProfile";
import { partnerKey } from "../page-builder/shared/partnerSelection";
import { recommendAgencyPartners } from "../page-builder/shared/partnerRecommendations";

function moveItem(items, index, direction) {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

function ItemToolbar({ index, count, onMove, onDelete }) {
  return <div className={styles.itemToolbar}><span>Élément {index + 1}</span><div><button type="button" disabled={index === 0} onClick={() => onMove(-1)} title="Monter">↑</button><button type="button" disabled={index === count - 1} onClick={() => onMove(1)} title="Descendre">↓</button><button type="button" onClick={onDelete} title="Supprimer">×</button></div></div>;
}

function Field({ label, value, onChange, multiline = false, type = "text" }) {
  return <label className={styles.field}><span>{label}</span>{multiline ? <textarea rows={4} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function SelectField({ label, value, onChange, children }) {
  return <label className={styles.field}><span>{label}</span><select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function ListEditor({ items, onChange, createItem, addLabel, maxItems = null, children }) {
  const safeItems = Array.isArray(items) ? items : [];
  const updateItem = (index, value) => onChange(safeItems.map((item, currentIndex) => currentIndex === index ? value : item));
  const deleteItem = (index) => onChange(safeItems.filter((_, currentIndex) => currentIndex !== index));
  const move = (index, direction) => onChange(moveItem(safeItems, index, direction));
  const canAdd = maxItems == null || safeItems.length < maxItems;
  return <div className={styles.listEditor}>{safeItems.map((item, index) => <section className={styles.listEditorItem} key={item.id || `${index}`}><ItemToolbar index={index} count={safeItems.length} onMove={(direction) => move(index, direction)} onDelete={() => deleteItem(index)} />{children({ item, index, update: (value) => updateItem(index, value) })}</section>)}{canAdd ? <button type="button" className={styles.addListItem} onClick={() => onChange([...safeItems, createItem()])}>+ {addLabel}</button> : null}</div>;
}

function lockedPartnerKeys(items = []) {
  const keys = new Set();
  for (const item of items) {
    for (const candidate of [item?.id, item?.name, item?.title]) {
      const key = partnerKey(candidate);
      if (key) keys.add(key);
    }
    for (const child of Array.isArray(item?.children) ? item.children : []) {
      for (const candidate of [child?.id, child?.name, child?.title]) {
        const key = partnerKey(candidate);
        if (key) keys.add(key);
      }
    }
  }
  return keys;
}

function canonicalAgencyPartnerOptions(networkItems = []) {
  const reserved = lockedPartnerKeys(networkItems);
  return FULL_PARTNERS
    .map(getPartnerProfile)
    .filter((partner) => partner?.publishable && partner?.readyForPublication)
    .filter((partner) => !reserved.has(partnerKey(partner.id)) && !reserved.has(partnerKey(partner.name)))
    .map((partner) => ({
      id: partner.id,
      name: partner.name,
      category: partner.category,
      summary: partner.summary,
      tags: Array.isArray(partner.tags) ? partner.tags : [],
      logoUrl: partner.logoUrl || "",
    }));
}

function canonicalPartnerValue(partner, current = {}) {
  return {
    id: partner.id,
    catalogPartnerId: partner.id,
    name: partner.name,
    category: partner.category,
    summary: partner.summary,
    tags: [...partner.tags],
    logoAssetId: "",
    logoUrl: partner.logoUrl,
    alt: `Logo ${partner.name}`,
    href: current.href || "",
    scope: "agency",
    source: "catalog",
  };
}

const RECOMMENDATION_FOCUS = Object.freeze([
  { value: "", label: "Déduire du mini-site" },
  { value: "croisières croisiere fluvial navire bateau", label: "Croisières" },
  { value: "circuits circuit autotour itineraire accompagne aventure", label: "Circuits & autotours" },
  { value: "séjours sejours club soleil famille balneaire hotel", label: "Séjours & clubs" },
  { value: "sur mesure long-courrier premium luxe combiné", label: "Sur mesure & long-courrier" },
  { value: "France Europe montagne residence camping thalasso Corse", label: "France & Europe" },
]);

export function PartnerLogosEditor({ networkItems, agencyPartners, recommendationSignals: providedRecommendationSignals = [], minisiteSignals = null, maxAgencyPartners = 3, assets = [], loading = false, onChange }) {
  const [fetchedPartnerAssets, setFetchedPartnerAssets] = useState([]);
  const [fetchedPartnerLoading, setFetchedPartnerLoading] = useState(true);
  const [recommendationFocus, setRecommendationFocus] = useState("");
  const hasProvidedAssets = assets.length > 0;
  const partnerAssets = hasProvidedAssets ? assets : fetchedPartnerAssets;
  const partnerLoading = hasProvidedAssets ? loading : fetchedPartnerLoading;
  const minisiteRecommendationSignals = Array.isArray(minisiteSignals)
    ? minisiteSignals
    : providedRecommendationSignals;

  useEffect(() => {
    if (hasProvidedAssets) return undefined;

    let cancelled = false;
    fetchPublishedMediaImages()
      .then((items) => { if (!cancelled) setFetchedPartnerAssets(items); })
      .catch(() => { if (!cancelled) setFetchedPartnerAssets([]); })
      .finally(() => { if (!cancelled) setFetchedPartnerLoading(false); });
    return () => { cancelled = true; };
  }, [hasProvidedAssets]);

  const suppliedNetwork = Array.isArray(networkItems)
    ? networkItems.filter((item) => item?.scope !== "agency")
    : [];
  const locked = suppliedNetwork.length ? suppliedNetwork : getCommonPartners();
  const agency = useMemo(
    () => (Array.isArray(agencyPartners) ? agencyPartners.slice(0, maxAgencyPartners) : []),
    [agencyPartners, maxAgencyPartners]
  );
  const canonicalOptions = useMemo(() => canonicalAgencyPartnerOptions(locked), [locked]);
  const categories = useMemo(() => new Map(PARTNER_DIRECTORY_CATEGORIES.map((category) => [category.id, category.label])), []);
  const recommendationSignals = useMemo(() => {
    if (recommendationFocus) return [{ value: recommendationFocus, source: "manual-focus", weight: 8 }];
    const siteSignals = Array.isArray(minisiteRecommendationSignals) ? minisiteRecommendationSignals : [];
    const selectedSignals = agency.flatMap((item) => [item?.name, item?.category, item?.summary, ...(Array.isArray(item?.tags) ? item.tags : [])]).filter(Boolean).map((value) => ({ value, source: "selected-partner", weight: 2 }));
    return [...siteSignals, ...selectedSignals];
  }, [agency, minisiteRecommendationSignals, recommendationFocus]);
  const recommendations = useMemo(() => recommendAgencyPartners({
    signals: recommendationSignals,
    selected: agency,
    networkItems: locked,
    max: Math.max(0, maxAgencyPartners - agency.length),
  }), [recommendationSignals, agency, locked, maxAgencyPartners]);

  const addRecommendation = (entry) => {
    if (!entry?.partner || agency.length >= maxAgencyPartners) return;
    const option = canonicalOptions.find((partner) => partner.id === entry.partner.id);
    if (!option) return;
    onChange([...agency, canonicalPartnerValue(option)].slice(0, maxAgencyPartners));
  };

  return <div className={styles.partnerEditor}><div className={styles.partnerLockedPanel}><strong>Socle réseau Mondescale</strong><p>Ces partenaires sont communs à tous les mini-sites et ne peuvent pas être modifiés ici.</p><div className={styles.partnerLockedList}>{locked.map((item) => <span key={item.id || item.name}>{item.name || item.title}</span>)}</div></div><div className={styles.partnerAgencyHeader}><strong>Partenaires de l’agence</strong><small>{agency.length}/{maxAgencyPartners} emplacement{maxAgencyPartners > 1 ? "s" : ""}</small></div><div className={styles.partnerLockedPanel}><strong>Suggestions pour l’agence</strong><p>Le moteur analyse les contenus du mini-site et propose uniquement des partenaires vérifiés. L’orientation ci-dessous reste un override manuel et aucun choix n’est appliqué sans votre action.</p><SelectField label="Orientation commerciale" value={recommendationFocus} onChange={setRecommendationFocus}>{RECOMMENDATION_FOCUS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}</SelectField>{recommendations.length ? <div className={styles.partnerLockedList}>{recommendations.map((entry) => <button type="button" key={entry.partner.id} className={styles.addListItem} onClick={() => addRecommendation(entry)} disabled={agency.length >= maxAgencyPartners} title={entry.reason}>+ {entry.partner.name}</button>)}</div> : <small>{agency.length >= maxAgencyPartners ? "Les trois emplacements sont déjà utilisés." : recommendationSignals.length ? "Aucune autre recommandation pertinente avec ces critères." : "Ajoutez du contenu au mini-site ou choisissez une orientation pour obtenir des suggestions."}</small>}</div><ListEditor items={agency} onChange={(items) => onChange(items.slice(0, maxAgencyPartners).map((item) => ({ ...item, scope: "agency" })))} maxItems={maxAgencyPartners} addLabel="Ajouter un partenaire agence" createItem={() => ({ id: `agency-partner-${Date.now()}`, catalogPartnerId: "", name: "", logoAssetId: "", logoUrl: "", alt: "", href: "", scope: "agency", source: "custom" })}>{({ item, index, update }) => {
    const catalogPartnerId = item.catalogPartnerId || (item.source === "catalog" ? item.id : "");
    const selectedCatalogPartner = canonicalOptions.find((partner) => partner.id === catalogPartnerId) || null;
    const selectedElsewhere = new Set(agency.filter((_, currentIndex) => currentIndex !== index).map((candidate) => candidate.catalogPartnerId || (candidate.source === "catalog" ? candidate.id : "")).filter(Boolean));
    const selectedAsset = item.logoAssetId ? partnerAssets.find((asset) => asset.id === item.logoAssetId) || null : null;
    const previewUrl = selectedCatalogPartner?.logoUrl || selectedAsset?.url || item.logoUrl || item.logo || "";
    const switchPartner = (partnerId) => {
      if (!partnerId) {
        update({ id: item.source === "catalog" ? `agency-partner-${Date.now()}` : item.id, catalogPartnerId: "", name: item.source === "catalog" ? "" : item.name, logoAssetId: "", logoUrl: item.source === "catalog" ? "" : item.logoUrl, alt: item.source === "catalog" ? "" : item.alt, href: item.href || "", scope: "agency", source: "custom" });
        return;
      }
      const partner = canonicalOptions.find((candidate) => candidate.id === partnerId);
      if (partner) update(canonicalPartnerValue(partner, item));
    };

    return <><SelectField label="Partenaire du catalogue Mondescale" value={catalogPartnerId} onChange={switchPartner}><option value="">Partenaire personnalisé</option>{canonicalOptions.map((partner) => <option key={partner.id} value={partner.id} disabled={selectedElsewhere.has(partner.id)}>{partner.name} — {categories.get(partner.category) || partner.category}</option>)}</SelectField>{previewUrl ? <img className={styles.editorThumbnail} src={previewUrl} alt={item.alt || item.name || "Logo partenaire"} /> : null}{selectedCatalogPartner ? <div className={styles.partnerLockedPanel}><strong>{selectedCatalogPartner.name}</strong><p>{selectedCatalogPartner.summary}</p>{selectedCatalogPartner.tags.length ? <small>{selectedCatalogPartner.tags.join(" · ")}</small> : null}</div> : <><Field label="Nom du partenaire" value={item.name} onChange={(name) => update({ ...item, name, catalogPartnerId: "", source: "custom", scope: "agency" })} /><MediaPicker assets={partnerAssets} loading={partnerLoading} selectedAssetId={item.logoAssetId || ""} onSelect={(asset) => update({ ...item, catalogPartnerId: "", source: "custom", logoAssetId: asset.id, logoUrl: asset.url, alt: item.alt || asset.altText || (item.name ? `Logo ${item.name}` : ""), scope: "agency" })} onClear={() => { const { logoAssetId: _assetId, logoUrl: _logoUrl, logo: _logo, ...rest } = item; update({ ...rest, catalogPartnerId: "", source: "custom", scope: "agency" }); }} /><Field label="Texte alternatif" value={item.alt || ""} onChange={(alt) => update({ ...item, alt, catalogPartnerId: "", source: "custom", scope: "agency" })} /><details><summary>URL de logo héritée</summary><Field label="URL du logo" value={item.logoUrl || item.logo || ""} onChange={(logoUrl) => update({ ...item, catalogPartnerId: "", source: "custom", logoAssetId: "", logoUrl, scope: "agency" })} /></details></>}<Field label="Lien facultatif" value={item.href || ""} onChange={(href) => update({ ...item, href, scope: "agency" })} /></>;
  }}</ListEditor></div>;
}

export function FaqEditor({ items, onChange }) { return <ListEditor items={items} onChange={onChange} addLabel="Ajouter une question" createItem={() => ({ question: "Nouvelle question", answer: "Nouvelle réponse" })}>{({ item, update }) => <><Field label="Question" value={item.question} onChange={(question) => update({ ...item, question })} /><Field label="Réponse" value={item.answer} multiline onChange={(answer) => update({ ...item, answer })} /></>}</ListEditor>; }
export function FeaturesEditor({ items, onChange }) { return <ListEditor items={items} onChange={onChange} addLabel="Ajouter un point fort" createItem={() => ({ icon: "✦", title: "Nouveau point fort", text: "Description du point fort." })}>{({ item, update }) => <><Field label="Icône" value={item.icon} onChange={(icon) => update({ ...item, icon })} /><Field label="Titre" value={item.title} onChange={(title) => update({ ...item, title })} /><Field label="Description" value={item.text} multiline onChange={(text) => update({ ...item, text })} /></>}</ListEditor>; }
export function GalleryEditor({ images, onChange, assets = [], loading = false }) { return <ListEditor items={images} onChange={onChange} addLabel="Ajouter une image" createItem={() => ({ imageAssetId: "", url: "", alt: "", caption: "" })}>{({ item, update }) => { const selectedAsset = item.imageAssetId ? assets.find((asset) => asset.id === item.imageAssetId) || null : null; const previewUrl = item.url || selectedAsset?.url || ""; return <>{previewUrl ? <img className={styles.editorThumbnail} src={previewUrl} alt={item.alt || ""} /> : null}<MediaPicker assets={assets} loading={loading} selectedAssetId={item.imageAssetId || ""} onSelect={(asset) => update({ ...item, imageAssetId: asset.id, url: null, alt: item.alt || asset.altText || "" })} onClear={() => update({ ...item, imageAssetId: "" })} /><details><summary>URL d’image héritée</summary><Field label="URL de l’image" value={item.url} onChange={(url) => update({ ...item, url })} /></details><Field label="Texte alternatif" value={item.alt} onChange={(alt) => update({ ...item, alt })} /><Field label="Légende" value={item.caption} multiline onChange={(caption) => update({ ...item, caption })} /></>; }}</ListEditor>; }
export function TestimonialsEditor({ items, onChange }) { return <ListEditor items={items} onChange={onChange} addLabel="Ajouter un témoignage" createItem={() => ({ author: "Client", text: "Un excellent accompagnement.", rating: 5 })}>{({ item, update }) => <><Field label="Auteur" value={item.author} onChange={(author) => update({ ...item, author })} /><Field label="Témoignage" value={item.text} multiline onChange={(text) => update({ ...item, text })} /><Field label="Note" type="number" value={item.rating} onChange={(rating) => update({ ...item, rating: Math.max(1, Math.min(5, Number(rating) || 1)) })} /></>}</ListEditor>; }
export function TeamEditor({ members, onChange, assets = [], loading = false }) { return <ListEditor items={members} onChange={onChange} addLabel="Ajouter un membre" createItem={() => ({ id: `team-${Date.now()}`, name: "", role: "Conseiller voyage", imageAssetId: "", imageUrl: "", imageAlt: "", bio: "" })}>{({ item, update }) => { const selectedAsset = item.imageAssetId ? assets.find((asset) => asset.id === item.imageAssetId) || null : null; const previewUrl = item.imageUrl || selectedAsset?.url || ""; return <>{previewUrl ? <img className={styles.editorThumbnail} src={previewUrl} alt={item.imageAlt || item.name || "Membre de l'équipe"} /> : null}<Field label="Nom" value={item.name} onChange={(name) => update({ ...item, name })} /><Field label="Fonction" value={item.role} onChange={(role) => update({ ...item, role })} /><MediaPicker assets={assets} loading={loading} selectedAssetId={item.imageAssetId || ""} onSelect={(asset) => update({ ...item, imageAssetId: asset.id, imageAlt: item.imageAlt || asset.altText || (item.name ? `Portrait de ${item.name}` : "") })} onClear={() => { const { imageAssetId: _a, imageUrl: _b, __mediaSource: _c, __mediaVersion: _d, ...rest } = item; update(rest); }} /><Field label="Texte alternatif de la photo" value={item.imageAlt} onChange={(imageAlt) => update({ ...item, imageAlt })} /><details><summary>URL de photo héritée</summary><Field label="URL de la photo" value={item.imageUrl} onChange={(imageUrl) => update({ ...item, imageUrl })} /></details><Field label="Présentation" value={item.bio} multiline onChange={(bio) => update({ ...item, bio })} /></>; }}</ListEditor>; }
export function StringListEditor({ items, onChange, label, addLabel }) { return <ListEditor items={(items || []).map((value) => ({ value }))} onChange={(nextItems) => onChange(nextItems.map((item) => item.value))} addLabel={addLabel} createItem={() => ({ value: "" })}>{({ item, update }) => <Field label={label} value={item.value} onChange={(value) => update({ value })} />}</ListEditor>; }
