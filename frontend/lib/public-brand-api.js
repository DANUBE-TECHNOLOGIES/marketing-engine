const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

export async function getPublicBrandTheme() {
  const response = await fetch(
    `${BACKEND_URL}/public/brands/${encodeURIComponent(
      TENANT_SLUG
    )}/theme`,
    {
      headers: {
        accept: "application/json",
      },

      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/*
 * Brand Studio V2 — Runtime public Brand + Legal.
 *
 * Conservé dans ce module afin que les renderers historiques puissent
 * progressivement adopter le nouveau contrat sans connaître Prisma.
 */
export {
  fetchPublicBrandLegalRuntime,
  mergePublicMetadata,
  resolveLegalPageHtml,
  runtimeBrandAssets,
  runtimeCssVariables,
  runtimeLegalPages,
  runtimeMetadata,
} from "./public-brand-legal-runtime.js";
