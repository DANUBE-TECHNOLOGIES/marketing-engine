"use strict";
const crypto=require("node:crypto");
function clean(value){const text=String(value||"").trim();return text||null;}
function getter(req={}){return typeof req.get==="function"?(name)=>req.get(name):(name)=>req.headers?.[name.toLowerCase()];}
function nativeActor(req={}){const user=req.user||req.auth?.user||req.auth||null;if(!user)return null;if(typeof user==="string")return clean(user);return clean(user.displayName||user.name||user.email||user.username||user.id);}
function signedHeaderActor(req={},env=process.env,now=Date.now()){
  const secret=clean(env.IDENTITY_HMAC_SECRET);if(!secret)return null;
  const get=getter(req),actor=clean(get("x-auth-user")),timestamp=clean(get("x-auth-timestamp")),signature=clean(get("x-auth-signature"));
  if(!actor||!timestamp||!signature)return null;
  const millis=Number(timestamp);if(!Number.isFinite(millis))return null;
  const maxAge=Math.max(1000,Number(env.IDENTITY_HMAC_MAX_AGE_MS||300000));if(Math.abs(now-millis)>maxAge)return null;
  const expected=crypto.createHmac("sha256",secret).update(`${actor}\n${timestamp}`).digest("hex");
  const a=Buffer.from(expected),b=Buffer.from(signature);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  return actor;
}
function trustedHeaderActor(req={},env=process.env){if(String(env.TRUST_IDENTITY_HEADERS||"").toLowerCase()!=="true")return null;const get=getter(req);return clean(get("x-auth-user")||get("x-forwarded-user")||get("x-user-email")||get("x-user"));}
function requestActorContext(req={},env=process.env,now=Date.now()){
  const native=nativeActor(req);if(native)return{actor:native,source:"native",verified:true};
  const signed=signedHeaderActor(req,env,now);if(signed)return{actor:signed,source:"signed_proxy",verified:true};
  const trusted=trustedHeaderActor(req,env);if(trusted)return{actor:trusted,source:"trusted_header",verified:false};
  return{actor:null,source:"anonymous",verified:false};
}
function requestActor(req={},env=process.env,now=Date.now()){return requestActorContext(req,env,now).actor;}
module.exports={clean,getter,nativeActor,signedHeaderActor,trustedHeaderActor,requestActorContext,requestActor};
