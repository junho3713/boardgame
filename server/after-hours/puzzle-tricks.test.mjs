import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,addItem,useItem,unlockLinen,unlockLuggage,unlockEvacuationBox} from './public/room-state.js';
import {updateBathSteam,prepareRubbing,alignRubbing,rubImprint,rubbingDigit,routeFits,routeFragmentSvg,evacuationSvg} from './public/puzzle-tricks.js';
import {createTestStart,readCheckpoint,writeCheckpoint} from './public/test-starts.js';

test('only running warm water reveals condensation, which fades and can be revealed again',()=>{
 const s=createState();s.faucetOn=true;for(let i=0;i<10;i++)updateBathSteam(s,1);assert.equal(s.bathSteam,0);assert.equal(s.bathSteamSeen,false);
 s.faucetHot=true;s.faucetOn=false;updateBathSteam(s,5);assert.equal(s.bathSteam,0);
 s.faucetOn=true;updateBathSteam(s,3);assert.ok(s.bathSteam<.78);assert.equal(s.bathSteamSeen,false);assert.ok(updateBathSteam(s,1));assert.ok(s.bathSteamSeen);
 s.faucetOn=false;for(let i=0;i<4;i++)updateBathSteam(s,10);assert.equal(s.bathSteam,0);assert.ok(s.bathSteamSeen);s.faucetOn=true;updateBathSteam(s,5);assert.equal(s.bathSteam,1);assert.equal(s.linenSolved,false);
 // Knowing a valid combination remains legitimate without forcing a document read.
 s.bathUnlocked=true;s.bathSteamSeen=false;assert.ok(unlockLinen(s,'628'));
});
test('rubbing uses three actual tools, a correctly aligned blank sheet, and coverage of every region',()=>{
 const s=createState();assert.equal(prepareRubbing(s),false);for(const id of ['pencil','receipt','tag'])addItem(s,id);
 assert.ok(useItem(s,'pencil','tag317'));assert.equal(s.tagRubbed,false);assert.equal(rubImprint(s,0),false);assert.equal(alignRubbing(s),false);
 s.rubbingOffset=[0,0];s.rubbingTurn=0;assert.equal(alignRubbing(s),false);s.rubbingBlank=true;s.rubbingTurn=2;assert.equal(alignRubbing(s),false);s.rubbingTurn=0;assert.ok(alignRubbing(s));
 assert.equal(rubImprint(s,-1),false);assert.equal(rubImprint(s,NaN),false);assert.equal(rubImprint(s,6),false);
 for(let i=0;i<5;i++)for(let n=0;n<3;n++)assert.ok(rubImprint(s,i));assert.equal(s.tagRubbed,false);assert.equal(rubbingDigit(s,0),'5');assert.equal(rubbingDigit(s,2),null);
 for(let n=0;n<3;n++)rubImprint(s,5);assert.ok(s.tagRubbed);assert.equal(rubImprint(s,5),false);assert.deepEqual([0,1,2].map(i=>rubbingDigit(s,i)),['5','7','1']);assert.deepEqual(s.inventory,['pencil','receipt','tag']);
 s.room317Entered=true;s.tagRubbed=false;assert.ok(unlockLuggage(s,'571'));
});
test('all 48 torn-map orders and half-turns have exactly one matching edge assembly',()=>{
 const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]],solutions=[];
 for(const order of orders)for(let n=0;n<8;n++){const turns=[n&1,(n>>1)&1,(n>>2)&1];if(routeFits(order,turns))solutions.push({order,turns});}
 assert.deepEqual(solutions,[{order:[0,1,2],turns:[0,0,0]}]);assert.equal(routeFits([0,0,2],[0,0,0]),false);assert.equal(routeFits([0,1,2],null),false);
 assert.match(routeFragmentSvg(0,1),/rotate\(180 80 127.5\)/);assert.match(evacuationSvg(),/서쪽 접점/);const s=createState();s.exitOpen=true;assert.ok(unlockEvacuationBox(s,[2,3,3]));
});
test('partial rubbing and turned map pieces survive a save; older completed clues remain completed',()=>{
 const setup=createTestStart('rubbing');Object.assign(setup.state,{rubbingPrepared:true,rubbingBlank:true,rubbingAligned:true,rubbingOffset:[0,0],rubbingTurn:0,rubbingMarks:[3,2,0,1,2,0],routeTurns:[0,1,1],bathSteam:.85,bathSteamSeen:true});
 const payload=JSON.parse(writeCheckpoint({...setup,pointId:'rubbing',position:setup.point.position,yaw:0,pitch:0}));const saved=readCheckpoint(JSON.stringify(payload));assert.deepEqual(saved.state.rubbingMarks,setup.state.rubbingMarks);assert.deepEqual(saved.state.routeTurns,[0,1,1]);assert.equal(saved.state.bathSteam,.85);assert.ok(saved.state.rubbingAligned);
 payload.state.rubbingMarks=[10,10,10,10,10,10];payload.state.routeTurns=[2,2,2];payload.state.rubbingOffset=[NaN,7];payload.state.bathSteam=100;payload.state.rubbingAligned=true;const invalid=readCheckpoint(JSON.stringify(payload));assert.deepEqual(invalid.state.rubbingMarks,[0,0,0,0,0,0]);assert.deepEqual(invalid.state.routeTurns,[1,0,1]);assert.equal(invalid.state.rubbingAligned,false);assert.equal(invalid.state.bathSteam,0);
 payload.state.tagRubbed=true;payload.state.routeRestored=true;delete payload.state.rubbingMarks;delete payload.state.routeTurns;const old=readCheckpoint(JSON.stringify(payload));assert.ok(old.state.rubbingMarks.every(n=>n===3));assert.deepEqual(old.state.routeTurns,[0,0,0]);assert.deepEqual(old.state.routeOrder,[0,1,2]);
});
