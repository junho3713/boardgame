import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,addItem,useItem,solveTray,unlockCompanionCase,COMPANION_TARGET,hearTune} from './public/room-state.js';
import {collectSearchItem,useSearchItem,scalePowered,openWheelDrawer,wipeTag,restoreRoute} from './public/search-state.js';
import {createTestStart,writeCheckpoint,readCheckpoint} from './public/test-starts.js';
test('tools and parts require a physical search and cannot be collected repeatedly',()=>{
 const s=createState();assert.equal(collectSearchItem(s,'coin'),false);s.caseLiningLifted=true;assert.ok(collectSearchItem(s,'coin'));assert.equal(collectSearchItem(s,'coin'),false);assert.equal(useSearchItem(s,'cloth','frame'),null);assert.ok(useItem(s,'coin','frame'));assert.ok(s.frameReleased);assert.ok(s.inventory.includes('coin'));
 s.bathUnlocked=true;collectSearchItem(s,'cloth');assert.equal(useItem(s,'cloth','linenTag2'),false);assert.equal(wipeTag(s,0),false);assert.ok(useItem(s,'cloth','basin'));for(let i=0;i<5;i++)assert.ok(wipeTag(s,i));assert.equal(s.tagWiped,false);wipeTag(s,5);assert.ok(s.tagWiped);assert.equal(wipeTag(s,9),false);
 s.bedroomOpen=true;assert.equal(collectSearchItem(s,'inlayA'),false);s.sofaLifted=true;s.bookLifted=true;collectSearchItem(s,'inlayA');collectSearchItem(s,'inlayB');s.inlayInstalled=true;assert.equal(solveTray(s,[1,3,2,0]),false);useItem(s,'inlayA','teaTray');assert.equal(solveTray(s,[1,3,2,0]),false);useItem(s,'inlayB','teaTray');assert.ok(solveTray(s,[1,3,2,0]));assert.ok(!s.inventory.includes('inlayA'));
});
test('power and missing mechanical parts are installed independently of clue read flags',()=>{
 const s=createState();s.kitchenOpen=true;assert.equal(collectSearchItem(s,'batteryA'),false);s.batteryDrawerOpen=true;collectSearchItem(s,'batteryA');collectSearchItem(s,'batteryB');useItem(s,'batteryA','kitchenScale');assert.equal(scalePowered(s),false);useItem(s,'batteryB','kitchenScale');assert.ok(scalePowered(s));
 s.twinOpen=true;assert.equal(openWheelDrawer(s,[0,0,0]),false);assert.ok(openWheelDrawer(s,[2,0,1]));collectSearchItem(s,'compassWheel');assert.equal(unlockCompanionCase(s,COMPANION_TARGET),false);useItem(s,'compassWheel','companionCase');assert.ok(unlockCompanionCase(s,COMPANION_TARGET));assert.equal(s.travelPostcardsSeen,false);
 s.room317Entered=true;s.luggageOpen=true;s.musicWound=true;assert.equal(collectSearchItem(s,'musicCylinder'),false);collectSearchItem(s,'magnet');assert.ok(useItem(s,'magnet','cylinderGap'));assert.equal(hearTune(s),false);assert.ok(useItem(s,'musicCylinder','musicBox'));assert.ok(hearTune(s));assert.equal(useItem(s,'magnet','cylinderGap'),false);
});
test('torn route pieces are found, mounted, and assembled before the full map appears',()=>{
 const s=createState();assert.equal(collectSearchItem(s,'route1'),false);s.exitOpen=true;assert.equal(collectSearchItem(s,'route0'),false);s.innerDrawerOpen=true;
 for(let i=0;i<3;i++){assert.ok(collectSearchItem(s,'route'+i));assert.ok(useItem(s,'route'+i,'evacuationPlan'));assert.equal(collectSearchItem(s,'route'+i),false);}
 assert.equal(restoreRoute(s,[2,0,1]),false);assert.equal(restoreRoute(s,[0,0,0]),false);assert.ok(restoreRoute(s,[0,1,2]));assert.ok(s.routeRestored);
});
test('new searches survive a save, and malformed arrays cannot skip them',()=>{
 const setup=createTestStart('searchKitchen');Object.assign(setup.state,{batteriesTaken:[true,true],batteriesInstalled:[true,false],postcardFound:[true,false,true],wipePatches:[true,false,true,false,true,false],routeOrder:[1,2,0],coinTaken:true});
 const raw=JSON.parse(writeCheckpoint({...setup,pointId:'searchKitchen',position:setup.point.position,yaw:0,pitch:0}));const restored=readCheckpoint(JSON.stringify(raw));assert.deepEqual(restored.state.batteriesInstalled,[true,false]);assert.deepEqual(restored.state.wipePatches,setup.state.wipePatches);assert.deepEqual(restored.state.routeOrder,[1,2,0]);raw.state.routeOrder=[1,1,1];raw.state.batteriesInstalled=[1,1];const invalid=readCheckpoint(JSON.stringify(raw));assert.deepEqual(invalid.state.routeOrder,[2,0,1]);assert.deepEqual(invalid.state.batteriesInstalled,[false,false]);
});
test('older checkpoints preserve already completed rooms without awarding extra copies',()=>{
 const setup=createTestStart('safe');const raw=JSON.parse(writeCheckpoint({...setup,pointId:'safe',position:setup.point.position,yaw:0,pitch:0}));for(const key of ['inlayMounted','batteriesInstalled','wheelInstalled','cylinderInstalled','frameReleased'])delete raw.state[key];const restored=readCheckpoint(JSON.stringify(raw));assert.ok(restored.state.inlayMounted.every(Boolean));assert.ok(restored.state.batteriesInstalled.every(Boolean));assert.ok(restored.state.wheelInstalled);assert.ok(restored.state.cylinderInstalled);assert.ok(restored.state.frameReleased);assert.ok(!restored.state.inventory.includes('inlayA'));
});
