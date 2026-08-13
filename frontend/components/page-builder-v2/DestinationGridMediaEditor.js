"use client";

import MediaPicker from "./MediaPicker";

function itemLabel(item, index) {
  return (
    item?.title ||
    item?.name ||
    item?.slug ||
    `Destination ${index + 1}`
  );
}

export default function DestinationGridMediaEditor({
  items = [],
  assets = [],
  loading = false,
  onChange,
}) {
  const updateItem = (index, updater) => {
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index
          ? updater({ ...(item || {}) })
          : item
      )
    );
  };

  if (!items.length) {
    return (
      <p>
        Aucune destination disponible dans ce bloc.
      </p>
    );
  }

  return (
    <div>
      {items.map((item, index) => (
        <details
          key={
            item?.id ||
            item?.slug ||
            `${itemLabel(item, index)}-${index}`
          }
          open={index === 0}
        >
          <summary>
            {itemLabel(item, index)}
          </summary>

          <MediaPicker
            assets={assets}
            loading={loading}
            selectedAssetId={
              item?.imageAssetId || ""
            }
            onSelect={(asset) =>
              updateItem(index, (current) => ({
                ...current,

                imageAssetId: asset.id,

                imageAlt:
                  current.imageAlt ||
                  asset.altText ||
                  current.title ||
                  current.name ||
                  "",
              }))
            }
            onClear={() =>
              updateItem(index, (current) => {
                const {
                  imageAssetId: _imageAssetId,
                  imageUrl: _imageUrl,
                  imageAlt: _imageAlt,
                  __mediaSource: _mediaSource,
                  __mediaVersion: _mediaVersion,
                  ...rest
                } = current;

                return rest;
              })
            }
          />
        </details>
      ))}
    </div>
  );
}
