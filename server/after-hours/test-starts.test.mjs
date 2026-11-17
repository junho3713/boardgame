import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TEST_STARTS,createTestStart,readCheckpoint,writeCheckpoint} from './public/test-starts.js';
import {phase,uvVisible,useItem} from './public/room-state.js';
import {canWalk} from './public/room-layout.js';

test('each test start is reachable and has the intended next puzzle',()=>{
 const phases={scale:'stock',plates:'stock',sink:'stock',bathEntry:'bathEntry',linen:'linen',linenLock:'linen',postcards:'neighborKey',desk317:'luggage',evacuationBox:'lastRoom',shower:'linen',teaBox:'tea',teaDoor:'tea',water:'stock',waterKey:'stockKey',towels:'linen',cups:'bathEntry',kettle:'stock',twin:'neighborKey',companion:'neighborKey',bedroom:'low',living:'bathEntry',kitchen:'stock',bath:'linen',hall:'enter317',room317:'luggage',clock:'clock',vanity:'drawer',uv:'mirror',music:'music',safe:'safe',exit:'lastRoom',stairs:'stairs',downstairs:'descend'};
 for(const point of TEST_STARTS){
  const {state}=createTestStart(point.id);
  assert.equal(phase(state),phases[point.id],point.id);
  assert.ok(canWalk(state,point.position[0],point.position[2]),point.id);
  assert.ok(point.look.every(Number.isFinite));
  assert.equal(state.complete,false);
 }
 assert.ok(uvVisible(createTestStart('uv').state));
 const vanity=createTestStart('vanity').state;
 assert.ok(useItem(vanity,'key','drawer'));assert.ok(vanity.drawerOpen);assert.equal(vanity.bathUnlocked,false);
 const hall=createTestStart('hall').state;
 assert.equal(hall.room317Open,false);assert.ok(useItem(hall,'passKey','entry317'));
 assert.ok(createTestStart('exit').state.exitOpen);
});

test('free exploration opens gates and starts never share mutable state',()=>{
 for(const point of TEST_STARTS){const s=createTestStart(point.id,true).state;
  for(const key of ['explore','doorOpen','room317Open','exitOpen','bathDoorOpen','showerOpen'])assert.equal(s[key],true,point.id+key);
 }
 const a=createTestStart('safe'),b=createTestStart('safe');a.state.inventory.push('receipt');a.state.rings[0]=0;
 assert.ok(!b.state.inventory.includes('receipt'));assert.equal(b.state.rings[0],5);
});

test('checkpoint roundtrip preserves progress, camera and usable items',()=>{
 const setup=createTestStart('vanity');setup.state.selected='key';setup.state.notes=[{title:'관찰',text:'수납장'}];setup.state.seconds=73;setup.state.wardrobeOpen=true;setup.state.suitcaseOpen=true;
 Object.assign(setup.state,{linenDigits:[6,2,0],trayTurns:[1,2,3,0],stockDigits:[3,1,4],companionArrows:[1,6,0],evacArrows:[2,0,3],stockWeights:[true,false,true,true],stockBottoms:[false,true,false],inlayInstalled:true,tagRubbed:true});
 const value={...setup,pointId:'vanity',position:[6.3,1.62,-.3],yaw:-1.5,pitch:-.5,luggageDigits:[2,8,4],safeSymbols:[1,0,2,3]};
 const saved=readCheckpoint(writeCheckpoint(value));
 assert.deepEqual(saved.state,setup.state);assert.deepEqual(saved.position,value.position);
 assert.equal(saved.yaw,value.yaw);assert.equal(saved.pitch,value.pitch);assert.equal(saved.clockHour,5);assert.equal(saved.clockMinute,40);
 assert.deepEqual(saved.luggageDigits,value.luggageDigits);assert.deepEqual(saved.safeSymbols,value.safeSymbols);
 assert.ok(useItem(saved.state,saved.state.selected,'drawer'));
});

test('corrupt or incompatible checkpoints are ignored and unknown fields filtered',()=>{
 for(const raw of [null,'{','null','{}',JSON.stringify({version:2}),JSON.stringify({version:2,state:{},position:[0,1,2],yaw:null,pitch:0})])assert.equal(readCheckpoint(raw),null);
 const raw=JSON.parse(writeCheckpoint({...createTestStart('bedroom'),pointId:'old-map',position:[0,1.62,2.7],yaw:0,pitch:9}));
 raw.state.inventory=['key','unknown','key'];raw.state.selected='unknown';raw.state.untrusted=true;raw.state.complete=true;raw.state.rings=[100,0,0];raw.state.notes=[null,{title:'valid',text:'text'}];
 const result=readCheckpoint(JSON.stringify(raw));
 assert.deepEqual(result.state.inventory,['key']);assert.equal(result.state.selected,null);assert.equal(result.state.untrusted,undefined);assert.equal(result.state.complete,false);assert.deepEqual(result.state.rings,[2,6,1]);assert.equal(result.state.notes.length,1);assert.equal(result.pitch,1.3);assert.equal(result.pointId,'bedroom');
});

test('old saved games that already took the spare key do not regenerate it in the new bedroom',()=>{
 const setup=createTestStart('room317'),raw=JSON.parse(writeCheckpoint({...setup,pointId:'room317',position:setup.point.position,yaw:0,pitch:0}));
 delete raw.state.companionSolved;delete raw.state.travelPostcardsSeen;
 const restored=readCheckpoint(JSON.stringify(raw));assert.equal(restored.state.companionSolved,true);assert.equal(restored.state.inventory.includes('passKey'),false);assert.equal(restored.state.room317Open,true);
});

test('existing checkpoints retain bedroom progress and later rewards after bathroom separation',()=>{const setup=createTestStart('uv'),raw=JSON.parse(writeCheckpoint({...setup,pointId:'uv',position:setup.point.position,yaw:0,pitch:0}));delete raw.state.drawerUnlocked;delete raw.state.linenSolved;raw.state.teaTinOpen=true;const restored=readCheckpoint(JSON.stringify(raw));assert.equal(restored.state.drawerUnlocked,true);assert.equal(restored.state.uvInstalled,true);assert.equal(restored.state.linenSolved,true);});

test('the scale placement survives refresh without duplicating a jar in inventory',()=>{const setup=createTestStart('water');setup.state.stockOnScale=1;setup.state.stockWeights[1]=true;setup.state.inventory.push('stock_coffee');setup.state.selected='stock_coffee';const raw=writeCheckpoint({...setup,pointId:'water',position:setup.point.position,yaw:0,pitch:0}),restored=readCheckpoint(raw);assert.equal(restored.state.stockOnScale,1);assert.equal(restored.state.inventory.includes('stock_coffee'),false);assert.equal(restored.state.selected,null);assert.equal(restored.state.stockWeights[1],true);});
