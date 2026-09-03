"use client";

import React, {
  useMemo,
  useState,
} from "react";

import {
  ALLOWED_BRAND_ASSET_MIME_TYPES,
  BRAND_ASSET_KIND_LABELS,
  uploadBrandAsset,
  validateBrandAssetFile,
} from "../../lib/brand-studio/index.js";

export function AssetUploader({
  tenantId,
  tenantSlug,
  agencyId,
  kind,
  baseUrl = "",
  onUploaded,
}) {
  const [
    file,
    setFile,
  ] = useState(null);

  const [
    altText,
    setAltText,
  ] = useState("");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const accept =
    useMemo(
      () =>
        ALLOWED_BRAND_ASSET_MIME_TYPES.join(
          ","
        ),
      []
    );

  async function submit(
    event
  ) {
    event.preventDefault();

    const errors =
      validateBrandAssetFile(
        file
      );

    if (errors.length) {
      setError(
        errors[0].message
      );

      return;
    }

    setUploading(true);
    setError("");

    try {
      const result =
        await uploadBrandAsset({
          tenantId,
          tenantSlug,
          agencyId,
          kind,
          file,
          altText,
          baseUrl,
        });

      setFile(null);
      setAltText("");

      onUploaded?.(
        result.asset
      );
    } catch (uploadError) {
      setError(
        uploadError.message
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="brand-studio-asset-uploader"
    >
      <h3>
        Ajouter :{" "}
        {BRAND_ASSET_KIND_LABELS[
          kind
        ] || kind}
      </h3>

      <label>
        Fichier
        <input
          type="file"
          accept={accept}
          onChange={
            (event) => {
              setFile(
                event.target
                  .files?.[0] ||
                null
              );

              setError("");
            }
          }
        />
      </label>

      <label>
        Texte alternatif
        <input
          type="text"
          value={altText}
          maxLength={180}
          onChange={
            (event) =>
              setAltText(
                event.target.value
              )
          }
        />
      </label>

      {error ? (
        <p role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={
          uploading ||
          !file
        }
      >
        {uploading
          ? "Envoi en cours…"
          : "Déposer le fichier"}
      </button>
    </form>
  );
}
