/* Adapted from NANG-SAN-KHAM/indie-avalon (MIT), commit
 * 09b39c49bddb8aa73d7734668ed74c137d9f674a.
 * constants/game.ts, utils/roles.ts and core/game-engine.ts.
 * Changes: CommonJS, stable role keys, minimal private vision projection,
 * no raw room spreading, configurable role pool supplied by our engine.
 * Copyright (c) 2026 Nang San Kham. See LICENSE.upstream.
 */
'use strict';
const MISSION_SIZES={5:[2,3,2,3,3],6:[2,3,4,3,4],7:[2,3,3,4,4],8:[3,4,4,5,5],9:[3,4,4,5,5],10:[3,4,4,5,5]};
const EVIL=new Set(['morgana','mordred','oberon','assassin','minion']);
const isEvil=role=>EVIL.has(role);
const isMissionFailed=(n,quest,failCount)=>failCount>=(n>=7&&quest===4?2:1);
function vision(players,viewer){
 if(viewer.role==='merlin')return {kind:'evil',ids:players.filter(p=>isEvil(p.role)&&p.role!=='mordred').map(p=>p.id)};
 if(viewer.role==='percival')return {kind:'candidates',ids:players.filter(p=>p.role==='merlin'||p.role==='morgana').map(p=>p.id)};
 if(isEvil(viewer.role)&&viewer.role!=='oberon')return {kind:'allies',ids:players.filter(p=>p.id!==viewer.id&&isEvil(p.role)&&p.role!=='oberon').map(p=>p.id)};
 return {kind:'none',ids:[]};
}
module.exports={MISSION_SIZES,isEvil,isMissionFailed,vision};
