"use strict";
const defineDomain=({name,version="1.0",capabilities=[],events=[]})=>Object.freeze({name,version,capabilities:Object.freeze([...capabilities]),events:Object.freeze([...events])});
const domains=Object.freeze({
 platform:defineDomain({name:"platform",capabilities:["platform.health","platform.events","platform.services"],events:["platform.started","platform.service.registered"]}),
 knowledge:defineDomain({name:"knowledge",capabilities:["graph.entity.read","graph.entity.search"],events:["knowledge.entity.created","knowledge.entity.updated"]}),
 content:defineDomain({name:"content",capabilities:["content.compose","content.validate"],events:["content.composed","content.rejected"]}),
 seo:defineDomain({name:"seo",capabilities:["seo.plan","seo.generate","seo.score"],events:["seo.page.generated","seo.page.published"]})
});
module.exports={defineDomain,domains};
