const express = require("express");

module.exports = function(prisma){

const router = express.Router();

const keywords = [
  "agence de voyage",
  "agence de voyages",
  "voyage sur mesure",
  "croisière",
  "séjour",
  "vacances",
  "circuit"
];

function detectKeyword(post){

const text =
`${post.title || ""} ${post.content || ""}`
.toLowerCase();

for(const keyword of keywords){
if(text.includes(keyword)){
return keyword;
}
}

if(text.includes("croisi")){
return "croisière";
}

if(text.includes("sur mesure")){
return "voyage sur mesure";
}

if(text.includes("vacance")){
return "vacances";
}

return "agence de voyage";

}

function computeScore(post, agency, keyword){

let score = 0;

const title =
(post.title || "").toLowerCase();

const content =
(post.content || "").toLowerCase();

const city =
(agency.city || "").toLowerCase();

if(keyword && title.includes(keyword)){
score += 20;
}

if(keyword && content.includes(keyword)){
score += 20;
}

if(city && content.includes(city)){
score += 20;
}

if(post.ctaLabel && post.ctaUrl){
score += 20;
}

if(content.length >= 300){
score += 20;
}

return Math.min(score,100);

}

router.post(
"/google-posts/compute-seo-score",
async(req,res)=>{

try{

const posts =
await prisma.googlePost.findMany({
include:{
agency:true
},
take:1000
});

let updated = 0;

for(const post of posts){

const keyword =
detectKeyword(post);

const score =
computeScore(
post,
post.agency || {},
keyword
);

await prisma.googlePost.update({
where:{
id:post.id
},
data:{
seoKeyword:keyword,
seoScore:score
}
});

updated++;

}

res.json({
updated
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
