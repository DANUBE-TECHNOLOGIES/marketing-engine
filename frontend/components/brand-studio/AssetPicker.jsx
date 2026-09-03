"use client";

import React, {
  useState,
} from "react";

import {
  AssetLibrary,
} from "./AssetLibrary.jsx";

import {
  AssetUploader,
} from "./AssetUploader.jsx";

export function AssetPicker({
  tenantId,
  tenantSlug,
  agencyId,
  kind,
  baseUrl = "",
  value,
  onChange,
}) {
  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  return (
    <div className="brand-studio-asset-picker">
      <AssetUploader
        tenantId={
          tenantId
        }
        tenantSlug={
          tenantSlug
        }
        agencyId={
          agencyId
        }
        kind={kind}
        baseUrl={
          baseUrl
        }
        onUploaded={
          (asset) => {
            setRefreshKey(
              (current) =>
                current + 1
            );

            onChange?.(
              asset.id,
              asset
            );
          }
        }
      />

      <AssetLibrary
        tenantId={
          tenantId
        }
        tenantSlug={
          tenantSlug
        }
        agencyId={
          agencyId
        }
        kind={kind}
        baseUrl={
          baseUrl
        }
        selectedId={
          value
        }
        refreshKey={
          refreshKey
        }
        onSelect={
          (asset) =>
            onChange?.(
              asset.id,
              asset
            )
        }
      />
    </div>
  );
}
