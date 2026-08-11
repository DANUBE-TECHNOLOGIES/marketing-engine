const API_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:4000';

const TENANT_SLUG = String(
  process.env.TENANT_SLUG ||
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  'mondescale'
).trim();

export class PublicDestinationNotFoundError extends Error {
  constructor(siteSlug, destinationSlug) {
    super(`Destination publique introuvable: ${siteSlug}/${destinationSlug}`);
    this.name = 'PublicDestinationNotFoundError';
  }
}

export async function getPublicDestination(siteSlug, destinationSlug) {
  const url = `${API_URL}/public/agency-sites/${encodeURIComponent(siteSlug)}/destinations/${encodeURIComponent(destinationSlug)}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        'x-tenant-slug': TENANT_SLUG,
      },
    });

    if (response.status === 404) {
      throw new PublicDestinationNotFoundError(siteSlug, destinationSlug);
    }

    if (!response.ok) {
      throw new Error(
        `Destination API returned ${response.status} for ${siteSlug}/${destinationSlug}`
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof PublicDestinationNotFoundError) {
      throw error;
    }

    console.error('Destination API unavailable:', error?.message || error);
    throw error;
  }
}
