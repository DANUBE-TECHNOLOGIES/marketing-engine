"use strict";
const routes=require("./routes");
const sdk=require("../../sdk");
if(!sdk.registry.describe().some(s=>s.name==="platform.core-api")){
 sdk.registry.register("platform.core-api",{routes},{version:"1.0.0",domain:"platform",capabilities:["platform.health","platform.services","platform.events"]});
}
module.exports={routes};
