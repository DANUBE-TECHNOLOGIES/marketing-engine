const test=require("node:test"); const assert=require("node:assert/strict");
const ContentBuilder=require("../src/modules/agency-site/builders/content-builder"); const SiteBuilder=require("../src/modules/agency-site/builders/site-builder");
const agency={id:5,name:"Mondescale Ozoir",city:"Ozoir-la-Ferrière",address:"1 rue du Voyage",postalCode:"77330",phone:"01 23 45 67 89",email:"ozoir@example.test",googleReviewUrl:"https://example.test/reviews"};
const built=new SiteBuilder().build(agency); const cb=new ContentBuilder();
test("les 12 pages reçoivent des sections",()=>{for(const p of built.pages) assert.ok(cb.build(p,agency,built.site).length>=2)});
test("l'accueil contient hero et CTA",()=>{const s=cb.build(built.pages[0],agency,built.site);assert.equal(s[0].sectionType,"hero");assert.ok(s.some(x=>x.sectionType==="contact-cta"))});
test("aucun contenu ne contient undefined",()=>{for(const p of built.pages) assert.doesNotMatch(JSON.stringify(cb.build(p,agency,built.site)),/undefined/)});
test("les coordonnées sont propagées",()=>{const p=built.pages.find(x=>x.pageType==="CONTACT");const s=cb.build(p,agency,built.site);assert.match(JSON.stringify(s),/01 23 45 67 89/)});
test("les sections sont uniques par page",()=>{for(const p of built.pages){const t=cb.build(p,agency,built.site).map(x=>x.sectionType);assert.equal(new Set(t).size,t.length)}});
