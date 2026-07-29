"use strict";
const assert=require("assert"); const {compose,slugify}=require("./service");
assert.strictEqual(slugify("Séjour à Budapest !"),"sejour-a-budapest");
const r=compose({subject:"Budapest",agency:"Mondescale Voyages Nevers",location:"Nevers",blocks:[{heading:"Capitale thermale",body:"Budapest compte de nombreux bains thermaux"}]});
assert.strictEqual(r.subject,"Budapest"); assert.strictEqual(r.sections.length,1); assert.strictEqual(r.composerVersion,"0.1.1"); assert.strictEqual(r.contentHash.length,64); assert.throws(()=>compose({}),e=>e.statusCode===400); console.log("FP-007 service tests: OK");
