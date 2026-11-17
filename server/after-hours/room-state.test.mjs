import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,addItem,combineFilms,alignFilm,setClock,useItem,uvVisible,unlockDoor,RING_TARGET,unlockLuggage,hearTune,unlockSafe,MUSIC_SEQUENCE,phase,unlockCompanionCase,COMPANION_TARGET,takeInlay,solveTray,takeKitchenKey,unlockStock,takeStockContents,takeCompanionKeys,takeWindingKey,takeInnerKey,unlockEvacuationBox,takeStairKey} from './public/room-state.js';
test('the clock cannot be bypassed by guessing before reconstructing and aligning the film',()=>{const s=createState();assert.equal(setClock(s,5,40),false);addItem(s,'filmA');assert.equal(combineFilms(s),false);addItem(s,'filmB');assert.equal(combineFilms(s),true);assert.deepEqual(s.inventory,['film']);assert.equal(alignFilm(s,2,1,1),false);assert.equal(setClock(s,5,40),false);assert.equal(alignFilm(s,2,1,0),true);assert.equal(setClock(s,5,40),true);assert.ok(s.inventory.includes('key'));});
test('a full playthrough consumes the correct items and supports reopening the drawer',()=>{const s=createState();addItem(s,'filmA');addItem(s,'filmB');combineFilms(s);alignFilm(s,2,1,0);setClock(s,5,40);assert.equal(useItem(s,'key','lamp'),false);assert.equal(useItem(s,'key','drawer'),false);assert.equal(useItem(s,'key','bathDoor'),true);assert.equal(useItem(s,'key','drawer'),true);assert.equal(s.inventory.includes('key'),false);addItem(s,'bulb');assert.equal(useItem(s,'bulb','lamp'),true);assert.equal(s.inventory.includes('bulb'),false);s.frameTaken=true;s.lightOn=false;s.curtainsClosed=true;assert.equal(uvVisible(s),true);assert.equal(unlockDoor(s),false);s.rings=[...RING_TARGET];assert.equal(unlockDoor(s),true);assert.equal(s.bedroomOpen,true);assert.equal(s.doorOpen,false);});
test('the UV clue responds to every physical light condition and stays usable after changing lights again',()=>{const s=createState();s.uvInstalled=true;s.lightOn=false;s.curtainsClosed=true;assert.equal(uvVisible(s),true);s.lampOn=false;assert.equal(uvVisible(s),false);s.lampOn=true;s.curtainsClosed=false;assert.equal(uvVisible(s),false);s.curtainsClosed=true;s.lightOn=true;assert.equal(uvVisible(s),false);s.rings=[...RING_TARGET];assert.equal(unlockDoor(s),true);});
test('exploration starts with the passage open while story mode remains locked',()=>{assert.equal(createState(true).doorOpen,true);const s=createState(false);s.rings=[...RING_TARGET];assert.equal(unlockDoor(s),false);assert.equal(s.doorOpen,false);});

test('the entire post-mirror chain requires physical installation, separate pickup, and the correct key for each door',()=>{
 const s=createState();s.bedroomOpen=true;
 assert.equal(takeInlay(s),false);assert.equal(solveTray(s,[1,3,2,0]),false);assert.equal(takeKitchenKey(s),false);
 addItem(s,'tinKey');assert.ok(useItem(s,'tinKey','teaTin'));assert.ok(takeInlay(s));assert.equal(takeInlay(s),false);
 assert.equal(useItem(s,'inlay','kitchenDoor'),false);assert.ok(useItem(s,'inlay','teaTray'));
 assert.equal(solveTray(s,[0,0,0,0]),false);assert.ok(solveTray(s,[1,3,2,0]));assert.equal(s.kitchenOpen,false);assert.equal(s.inventory.includes('kitchenKey'),false);
 assert.ok(takeKitchenKey(s));assert.equal(takeKitchenKey(s),false);assert.ok(useItem(s,'kitchenKey','kitchenDoor'));
 assert.equal(unlockStock(s,'564'),false);assert.ok(unlockStock(s,'364'));assert.equal(s.inventory.includes('twinKey'),false);
 assert.ok(takeStockContents(s));assert.equal(takeStockContents(s),false);assert.ok(s.inventory.includes('tourMap'));assert.ok(useItem(s,'twinKey','twinDoor'));
 assert.equal(unlockCompanionCase(s,[0,1,2]),false);assert.ok(unlockCompanionCase(s,COMPANION_TARGET));assert.equal(s.inventory.includes('passKey'),false);
 assert.ok(takeCompanionKeys(s));assert.equal(useItem(s,'passKey','entry317'),false);assert.ok(useItem(s,'suiteKey','suiteDoor'));assert.ok(useItem(s,'passKey','entry317'));
 s.room317Entered=true;assert.equal(phase(s),'luggage');assert.equal(unlockLuggage(s,'284'),false);assert.ok(unlockLuggage(s,'571'));assert.equal(s.inventory.includes('windingKey'),false);
 assert.ok(takeWindingKey(s));assert.ok(useItem(s,'windingKey','musicBox'));assert.ok(hearTune(s));assert.equal(unlockSafe(s,[3,2,0,1]),false);assert.ok(unlockSafe(s,MUSIC_SEQUENCE));
 assert.equal(s.inventory.includes('exitKey'),false);assert.ok(takeInnerKey(s));assert.ok(useItem(s,'exitKey','exit317'));
 s.evacuationRead=true;assert.equal(takeStairKey(s),false);assert.equal(unlockEvacuationBox(s,[2,1,1]),false);assert.ok(unlockEvacuationBox(s,[2,3,3]));assert.ok(takeStairKey(s));assert.ok(useItem(s,'stairKey','stairDoor'));
 assert.equal(phase(s),'descend');assert.equal(s.complete,false);
 for(const [fn,key]of[[takeKitchenKey,'kitchenKey'],[takeStockContents,'twinKey'],[takeCompanionKeys,'passKey'],[takeWindingKey,'windingKey'],[takeInnerKey,'exitKey'],[takeStairKey,'stairKey']]){assert.equal(fn(s),false);assert.ok(!s.inventory.includes(key));}
});
test('inventory tools have material prerequisites, and a pencil remains usable after rubbing',()=>{
 const s=createState();addItem(s,'pencil');assert.equal(useItem(s,'pencil','tag317'),false);addItem(s,'tag');assert.equal(useItem(s,'pencil','tag317'),false);addItem(s,'receipt');assert.ok(useItem(s,'pencil','tag317'));assert.equal(s.tagRubbed,true);assert.ok(s.inventory.includes('pencil'));assert.ok(s.inventory.includes('receipt'));
});
test('combination locks do not depend on hidden read flags or claim success for malformed values',()=>{
 const s=createState();s.kitchenOpen=true;s.twinOpen=true;s.room317Entered=true;s.exitOpen=true;
 assert.ok(unlockStock(s,'364'));assert.ok(unlockCompanionCase(s,COMPANION_TARGET));assert.ok(unlockLuggage(s,'571'));assert.ok(unlockSafe(s,MUSIC_SEQUENCE));assert.ok(unlockEvacuationBox(s,[2,3,3]));
 assert.equal(s.travelPostcardsSeen,false);assert.equal(s.tuneHeard,false);assert.equal(s.evacuationRead,false);
 for(const value of [null,[],[1,2,3,4,5],['1','6','3']])assert.equal(unlockCompanionCase(s,value),false);
});
