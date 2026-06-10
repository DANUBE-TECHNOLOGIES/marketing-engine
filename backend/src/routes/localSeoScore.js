const express = require("express");

module.exports = function(prisma){

const router = express.Router();

function clamp(v,min,max){
  return Math.max(min,Math.min(max,v));
}

function reviewScore(reviews){
  const total = reviews.length;

  const average =
    total
    ? reviews.reduce((s,r)=>s+(r.rating || 0),0)/total
    : 0;

  const volumeScore =
    clamp(total * 4, 0, 60);

  const ratingScore =
    average
    ? clamp((average / 5) * 40, 0, 40)
    : 0;

  return Math.round(volumeScore + ratingScore);
}

router.get("/local-seo-score", async(req,res)=>{

try{

const agencies =
await prisma.agency.findMany({
include:{
reviews:true,
googlePosts:true,
directoryListings:true,
realRankingChecks:true
}
});

const rows=[];

for(const agency of agencies){

const reviewsScore =
reviewScore(agency.reviews || []);

const validCitations =
agency.directoryListings.filter(
l=>l.status==="validated"
).length;

const totalCitations =
agency.directoryListings.length || 1;

const citationsScore =
Math.round(
(validCitations/totalCitations)*100
);

const published30 =
agency.googlePosts.filter(p=>{

if(!p.publishedAt || p.status!=="published"){
return false;
}

return (
Date.now() -
new Date(p.publishedAt).getTime()
)
<
30*86400000;

}).length;

const postsScore =
clamp(
published30*15,
0,
100
);

const rankings =
agency.realRankingChecks
.filter(r=>r.position);

let rankingScore = 0;

if(rankings.length){

const avg =
rankings.reduce(
(s,r)=>s+r.position,
0
)/rankings.length;

rankingScore =
clamp(
100-((avg-1)*5),
0,
100
);

}

const globalScore =
Math.round(
(reviewsScore*0.4)+
(citationsScore*0.2)+
(postsScore*0.2)+
(rankingScore*0.2)
);

let priority = "OK";

if(globalScore < 45){
  priority = "HIGH";
}else if(globalScore < 65){
  priority = "MEDIUM";
}

rows.push({
agencyId:agency.id,
agencyName:agency.name,
city:agency.city,

reviewsScore,
citationsScore,
postsScore,
rankingScore,

globalScore,
priority
});

}

rows.sort(
(a,b)=>b.globalScore-a.globalScore
);

res.json({
average:
Math.round(
rows.reduce(
(s,r)=>s+r.globalScore,
0
)/Math.max(rows.length,1)
),
high:rows.filter(r=>r.priority==="HIGH").length,
medium:rows.filter(r=>r.priority==="MEDIUM").length,
ok:rows.filter(r=>r.priority==="OK").length,
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
