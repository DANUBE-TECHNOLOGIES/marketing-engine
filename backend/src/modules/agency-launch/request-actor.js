"use strict";

function clean(value){const text=String(value||"").trim();return text||null;}
function nativeActor(req={}){
  const user=req.user||req.auth?.user||req.auth||null;
  if(!user)return null;
  if(typeof user==="string")return clean(user);
  return clean(user.displayName||user.name||user.email||user.username||user.id);
}
function trustedHeaderActor(req={},env=process.env){
  if(String(env.TRUST_IDENTITY_HEADERS||"").toLowerCase()!=="true")return null;
  const getter=typeof req.get==="function"?(name)=>req.get(name):(name)=>req.headers?.[name.toLowerCase()];
  return clean(getter("x-auth-user")||getter("x-forwarded-user")||getter("x-user-email")||getter("x-user"));
}
function requestActor(req={},env=process.env){return nativeActor(req)||trustedHeaderActor(req,env)||null;}
module.exports={clean,nativeActor,trustedHeaderActor,requestActor};
