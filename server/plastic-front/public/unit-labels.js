/* Unit-owned evolution names, independent of the viewing player's progress. */
(function(root){'use strict';
function isEvolved(game,u){
 if(u.team!==0)return false;
 return !!(game.coop?game.withOwner(u.coopOwner,()=>game.evolved[u.type]):game.evolved[u.type]);
}
function evolution(game,u){
 if(u.hp<=0||!isEvolved(game,u))return null;
 const name=game.stats(u).name;
 const vehicle=['tank','crimsonAce','guntruck','lucky'].includes(u.type),rina=u.type==='medic'&&u.appearance==='rina';
 const rise=u.star>=2?(vehicle?79:rina?86:66)-(vehicle?10:8)+24:vehicle?90:rina?98:79;
 return {text:name,x:u.x,y:u.y-rise,size:10};
}
const api={isEvolved,evolution};root.FrontUnitLabels=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
