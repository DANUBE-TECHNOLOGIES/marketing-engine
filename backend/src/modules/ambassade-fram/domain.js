"use strict";
const TIERS = Object.freeze([{points:40,percent:3},{points:60,percent:5},{points:100,percent:7},{points:150,percent:10}]);
const TYPES = new Set(["EXCLUS_AMBASSADE","VENTE_FLASH"]);
function simulateLoyalty(spend) {
 if(typeof spend!=="number"||!Number.isFinite(spend)||spend<0) throw new RangeError("Invalid spend");
 const points=Math.floor(spend/100);
 return {points,discountPercent:[...TIERS].reverse().find(x=>points>=x.points)?.percent??0};
}
function validateOffer(input) {
 if(!input||typeof input!=="object") throw new TypeError("Offer required");
 if(!TYPES.has(input.type)) throw new RangeError("Invalid offer type");
 if(typeof input.title!=="string"||!input.title.trim()||input.title.length>160) throw new RangeError("Invalid title");
 if(!["DRAFT","PUBLISHED","ARCHIVED"].includes(input.status)) throw new RangeError("Invalid status");
 const start=new Date(input.startAt).getTime(),end=new Date(input.endAt).getTime();
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end) throw new RangeError("Invalid dates");
 if(input.type==="EXCLUS_AMBASSADE" && (typeof input.campaignMonth!=="string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.campaignMonth))) throw new RangeError("Exclusive offer requires YYYY-MM campaign month");
 if(input.type==="VENTE_FLASH" && input.campaignMonth != null) throw new RangeError("Flash sales do not belong to monthly exclusives");
 if(input.imageUrl != null){
   if(typeof input.imageUrl!=="string"||!input.imageUrl.trim()||input.imageUrl.length>2048) throw new RangeError("Invalid image URL");
   let u;try{u=new URL(input.imageUrl)}catch{throw new RangeError("Invalid image URL")}
   if(u.protocol!=="https:") throw new RangeError("HTTPS image required");
 }
 return true;
}
function publishedOffers(offers, now=new Date()) {
 const t=now.getTime();if(!Number.isFinite(t)) throw new RangeError("Invalid clock");
 return offers.filter(o=>{try{validateOffer(o);return o.status==="PUBLISHED"&&new Date(o.startAt).getTime()<=t&&t<new Date(o.endAt).getTime()}catch{return false}});
}
function monthlyExclusives(offers,now=new Date()){
 if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new RangeError("Invalid clock");
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit"}).formatToParts(now);
 const month=`${parts.find(p=>p.type==="year").value}-${parts.find(p=>p.type==="month").value}`;
 return publishedOffers(offers,now).filter(o=>o.type==="EXCLUS_AMBASSADE"&&o.campaignMonth===month).slice(0,4);
}
module.exports={TIERS,simulateLoyalty,validateOffer,publishedOffers,monthlyExclusives};
