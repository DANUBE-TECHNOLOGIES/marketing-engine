import { notFound } from 'next/navigation';
import DestinationPage from '../../../../../components/destination/DestinationPage';
import { getPublicDestination } from '../../../../../lib/destination-api';
export async function generateMetadata({ params }) {
  const p = await params;
  const data = await getPublicDestination(p.siteSlug, p.destinationSlug);
  if (!data) return {};
  const d = data.destination;
  return {
    title: d.seoTitle || `Voyage à ${d.name} | ${data.site.name}`,
    description: d.seoDescription || d.summary,
    alternates: { canonical: data.canonicalPath },
    openGraph: { title: d.seoTitle || d.name, description: d.seoDescription || d.summary, images: d.heroImageUrl ? [d.heroImageUrl] : [] }
  };
}
export default async function Page({ params }) {
  const p = await params;
  const data = await getPublicDestination(p.siteSlug, p.destinationSlug);
  if (!data) notFound();
  return <DestinationPage data={data} />;
}
