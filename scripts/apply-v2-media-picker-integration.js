#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const target = path.resolve(
  process.cwd(),
  "frontend/components/page-builder-v2/VisualPageBuilder.js"
);

let source = fs.readFileSync(target, "utf8");

function replaceOnce(label, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: attendu 1 occurrence, trouvé ${count}.`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  "import MediaPicker",
  'import styles from "./VisualPageBuilder.module.css";\nimport PreviewCanvas from "./PreviewCanvas";',
  'import styles from "./VisualPageBuilder.module.css";\nimport PreviewCanvas from "./PreviewCanvas";\nimport MediaPicker from "./MediaPicker";'
);

replaceOnce(
  "import media API",
  'import {\n  fetchPageDetails,\n  fetchSite,\n  savePage,\n} from "../../lib/page-builder-v2/page-builder-api";',
  'import {\n  fetchPageDetails,\n  fetchSite,\n  savePage,\n} from "../../lib/page-builder-v2/page-builder-api";\n\nimport {\n  fetchPublishedMediaImages,\n} from "../../lib/page-builder-v2/media-library-api";'
);

replaceOnce(
  "BlockPreview signature",
  'function BlockPreview({ block }) {\n  const content = block.content || {};',
  'function BlockPreview({ block, mediaAssetsById = {} }) {\n  const content = block.content || {};\n  const mediaAsset = content.imageAssetId\n    ? mediaAssetsById[content.imageAssetId] || null\n    : null;\n  const previewUrl = content.imageUrl || mediaAsset?.url || "";'
);

replaceOnce(
  "Hero preview URL",
  '            content.imageUrl\n              ? {\n                  backgroundImage:\n                    `linear-gradient(90deg, rgba(10,20,35,.74), rgba(10,20,35,.25)), url("${content.imageUrl}")`,',
  '            previewUrl\n              ? {\n                  backgroundImage:\n                    `linear-gradient(90deg, rgba(10,20,35,.74), rgba(10,20,35,.25)), url("${previewUrl}")`,'
);

replaceOnce(
  "ImageText preview URL",
  '            {content.imageUrl ? (\n              // eslint-disable-next-line @next/next/no-img-element\n              <img\n                src={content.imageUrl}',
  '            {previewUrl ? (\n              // eslint-disable-next-line @next/next/no-img-element\n              <img\n                src={previewUrl}'
);

replaceOnce(
  "BlockProperties signature",
  'function BlockProperties({\n  block,\n  onContentChange,\n  onStatusChange,\n}) {',
  'function BlockProperties({\n  block,\n  onContentChange,\n  onStatusChange,\n  mediaAssets = [],\n  mediaLoading = false,\n}) {'
);

const oldImageEditor = `      {"imageUrl" in content ? (\n        <>\n          <TextInput\n            label="URL de l’image"\n            value={content.imageUrl}\n            onChange={(value) => set("imageUrl", value)}\n          />\n\n          <TextInput\n            label="Texte alternatif"\n            value={content.imageAlt}\n            onChange={(value) => set("imageAlt", value)}\n          />\n        </>\n      ) : null}`;

const newImageEditor = `      {"imageUrl" in content ? (\n        block.type === "hero" ? (\n          <>\n            <MediaPicker\n              assets={mediaAssets}\n              loading={mediaLoading}\n              selectedAssetId={content.imageAssetId || ""}\n              onSelect={(asset) =>\n                onContentChange({\n                  ...content,\n                  imageAssetId: asset.id,\n                  imageAlt:\n                    content.imageAlt ||\n                    asset.altText ||\n                    "",\n                })\n              }\n              onClear={() => {\n                const { imageAssetId: _removed, ...rest } = content;\n                onContentChange(rest);\n              }}\n            />\n\n            <TextInput\n              label="Texte alternatif"\n              value={content.imageAlt}\n              onChange={(value) => set("imageAlt", value)}\n            />\n\n            <details>\n              <summary>URL d’image héritée</summary>\n              <TextInput\n                label="URL de l’image"\n                value={content.imageUrl}\n                onChange={(value) => set("imageUrl", value)}\n              />\n            </details>\n          </>\n        ) : (\n          <>\n            <TextInput\n              label="URL de l’image"\n              value={content.imageUrl}\n              onChange={(value) => set("imageUrl", value)}\n            />\n\n            <TextInput\n              label="Texte alternatif"\n              value={content.imageAlt}\n              onChange={(value) => set("imageAlt", value)}\n            />\n          </>\n        )\n      ) : null}`;

replaceOnce("Hero media editor", oldImageEditor, newImageEditor);

replaceOnce(
  "media state",
  '  const [loading, setLoading] = useState(true);\n  const [loadingPage, setLoadingPage] = useState(false);\n  const [saving, setSaving] = useState(false);',
  '  const [loading, setLoading] = useState(true);\n  const [loadingPage, setLoadingPage] = useState(false);\n  const [saving, setSaving] = useState(false);\n  const [mediaAssets, setMediaAssets] = useState([]);\n  const [mediaLoading, setMediaLoading] = useState(true);'
);

replaceOnce(
  "media memo and effect insertion",
  '  const selectedBlock = useMemo(\n    () =>\n      activePage?.blocks.find(\n        (block) => block.id === selectedBlockId\n      ) || null,\n    [activePage, selectedBlockId]\n  );\n\n  const pushHistory = useCallback((currentSite) => {',
  '  const selectedBlock = useMemo(\n    () =>\n      activePage?.blocks.find(\n        (block) => block.id === selectedBlockId\n      ) || null,\n    [activePage, selectedBlockId]\n  );\n\n  const mediaAssetsById = useMemo(\n    () =>\n      Object.fromEntries(\n        mediaAssets.map((asset) => [asset.id, asset])\n      ),\n    [mediaAssets]\n  );\n\n  useEffect(() => {\n    let cancelled = false;\n\n    async function loadMedia() {\n      setMediaLoading(true);\n      try {\n        const items = await fetchPublishedMediaImages();\n        if (!cancelled) setMediaAssets(items);\n      } catch (mediaError) {\n        if (!cancelled) {\n          setError((current) =>\n            current ||\n            mediaError?.message ||\n            "Impossible de charger la médiathèque."\n          );\n        }\n      } finally {\n        if (!cancelled) setMediaLoading(false);\n      }\n    }\n\n    loadMedia();\n    return () => {\n      cancelled = true;\n    };\n  }, []);\n\n  const pushHistory = useCallback((currentSite) => {'
);

replaceOnce(
  "BlockPreview props",
  '                          <BlockPreview block={block} />',
  '                          <BlockPreview\n                            block={block}\n                            mediaAssetsById={mediaAssetsById}\n                          />'
);

replaceOnce(
  "BlockProperties props",
  '          <BlockProperties\n            block={selectedBlock}\n            onContentChange={(content) =>',
  '          <BlockProperties\n            block={selectedBlock}\n            mediaAssets={mediaAssets}\n            mediaLoading={mediaLoading}\n            onContentChange={(content) =>'
);

fs.writeFileSync(target, source);
console.log(`Patch appliqué : ${target}`);
