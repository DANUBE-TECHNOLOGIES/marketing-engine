const API_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:4000';

const TENANT_SLUG = String(
  process.env.TENANT_SLUG ||
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  'mondescale'
).trim();

export async function getPublicDestination(siteSlug, destinationSlug) {
  try {
    const response = await fetch(
      `${API_URL}/public/agency-sites/${encodeURIComponent(siteSlug)}/destinations/${encodeURIComponent(destinationSlug)}`,
      {
        cache: 'no-store',
        headers: {
          accept: 'application/json',
          'x-tenant-slug': TENANT_SLUG,
        },
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Destination API unavailable:', error?.message || error);
    return null;
  }
}
