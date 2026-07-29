"use strict";
const bool=(v,f=false)=>v===undefined?f:["1","true","yes","on"].includes(String(v).toLowerCase());
module.exports={
  get:(key,fallback)=>process.env[key]===undefined?fallback:process.env[key],
  bool,
  platform:{version:"0.10.0",environment:process.env.NODE_ENV||"development",apiVersion:"v1"},
  featureFlags:{coreEvents:bool(process.env.FF_CORE_EVENTS,true),domainContracts:bool(process.env.FF_DOMAIN_CONTRACTS,true)}
};
