/* Symbol cards for realtime reinforcements. */
(function(root){'use strict';
 const art={
  rifle:['산탄','#597249','M3 17h8l4-4h15v-3H13l-4 3H3z M16 13h7l-2 4h-5z'],
  machinegun:['기관총','#58634b','M3 13h6l4-3h13v-3h4v7H18l-2 5h-4l2-5H8l-3 4H3z M22 17h3v3h-3z'],
  sniper:['저격','#45636a','M2 17h8l5-4h15v-2H19V8h-7v3h-2l-3 2H2z M14 16h3l2 5h-3z'],
  guntruck:['통신','#7d672e','M7 12l10-5 10 5v11l-10 5-10-5z M16 5V1h2v4z','M12 16h2v2h-2z M20 13h2v2h-2z M19 21h2v2h-2z'],
  rocket:['지뢰','#834a43','M4 15l12-6 12 6v10H4z M10 10V7l4-2 3 2v2 M19 10V7l4-2 3 2v4','M9 19h14v2H9z'],
  mortar:['박격포','#635b70','M7 25h20v3H5v-3z M13 22L23 5l5 3-11 16z M17 18l8 7h-3l-7-5z'],
  tank:['전차','#575c47','M3 18l4-4h20l3 4v7H3z M10 14v-5h10v3h10v2z','M7 20h3v3H7z M15 20h3v3h-3z M23 20h3v3h-3z'],
  medic:['의무','#43785b','M12 5h8v7h7v8h-7v7h-8v-7H5v-8h7z'],
  lucky:['레토나','#4f7245','M16 15C4 17 5 6 12 6c3 0 4 3 4 6 0-3 1-6 4-6 7 0 8 11-4 9 12-2 11 9 4 9-3 0-4-3-4-6 0 3-1 6-4 6-7 0-8-11 4-9z M15 21h2l-2 8h-3z'],
  drone:['드론','#427589','M2 7h10v3H2z M20 7h10v3H20z M2 22h10v3H2z M20 22h10v3H20z M9 9l7 5 7-5 2 2-6 5 6 5-2 2-7-5-7 5-2-2 6-5-6-5z','M14 14h4v4h-4z'],
  mystery:['미스터리','#735783','M4 13l12-6 12 6-12 6z M5 16l10 5v8L5 24z M17 21l10-5v8l-10 5z M16 2l2 2-2 2-2-2z','M15 12h3v2h-2v2h-2v-2h1z']
 };
 function icon(type){
  const spec=art[type];if(!spec)return '';
  return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="'+spec[2]+'"/>'+
   (spec[3]?'<path fill="var(--summon-accent)" d="'+spec[3]+'"/>':'')+'</svg>';
 }
 function create(panel,activate){
  const slots=Array.from({length:6},(_,i)=>{
   const node=document.createElement('button');node.type='button';node.className='summon-slot';
   node.innerHTML='<span class="summon-key"></span><span class="summon-level"></span><span class="summon-icon"></span><span class="summon-caption"></span><span class="summon-cost"></span>';
   node.firstElementChild.textContent=i===5?'F':i+1;
   node.addEventListener('click',()=>activate(i+1));panel.append(node);return node;
  });
  const previous=[];
  return {update(game){
   panel.hidden=!game.usesSummoning()||['ready','ended'].includes(game.phase);
   document.documentElement.classList.toggle('summon-active',!panel.hidden);
   if(panel.hidden)return;
   slots.forEach((node,i)=>{
    const type=i===5?'mystery':game.summonSlots[i],entry=art[type];
    const status=game.summonStatus(i+1),level=type&&i<5?game.tech[0][type]:0,evolved=!!game.evolved[type];
    const ratio=status.cost?Math.min(1,Math.max(0,game.cash[0]/status.cost)):0;
    node.style.setProperty('--charge',ratio*100+'%');
    const key=[type,level,evolved,status.reason,status.cost].join('/');
    if(previous[i]===key)return;previous[i]=key;
    node.style.setProperty('--summon-accent',entry?.[1]||'#3c5045');
    node.classList.toggle('evolved',evolved);node.classList.toggle('affordable',!!entry&&!status.reason);
    node.classList.toggle('empty',!entry);node.disabled=!entry;
    node.setAttribute('aria-disabled',String(!!status.reason));
    const name=(i===5?'미스터리 장난감 박스':root.FrontTypes[type]?.name)||'빈 슬롯';
    node.title=name+' · '+(status.reason||'소환 가능');
    node.setAttribute('aria-label',(i===5?'F 또는 6':i+1)+'번, '+name+(level?', 레벨 '+level:'')+(status.cost?', '+status.cost+' 골드':'')+(status.reason?', '+status.reason:''));
    node.children[1].textContent=level?'Lv.'+level:'';
    node.children[2].innerHTML=icon(type);
    node.children[3].textContent=entry?.[0]||'미등록';
    node.children[4].textContent=status.cost?status.cost+'G':'';
   });
  }};
 }
 function shadows(ctx,game){
  for(const p of game.dropPods||[]){
   const progress=Math.min(1,Math.max(0,1-(p.landAt-game.time)/root.FrontSummoning.rules.fall)),size=.2+.8*progress,r=root.FrontSummoning.isVehicle(p.type)?35:19;
   ctx.save();ctx.fillStyle='rgba(15,26,21,'+(.24+progress*.28)+')';
   ctx.beginPath();ctx.ellipse(p.x,p.y+3,r*size,r*.35*size,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
 function airborne(ctx,game,drawModel){
  for(const p of game.dropPods||[]){
   const {fall,height}=root.FrontSummoning.rules,progress=Math.min(1,Math.max(0,1-(p.landAt-game.time)/fall));
   ctx.save();ctx.translate(p.x,p.y-(1-progress**2)*height);
   if(p.goldenSummon){ctx.scale(1.5,1.5);ctx.filter='sepia(.9) saturate(2.4) brightness(1.3)';}
   const draw=()=>drawModel(p,!!(p.summonEvolved||game.evolved[p.type]));
   if(!(game.coop?game.withOwner(p.coopOwner,draw):draw())){
    ctx.fillStyle=art[p.type][1];ctx.fillRect(-13,-33,26,27);
    ctx.fillStyle='#d6dfad';ctx.fillRect(-10,-30,20,3);
   }
   ctx.restore();
  }
 }
 function impact(ctx,e){
  if(e.kind!=='summonLanding')return false;
  const progress=1-e.t/e.max;
  ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=(1-progress)*.85;
  if(e.heavy){
   const r=e.radius*(.16+.84*progress);ctx.lineWidth=3;ctx.strokeStyle='#fff8e5';
   ctx.beginPath();ctx.ellipse(0,0,r,r*.43,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.fillStyle='#deca9f';
  for(let i=0;i<(e.heavy?12:5);i++){
   const a=i*2.399963,r=(e.heavy?65:30)*progress;
   ctx.beginPath();ctx.ellipse(Math.cos(a)*r,Math.sin(a)*r*.42,3+progress*4,2+progress*2,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();return true;
 }
 function shake(game){
  const hit=game.effects.findLast(e=>e.kind==='summonLanding'&&e.heavy);
  const age=hit?game.time-hit.at:Infinity;
  if(age<0||age>=.15||Math.hypot(hit.x-game.camera.x,hit.y-game.camera.y)>600)return [0,0];
  const k=1-age/.15;return [Math.sin(age*95+1)*5*k,Math.cos(age*82)*4*k];
 }
 root.FrontSummonHud={create,shadows,airborne,impact,shake};
})(window);

