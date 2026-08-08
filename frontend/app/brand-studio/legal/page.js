import LegalProfileManager from "../../../components/brand-studio/LegalProfileManager";

export const metadata = {
  title:
    "Profil juridique | Brand Studio Mondescale",

  description:
    "Gestion des mentions légales et politiques de confidentialité des mini-sites Mondescale.",
};

export default function BrandStudioLegalPage() {
  return (
    <LegalProfileManager
      initialAgencyId={6}
    />
  );
}
