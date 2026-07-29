"use strict";
class MemoryCache{
  constructor(){this.values=new Map();}
  set(key,value,ttl=300){this.values.set(key,{value,expiresAt:ttl>0?Date.now()+ttl*1000:null});return value;}
  get(key){const item=this.values.get(key);if(!item)return undefined;if(item.expiresAt&&item.expiresAt<=Date.now()){this.values.delete(key);return undefined;}return item.value;}
  delete(key){return this.values.delete(key);}
  clear(){this.values.clear();}
  stats(){for(const key of this.values.keys())this.get(key);return{entries:this.values.size,provider:"memory"};}
}
module.exports=MemoryCache;
