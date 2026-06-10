const express = require("express");

const themes = [
  {
    key: "agence de voyage",
    titles: [
      "Pourquoi réserver avec une agence de voyage à {CITY} ?",
      "Agence locale ou réservation seule : que choisir pour vos vacances ?",
      "Préparer son voyage avec un conseiller à {CITY}",
      "Ce qu’une agence de voyage peut changer dans votre projet",
      "Voyage organisé : l’intérêt d’un accompagnement professionnel"
    ],
    bodies: [
      "Comparer des prix ne suffit pas toujours à préparer un voyage sereinement. Une agence vous aide à comprendre les prestations, les conditions, les formalités et les garanties associées à votre réservation.",
      "Un conseiller voyage peut vous aider à éviter les erreurs fréquentes : mauvais aéroport, durée d’escale trop courte, hébergement mal situé ou conditions d’annulation mal comprises.",
      "L’accompagnement humain reste précieux lorsque le voyage comporte plusieurs étapes, des formalités particulières ou un budget important.",
      "Notre rôle est de transformer une idée de départ en projet clair : destination, dates, budget, transport, hébergement et services complémentaires.",
      "Réserver avec une agence locale, c’est bénéficier d’un interlocuteur identifié avant, pendant et après le départ."
    ]
  },
  {
    key: "voyage sur mesure",
    titles: [
      "Créer un voyage sur mesure depuis {CITY}",
      "Un itinéraire personnalisé pour un voyage qui vous ressemble",
      "Voyage privé, combiné ou circuit : construisons votre projet",
      "Sortir des séjours classiques avec un voyage personnalisé",
      "Comment préparer un voyage sur mesure sans mauvaise surprise ?"
    ],
    bodies: [
      "Un voyage sur mesure permet d’adapter le rythme, les étapes et les prestations à vos envies réelles plutôt qu’à un programme standard.",
      "Circuit privé, extension balnéaire, voyage de noces, safari, city break prolongé ou combiné de destinations : chaque projet mérite une construction spécifique.",
      "Notre équipe peut comparer les possibilités, vérifier la cohérence de l’itinéraire et vous aider à équilibrer confort, budget et temps disponible.",
      "Le sur-mesure est particulièrement adapté lorsque vous souhaitez voyager autrement, éviter les parcours trop rapides ou ajouter des expériences spécifiques.",
      "Un projet personnalisé demande méthode et anticipation : choix des étapes, transports internes, formalités, assurances et conditions de modification."
    ]
  },
  {
    key: "croisière",
    titles: [
      "Comment bien choisir sa prochaine croisière ?",
      "Croisière en Méditerranée, Caraïbes ou Europe du Nord : comment comparer ?",
      "Cabine, itinéraire, escales : les points clés d’une croisière réussie",
      "Pourquoi la croisière séduit de plus en plus de voyageurs ?",
      "Préparer une croisière avec l’aide de votre agence"
    ],
    bodies: [
      "Une croisière ne se choisit pas uniquement sur le prix. L’itinéraire, la compagnie, le type de cabine, les escales et les services à bord changent fortement l’expérience.",
      "Entre Méditerranée, Caraïbes, fjords, Canaries ou croisières fluviales, les ambiances et les saisons idéales ne sont pas les mêmes.",
      "Notre équipe vous aide à comparer les compagnies, comprendre les formules de pension, les forfaits boissons, les excursions et les conditions d’embarquement.",
      "La croisière peut convenir aux couples, familles, groupes d’amis ou voyageurs qui souhaitent découvrir plusieurs destinations sans changer d’hôtel.",
      "Un accompagnement professionnel permet d’éviter les erreurs classiques : cabine mal placée, itinéraire peu adapté ou frais complémentaires mal anticipés."
    ]
  },
  {
    key: "vacances",
    titles: [
      "Préparer ses vacances sans stress : les bons réflexes",
      "Vacances en famille : comment choisir la bonne formule ?",
      "Club, circuit, séjour ou location : quelle formule pour vos vacances ?",
      "Anticiper ses vacances pour profiter des meilleures disponibilités",
      "Bien organiser son prochain départ depuis {CITY}"
    ],
    bodies: [
      "Le choix d’une formule de vacances dépend du budget, de l’âge des voyageurs, du niveau d’autonomie souhaité et du type d’expérience recherchée.",
      "Anticiper permet souvent d’avoir plus de choix sur les dates, les chambres familiales, les vols et les établissements les mieux situés.",
      "Une agence peut vous aider à comparer les offres réellement équivalentes, notamment sur les bagages, transferts, repas, assurances et conditions d’annulation.",
      "Pour des vacances en famille, certains détails comptent beaucoup : durée du vol, horaires, club enfants, plage, chambres communicantes ou animations.",
      "Notre équipe vous accompagne pour transformer une envie de départ en séjour concret, clair et sécurisé."
    ]
  },
  {
    key: "circuit",
    titles: [
      "Circuit accompagné ou autotour : quelle formule choisir ?",
      "Découvrir une destination autrement grâce à un circuit",
      "Comment choisir le bon rythme pour un circuit ?",
      "Circuit culturel, nature ou découverte : préparons votre itinéraire",
      "Les avantages d’un circuit organisé pour voyager sereinement"
    ],
    bodies: [
      "Un circuit permet de découvrir plusieurs étapes d’une destination, mais le rythme, la taille du groupe et la qualité du guide sont essentiels.",
      "Circuit accompagné, autotour, voyage privé ou itinéraire sur mesure : chaque formule correspond à une manière différente de voyager.",
      "Notre équipe vous aide à comparer les programmes, le nombre de kilomètres, les hôtels, les repas inclus et les visites prévues.",
      "Un bon circuit doit équilibrer découverte, temps libre et confort. Trop d’étapes peuvent rendre le voyage fatigant.",
      "L’accompagnement d’une agence permet de mieux comprendre les différences entre les programmes et d’éviter les mauvaises surprises."
    ]
  },
  {
    key: "assurance",
    titles: [
      "Assurance voyage : pourquoi ne pas la négliger ?",
      "Imprévu avant le départ : comment sécuriser son voyage ?",
      "Annulation, assistance, bagages : les garanties à vérifier",
      "Voyager protégé : les points importants avant de réserver",
      "Pourquoi parler assurance avant de finaliser ses vacances ?"
    ],
    bodies: [
      "Une assurance voyage peut faire la différence en cas d’annulation, problème médical, bagage perdu ou assistance nécessaire pendant le séjour.",
      "Toutes les garanties ne se valent pas. Il est important de comprendre les plafonds, exclusions, franchises et délais de déclaration.",
      "Notre équipe vous aide à vérifier les solutions adaptées à votre voyage, à votre destination et au profil des voyageurs.",
      "Pour certains voyages lointains ou coûteux, l’assurance doit être étudiée dès la réservation, pas au dernier moment.",
      "Sécuriser son voyage fait partie d’une préparation sérieuse, surtout lorsque le départ implique plusieurs prestations ou formalités."
    ]
  }
];

