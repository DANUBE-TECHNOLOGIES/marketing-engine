import SeoWorkQueueClient from "./SeoWorkQueueClient";

export const metadata = {
  title: "File de travail SEO · Marketing Engine",
  robots: { index: false, follow: false },
};

export default function SeoWorkQueuePage() {
  return <SeoWorkQueueClient />;
}
