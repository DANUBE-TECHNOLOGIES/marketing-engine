const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.agency.createMany({
    data: [
      {
        name: "Ambassade FRAM - Mondescale Maurepas",
        city: "Maurepas",
        address: "6 place du sancerrois",
        postalCode: "78310",
        phone: "01 30 51 90 36",
        email: "maurepas@mondescale.com",
        website: "https://maurepas.mondescale.com/bienvenue-sur-le-site-de-votre-agence-de-voyage?utm_source=gmb"
      },
      {
        name: "Ambassade FRAM - Mondescale Nevers",
        city: "Nevers",
        address: "C.C Carré Colbert - 7 Rue etienne Litaud",
        postalCode: "58000",
        phone: "02 46 66 01 21",
        email: "nevers@mondescale.com",
        website: "https://nevers.mondescale.com/?utm_source=gmb"
      },
 {
        name: "Ambassade FRAM - Mondescale Dax",
        city: "Dax",
        address: "7 bis avenue eugéne Milliès Lacroix",
        postalCode: "40100",
        phone: "05 33 52 03 32",
        email: "dax@mondescale.com",
        website: "https://dax.mondescale.com/?utm_source=gmb"
      },
{
        name: "Ambassade FRAM - Mondescale Gien",
        city: "Gien",
        address: "12 Rue Gambetta",
        postalCode: "45500",
        phone: "09 73 03 72 20",
        email: "gien@mondescale.com",
        website: "https://gien.mondescale.com/bienvenue-sur-le-site-de-votre-agence-de-voyage?utm_source=gmb"
      },
 {
        name: "Ambassade FRAM - Mondescale Ozoir la Ferrière",
        city: "Ozoir la Ferrière",
        address: "61 Avenue du Général de Gaulle",
        postalCode: "77330",
        phone: "01 84 67 26 94",
        email: "ozoir@mondescale.com",
        website: "https://ozoir-la-ferriere.mondescale.com/?utm_source=gmb"
      },
{
        name: "Ambassade FRAM - Mondescale Bois-Colombes",
        city: "Bois-Colombes",
        address: "41 Rue des Bourguignons",
        postalCode: "92700",
        phone: "01 42 42 31 31",
        email: "boiscolombes@mondescale.com",
        website: "https://www.bois-colombes.mondescale.com/?utm_source=gmb"
      },
{
        name: "Mondescale Lamorlaye",
        city: "Lamorlaye",
        address: "29 avenue de la libération",
        postalCode: "60260",
        phone: "03 44 21 59 98",
        email: "lamorlaye@mondescale.com",
        website: "https://www.lamorlaye.mondescale.com/?utm_source=gmb"
      },
      {
        name: "TUI STORE Melun",
        city: "Melun",
        address: "10 Rue Saint Etienne",
        postalCode: "77000",
        phone: "01 64 39 31 07",
        email: "agencemelun@tuifrance.com",        website: "https://www.tui.fr"
      }
    ],
    skipDuplicates: true
  });

  await prisma.localDirectory.createMany({
    data: [
      // Niveau 1 — Critique
      { name: "Google Business Profile", website: "https://business.google.com", category: "critical", impactScore: 5, difficulty: 1, priority: 1 },
      { name: "Pages Jaunes", website: "https://www.pagesjaunes.fr", category: "general", impactScore: 5, difficulty: 2, priority: 1 },
      { name: "Apple Plans", website: "https://mapsconnect.apple.com", category: "map", impactScore: 5, difficulty: 2, priority: 1 },
      { name: "Bing Places", website: "https://www.bingplaces.com", category: "map", impactScore: 4, difficulty: 2, priority: 1 },
      { name: "Facebook", website: "https://www.facebook.com", category: "social", impactScore: 4, difficulty: 1, priority: 1 },

      // Niveau 2 — Très importants
      { name: "Tripadvisor", website: "https://www.tripadvisor.fr", category: "tourisme", impactScore: 4, difficulty: 3, priority: 2 },
      { name: "Petit Futé", website: "https://www.petitfute.com", category: "tourisme", impactScore: 4, difficulty: 3, priority: 2 },
      { name: "Yelp", website: "https://www.yelp.fr", category: "general", impactScore: 3, difficulty: 2, priority: 2 },
      { name: "118000", website: "https://www.118000.fr", category: "general", impactScore: 3, difficulty: 2, priority: 2 },
      { name: "Hoodspot", website: "https://hoodspot.fr", category: "seo", impactScore: 3, difficulty: 2, priority: 2 },
      { name: "Cylex", website: "https://www.cylex-locale.fr", category: "seo", impactScore: 3, difficulty: 2, priority: 2 },
      { name: "Justacoté", website: "https://www.justacote.com", category: "general", impactScore: 3, difficulty: 2, priority: 2 },

      // Niveau 3 — Citations SEO
      { name: "Kompass", website: "https://fr.kompass.com", category: "seo", impactScore: 3, difficulty: 3, priority: 3 },
      { name: "Europages", website: "https://www.europages.fr", category: "seo", impactScore: 3, difficulty: 3, priority: 3 },
      { name: "Annuaire.com", website: "https://www.annuaire.com", category: "seo", impactScore: 2, difficulty: 2, priority: 3 },
      { name: "Indexa", website: "https://www.indexa.fr", category: "seo", impactScore: 2, difficulty: 2, priority: 3 },
      { name: "Hotfrog", website: "https://www.hotfrog.fr", category: "seo", impactScore: 2, difficulty: 2, priority: 3 },
      { name: "118218", website: "https://www.118218.fr", category: "general", impactScore: 2, difficulty: 2, priority: 3 },

      // Niveau 4 — Réseaux sociaux / image
      { name: "Instagram", website: "https://www.instagram.com", category: "social", impactScore: 3, difficulty: 1, priority: 3 },
      { name: "LinkedIn", website: "https://www.linkedin.com", category: "social", impactScore: 3, difficulty: 1, priority: 3 },

      // Niveau 5 — Tourisme / local
      { name: "Office de Tourisme local", website: "https://www.france.fr", category: "tourisme", impactScore: 5, difficulty: 4, priority: 2 },
      { name: "Atout France", website: "https://www.atout-france.fr", category: "tourisme", impactScore: 5, difficulty: 4, priority: 2 },
      { name: "France Voyage", website: "https://www.france-voyage.com", category: "tourisme", impactScore: 3, difficulty: 3, priority: 3 },
      { name: "Cityvox", website: "https://www.cityvox.fr", category: "general", impactScore: 2, difficulty: 3, priority: 4 },
      { name: "Guide du Routard", website: "https://www.routard.com", category: "tourisme", impactScore: 3, difficulty: 4, priority: 4 }
    ],
    skipDuplicates: true
  });

  console.log("Données agences et annuaires ajoutées");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
