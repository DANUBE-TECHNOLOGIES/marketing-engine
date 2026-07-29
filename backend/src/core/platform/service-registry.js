"use strict";
class ServiceRegistry{
  constructor(){this.services=new Map();this.capabilities=new Map();}
  register(name,service,metadata={}){
    if(this.services.has(name))throw new Error(`Service déjà enregistré : ${name}`);
    const descriptor={name,version:metadata.version||"1.0.0",domain:metadata.domain||"platform",capabilities:Array.isArray(metadata.capabilities)?metadata.capabilities:[],registeredAt:new Date().toISOString()};
    this.services.set(name,{service,descriptor});
    for(const capability of descriptor.capabilities){
      if(!this.capabilities.has(capability))this.capabilities.set(capability,[]);
      this.capabilities.get(capability).push(name);
    }
    return descriptor;
  }
  get(name){const item=this.services.get(name);if(!item)throw new Error(`Service introuvable : ${name}`);return item.service;}
  describe(){return[...this.services.values()].map(({descriptor})=>descriptor);}
  providers(capability){return[...(this.capabilities.get(capability)||[])];}
}
module.exports=ServiceRegistry;
