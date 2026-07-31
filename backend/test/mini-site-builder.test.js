"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const MiniSiteBuilderService = require("../src/modules/mini-site-builder/service");
const { validateBlockInput, validateReorderInput } = require("../src/modules/mini-site-builder/validation");
const { renderBlock, renderPage } = require("../src/modules/mini-site-builder/renderers/html-renderer");

function repo(overrides={}) { return { getPage: async id=>({id,title:"Accueil",seoTitle:"Agence",metaDescription:"Voyages",site:{tenantId:"t1"}}), list: async()=>[], get: async id=>({id,pageId:"p1",blockType:"hero",content:{},displayOrder:0,status:"draft"}), nextOrder: async()=>({_max:{displayOrder:2}}), create: async(pageId,data)=>({id:"b1",pageId,...data}), update: async(id,data)=>({id,...data,version:2}), remove: async id=>({id}), reorder: async()=>[], ...overrides }; }

test("valide un bloc hero",()=>{ const b=validateBlockInput({blockType:"HERO",content:{title:"Japon"}}); assert.equal(b.blockType,"hero"); });
test("refuse un type inconnu",()=>assert.throws(()=>validateBlockInput({blockType:"x",content:{}}),/non supporté/));
test("valide un ordre de blocs",()=>assert.deepEqual(validateReorderInput({blocks:[{id:"b",displayOrder:1}]}),[{id:"b",displayOrder:1}]));
test("crée un bloc à la suite",async()=>{ const s=new MiniSiteBuilderService(repo()); const b=await s.create("p1",{blockType:"hero",content:{title:"Japon"}}); assert.equal(b.displayOrder,3); assert.equal(b.status,"draft"); });
test("isole les pages absentes",async()=>{ const s=new MiniSiteBuilderService(repo({getPage:async()=>null})); await assert.rejects(()=>s.list("p2"),e=>e.statusCode===404); });
test("met à jour un bloc",async()=>{ const s=new MiniSiteBuilderService(repo()); const b=await s.update("b1",{status:"published"}); assert.equal(b.status,"published"); });
test("rend un hero en échappant le HTML",()=>{ const html=renderBlock({id:"b1",blockType:"hero",content:{title:"<script>x</script>"},status:"published",displayOrder:0}); assert.match(html,/&lt;script&gt;/); assert.doesNotMatch(html,/<script>/); });
test("rend uniquement les blocs publiés",()=>{ const html=renderPage({title:"A",seoTitle:"A",metaDescription:"B"},[{id:"1",blockType:"cta",content:{title:"Oui"},status:"published",displayOrder:1},{id:"2",blockType:"cta",content:{title:"Non"},status:"draft",displayOrder:0}],{}); assert.match(html,/Oui/); assert.doesNotMatch(html,/>Non</); });
test("health expose les types",()=>{ const h=new MiniSiteBuilderService(repo()).health(); assert.equal(h.capability,"page-block-engine"); assert.ok(h.blockTypes.includes("faq")); });
