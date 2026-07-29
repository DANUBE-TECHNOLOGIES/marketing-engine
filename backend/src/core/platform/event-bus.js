"use strict";
const {EventEmitter}=require("events");
class EventBus{
  constructor({logger}={}){this.emitter=new EventEmitter();this.emitter.setMaxListeners(100);this.logger=logger;this.history=[];}
  publish(name,payload={},meta={}){
    if(!name||typeof name!=="string")throw new TypeError("Nom événement obligatoire.");
    const event={id:`${Date.now()}-${Math.random().toString(36).slice(2,10)}`,name,payload,meta,occurredAt:new Date().toISOString()};
    this.history.unshift(event);this.history=this.history.slice(0,200);
    this.logger?.info("platform.event.published",{event:name,eventId:event.id});
    this.emitter.emit(name,event);this.emitter.emit("*",event);return event;
  }
  subscribe(name,handler){this.emitter.on(name,handler);return()=>this.emitter.off(name,handler);}
  recent(limit=20){return this.history.slice(0,Math.max(1,Math.min(Number(limit)||20,100)));}
}
module.exports=EventBus;
