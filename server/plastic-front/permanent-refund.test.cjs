'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame,FrontProfile,PERMANENT}=require('./public/engine.js');
const {FrontAutoProfile}=require('./public/autoplay.js');

test('a legacy profile refunds every paid tier at the purchase price and saves once',()=>{
 const legacy={version:1,gold:321.35,upgrades:{damage:2,capacity:1,turretHp:4}};
 const values=new Map([['plastic-front-profile-v1',JSON.stringify(legacy)]]);
 const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const profile=FrontProfile.read(storage);
 assert.equal(profile.refundTotal(),1580);
 assert.equal(profile.resetPermanent(),1580);
 profile.save(storage);
 const restored=FrontProfile.read(storage);
 assert.equal(restored.gold,1901.35);
 assert.ok(Object.values(restored.upgrades).every(level=>level===0));
 assert.equal(restored.resetPermanent(),0);
 const game=new FrontGame({},restored);
 assert.equal(game.capacity(),20);
 assert.ok(game.buyPermanent('damage'));
 assert.equal(restored.gold,1821.35);
 assert.equal(restored.resetPermanent(),80);
 assert.equal(restored.gold,1901.35);
});

test('purchases can be fully refunded even at the earnings limit',()=>{
 const upgrades=Object.fromEntries(Object.entries(PERMANENT).map(([key,spec])=>[key,spec.max]));
 const profile=new FrontProfile({gold:1e9,upgrades});
 const refund=profile.refundTotal();
 assert.equal(profile.resetPermanent(),refund);
 const reloaded=new FrontProfile(profile.snapshot());
 const game=new FrontGame({},reloaded);
 game.awardGold(10);
 assert.equal(reloaded.gold,1e9+refund);
});

test('the separate AI wallet is unaffected by the manual refund',()=>{
 const idle=new FrontAutoProfile({gold:100,upgrades:{capacity:2},fails:{capacity:3}});
 const before=idle.snapshot();
 assert.equal(idle.resetPermanent(),0);
 assert.deepEqual(idle.snapshot(),before);
});
