/* Retain presentation identity while replacing all authoritative state fields. */
(function(root){'use strict';
function applySnapshot(game,data,unpack){
 const previous=new Map(game.units.map(u=>[u.id,u]));
 unpack(game,data);
 const replace=new Map();
 for(const next of game.units){
  const old=previous.get(next.id);
  if(!old||old.type!==next.type||old.team!==next.team||old.coopOwner!==next.coopOwner)continue;
  for(const key of Object.keys(old))if(!(key in next))delete old[key];
  Object.assign(old,next);replace.set(next,old);
 }
 const seen=new WeakSet();
 function visit(value){
  if(!value||typeof value!=='object')return value;
  value=replace.get(value)||value;
  if(seen.has(value))return value;seen.add(value);
  for(const key of Object.keys(value))value[key]=visit(value[key]);
  return value;
 }
 visit(game);return game;
}
const api={applySnapshot};root.FrontCoopState=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
