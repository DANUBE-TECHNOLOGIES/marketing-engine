const express = require("express");

module.exports = function(prisma){

const router = express.Router();

router.get("/seo-movements", async(req,res)=>{

try{

const data =
await prisma.$queryRawUnsafe(`

SELECT

a.name,
a.city,

s1.position AS current_position,
s2.position AS previous_position,

(s2.position - s1.position) AS gain

FROM "SeoDailySnapshot" s1

JOIN "Agency" a
ON a.id=s1."agencyId"

LEFT JOIN LATERAL (

SELECT position

FROM "SeoDailySnapshot"

WHERE
"agencyId"=s1."agencyId"
AND keyword=s1.keyword
AND "capturedAt"<s1."capturedAt"

ORDER BY "capturedAt" DESC

LIMIT 1

) s2 ON true

WHERE s2.position IS NOT NULL

ORDER BY gain DESC

LIMIT 100

`);

const progressions =
data
.filter(r=>r.gain > 0)
.sort((a,b)=>b.gain-a.gain)
.slice(0,10);

const regressions =
data
.filter(r=>r.gain < 0)
.sort((a,b)=>a.gain-b.gain)
.slice(0,10);

res.json({
progressions,
regressions
});

}catch(e){

res.status(500).json({
error:e.message
});

}

});

return router;

}
