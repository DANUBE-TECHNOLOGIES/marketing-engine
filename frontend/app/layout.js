import "./globals.css";

export const metadata = {
  title: "Mondescale Local Engine",
  description: "Outil SEO local Mondescale"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <nav className="bg-gray-900 text-white shadow">
          <div className="max-w-7xl mx-auto px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <a href="/" className="font-bold text-lg">
              Mondescale Local Engine
            </a>

            <div className="flex flex-wrap gap-4 text-sm">
              <a href="/" className="hover:underline">Dashboard</a>
              <a href="/actions" className="hover:underline">Actions</a>
              <a href="/agencies" className="hover:underline">Agences</a>
              <a href="/directories" className="hover:underline">Annuaires</a>
<a href="/reviews" className="hover:underline">Avis Google</a>
<a href="/review-requests" className="hover:underline">Demandes avis</a>
              <a href="/progress" className="hover:underline">Progression</a>
<a href="/direction" className="hover:underline">Direction</a>
<a href="/notifications" className="hover:underline">Notifications</a>
<a href="/google-posts" className="hover:underline">Google Posts</a>
              <a href="/system" className="hover:underline">Système</a>
            </div>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
