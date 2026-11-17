import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TRAY_TARGET,trayFits,STOCK,STOCK_CODE,MAP_TARGET,MAP_PLACES,POSTCARDS,MUSIC_PHRASES,SAFE_BEATS,SAFE_TARGET,EVAC_TARGET,EVAC_ROUTE,EVAC_NODES,STORY} from './public/puzzle-evidence.js';

test('all 256 inlay orientations have exactly one solution from the visible seams and border',()=>{
 const solutions=[];for(let n=0;n<256;n++){const v=[n%4,(n>>2)%4,(n>>4)%4,(n>>6)%4];if(trayFits(v))solutions.push(v);}
 assert.deepEqual(solutions,[TRAY_TARGET]);assert.equal(trayFits([-3,3,2,0]),false);
});
test('pantry evidence has plausible conserved quantities and a unique whole-portion combination',()=>{
 for(const j of STOCK){const remaining=j.gross-j.tare,used=j.initial-remaining;assert.ok(remaining>0&&remaining<j.initial);assert.ok(j.tare>0);assert.equal(used%j.portion,0);assert.ok(used/j.portion<10);}
 assert.equal(STOCK_CODE,'364');
 // Ignoring the container mass does not accidentally produce the correct digits.
 assert.notEqual(STOCK.map(j=>(j.initial-j.gross)/j.portion).join(''),STOCK_CODE);
});
test('postcard bearings can be derived geometrically from the printed map, with no dates',()=>{
 const expected=POSTCARDS.map(p=>{const a=MAP_PLACES.find(n=>n.id===p.from),b=MAP_PLACES.find(n=>n.id===p.to),dx=b.x-a.x,dy=b.y-a.y;assert.ok(dx===0||dy===0||Math.abs(dx)===Math.abs(dy));return(dx>0&&dy<0)?1:(dx<0&&dy===0)?6:3;});
 assert.deepEqual(expected,[1,6,3]);assert.deepEqual(MAP_TARGET,expected);
});
test('safe solution requires matching strike counts, not copying playback order',()=>{
 assert.equal(new Set(MUSIC_PHRASES.map(p=>p.beats)).size,4);assert.notDeepEqual(MUSIC_PHRASES.map(p=>p.symbol),SAFE_TARGET);
 assert.deepEqual(SAFE_TARGET.map(symbol=>MUSIC_PHRASES.find(p=>p.symbol===symbol).beats),SAFE_BEATS);
});
test('final cabinet directions follow the actual three segments on the printed plan',()=>{
 const dirs=EVAC_ROUTE.slice(1).map((id,i)=>{const a=EVAC_NODES.find(n=>n.id===EVAC_ROUTE[i]),b=EVAC_NODES.find(n=>n.id===id);return b.x<a.x?3:b.x>a.x?1:b.y>a.y?2:0;});assert.deepEqual(dirs,EVAC_TARGET);assert.ok(!EVAC_ROUTE.includes('lift'));
});
test('story fragments describe people, actions and evidence without printing lock combinations',()=>{
 for(const v of Object.values(STORY)){assert.ok(v.paragraphs.length>=3);assert.ok(v.paragraphs.join('').length>150);assert.doesNotMatch(v.paragraphs.join(''),/364|571|북동·서·남동|달·종·물결·별/);}
});
