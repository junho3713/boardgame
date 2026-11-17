import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,addItem,combineFilms,alignFilm,setClock,useItem,uvVisible,unlockDoor,RING_TARGET,unlockLuggage,hearTune,unlockSafe,MUSIC_SEQUENCE,phase,unlockCompanionCase,COMPANION_TARGET,unlockKitchen,moveWater,takeJugKey,takeStairKey} from './public/room-state.js';
test('the clock cannot be bypassed by guessing before reconstructing and aligning the film',()=>{const s=createState();assert.equal(setClock(s,5,40),false);addItem(s,'filmA');assert.equal(combineFilms(s),false);addItem(s,'filmB');assert.equal(combineFilms(s),true);assert.deepEqual(s.inventory,['film']);assert.equal(alignFilm(s,2,1,1),false);assert.equal(setClock(s,5,40),false);assert.equal(alignFilm(s,2,1,0),true);assert.equal(setClock(s,5,40),true);assert.ok(s.inventory.includes('key'));});
test('a full playthrough consumes the correct items and supports reopening the drawer',()=>{const s=createState();addItem(s,'filmA');addItem(s,'filmB');combineFilms(s);alignFilm(s,2,1,0);setClock(s,5,40);assert.equal(useItem(s,'key','lamp'),false);assert.equal(useItem(s,'key','drawer'),false);assert.equal(useItem(s,'key','bathDoor'),true);assert.equal(useItem(s,'key','drawer'),true);assert.equal(s.inventory.includes('key'),false);addItem(s,'bulb');assert.equal(useItem(s,'bulb','lamp'),true);assert.equal(s.inventory.includes('bulb'),false);s.frameTaken=true;s.lightOn=false;s.curtainsClosed=true;assert.equal(uvVisible(s),true);assert.equal(unlockDoor(s),false);s.rings=[...RING_TARGET];assert.equal(unlockDoor(s),true);assert.equal(s.bedroomOpen,true);assert.equal(s.doorOpen,false);});
test('the UV clue responds to every physical light condition and stays usable after changing lights again',()=>{const s=createState();s.uvInstalled=true;s.lightOn=false;s.curtainsClosed=true;assert.equal(uvVisible(s),true);s.lampOn=false;assert.equal(uvVisible(s),false);s.lampOn=true;s.curtainsClosed=false;assert.equal(uvVisible(s),false);s.curtainsClosed=true;s.lightOn=true;assert.equal(uvVisible(s),false);s.rings=[...RING_TARGET];assert.equal(unlockDoor(s),true);});
test('exploration starts with the passage open while story mode remains locked',()=>{assert.equal(createState(true).doorOpen,true);const s=createState(false);s.rings=[...RING_TARGET];assert.equal(unlockDoor(s),false);assert.equal(s.doorOpen,false);});
test('317 continues through luggage, item use, music observation and a separate corridor key',()=>{
 const s=createState();s.doorOpen=true;
 assert.equal(s.complete,false);assert.equal(unlockLuggage(s,'284'),false);
 s.room317Entered=true;assert.equal(phase(s),'luggage');
 assert.equal(unlockLuggage(s,'248'),false);assert.deepEqual(s.inventory,[]);
 assert.equal(unlockLuggage(s,'284'),true);assert.equal(phase(s),'music');
 s.selected='windingKey';assert.equal(useItem(s,'windingKey','exit317'),false);assert.equal(s.selected,'windingKey');
 assert.equal(hearTune(s),false);assert.equal(unlockSafe(s,MUSIC_SEQUENCE),false);
 assert.equal(useItem(s,'windingKey','musicBox'),true);assert.equal(s.selected,null);assert.equal(phase(s),'listen');
 assert.equal(unlockSafe(s,MUSIC_SEQUENCE),false);assert.equal(hearTune(s),true);assert.equal(phase(s),'safe');
 assert.equal(unlockSafe(s,[0,1,2,3]),false);assert.equal(unlockSafe(s,[...MUSIC_SEQUENCE,0]),false);
 assert.equal(unlockSafe(s,MUSIC_SEQUENCE),true);assert.equal(s.complete,false);assert.equal(s.exitOpen,false);assert.equal(phase(s),'corridor');
 assert.equal(useItem(s,'exitKey','drawer'),false);assert.equal(useItem(s,'exitKey','exit317'),true);assert.equal(s.exitOpen,true);
 assert.equal(s.inventory.includes('exitKey'),false);
});
test('reopening solved 317 puzzles never duplicates or regenerates consumed keys',()=>{
 const s=createState();s.room317Entered=true;unlockLuggage(s,'284');unlockLuggage(s,'284');
 assert.deepEqual(s.inventory,['windingKey']);useItem(s,'windingKey','musicBox');unlockLuggage(s,'284');assert.deepEqual(s.inventory,[]);
 hearTune(s);unlockSafe(s,MUSIC_SEQUENCE);unlockSafe(s,MUSIC_SEQUENCE);assert.deepEqual(s.inventory,['exitKey']);
 useItem(s,'exitKey','exit317');unlockSafe(s,MUSIC_SEQUENCE);assert.deepEqual(s.inventory,[]);
 s.lightOn=false;s.curtainsClosed=false;assert.equal(phase(s),'lastRoom');
});


