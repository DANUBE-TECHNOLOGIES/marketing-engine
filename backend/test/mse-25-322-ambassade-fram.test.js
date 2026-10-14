const test=require("node:test"),assert=require("node:assert/strict");
const {simulateLoyalty,validateOffer,publishedOffers,monthlyExclusives}=require("../src/modules/ambassade-fram/domain");
test("FRAM loyalty tiers",()=>{for(const [euros,percent] of [[0,0],[3999,0],[4000,3],[6000,5],[10000,7],[15000,10]]) assert.equal(simulateLoyalty(euros).discountPercent,percent)});
test("offer validation and publication",()=>{const offer={type:"EXCLUS_AMBASSADE",campaignMonth:"2026-10",title:"Séjour",status:"PUBLISHED",startAt:"2026-10-01",endAt:"2026-11-01"};assert.equal(validateOffer(offer),true);assert.equal(publishedOffers([offer],new Date("2026-10-13")).length,1);assert.equal(monthlyExclusives(Array(6).fill(offer),new Date("2026-10-13")).length,4);assert.equal(publishedOffers([offer],new Date("2026-11-01")).length,0);assert.throws(()=>validateOffer({...offer,imageUrl:"http://example.com/a.jpg"}))});

test("monthly exclusives never leak across months",()=>{
 const base={type:"EXCLUS_AMBASSADE",status:"PUBLISHED",title:"Offre",startAt:"2026-10-01",endAt:"2026-12-01"};
 const offers=[{...base,campaignMonth:"2026-10"},{...base,campaignMonth:"2026-11"}];
 assert.equal(monthlyExclusives(offers,new Date("2026-10-15")).length,1);
 assert.equal(monthlyExclusives(offers,new Date("2026-11-15")).length,1);
 assert.equal(monthlyExclusives(offers,new Date("2026-12-15")).length,0);
 assert.throws(()=>validateOffer({...base}),/campaign month/);
});

test("monthly exclusives switch at midnight in mainland France",()=>{
 const base={type:"EXCLUS_AMBASSADE",status:"PUBLISHED",title:"Offre",startAt:"2026-10-01",endAt:"2026-12-01"};
 const offers=[{...base,campaignMonth:"2026-10"},{...base,campaignMonth:"2026-11"}];
 assert.equal(monthlyExclusives(offers,new Date("2026-10-31T22:59:00Z"))[0].campaignMonth,"2026-10");
 assert.equal(monthlyExclusives(offers,new Date("2026-10-31T23:01:00Z"))[0].campaignMonth,"2026-11");
});
