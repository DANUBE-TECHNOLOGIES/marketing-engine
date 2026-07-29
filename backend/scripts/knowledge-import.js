#!/usr/bin/env node
require("dotenv").config(); const path=require("node:path"); const prisma=require("../src/core/prisma/client"); const {importKnowledge}=require("../src/modules/knowledge-graph/importer");
(async()=>{const args=process.argv.slice(2),dryRun=args.includes("--dry-run"),dir=args.find(a=>!a.startsWith("--"));const out=await importKnowledge({prisma,directory:path.resolve(dir||path.join(process.cwd(),"knowledge")),dryRun});console.log(JSON.stringify(out,null,2));})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
