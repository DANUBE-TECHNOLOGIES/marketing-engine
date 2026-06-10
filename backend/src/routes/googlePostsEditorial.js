const express = require("express");

const editorialAngles = [
  {
    key: "conseil",
    label: "Conseil voyage",
    titles: [
      "Bien préparer son prochain voyage avec une agence locale",
      "Pourquoi anticiper ses vacances avec un conseiller voyage ?",
      "Voyager sereinement grâce à un accompagnement professionnel"
    ]
  },
  {
    key: "destination",
    label: "Destination",
    titles: [
      "Une envie d’évasion pour vos prochaines vacances ?",
      "Inspirez-vous pour votre prochain départ",
      "Et si votre prochain voyage commençait maintenant ?"
    ]
  },
  {
    key: "croisiere",
    label: "Croisière",
    titles: [
      "Croisière : une autre façon de découvrir le monde",
      "Envie de partir en croisière ?",
      "Cap sur une expérience de voyage différente"
    ]
  },
  {
    key: "surmesure",
    label: "Voyage sur mesure",
    titles: [
      "Un voyage créé autour de vos envies",
      "Votre projet mérite un accompagnement sur mesure",
      "Construisons ensemble un voyage qui vous ressemble"
    ]
  },
  {
    key: "avis",
    label: "Avis client",
    titles: [
      "Vos retours nous aident à progresser",
      "Merci à nos voyageurs pour leur confiance",
      "Votre expérience compte pour notre agence"
    ]
  },
  {
    key: "equipe",
    label: "Équipe agence",
    titles: [
      "Une équipe locale à votre écoute",
      "Des conseillères voyage proches de vous",
      "Votre agence de voyages vous accompagne"
    ]
  },
  {
    key: "securite",
    label: "Sécurité",
    titles: [
      "Partir accompagné, c’est voyager plus sereinement",
      "Un imprévu avant ou pendant le voyage ?",
      "Pourquoi réserver avec une agence de voyages ?"
    ]
  },
  {
    key: "offre",
    label: "Offre commerciale",
    titles: [
      "Des idées de séjours à étudier en agence",
      "Votre prochain départ se prépare dès maintenant",
      "Vacances, circuits, croisières : parlons de votre projet"
    ]
  }
];

function pick(list, index) {
  return list[index % list.length];
}

function buildPostContent({ agency, angle, index }) {
  const city = agency.city || "votre ville";
  const agencyName = agency.name || "votre agence de voyages";

  const openers = [
    `À ${city}, votre agence ${agencyName} vous accompagne dans la préparation de vos prochains voyages.`,
    `Vous avez un projet de voyage au départ de ${city} ou de votre région ? Notre équipe est là pour vous conseiller.`,
    `Chaque projet de voyage mérite une attention particulière. Votre agence ${agencyName} vous aide à faire les bons choix.`
  ];

  const bodies = {
    conseil: [
      "Choix de la destination, budget, formalités, assurances, horaires, prestations : un conseiller voyage vous aide à comparer les solutions et à réserver avec davantage de sérénité.",
      "Préparer un séjour ne se limite pas à trouver un prix. L’accompagnement humain permet d’éviter les mauvaises surprises et de bénéficier d’un vrai suivi.",
      "Notre rôle est de vous aider à construire un voyage clair, adapté et sécurisé, avec un interlocuteur disponible avant, pendant et après le départ."
    ],
    destination: [
      "Séjour soleil, city break, circuit culturel, voyage en famille ou escapade à deux : nous vous aidons à trouver la destination adaptée à vos envies.",
      "Besoin d’inspiration ? Venez échanger avec notre équipe pour comparer les destinations, les périodes idéales et les formules les plus pertinentes.",
      "Votre prochain voyage peut prendre plusieurs formes : détente, découverte, aventure, croisière ou séjour tout compris. Parlons-en ensemble."
    ],
    croisiere: [
      "La croisière permet de découvrir plusieurs destinations tout en profitant d’un confort à bord. Notre équipe vous aide à choisir l’itinéraire, la compagnie et la cabine adaptés.",
      "Méditerranée, Caraïbes, Europe du Nord ou fleuves : les croisières offrent des expériences variées pour les couples, les familles ou les groupes.",
      "Une croisière se prépare avec attention : itinéraire, escales, pension, animations, excursions. Votre agence vous accompagne dans ces choix."
    ],
    surmesure: [
      "Un voyage sur mesure permet de construire un itinéraire adapté à votre rythme, à vos envies et à votre budget.",
      "Vous souhaitez sortir des formules classiques ? Notre équipe peut étudier un projet personnalisé, étape par étape.",
      "Circuit privé, extension balnéaire, combiné de destinations, voyage de noces ou séjour haut de gamme : parlons de votre projet."
    ],
    avis: [
      "Les avis de nos voyageurs sont précieux. Ils permettent à d’autres clients de choisir leur agence avec confiance.",
      "Merci à toutes celles et ceux qui prennent le temps de partager leur expérience après leur retour de voyage.",
      "Vos retours nous aident à améliorer notre accompagnement et à valoriser le travail de nos conseillères voyage."
    ],
    equipe: [
      "Notre équipe locale prend le temps d’écouter votre projet pour vous proposer des solutions adaptées.",
      "Derrière chaque réservation, il y a un accompagnement humain, des conseils et un suivi personnalisé.",
      "Votre agence reste disponible pour répondre à vos questions, comparer les offres et sécuriser votre départ."
    ],
    securite: [
      "Réserver avec une agence, c’est bénéficier d’un accompagnement en cas d’imprévu et d’un interlocuteur identifié.",
      "Formalités, conditions d’entrée, assurances, modifications ou assistance : notre équipe vous aide à voyager avec plus de sérénité.",
      "Un voyage bien préparé est souvent un voyage plus serein. Votre agence vous accompagne dans les points importants avant le départ."
    ],
    offre: [
      "Séjours, circuits, clubs vacances, croisières ou voyages personnalisés : nous pouvons étudier plusieurs solutions selon vos envies.",
      "Certaines offres évoluent rapidement selon les disponibilités, les dates de départ et les conditions tarifaires. Venez en parler en agence.",
      "Notre équipe peut comparer les propositions de plusieurs voyagistes afin de vous aider à choisir la formule la plus adaptée."
    ]
  };

  const closers = [
    `Contactez votre agence à ${city} pour échanger sur votre prochain projet.`,
    `Passez en agence ou contactez-nous pour préparer votre prochain voyage.`,
    `Notre équipe reste à votre écoute pour vous accompagner dans vos prochaines envies d’évasion.`
  ];

  return [
    pick(openers, index),
    "",
    pick(bodies[angle.key] || bodies.conseil, index),
    "",
    pick(closers, index)
  ].join("\n");
}

