const express = require("express");

module.exports = function(prisma){

const router = express.Router();

router.post("/seo-regression-check", async(req,res)=>{

try{

const movements =
await fetch(
`http://localhost:${process.env.PORT || 4000}/seo-movements`
);

const data =
await movements.json();

let created = 0;

for(const row of data.regressions){

if(Math.abs(row.gain) < 3){
continue;
}

const agency =
await prisma.agency.findFirst({
where:{
name:row.name
}
});

if(!agency){
continue;
}

const existing =
await prisma.networkAction.findFirst({

where:{
agencyId:agency.id,
lever:"seo-regression",
status:{
in:[
"todo",
"in_progress"
]
}
}

});

if(existing){
continue;
}

await prisma.networkAction.create({

data:{

agencyId:agency.id,

lever:"seo-regression",

title:
"Régression SEO détectée",

description:
`Perte de ${Math.abs(row.gain)} positions.`,

owner:"Sylvie",

status:"todo"

}

});

created++;

}

res.json({
created
});

}catch(e){

res.status(500).json({
error:e.message
});

}

});

return router;

}
