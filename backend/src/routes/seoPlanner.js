const express = require("express");

function generateTopic(level,index){

const leader = [
"Conseil voyage",
"Destination tendance",
"Avis client",
"Equipe agence"
];

const renforcement = [
"Conseil voyage",
"Destination",
"Croisière",
"Voyage sur mesure",
"Avis client",
"Promotion"
];

const offensive = [
"Destination",
"Promotion",
"Conseil voyage",
"Croisière",
"Voyage sur mesure",
"Equipe agence",
"Avis client",
"Formalités"
];

const map = {
LEADER:leader,
RENFORCEMENT:renforcement,
OFFENSIVE:offensive,
CRITIQUE:offensive
};

const arr =
map[level] || renforcement;

return arr[index % arr.length];

}

module.exports = function(prisma){

const router = express.Router();

router.post("/seo-planner/generate", async (req,res)=>{

try{

const agencies =
await prisma.agency.findMany();

const created = [];

for(const agency of agencies){

const level =
agency.seoLevel || "RENFORCEMENT";

let target = 2;

if(level==="LEADER") target=4;
if(level==="RENFORCEMENT") target=8;
if(level==="OFFENSIVE") target=12;
if(level==="CRITIQUE") target=12;

const existing =
await prisma.googlePost.count({
where:{
agencyId:agency.id,
status:{
in:[
"draft",
"planned"
]
}
}
});

const missing =
Math.max(0,target-existing);

for(let i=0;i<missing;i++){

const topic =
generateTopic(level,i);

await prisma.googlePost.create({

data:{

agencyId:agency.id,

title:
`${topic} - ${agency.city}`,

content:
`${agency.name} vous accompagne dans vos projets de voyage.

Thématique du jour : ${topic}.

Notre équipe reste à votre disposition pour préparer vos prochaines vacances, séjours, circuits, croisières ou voyages sur mesure.`,

status:"draft",

plannedAt:
new Date(
Date.now()+
(i+1)*86400000
)

}

});

}

created.push({
agency:agency.name,
level,
created:missing
});

}

res.json(created);

}catch(e){

res.status(500).json({
error:e.message
});

}

});

return router;

};
