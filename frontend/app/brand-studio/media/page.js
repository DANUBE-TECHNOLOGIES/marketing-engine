import BrandMediaManager from "../../../components/brand-studio/BrandMediaManager";

export const metadata = {
  title:
    "Médias Brand Studio | Mondescale",

  description:
    "Gestion des logos, favicons et visuels des mini-sites Mondescale.",
};

export default function BrandStudioMediaPage() {
  return (
    <BrandMediaManager
      initialAgencyId={6}
    />
  );
}
