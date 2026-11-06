/* Unit-owned evolution names, independent of the viewing player's progress. */
(function(root){'use strict';
function isEvolved(game,u){
 if(u.team!==0)return false;
 return !!(game.coop?game.withOwner(u.coopOwner,()=>game.evolved[u.type]):game.evolved[u.type]);
}
function evolution(game,u,ctx){
 if(u.hp<=0||!isEvolved(game,u))return null;
 const name=game.stats(u).name;
 const vehicle=['tank','crimsonAce','guntruck','lucky'].includes(u.type),rina=u.type==='medic'&&u.appearance==='rina';
 let rise=vehicle?90:rina?98:79;
 if(u.star>=2){
  const starY=u.y-((vehicle?79:rina?86:66)-(vehicle?10:8))-6;
  let ascent=9,descent=2;
  if(ctx){
   ctx.save();ctx.font='600 12px "Noto Sans KR",sans-serif';
   ascent=ctx.measureText('★'.repeat(u.star)).actualBoundingBoxAscent??ascent;
   ctx.font='600 10px "Noto Sans KR",sans-serif';
   descent=ctx.measureText(name).actualBoundingBoxDescent??descent;ctx.restore();
  }
  rise=u.y-starY+ascent+4+descent;
 }
 return {text:name,x:u.x,y:u.y-rise,size:10};
}
const api={isEvolved,evolution};root.FrontUnitLabels=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
