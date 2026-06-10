const express = require("express");

module.exports = function(prisma){

const router = express.Router();

router.post(
"/local-seo/generate-actions",
async(req,res)=>{

try{

const agencies =
await prisma.agency.findMany({

include:{
directoryListings:true,
googlePosts:true
}

});

let created=0;

for(const agency of agencies){

const valid =
agency.directoryListings.filter(
l=>l.status==="validated"
).length;

const citationsScore =
Math.round(
(valid/Math.max(
agency.directoryListings.length,
1
))*100
);

const posts30 =
agency.googlePosts.filter(p=>{

if(
!p.publishedAt
){
return false;
}

return (
Date.now() -
new Date(
p.publishedAt
).getTime()
)
<
30*86400000;

}).length;

if(citationsScore<50){

await prisma.networkAction.create({

data:{

agencyId:agency.id,

lever:"citations",

title:
"Renforcer les citations",

description:
"Score citations faible",

owner:"Sylvie",

status:"todo"

}

});

created++;

}

if(posts30<4){

await prisma.networkAction.create({

data:{

agencyId:agency.id,

lever:"google_posts",

title:
"Renforcer les Google Posts",

description:
"Activité insuffisante",

owner:"Sylvie",

status:"todo"

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

return router;

}
