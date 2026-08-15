"use client";

import { useEffect, useState } from "react";
import styles from "./VisualPageBuilder.module.css";
import MediaPicker from "./MediaPicker";
import { fetchPublishedMediaImages } from "../../lib/page-builder-v2/media-library-api";

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

function ListEditor({ items, onChange, createItem, addLabel, maxItems = null, children }) {
  const safeItems = Array.isArray(items) ? items : [];
  const updateItem = (index, value) => onChange(safeItems.map((item, currentIndex) => currentIndex === index ? value : item));
  const deleteItem = (index) => onChange(safeItems.filter((_, currentIndex) => currentIndex !== index));
  const move = (index, direction) => onChange(moveItem(safeItems, index, direction));
  const canAdd = maxItems == null || safeItems.length < maxItems;
  return <div className={styles.listEditor}>{safeItems.map((item, index) => <section className={styles.listEditorItem} key={item.id || `${index}`}><ItemToolbar index={index} count={safeItems.length} onMove={(direction) => move(index, direction)} onDelete={() => deleteItem(index)} />{children({ item, index, update: (value) => updateItem(index, value) })}</section>)}{canAdd ? <button type="button" className={styles.addListItem} onClick={() => onChange([...safeItems, createItem()])}>+ {addLabel}</button> : null}</div>;
}

export function PartnerLogosEditor({ networkItems, agencyPartners, maxAgencyPartners = 3, assets = [], loading = false, onChange }) {
  const [partnerAssets, setPartnerAssets] = useState(assets);
  const [partnerLoading, setPartnerLoading] = useState(loading || assets.length === 0);

  useEffect(() => {
    if (assets.length) {
      setPartnerAssets(assets);
      setPartnerLoading(loading);
      return undefined;
    }

    let cancelled = false;
    setPartnerLoading(true);
    fetchPublishedMediaImages()
      .then((items) => { if (!cancelled) setPartnerAssets(items); })
      .catch(() => { if (!cancelled) setPartnerAssets([]); })
      .finally(() => { if (!cancelled) setPartnerLoading(false); });
    return () => { cancelled = true; };
  }, [assets, loading]);

  const locked = Array.isArray(networkItems) ? networkItems.filter((item) => item?.scope !== "agency") : [];
  const agency = Array.isArray(agencyPartners) ? agencyPartners.slice(0, maxAgencyPartners) : [];

  return <div className={styles.partnerEditor}><div className={styles.partnerLockedPanel}><strong>Socle réseau Mondescale</strong><p>Ces partenaires sont communs à tous les mini-sites et ne peuvent pas être modifiés ici.</p><div className={styles.partnerLockedList}>{locked.map((item) => <span key={item.id || item.name}>{item.name || item.title}</span>)}</div></div><div className={styles.partnerAgencyHeader}><strong>Partenaires de l’agence</strong><small>{agency.length}/{maxAgencyPartners} emplacement{maxAgencyPartners > 1 ? "s" : ""}</small></div><ListEditor items={agency} onChange={(items) => onChange(items.slice(0, maxAgencyPartners).map((item) => ({ ...item, scope: "agency" })))} maxItems={maxAgencyPartners} addLabel="Ajouter un partenaire agence" createItem={() => ({ id: `agency-partner-${Date.now()}`, name: "", logoAssetId: "", logoUrl: "", alt: "", href: "", scope: "agency" })}>{({ item, update }) => { const selectedAsset = item.logoAssetId ? partnerAssets.find((asset) => asset.id === item.logoAssetId) || null : null; const previewUrl = selectedAsset?.url || item.logoUrl || item.logo || ""; return <>{previewUrl ? <img className={styles.editorThumbnail} src={previewUrl} alt={item.alt || item.name || "Logo partenaire"} /> : null}<Field label="Nom du partenaire" value={item.name} onChange={(name) => update({ ...item, name, scope: "agency" })} /><MediaPicker assets={partnerAssets} loading={partnerLoading} selectedAssetId={item.logoAssetId || ""} onSelect={(asset) => update({ ...item, logoAssetId: asset.id, logoUrl: asset.url, alt: item.alt || asset.altText || (item.name ? `Logo ${item.name}` : ""), scope: "agency" })} onClear={() => { const { logoAssetId: _assetId, logoUrl: _logoUrl, logo: _logo, ...rest } = item; update({ ...rest, scope: "agency" }); }} /><Field label="Texte alternatif" value={item.alt || ""} onChange={(alt) => update({ ...item, alt, scope: "agency" })} /><Field label="Lien facultatif" value={item.href || ""} onChange={(href) => update({ ...item, href, scope: "agency" })} /><details><summary>URL de logo héritée</summary><Field label="URL du logo" value={item.logoUrl || item.logo || ""} onChange={(logoUrl) => update({ ...item, logoAssetId: "", logoUrl, scope: "agency" })} /></details></>; }}</ListEditor></div>;
}