const closers = [
  "Contactez notre équipe pour échanger sur votre prochain projet.",
  "Passez en agence ou contactez-nous pour préparer votre départ.",
  "Notre équipe reste à votre écoute pour comparer les meilleures solutions.",
  "Parlons ensemble de vos prochaines envies de voyage.",
  "Nous vous accompagnons pour construire un projet clair, adapté et sécurisé."
];

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

function hash(str) {
  return String(str || "").split("").reduce((a,c)=>a+c.charCodeAt(0),0);
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^\\w\\s]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function words(text) {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((w) => w.length > 3)
  );
}

function similarity(a, b) {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  const union = new Set([...A, ...B]).size;
  return Math.round((inter / union) * 100);
}

async function tooSimilar(prisma, agencyId, candidateText, title) {
  const recent = await prisma.googlePost.findMany({
    where: {
      status: {
        in: ["published","draft","approved","queued"]
      },
      createdAt: {
        gte: new Date(Date.now() - 90 * 86400000)
      }
    },
    take: 300
  });

  const normalizedTitle = normalize(title);

  for (const p of recent) {
    if (normalize(p.title) === normalizedTitle) {
      return true;
    }

    const threshold =
      p.agencyId === agencyId
      ? 55
      : 45;

    const score = similarity(candidateText, `${p.title} ${p.content}`);

    if (score >= threshold) return true;
  }

  return false;
}

module.exports = function(prisma){

const router = express.Router();

router.post("/google-posts/generate-seo-posts", async(req,res)=>{

try{

const agencies =
await prisma.agency.findMany({
include:{
realRankingChecks:true
},
orderBy:{
city:"asc"
}
});

const created=[];
const skipped=[];

for(const agency of agencies){

const latest={};

agency.realRankingChecks
.sort((a,b)=>new Date(b.checkedAt)-new Date(a.checkedAt))
.forEach(r=>{
if(!latest[r.keyword]) latest[r.keyword]=r;
});

const rankings =
Object.values(latest);

let weakestKeyword = "agence de voyage";

if(rankings.length){
rankings.sort((a,b)=>(b.position || 30)-(a.position || 30));
weakestKeyword = rankings[0].keyword || weakestKeyword;
}

let theme =
themes.find(t=>weakestKeyword && weakestKeyword.toLowerCase().includes(t.key));

if(!theme){
theme = pick(themes, agency.id);
}

let generated = null;

for(let attempt=0; attempt<themes.length*5; attempt++){

const seed =
agency.id*17 + attempt*13 + hash(agency.city);

const t =
attempt < 5
? theme
: pick(themes, seed);

const title =
pick(t.titles, seed)
.replace("{CITY}", agency.city);

const body =
pick(t.bodies, seed + 3);

const introVariants = [
`À ${agency.city}, ${agency.name} accompagne les voyageurs dans leurs projets.`,
`Votre agence ${agency.name} vous conseille pour préparer vos prochaines vacances.`,
`Depuis ${agency.city}, notre équipe vous aide à comparer les solutions les plus adaptées.`,
`Chaque projet mérite une préparation sérieuse et un accompagnement personnalisé.`,
`Notre agence met son expertise au service de vos envies de départ.`
];

const content = [
pick(introVariants, seed + 5),
"",
body,
"",
pick(closers, seed + 7)
].join("\\n");

const candidateText = `${title} ${content}`;

if(!(await tooSimilar(prisma, agency.id, candidateText, title))){
generated = {
theme:t,
title,
content
};
break;
}

}

if(!generated){
skipped.push({
agency:agency.name,
city:agency.city,
reason:"too_similar"
});
continue;
}

const post =
await prisma.googlePost.create({
data:{
agencyId:agency.id,
title:generated.title,
content:generated.content,
ctaLabel:"Demander un devis",
ctaUrl:agency.website,
status:"draft",
plannedAt:new Date(Date.now()+2*86400000),
seoKeyword:generated.theme.key,
editorialSignature: normalize(generated.title)
}
});

created.push({
agency:agency.name,
city:agency.city,
keyword:generated.theme.key,
postId:post.id,
title:generated.title
});

}

res.json({
created:created.length,
skipped:skipped.length,
posts:created,
skippedAgencies:skipped
});

}catch(e){

res.status(500).json({
error:e.message
});

}

});

return router;

}
