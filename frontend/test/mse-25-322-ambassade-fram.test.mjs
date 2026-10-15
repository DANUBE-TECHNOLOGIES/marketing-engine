import test from "node:test";
import assert from "node:assert/strict";
import { simulateFramLoyalty } from "../lib/ambassade-fram/loyalty.mjs";
import { currentMonthlyExclusives, publicFramOffers } from "../lib/ambassade-fram/offers.mjs";
test("loyalty thresholds are exact at boundaries", () => {
  for (const [euros, points, discount] of [[0,0,0],[3999,39,0],[4000,40,3],[6000,60,5],[10000,100,7],[15000,150,10]]) {
    assert.deepEqual([simulateFramLoyalty(euros).points, simulateFramLoyalty(euros).discountPercent], [points,discount]);
  }
  assert.throws(() => simulateFramLoyalty(-1), RangeError);
  assert.throws(() => simulateFramLoyalty(Infinity), RangeError);
});
test("only published active offers are public; maximum four monthly exclusives", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  const base = {type:"EXCLUS_AMBASSADE",status:"PUBLISHED",title:"Voyage",startAt:"2026-10-01T00:00:00Z",endAt:"2026-11-01T00:00:00Z"};
  const offers = [...Array.from({length:5},(_,i)=>({...base,id:i})),{...base,status:"DRAFT"},{...base,endAt:"2026-10-13T12:00:00Z"},{...base,type:"UNKNOWN"}];
  assert.equal(publicFramOffers(offers,now).length,5);
  assert.equal(currentMonthlyExclusives(offers,now).length,4);
});
