const express = require("express");

module.exports = function(prisma){

const router = express.Router();

function buildResponse(review,agency){

const agencyName =
agency?.name || "notre agence";

const city =
agency?.city || "";

const rating =
review.rating || 5;

if(rating >= 5){

return `Merci pour votre confiance envers ${agencyName}${city ? " à " + city : ""}.

Nous sommes ravis d'avoir pu vous accompagner dans l'organisation de votre voyage.

Toute l'équipe vous remercie pour ce retour positif et espère vous accompagner à nouveau pour vos prochaines vacances, séjours, circuits ou croisières.

À très bientôt dans votre agence de voyages ${city}.`;

}

if(rating >= 4){

return `Merci d'avoir pris le temps de partager votre expérience avec ${agencyName}.

Nous sommes heureux que votre voyage vous ait apporté satisfaction.

Vos remarques nous encouragent à continuer à vous proposer un accompagnement personnalisé pour tous vos projets de voyage.`;

}

if(rating >= 3){

return `Merci d'avoir partagé votre avis.

Nous prenons bonne note de vos remarques afin d'améliorer continuellement la qualité de nos services.

Notre équipe reste à votre disposition pour échanger plus en détail sur votre expérience.`;

}

return `Nous vous remercions d'avoir pris le temps de nous faire part de votre retour.

Nous sommes sincèrement désolés que votre expérience n'ait pas répondu à vos attentes.

Nous restons à votre disposition afin d'échanger avec vous et comprendre précisément les difficultés rencontrées.`;

}

router.post(
"/review-responses/generate",
async(req,res)=>{

try{

const agencies =
await prisma.agency.findMany({
include:{
reviews:true
}
});

let created = 0;

for(const agency of agencies){

for(const review of agency.reviews){

const existing =
await prisma.reviewResponse.findFirst({

where:{
reviewId:review.id
}

});

if(existing){
continue;
}

await prisma.reviewResponse.create({

data:{

reviewId:review.id,
agencyId:agency.id,

reviewAuthor:
review.authorName || "",

reviewRating:
review.rating || 5,

reviewText:
review.comment || "",

responseText:
buildResponse(review,agency),

status:"draft"

}

});

created++;

}

}

res.json({
created
});

}catch(e){

res.status(500).json({
error:e.message
});

}

}
);

router.get(
"/review-responses",
async(req,res)=>{

try{

const responses =
await prisma.reviewResponse.findMany({

include:{
agency:true
},

orderBy:{
createdAt:"desc"
},

take:500

});

res.json({

total:responses.length,

draft:
responses.filter(
r=>r.status==="draft"
).length,

approved:
responses.filter(
r=>r.status==="approved"
).length,

published:
responses.filter(
r=>r.status==="published"
).length,

responses

});

}catch(e){

res.status(500).json({
error:e.message
});

}

}
);

return router;

}