test('all inter-room locks form a solvable chain without consuming a needed key early',()=>{
 const s=createState();assert.equal(unlockKitchen(s,[0,1,2]),false);assert.equal(moveWater(s,'fillLarge'),false);assert.equal(takeJugKey(s),false);assert.equal(unlockCompanionCase(s,COMPANION_TARGET),false);
 addItem(s,'filmA');addItem(s,'filmB');combineFilms(s);alignFilm(s,2,1,0);setClock(s,5,40);
 assert.equal(useItem(s,'key','drawer'),false);assert.ok(useItem(s,'key','bathDoor'));assert.ok(s.inventory.includes('key'));assert.ok(useItem(s,'key','drawer'));
 addItem(s,'bulb');useItem(s,'bulb','lamp');s.rings=[...RING_TARGET];assert.ok(unlockDoor(s));assert.ok(s.bedroomOpen);assert.equal(s.doorOpen,false);
 assert.equal(unlockKitchen(s,[0,1,2]),false);s.teaTraySeen=true;addItem(s,'tinKey');assert.equal(useItem(s,'tinKey','twinDoor'),false);assert.ok(useItem(s,'tinKey','teaTin'));s.teaNoteSeen=true;assert.equal(unlockKitchen(s,[2,1,0]),false);assert.ok(unlockKitchen(s,[0,1,2]));
 for(const action of ['fillLarge','toSmall','emptySmall','toSmall','fillLarge','toSmall'])assert.ok(moveWater(s,action));assert.equal(s.jugLarge,4);assert.equal(s.jugSmall,3);assert.ok(s.jugSolved);assert.equal(s.inventory.includes('twinKey'),false);
 assert.ok(takeJugKey(s));assert.equal(takeJugKey(s),false);assert.ok(useItem(s,'twinKey','twinDoor'));assert.equal(s.inventory.includes('twinKey'),false);
 s.travelPostcardsSeen=true;assert.equal(unlockCompanionCase(s,[2,0,1]),false);assert.ok(unlockCompanionCase(s,COMPANION_TARGET));assert.equal(useItem(s,'passKey','entry317'),false);assert.ok(useItem(s,'suiteKey','suiteDoor'));assert.ok(useItem(s,'passKey','entry317'));unlockCompanionCase(s,COMPANION_TARGET);assert.equal(s.inventory.includes('passKey'),false);assert.equal(s.inventory.includes('suiteKey'),false);
});
test('every reachable jug configuration preserves capacity, and reset never traps progress',()=>{
 const actions=['fillSmall','fillLarge','emptySmall','emptyLarge','toSmall','toLarge'],q=[[0,0]],seen=new Set();let solved=false;
 while(q.length){const [a,b]=q.shift(),key=a+','+b;if(seen.has(key))continue;seen.add(key);for(const action of actions){const s=createState();Object.assign(s,{kitchenOpen:true,jugSmall:a,jugLarge:b});moveWater(s,action);assert.ok(s.jugSmall>=0&&s.jugSmall<=3&&s.jugLarge>=0&&s.jugLarge<=5);if(action.startsWith('to'))assert.equal(s.jugSmall+s.jugLarge,a+b);if(s.jugSolved)solved=true;else q.push([s.jugSmall,s.jugLarge]);}}
 assert.ok(solved);
});

test('last-room observation and manual key pickup gate the corridor stairs without ending play',()=>{
 const s=createState();assert.equal(takeStairKey(s),false);s.room317Entered=true;s.luggageOpen=true;s.musicWound=true;s.tuneHeard=true;
 unlockSafe(s,MUSIC_SEQUENCE);assert.equal(s.inventory.includes('stairKey'),false);assert.ok(useItem(s,'exitKey','exit317'));
 assert.equal(phase(s),'lastRoom');assert.equal(takeStairKey(s),false);s.evacuationRead=true;
 assert.ok(takeStairKey(s));assert.equal(takeStairKey(s),false);assert.equal(phase(s),'stairs');
 assert.equal(useItem(s,'stairKey','entry317'),false);assert.equal(useItem(s,'stairKey','exit317'),false);
 assert.ok(useItem(s,'stairKey','stairDoor'));assert.equal(s.inventory.includes('stairKey'),false);assert.equal(phase(s),'descend');assert.equal(s.complete,false);
 assert.equal(takeStairKey(s),false);
});
