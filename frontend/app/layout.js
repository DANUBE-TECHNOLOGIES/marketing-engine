import { Suspense } from "react";
import AdminEngineNav from "../components/AdminEngineNav";
import { getPublicSiteUrl } from "../lib/seo/site-url";
import AcquisitionAnalyticsBridge from "./components/AcquisitionAnalyticsBridge";
import "./globals.css";

export const metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: "Mondescale Local Engine",
  description: "Outil SEO local Mondescale"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AdminEngineNav />
        <Suspense fallback={null}><AcquisitionAnalyticsBridge /></Suspense>
        {children}
      </body>
    </html>
  );
}