module.exports = function createGooglePostsEditorialRoutes(prisma) {
  const router = express.Router();

  router.get("/google-posts/editorial-angles", async (req, res) => {
    res.json({
      total: editorialAngles.length,
      angles: editorialAngles.map((angle) => ({
        key: angle.key,
        label: angle.label
      }))
    });
  });

  router.post("/google-posts/generate-editorial-calendar", async (req, res) => {
    try {
      const weeks = Number(req.body.weeks || 4);
      const replaceExisting = Boolean(req.body.replaceExisting || false);

      const agencies = await prisma.agency.findMany({
        orderBy: { city: "asc" }
      });

      const created = [];
      const skipped = [];

      for (let agencyIndex = 0; agencyIndex < agencies.length; agencyIndex++) {
        const agency = agencies[agencyIndex];

        let postsPerWeek = 1;

        if (agency.seoLevel === "RENFORCEMENT") postsPerWeek = 2;
        if (agency.seoLevel === "OFFENSIVE") postsPerWeek = 3;
        if (agency.seoLevel === "CRITIQUE") postsPerWeek = 3;

        const totalPosts = weeks * postsPerWeek;

        const existing = await prisma.googlePost.count({
          where: {
            agencyId: agency.id,
            status: {
              in: ["draft", "planned", "approved"]
            }
          }
        });

        if (!replaceExisting && existing >= totalPosts) {
          skipped.push({
            agencyId: agency.id,
            agencyName: agency.name,
            city: agency.city,
            reason: "enough_existing_posts",
            existing,
            target: totalPosts
          });
          continue;
        }

        const missing = replaceExisting ? totalPosts : Math.max(0, totalPosts - existing);

        for (let i = 0; i < missing; i++) {
          const angleIndex = agencyIndex + i;
          const angle = pick(editorialAngles, angleIndex);

          const titleBase = pick(angle.titles, agencyIndex + i);

          const plannedAt = new Date(
            Date.now() +
            (2 + i * Math.max(2, Math.floor(7 / postsPerWeek)) + agencyIndex) *
            24 * 60 * 60 * 1000
          );

          const post = await prisma.googlePost.create({
            data: {
              agencyId: agency.id,
              title: `${titleBase} - ${agency.city}`,
              content: buildPostContent({
                agency,
                angle,
                index: agencyIndex + i
              }),
              ctaLabel: "Demander un devis",
              ctaUrl: agency.website || null,
              status: "draft",
              plannedAt
            },
            include: { agency: true }
          });

          created.push({
            id: post.id,
            agencyId: agency.id,
            agencyName: agency.name,
            city: agency.city,
            seoLevel: agency.seoLevel,
            angle: angle.label,
            plannedAt
          });
        }
      }

      res.json({
        weeks,
        created: created.length,
        skipped: skipped.length,
        posts: created,
        skippedAgencies: skipped
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
