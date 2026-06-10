const express = require("express");

module.exports = function createPriorityRoutes(prisma){

const router = express.Router();

router.get("/priorities", async(req,res)=>{

try{

const agencies =
await prisma.agency.findMany({
include:{
reviews:true,
googlePosts:true,
networkActions:true,
realRankingChecks:true
}
});

const rows=[];

for(const agency of agencies){

const reviews30 =
agency.reviews.filter(
r =>
new Date(r.createdAt) >
new Date(Date.now()-30*86400000)
).length;

const posts30 =
agency.googlePosts.filter(
p =>
p.status==="published" &&
p.publishedAt &&
new Date(p.publishedAt) >
new Date(Date.now()-30*86400000)
).length;

const openActions =
agency.networkActions.filter(
a =>
["todo","in_progress"].includes(a.status)
).length;

const latest={};

agency.realRankingChecks
.sort((a,b)=>
new Date(b.checkedAt)-new Date(a.checkedAt)
)
.forEach(r=>{

if(!latest[r.keyword]){
latest[r.keyword]=r;
}

});

const rankings =
Object.values(latest);

const positions =
rankings
.filter(r=>r.found && r.position)
.map(r=>r.position);

const avgPosition =
positions.length
?
positions.reduce((s,p)=>s+p,0)
/ positions.length
:
20;

let score = 0;

if(avgPosition <= 5){
score += 50;
}
else if(avgPosition <= 10){
score += 30;
}
else{
score += 10;
}

if(reviews30 < 3){
score += 30;
}

if(posts30 < 4){
score += 15;
}

if(openActions > 5){
score += 10;
}

let priority="STABLE";

if(score >= 80){
priority="PRIORITE_1";
}
else if(score >= 50){
priority="PRIORITE_2";
}

rows.push({

agencyId:agency.id,
agency:agency.name,
city:agency.city,

averagePosition:
Math.round(avgPosition*10)/10,

reviews30,
posts30,
openActions,

score,
priority

});

}

rows.sort((a,b)=>b.score-a.score);

res.json({

top5:
rows.slice(0,5),

rows

});

}catch(e){

res.status(500).json({
error:e.message
});

}

});

return router;

}
