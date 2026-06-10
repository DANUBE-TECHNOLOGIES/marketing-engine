const express = require("express");

module.exports = function(prisma){

const router = express.Router();

router.post("/google-posts/bulk-approve", async(req,res)=>{

try{

const ids = req.body.ids || [];

if(ids.length===0){

const result =
await prisma.googlePost.updateMany({

where:{
status:"draft"
},

data:{
status:"approved"
}

});

return res.json({
approved:result.count
});

}

let approved=0;

for(const id of ids){

await prisma.googlePost.update({

where:{id:Number(id)},

data:{
status:"approved"
}

});

approved++;

}

res.json({
approved
});

}catch(e){

res.status(500).json({
error:e.message
});

}

});

router.post("/google-posts/bulk-unapprove", async(req,res)=>{

try{

const ids = req.body.ids || [];

let updated=0;

for(const id of ids){

await prisma.googlePost.update({

where:{id:Number(id)},

data:{
status:"draft"
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

});

return router;

}
