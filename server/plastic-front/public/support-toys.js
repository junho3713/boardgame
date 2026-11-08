/* Support toys: separate slots, simulation clocks, owner-safe choices and bounded crowd control. */
(function(root){'use strict';
function install({FrontGame:Game,TYPES}){
 const p=Game.prototype;if(p.supportToyVersion)return;p.supportToyVersion=1;
 const rules={slots:2,range:300,move:1.05,haste:1.03,repair:20,controlResistance:3,odds:{toyDrum:.25,toyDecoyMaker:.25,toyTurtle:.25,toyStunner:.25}};
 const toys={
  toyDrum:{name:'태엽 북 토이',icon:'♫',hp:200,speed:145,cooldown:0,detail:'주변 아군 이동 +5% · 일반 공격속도 +3% · 중첩 없음'},
  toyDecoyMaker:{name:'미끼 토이',icon:'◇',hp:180,speed:145,cooldown:12,detail:'12초마다 미끼 · 일반 적 최대 2명 유도 · 최대 3초'},
  toyTurtle:{name:'물대포 거북이',icon:'≈',hp:480,speed:90,cooldown:5,detail:'5초마다 최대 3명 넉백 · 곤충형 보스도 가능 · 전투 중 느림'},
  toyStunner:{name:'전기 토이',icon:'ϟ',hp:180,speed:140,cooldown:10,detail:'10초마다 위협적인 일반 적 1초 스턴 · 낮은 내구도'}
 };
 const insects=new Set(['ant','soldierAnt','beetle','bruteBeetle','stagBeetle','rhinoBeetle','honeybee','hornet','butterfly','bombBug','acidBeetle']);
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const reset=p.reset,stats=p.stats,canTarget=p.canTarget,pursuit=p.pursuitTarget,refresh=p.refreshCommanderHealth;
 for(const [type,t]of Object.entries(toys))TYPES[type]={name:t.name,icon:t.icon,hp:t.hp,speed:t.speed,damage:0,rate:100,range:0,r:type==='toyTurtle'?20:15,cost:0,role:t.detail};
 TYPES.toyDecoy={name:'장난감 미끼',icon:'◇',hp:75,speed:0,damage:0,rate:100,range:0,r:13,cost:0,stationary:true,role:'일반 적 최대 2명 유도 · 3초 뒤 소멸'};
 p.reset=function(){reset.call(this);};
 p.isSupportToy=function(u){return Object.hasOwn(toys,typeof u==='string'?u:u?.type);};
 p.isSupportEntity=function(u){return this.isSupportToy(u)||u?.type==='toyDecoy';};
 p.supportToys=function(owner=this.coopOwner||0){return this.units.filter(u=>this.isSupportToy(u)&&!u.toyRetired&&(!this.coop||u.coopOwner===owner)).sort((a,b)=>(a.toySlot||0)-(b.toySlot||0)||a.id-b.id);};
 p.supportToyOffer=function(){return this.supplyState().toyOffer||null;};
 p.stats=function(u){const s=stats.call(this,u);if(this.isSupportEntity(u)){
  const level=this.commanderLevel(this.commander(0));s.hp=TYPES[u.type].hp*(1+.12*(level-1));s.damage=0;s.defense=u.type==='toyTurtle'?24:8;
 }
 if(u.team===0&&this.units?.some(t=>t.type==='toyDrum'&&t.hp>0&&!t.toyRetired&&distance(t,u)<=rules.range)){
  s.speed*=rules.move;if(u.type!=='medic')s.rate/=rules.haste;
 }return s;};
 p.refreshCommanderHealth=function(){refresh.call(this);for(const t of this.supportToys()){const hp=this.stats(t).hp,ratio=t.hp/Math.max(1,t.maxHp);t.maxHp=hp;t.hp=hp*ratio;}};
 p.addSupportToy=function(type,slot){
  if(!this.isSupportToy(type))return null;const current=this.supportToys();if(current.length>=rules.slots)return null;
  const c=this.commander(0),u=this.addUnit(0,type,c.x+(slot===1?65:-65),c.y+80,true);u.toySlot=slot??([0,1].find(s=>!current.some(t=>t.toySlot===s))??0);u.toyNextAt=this.time+.8;u.hp=u.maxHp=this.stats(u).hp;this.resolvePosition(u);return u;
 };
 p.collectSupportToy=function(pickup,type){
  const state=this.supplyState();if(state.toyOffer){if(this.time>=(pickup.nextToyHint||0)){pickup.nextToyHint=this.time+2;this.notify('toast','서포토이 교체를 먼저 선택하세요 · 희귀 보급은 유지됩니다');}return false;}
  const own=this.supportToys(),same=own.find(u=>u.type===type);pickup.active=false;pickup.supplyKind=type;state.collected++;this.gainXP(18);this.awardGold(5);
  if(same){same.toyDownUntil=0;same.diedAt=undefined;same.hp=same.maxHp=this.stats(same).hp;this.notify('toast',toys[type].name+' 중복 · 기존 서포토이 완전 수리');}
  else if(own.length<rules.slots){this.addSupportToy(type);this.notify('toast','서포토이 합류 · '+toys[type].name+' · '+toys[type].detail);}
  else{state.toyOffer={type,at:this.time};if(this.coop)this.coopInvulnerable[this.coopOwner]=Math.max(this.coopInvulnerable[this.coopOwner]||0,this.time+5);this.notify('toast','새 서포토이 · '+toys[type].name+' · 교체할 슬롯 또는 현재 편성 유지 선택');}
  this.effects.push({kind:'fieldSupply',x:pickup.x,y:pickup.y,reward:'supportToy',t:1.2,max:1.2,team:0});this.notify('change');return true;
 };
 p.resolveSupportToyOffer=function(id){
  const state=this.supplyState(),offer=state.toyOffer;if(this.phase!=='playing'||!offer||this.commander(0).hp<=0)return false;
  if(id==='keep'){state.toyOffer=null;this.notify('change');return true;}
  if(!Number.isInteger(id))return false;const old=this.supportToys().find(t=>t.id===id);if(!old)return false;
  const slot=old.toySlot;old.toyRetired=true;old.hp=0;old.diedAt=this.time;this.units=this.units.filter(t=>t!==old);state.toyOffer=null;this.addSupportToy(offer.type,slot);this.notify('toast','서포토이 교체 · '+toys[offer.type].name);this.notify('change');return true;
 };
 p.autoSupportToyOffer=function(){const offer=this.supportToyOffer();if(!offer)return;const rank=t=>['toyTurtle','toyStunner'].includes(t.type)?2:1,own=this.supportToys().sort((a,b)=>rank(a)-rank(b)||a.hp/a.maxHp-b.hp/b.maxHp);this.resolveSupportToyOffer(own[0]&&rank({type:offer.type})>rank(own[0])?own[0].id:'keep');};
 p.disableSupportEntity=function(u){
  u.hp=0;u.diedAt=this.time;if(this.isSupportToy(u)){u.toyDownUntil=this.time+rules.repair;this.notify('toast',toys[u.type].name+' 파손 · 20초 후 수리');}
  else u.toyExpires=this.time;this.effects.push({kind:'burst',x:u.x,y:u.y,t:.4,max:.4,team:0});
 };
 p.supportDecoyTarget=function(u){if(u.team===0||u.boss||u.roadCaptain)return null;return this.units.find(t=>t.type==='toyDecoy'&&t.hp>0&&t.toyExpires>this.time&&t.toyLuredIds?.includes(u.id)&&distance(u,t)<500)||null;};
 p.canTarget=function(u,t){if(t?.type==='toyDecoy'&&(u.team===0||u.boss||u.roadCaptain||t.toyExpires<=this.time||!t.toyLuredIds?.includes(u.id)))return false;return canTarget.call(this,u,t);};
 p.pursuitTarget=function(u){return this.supportDecoyTarget(u)||pursuit.call(this,u);};
 p.supportControlAllowed=function(t,kind){
  if(t.team===0||t.hp<=0||this.bossInvulnerable(t)||this.time<(t.toyControlReadyAt||0)||this.time<(t.toyStunUntil||0))return false;
  const boss=t.boss||t.roadCaptain||t.finalBoss;return !boss||kind==='push'&&insects.has(t.type);
 };
 p.pushSupportTarget=function(u,t){
  if(!this.supportControlAllowed(t,'push'))return false;const a=Math.atan2(t.y-u.y,t.x-u.x),n=t.boss?40:72,b=this.bounds();let x=t.x,y=t.y;
  for(let d=8;d<=n;d+=8){const q={x:clamp(t.x+Math.cos(a)*d,45,b.width-45),y:clamp(t.y+Math.sin(a)*d,70,b.height-70)};if(!this.isFlying(t)&&!this.freePosition(q.x,q.y,this.collisionRadius(t)))break;x=q.x;y=q.y;}
  t.x=x;t.y=y;if(t.bikeAttack?.origin){t.bikeAttack.origin.x=x;t.bikeAttack.origin.y=y;}t.hitReaction={at:this.time,angle:a,power:1,heavy:true};t.route=t.routeGoal=null;t.toyControlReadyAt=this.time+rules.controlResistance;return true;
 };
 p.toyThreats=function(u,range=350){const c=this.commander(0),urgent=t=>t.bikeAttack||t.bayonetAttack||t.bombFuse?0:1;return this.units.filter(t=>t.team!==0&&t.hp>0&&distance(u,t)<=range&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:0})).sort((a,b)=>urgent(a)-urgent(b)||distance(a,c)-distance(b,c)||a.id-b.id);};
 p.useSupportToy=function(u){
  if(u.hp<=0||this.time<(u.toyNextAt||0))return false;const type=u.type;
  if(type==='toyDecoyMaker'){
   const threats=this.toyThreats(u,460).filter(t=>!t.boss&&!t.roadCaptain);if(!threats.length)return false;
   const c=this.commander(0),a=Math.atan2(threats[0].y-c.y,threats[0].x-c.x);let point=null;
   for(const r of [150,120,90]){const q={x:c.x+Math.cos(a)*r,y:c.y+Math.sin(a)*r};if(this.freePosition(q.x,q.y,15)){point=q;break;}}if(!point)return false;
   const d=this.addUnit(0,'toyDecoy',point.x,point.y,true);d.toyExpires=this.time+3;d.toyLuredIds=threats.slice(0,2).map(t=>t.id);d.toyMakerId=u.id;this.effects.push({kind:'toyDecoyDrop',x:d.x,y:d.y,source:u,t:.7,max:.7,team:0});
  }else if(type==='toyTurtle'){
   const threats=this.toyThreats(u,350).filter(t=>this.supportControlAllowed(t,'push'));if(!threats.length)return false;const first=threats[0],angle=Math.atan2(first.y-u.y,first.x-u.x);u.face=angle;
   const hit=threats.filter(t=>Math.abs(Math.atan2(Math.sin(Math.atan2(t.y-u.y,t.x-u.x)-angle),Math.cos(Math.atan2(t.y-u.y,t.x-u.x)-angle)))<=Math.PI/4).slice(0,3);
   for(const t of hit){this.effects.push({kind:'toyWater',x:u.x,y:u.y,tx:t.x,ty:t.y,target:t,source:u,t:.5,max:.5,team:0});this.pushSupportTarget(u,t);}
  }else if(type==='toyStunner'){
   const t=this.toyThreats(u,310).find(t=>this.supportControlAllowed(t,'stun'));if(!t)return false;t.toyStunUntil=this.time+1;t.toyControlReadyAt=t.toyStunUntil+rules.controlResistance;t.sniperAim=t.bayonetAttack=null;
   u.face=Math.atan2(t.y-u.y,t.x-u.x);this.effects.push({kind:'toyZap',x:u.x,y:u.y,target:t,source:u,t:1,max:1,team:0});
  }else return false;
  u.toyNextAt=this.time+toys[type].cooldown;u.toyActionUntil=this.time+.5;u.toyActionFace=u.face;return true;
 };
 p.updateSupportToys=function(dt){
  for(const d of this.units)if(d.type==='toyDecoy'&&d.hp>0&&this.time>=d.toyExpires){d.hp=0;d.diedAt=this.time;}
  for(const u of this.units.filter(t=>this.isSupportToy(t)&&!t.toyRetired)){
   const run=()=>{
    if(u.hp<=0){if(this.time<(u.toyDownUntil||Infinity))return;u.hp=u.maxHp*.5;u.diedAt=undefined;u.toyDownUntil=0;u.toyNextAt=this.time+1;}
    const c=this.commander(0),angle=this.formationFacing||-Math.PI/2,side=u.toySlot===1?80:-80,goal={x:c.x-Math.cos(angle)*95-Math.sin(angle)*side,y:c.y-Math.sin(angle)*95+Math.cos(angle)*side};
    const combat=this.units.some(t=>t.team!==0&&t.hp>0&&(distance(t,c)<550||distance(t,u)<300)),s=this.stats(u),speed=!combat&&distance(u,c)>240?Math.max(s.speed,this.stats(c).speed*1.4):s.speed;
    const oldX=u.x,oldY=u.y;if(distance(u,goal)>18)this.navigate(u,goal.x,goal.y,dt,speed);if(Math.hypot(u.x-oldX,u.y-oldY)>.05)u.toyBodyFace=Math.atan2(u.y-oldY,u.x-oldX);
    this.useSupportToy(u);
   };if(this.coop)this.withOwner(u.coopOwner,run);else run();
  }
 };
 root.FrontSupportToys={rules,toys,insects};return root.FrontSupportToys;
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install({FrontGame:root.FrontGame,TYPES:root.FrontTypes});
})(typeof window==='undefined'?globalThis:window);