export function FaqEditor({ items, onChange }) { return <ListEditor items={items} onChange={onChange} addLabel="Ajouter une question" createItem={() => ({ question: "Nouvelle question", answer: "Nouvelle réponse" })}>{({ item, update }) => <><Field label="Question" value={item.question} onChange={(question) => update({ ...item, question })} /><Field label="Réponse" value={item.answer} multiline onChange={(answer) => update({ ...item, answer })} /></>}</ListEditor>; }
export function FeaturesEditor({ items, onChange }) { return <ListEditor items={items} onChange={onChange} addLabel="Ajouter un point fort" createItem={() => ({ icon: "✦", title: "Nouveau point fort", text: "Description du point fort." })}>{({ item, update }) => <><Field label="Icône" value={item.icon} onChange={(icon) => update({ ...item, icon })} /><Field label="Titre" value={item.title} onChange={(title) => update({ ...item, title })} /><Field label="Description" value={item.text} multiline onChange={(text) => update({ ...item, text })} /></>}</ListEditor>; }
export function GalleryEditor({ images, onChange, assets = [], loading = false }) { return <ListEditor items={images} onChange={onChange} addLabel="Ajouter une image" createItem={() => ({ imageAssetId: "", url: "", alt: "", caption: "" })}>{({ item, update }) => { const selectedAsset = item.imageAssetId ? assets.find((asset) => asset.id === item.imageAssetId) || null : null; const previewUrl = item.url || selectedAsset?.url || ""; return <>{previewUrl ? <img className={styles.editorThumbnail} src={previewUrl} alt={item.alt || ""} /> : null}<MediaPicker assets={assets} loading={loading} selectedAssetId={item.imageAssetId || ""} onSelect={(asset) => update({ ...item, imageAssetId: asset.id, url: null, alt: item.alt || asset.altText || "" })} onClear={() => update({ ...item, imageAssetId: "" })} /><details><summary>URL d’image héritée</summary><Field label="URL de l’image" value={item.url} onChange={(url) => update({ ...item, url })} /></details><Field label="Texte alternatif" value={item.alt} onChange={(alt) => update({ ...item, alt })} /><Field label="Légende" value={item.caption} multiline onChange={(caption) => update({ ...item, caption })} /></>; }}</ListEditor>; }
export function TestimonialsEditor({ items, onChange }) { return <ListEditor items={items} onChange={onChange} addLabel="Ajouter un témoignage" createItem={() => ({ author: "Client", text: "Un excellent accompagnement.", rating: 5 })}>{({ item, update }) => <><Field label="Auteur" value={item.author} onChange={(author) => update({ ...item, author })} /><Field label="Témoignage" value={item.text} multiline onChange={(text) => update({ ...item, text })} /><Field label="Note" type="number" value={item.rating} onChange={(rating) => update({ ...item, rating: Math.max(1, Math.min(5, Number(rating) || 1)) })} /></>}</ListEditor>; }
export function TeamEditor({ members, onChange, assets = [], loading = false }) { return <ListEditor items={members} onChange={onChange} addLabel="Ajouter un membre" createItem={() => ({ id: `team-${Date.now()}`, name: "", role: "Conseiller voyage", imageAssetId: "", imageUrl: "", imageAlt: "", bio: "" })}>{({ item, update }) => { const selectedAsset = item.imageAssetId ? assets.find((asset) => asset.id === item.imageAssetId) || null : null; const previewUrl = item.imageUrl || selectedAsset?.url || ""; return <>{previewUrl ? <img className={styles.editorThumbnail} src={previewUrl} alt={item.imageAlt || item.name || "Membre de l'équipe"} /> : null}<Field label="Nom" value={item.name} onChange={(name) => update({ ...item, name })} /><Field label="Fonction" value={item.role} onChange={(role) => update({ ...item, role })} /><MediaPicker assets={assets} loading={loading} selectedAssetId={item.imageAssetId || ""} onSelect={(asset) => update({ ...item, imageAssetId: asset.id, imageAlt: item.imageAlt || asset.altText || (item.name ? `Portrait de ${item.name}` : "") })} onClear={() => { const { imageAssetId: _a, imageUrl: _b, __mediaSource: _c, __mediaVersion: _d, ...rest } = item; update(rest); }} /><Field label="Texte alternatif de la photo" value={item.imageAlt} onChange={(imageAlt) => update({ ...item, imageAlt })} /><details><summary>URL de photo héritée</summary><Field label="URL de la photo" value={item.imageUrl} onChange={(imageUrl) => update({ ...item, imageUrl })} /></details><Field label="Présentation" value={item.bio} multiline onChange={(bio) => update({ ...item, bio })} /></>; }}</ListEditor>; }
export function StringListEditor({ items, onChange, label, addLabel }) { return <ListEditor items={(items || []).map((value) => ({ value }))} onChange={(nextItems) => onChange(nextItems.map((item) => item.value))} addLabel={addLabel} createItem={() => ({ value: "" })}>{({ item, update }) => <Field label={label} value={item.value} onChange={(value) => update({ value })} />}</ListEditor>; }