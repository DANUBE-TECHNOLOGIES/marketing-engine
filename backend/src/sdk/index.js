"use strict";
const platform=require("../core/platform");
module.exports={
 ...platform,
 capability:(name)=>platform.registry.providers(name),
 service:(name)=>platform.registry.get(name)
};
