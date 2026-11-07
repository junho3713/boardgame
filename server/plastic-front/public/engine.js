/* Original prototype rules. Engine is DOM independent for repeatable simulation checks. */
(function(root){
'use strict';
const SWORD={damage:90,rate:.75,range:90,arc:110*Math.PI/180,windup:.14,recovery:.42,targets:3,ultimateRange:170,ultimateInterval:.5,ultimateDamage:2};
const FLAME={damage:14.4,rate:.12,range:250,arc:50*Math.PI/180,armor:.65,ultimateRange:420,ultimateArc:70*Math.PI/180,ultimateDamage:2};
const BALANCE_VERSION=70;
const UNIT_TYPE_CAP=8;
const COMMANDER_REVIVAL={delay:5,protection:3};
const GUARDIANS={range:460,mageHp:560,mageRate:6,mageDamage:18,windup:.45,radius:145,root:2,laserHp:1500,laserDamage:40,laserTick:.2,respawnDelay:60,shieldNotice:.8,shieldRaise:.18,shieldHold:.35,lessonRange:650,lessonBannerTime:5,laserWindup:0,laserRate:0};
const BUTTERFLY={range:330,arc:80*Math.PI/180,windup:.65,flight:.8,reduction:.5,duration:6};
const MEDIC_CLEANSE={cooldown:10,targets:5};
const MEDIC_HEALING={base:10,interval:1,perLevel:.15,evolvedMultiplier:1.4,window:1,efficiencies:[1,.6,.4]};
const BIKE={windup:1.25,distance:450,speed:600,halfWidth:24,recovery:.9,cooldown:6};
const LUCKY={interval:4,spin:.6,range:350,normal:{glue:.33,mine:.15,spray:.10,missiles:.02,blank:.40},evolved:{glue:.33,mine:.15,spray:.17,missiles:.05,blank:.30},slowDuration:2,groundSlow:.30,flyingSlow:.15,glueRadius:100,glueFlight:.55,glueLife:10,mineDamage:100,mineRadius:80,mineLife:60,sprayDamage:150,sprayDuration:6,sprayRange:310,missileDamage:700,missileEdge:.3,alliedMissileEdge:.75,alliedMissileLight:.75,missiles:7,missileInterval:.12,alliedMissileInterval:.08,missileRange:480};
const ROOM_PROP_SHAPES={"sofa":{"file":"sofa-user-v093.webp","width":1533,"height":1026,"anchorX":653.0,"anchorY":552.7142857142858,"footprintW":1272,"footprintH":590.5714285714286,"bodyBounds":[17,128,1289,848],"collisionSlicesNormalized":[[0.022013,0.0,0.955189,0.0625],[0.014151,0.0625,0.970912,0.0625],[0.01022,0.125,0.978774,0.0625],[0.007862,0.1875,0.984277,0.0625],[0.005503,0.25,0.988208,0.0625],[0.003931,0.3125,0.992138,0.0625],[0.001572,0.375,0.996855,0.0625],[0,0.4375,1,0.0625],[0,0.5,1,0.0625],[0,0.5625,1,0.0625],[0.002358,0.625,0.996069,0.0625],[0.004717,0.6875,0.990566,0.0625],[0.008648,0.75,0.983491,0.0625],[0.014151,0.8125,0.97327,0.0625],[0.022799,0.875,0.955975,0.0625],[0.025157,0.9375,0.952044,0.0625]],"source":"uploaded","sha256":"635a08e85ce8a54753d7fa43fb4df7327d05fe5d5445e61d158690e7fe1c2545","uniformFit":true},"slipper":{"file":"slipper-user-v093.webp","width":1010,"height":1557,"anchorX":475.5,"anchorY":787.0,"footprintW":771,"footprintH":1516,"bodyBounds":[90,29,861,1545],"collisionSlicesNormalized":[[0.184176,0.0,0.616083,0.0625],[0.092088,0.0625,0.793774,0.0625],[0.042802,0.125,0.894942,0.0625],[0.015564,0.1875,0.955901,0.0625],[0.002594,0.25,0.988327,0.0625],[0,0.3125,0.998703,0.0625],[0,0.375,1,0.0625],[0.007782,0.4375,0.989624,0.0625],[0.032425,0.5,0.950713,0.0625],[0.070039,0.5625,0.885863,0.0625],[0.101167,0.625,0.830091,0.0625],[0.119326,0.6875,0.800259,0.0625],[0.127108,0.75,0.787289,0.0625],[0.137484,0.8125,0.763943,0.0625],[0.167315,0.875,0.706874,0.0625],[0.238651,0.9375,0.571984,0.0625]],"source":"uploaded","sha256":"b38f3189c8a95f944325cc0dd06386dd16cd222113fdf0a4600c6f3f08d36985","uniformFit":true}};
function roomPropKey(o){return o.kind==='slipper'?'slipper':o.kind==='sofa'&&o.label!=='암체어'?'sofa':null;}
function roomPropFloor(o){const s=ROOM_PROP_SHAPES[roomPropKey(o)],k=Math.min(o.w/s.footprintW,o.h/s.footprintH),w=s.footprintW*k,h=s.footprintH*k;return{x:o.x+o.w/2-w/2,y:o.y+o.h/2-h/2,w,h};}
function roomPropBodies(o){const s=ROOM_PROP_SHAPES[roomPropKey(o)],f=roomPropFloor(o);return s.collisionSlicesNormalized.map(([x,y,w,h],i)=>({x:f.x+x*f.w,y:f.y+y*f.h,w:w*f.w,h:h*f.h+(i<15?.01:0),kind:o.kind+'Body'}));}
// Derived geometry stays outside checkpoints. Validate the source objects, not every expanded strip.
const collisionCaches=new WeakMap();
function collisionState(game){
 let c=collisionCaches.get(game);const obstacles=game.obstacles||[],buildings=game.buildings||[],desktop=game.isDesktopDefense(),fenceKey=(game.defenses||[]).filter(p=>p.fencePost).map(p=>`${p.id}:${p.hp>0}:${p.x}:${p.y}`).join(';');
 let dirty=!c||c.fenceKey!==fenceKey||c.source!==obstacles||c.desktop!==desktop||c.obstacles.length!==obstacles.length||c.buildings.length!==buildings.length;
 if(!dirty)for(let i=0;i<obstacles.length;i++){const o=obstacles[i],v=c.obstacles[i];if(v.object!==o||v.x!==o.x||v.y!==o.y||v.w!==o.w||v.h!==o.h||v.kind!==o.kind||v.label!==o.label){dirty=true;break;}}
 if(!dirty)for(let i=0;i<buildings.length;i++){const b=buildings[i],v=c.buildings[i],solid=b.hp>0&&!b.mobile;if(v.object!==b||v.solid!==solid||solid&&(v.x!==b.x||v.y!==b.y||v.w!==b.w||v.h!==b.h||v.team!==b.team||v.kind!==b.kind)){dirty=true;break;}}
 if(!dirty)return c;
 c={source:obstacles,desktop,fenceKey,obstacles:obstacles.map(o=>({object:o,x:o.x,y:o.y,w:o.w,h:o.h,kind:o.kind,label:o.label})),buildings:buildings.map(b=>({object:b,solid:b.hp>0&&!b.mobile,x:b.x,y:b.y,w:b.w,h:b.h,team:b.team,kind:b.kind})),views:new Map()};
 c.static=obstacles.flatMap((o,index)=>DESKTOP_ITEM_ART[o.kind]?desktopItemBodies(o):DESKTOP_PROP_ART[o.kind]?desktopPropBodies(o):o.kind==='notebook'&&desktop?desktopNotebookBodies(o):o.kind==='deskCover'?[desktopCoverRect(o)]:o.kind==='remote'?ROOM_REMOTE_SHAPE.slices.map(([x,y,w,h])=>({x:o.x+x/ROOM_REMOTE_SHAPE.width*o.w,y:o.y+y/ROOM_REMOTE_SHAPE.height*o.h,w:w/ROOM_REMOTE_SHAPE.width*o.w,h:h/ROOM_REMOTE_SHAPE.height*o.h,kind:'remoteBody'})):roomPropKey(o)?roomPropBodies(o):game.bounds().id==='backyard'&&[2,5].includes(index)?[{...o,y:o.y+o.h*(index===2?.18:.215),h:o.h*(index===2?.64:.57),kind:'gardenPlanterBody'}]:o.kind==='table'?[-1,1].flatMap(sx=>[-1,1].map(sy=>({x:o.x+o.w/2+sx*o.w*.4-16,y:o.y+o.h/2+sy*o.h*.36-12,w:32,h:24,kind:'tableLeg'}))):[o]);
 c.static.push(...game.roomFenceBodies());
 c.solid=c.buildings.filter(b=>b.solid).map(b=>({team:b.team,kind:b.kind,body:{x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h}}));
 const all=[...c.static,...c.solid.map(b=>b.body)];c.views.set(null,all);c.signature=all.map(o=>`${o.x},${o.y},${o.w},${o.h}`).join(';');collisionCaches.set(game,c);return c;
}
const ROOM_CAMPAIGN=typeof module!=='undefined'&&module.exports?require('./room-campaign.js'):root.FrontRoomCampaign;
const WAVE_CONFIGS=typeof module!=='undefined'&&module.exports?{survival:require('./waves-survival.js'),defense:require('./waves-defense.js')}:root.FrontWaveConfigs;
if(!WAVE_CONFIGS?.survival||!WAVE_CONFIGS?.defense)throw Error('웨이브 설정 파일을 engine.js보다 먼저 불러오세요.');
function waveValue(rule,tier=0,wave=0){if(rule===null)return Infinity;if(typeof rule==='number')return rule;let n=rule.base+(rule.perTier||0)*tier+(rule.perWave||0)*wave+(rule.add||0)*Math.floor(tier/(rule.every||1));if(rule.round==='floor')n=Math.floor(n);return Math.max(rule.min??-Infinity,Math.min(rule.max??Infinity,n));}
function waveRoster(rows,time,forceLast=false){let selected=null;for(const row of rows)if((forceLast||row.at<=time)&&(!selected||row.at>=selected.at))selected=row;return selected?.types||[];}
const ROOM_WAVES={...WAVE_CONFIGS.survival,opening:ROOM_CAMPAIGN.config.opening,swarm:{enabled:false,firstAt:4},hunt:{enabled:false},assault:{enabled:false},boss:{...WAVE_CONFIGS.survival.boss,firstAt:240}};
const DESKTOP_RULES={width:2400,height:2400,duration:1200,assaultAt:WAVE_CONFIGS.defense.assault.firstAt};
const DESKTOP_COVER_ART={"three":{"file":"power-strip-3.png","width":1448,"height":1086,"crop":[107,366,1234,448],"sha256":"8553afba2ab8f4fa518d7cb6d34837d27442bf80141592bfc6d903ca561e283f","source":"uploaded","footprintW":1199,"footprintH":406},"four":{"file":"power-strip-4.png","width":1448,"height":1086,"crop":[48,363,1358,429],"sha256":"c53d90258fb6b1313d04e84a7b4d838c8ef3bf894feb356683e20136b7d4fa18","source":"uploaded","footprintW":1344,"footprintH":398}};
// Fit the opaque body inside the existing slot; never enlarge a saved obstacle.
const desktopCoverStyle=o=>DESKTOP_COVER_ART[o.w/o.h>=3?'four':'three'];
function desktopCoverRect(o){const s=desktopCoverStyle(o),fw=s.footprintW||s.crop[2],fh=s.footprintH||s.crop[3],scale=Math.min(o.w/fw,o.h/fh),w=fw*scale,h=fh*scale;return {...o,x:o.x+(o.w-w)/2,y:o.y+(o.h-h)/2,w,h};}

const DESKTOP_NOTEBOOK_ART={"file":"defense-notebook.png","width":1122,"height":1402,"crop":[9,32,1111,1293],"sha256":"ae71326b24123b12f37d0c06c84887bc48df9bb681f294cfc9a437461a35123a","source":"uploaded"};
function desktopNotebookRect(o){const s=DESKTOP_NOTEBOOK_ART,k=Math.min(o.w/s.crop[2],o.h/s.crop[3]),w=s.crop[2]*k,h=s.crop[3]*k;return{x:o.x+(o.w-w)/2,y:o.y+o.h-h,w,h};}
function desktopNotebookBodies(o){const r=desktopNotebookRect(o),width=r.w*.95,x=r.x+r.w*.05;return [.87,.98,1,1,1,1,.99,.90].map((a,i)=>({x:x+width*(1-a)/2,y:r.y+r.h*i/8,w:width*a,h:r.h/8+(i<7?.01:0),kind:'notebookBody'}));}
const DESKTOP_PROP_ART={"smileMug":{"file":"smile-mug.png","width":1254,"height":1254,"crop":[281,150,860,933],"anchor":[590,880],"footprintW":620,"footprintH":400,"sha256":"4abb0bc56d8a7a75bc2a34ae92bc294500fc97b8148ea276ed1bd60680b40075","source":"uploaded"},"toiletRoll":{"file":"toilet-roll-upright.png","width":1254,"height":1254,"crop":[263,102,832,1049],"anchor":[626,910],"footprintW":710,"footprintH":460,"sha256":"f4afdd60800b5b9b192da5ea2c96ce34e8ceb4da0c63b774c05c3dad6103754d","source":"generated"}};
function desktopPropSprite(o){const s=DESKTOP_PROP_ART[o.kind],scale=o.w/s.footprintW;return {x:o.x+o.w/2+(s.crop[0]-s.anchor[0])*scale,y:o.y+o.h/2+(s.crop[1]-s.anchor[1])*scale,w:s.crop[2]*scale,h:s.crop[3]*scale};}
function desktopPropBodies(o){return [.5,.82,.96,1,1,.96,.82,.5].map((width,i)=>({x:o.x+o.w*(1-width)/2,y:o.y+o.h*i/8,w:o.w*width,h:o.h/8+(i<7?.01:0),kind:o.kind+'Body'}));}

// Item art and navigation share the same projection; tall cup decorations never block the floor.
const DESKTOP_ITEM_ART={"eraser":{"file":"pink-eraser-shadowed.png","crop":[0,0,1536,1024],"polygon":[[242.976,578.645],[258.851,506.278],[366.995,418.835],[1065.466,258.02],[1278.777,260.031],[1357.157,335.413],[1375.016,449.993],[1365.094,561.559],[1303.581,627.895],[517.801,843.99],[334.254,817.857],[268.772,746.496]],"slices":20,"width":1536,"height":1024,"sha256":"4999df447aa1025179fa2e3d03fb0fcdfb62a978d47c4de0dbfe5caf16a59398","source":"generated","originalFile":"pink-eraser.png","bodyCrop":[240,254,1137,592],"shadow":"upper-left key / lower-right soft cast and contact shadow"},"mug":{"file":"iced-coffee-shadowed.png","crop":[0,0,985,1597],"anchor":[457.0,1398.967],"footprintW":600.0,"floor":[0.18,0.38,0.64,0.24],"width":985,"height":1597,"sha256":"dfec994d518b1f00fdbda06aa2d51792b66c4b2aae22be89672e621ebf4d33f3","source":"generated","originalFile":"iced-coffee.png","bodyCrop":[111,111,714,1357],"shadow":"upper-left key / lower-right soft cast and contact shadow"},"mechanicalPencil":{"file":"mechanical-pencil-shadowed.png","crop":[0,0,2171,724],"polygon":[[48.106,640.066],[191.285,587.731],[346.045,497.715],[417.634,453.754],[732.418,368.971],[771.372,384.671],[1901.014,88.456],[2004.187,72.755],[2123.152,60.195],[2151.578,113.576],[2149.472,196.266],[2118.941,245.461],[1915.753,312.449],[1859.955,339.663],[1759.94,362.691],[1740.99,348.037],[857.7,587.731],[790.322,623.319],[738.735,639.019],[654.512,649.486],[609.242,657.86],[415.529,649.486],[388.156,635.879],[220.763,648.44],[189.179,640.066],[102.851,652.626],[51.264,654.72]],"slices":40,"width":2171,"height":724,"sha256":"27d8cfdeb29f3c569d8c70ab6d904dce5beabe3f9aa335a98547bba5e136dd03","source":"generated","originalFile":"mechanical-pencil.png","bodyCrop":[46,11,2114,650],"shadow":"upper-left key / lower-right soft cast and contact shadow"}};
function desktopItemFloor(o){const s=DESKTOP_ITEM_ART[o.kind],f=s.floor||[0,0,1,1];return{x:o.x+o.w*f[0],y:o.y+o.h*f[1],w:o.w*f[2],h:o.h*f[3]};}
function desktopItemSprite(o){
 const s=DESKTOP_ITEM_ART[o.kind];if(s.floor){const f=desktopItemFloor(o),k=f.w/s.footprintW;return{x:f.x+f.w/2+(s.crop[0]-s.anchor[0])*k,y:f.y+f.h/2+(s.crop[1]-s.anchor[1])*k,w:s.crop[2]*k,h:s.crop[3]*k};}
 // Fit the solid object, then project the entire transparent image so its shadow never shrinks it.
 const body=s.bodyCrop||s.crop,k=Math.min(o.w/body[2],o.h/body[3]),w=body[2]*k,h=body[3]*k,x=o.x+(o.w-w)/2,y=o.y+o.h-h;
 return{x:x+(s.crop[0]-body[0])*k,y:y+(s.crop[1]-body[1])*k,w:s.crop[2]*k,h:s.crop[3]*k};
}
const desktopItemBodyCache=new WeakMap();
function desktopItemBodies(o){const key=[o.x,o.y,o.w,o.h,o.kind].join(','),saved=desktopItemBodyCache.get(o);if(saved?.key===key)return saved.bodies;const bodies=projectDesktopItemBodies(o);desktopItemBodyCache.set(o,{key,bodies});return bodies;}
function projectDesktopItemBodies(o){
 const s=DESKTOP_ITEM_ART[o.kind];if(s.floor){const f=desktopItemFloor(o);return [.5,.82,.96,1,1,.96,.82,.5].map((a,i)=>({x:f.x+f.w*(1-a)/2,y:f.y+f.h*i/8,w:f.w*a,h:f.h/8+(i<7?.01:0),kind:o.kind+'Body'}));}
 const r=desktopItemSprite(o),k=r.w/s.crop[2],poly=s.polygon.map(([x,y])=>({x:r.x+(x-s.crop[0])*k,y:r.y+(y-s.crop[1])*k})),min=Math.min(...poly.map(p=>p.x)),max=Math.max(...poly.map(p=>p.x)),step=(max-min)/s.slices,bodies=[];
 // Clip the shaft/body polygon to narrow vertical strips, leaving transparent corners open.
 const clip=(poly,x,greater)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=greater?a.x>=x:a.x<=x,bi=greater?b.x>=x:b.x<=x;if(ai)out.push(a);if(ai!==bi){const t=(x-a.x)/(b.x-a.x);out.push({x,y:a.y+(b.y-a.y)*t});}}return out;};
 for(let i=0;i<s.slices;i++){const left=min+step*i,right=left+step,p=clip(clip(poly,left,true),right,false);if(p.length<3)continue;const top=Math.min(...p.map(v=>v.y)),bottom=Math.max(...p.map(v=>v.y));bodies.push({x:left,y:top,w:step+(i<s.slices-1?.01:0),h:Math.max(.01,bottom-top),kind:o.kind+'Body'});}return bodies;
}
const ULTIMATE={level:10,cooldown:60,duration:4,interval:.2,range:460,arc:136*Math.PI/180,damage:2};
const ROOM_REMOTE_SHAPE={"width":371,"height":1165,"slices":[[53,0,265,6],[38,6,295,8],[24,14,323,15],[16,29,338,18],[0,47,371,1071],[6,1118,360,18],[15,1136,342,15],[30,1151,313,8],[44,1159,293,6]]};
const ENEMY_MISSILE={hp:1400,damage:72,rate:4.8,range:560,splash:80,flightTime:1};
const ENEMY_MISSILE_SITES=[['east-missile','동부 미사일 포탑',1470,845,2],['final-missile','본진 미사일 포탑',1160,340,3]];
const FLYING_WAVES=WAVE_CONFIGS.survival.flying;
const TYPES={swordEmpress:{name:'사검의 군주',hp:64000,damage:0,rate:100,range:0,speed:0,r:28,cost:0,stationary:true},
 butterfly:{name:'치유 약화 나비',icon:'❃',hp:520,damage:0,rate:7,range:BUTTERFLY.range,speed:86,r:17,cost:0,flying:true,flightHeight:42,role:'경장갑 비행 · 바람에 맞으면 6초간 받는 치유량 50% 감소 · 야전 의무관 정화로 해제'},
 crimsonAce:{name:'진홍 전차 에이스',icon:'▰',hp:900,damage:82,rate:2.8,range:365,speed:76,r:31,cost:0,splash:65,vehicle:true,role:'적 전용 중장갑 · 붉은 머리 전차 지휘관 · 독립 포탑 조준과 범위 포격 · 8분 정기 보스'},
 blizzardMage:{name:'얼음 마녀',icon:'❄',hp:GUARDIANS.mageHp,damage:GUARDIANS.mageDamage,rate:GUARDIANS.mageRate,range:GUARDIANS.range,speed:0,r:17,cost:0,stationary:true,role:'고정 수비 · 광역 빙결 속박 2초 · 아이스 실드로 박격포 차단 · 저격병 우선 공략'},
 bikeRaider:{name:'바이크 돌격병',icon:'➤',hp:420,damage:40,rate:6,range:420,speed:112,r:19,cost:0,charge:true,role:'적 전용 군용 바이크 · 1.25초 방향 예고 후 직선 돌진 · 돌진 후 0.9초 빈틈'},
 bladeGuard:{name:'블랙 실드 검병',icon:'⚔',hp:140,damage:14,rate:1.7,range:56,speed:86,r:13,cost:0,windup:.5,stab:true,slash:true,role:'초반부터 등장 · 경장갑 근접 적 · 0.5초 준비 후 분홍색 칼날 베기'},
 honeybee:{name:'꿀벌',icon:'✥',hp:360,damage:16,rate:1.15,range:40,speed:112,r:14,cost:0,flying:true,flightHeight:36,role:'4분부터 6마리씩 · 비행 근접 · 경장갑'},
 hornet:{name:'말벌',icon:'⟡',hp:1500,damage:38,rate:1.5,range:48,speed:98,r:22,cost:0,flying:true,flightHeight:48,role:'6분부터 2마리씩 · 공격 자세 비행 · 중장갑'},
 leader:{name:'지휘관',icon:'★',hp:400,damage:16.8,rate:.65,range:235,speed:130,r:14,cost:0},
 lucky:{name:'럭키 레토나',icon:'🍀',hp:135,damage:8,rate:.95,range:285,speed:140,r:20,cost:160,role:'네잎클로버 군용 지프 · 4초마다 슬롯 추첨 / 꽝 40% · 끈끈이 폭탄/지뢰/퇴치 스프레이/777 미사일 · 레토나 Lv.5 + 이동속도 Lv.5 진화 시 꽝 감소·희귀 확률 증가'},
 rifle:{name:'소총병',icon:'▥',hp:140,damage:12,rate:.63,range:245,speed:144,r:11,cost:45,role:'범용 소총 · 경장갑 ×1 / 장갑 ×0.8'},
 machinegun:{name:'기관총병',icon:'≋',hp:160,damage:9,rate:.2,range:280,speed:126,r:12,cost:95,role:'빠른 연사 · 경장갑 ×1 / 장갑 ×0.8'},
 mortar:{name:'박격포병',icon:'◉',hp:90,damage:64,rate:3.6,range:700,minRange:135,speed:116,r:12,cost:140,splash:70,role:'레이저 포탑 우선 · 고정 낙탄 2초 · 건물 ×1.2 · 사거리 135~700'},
 rocket:{name:'바주카병',icon:'⌁',hp:120,damage:80,rate:1.85,range:295,speed:128,r:12,cost:120,splash:38,role:'장갑 ×1 · 경장갑 ×0.5 · 소형 폭발'},
 sniper:{name:'저격병',icon:'⌖',hp:100,damage:100,rate:2.35,range:560,speed:137,r:11,cost:110,role:'경장갑 ×1 / 장갑 ×0.5 · 얼음 마녀 → 박격포병 우선 사격'},
 guntruck:{name:'전투트럭',icon:'▱',hp:280,damage:12,rate:.22,range:265,speed:150,r:22,cost:150,role:'기동 연사 · 경장갑 ×1 / 장갑 ×0.8'},
 tank:{name:'전차',icon:'▰',hp:600,damage:100,rate:2.3,range:310,speed:95,r:26,cost:260,splash:60,role:'장갑 ×1 · 경장갑 ×0.5 · 범위 포격'},
 artillery:{name:'적 포병',icon:'⊕',hp:520,damage:0,rate:99,range:0,speed:0,r:27,cost:0,role:'포격을 지휘하는 장갑 목표'},
 medic:{name:'의무병',icon:'✚',hp:110,damage:0,rate:MEDIC_HEALING.interval,range:280,speed:145,r:11,cost:70,role:'부상 대장 우선 · 기본 10 회복 · 1초 간격 · 중첩 치료 100%/60%/40%'},
 bayonetCaptain:{name:'장난감 병정 대장',icon:'♛',hp:640,damage:32,rate:1.6,range:64,speed:90,r:16,cost:0,windup:.38,stab:true,role:'적 전용 경장갑 · 강화 총검병 · 일반 정예 5분 / 대장 보스 2분부터'},
 bayonet:{name:'너트크래커 총검병',icon:'⚔',hp:320,damage:24,rate:1.6,range:58,speed:96,r:14,cost:0,windup:.38,stab:true,role:'적 전용 경장갑 · 총검 준비 후 찌르기 · 3분부터 웨이브 합류'},
 ant:{name:'개미',icon:'•',hp:110,damage:12,rate:1.15,range:25,speed:91.2,r:10,cost:0,role:'접근하면 추격하는 근접 몬스터'},
 soldierAnt:{name:'병정개미',icon:'◆',hp:260,damage:20,rate:1.05,range:28,speed:102,r:13,cost:0,role:'1분 이후 출현하는 강화 근접 벌레'},
 bruteBeetle:{name:'거대 갑충',icon:'⬢',hp:1050,damage:40,rate:1.6,range:36,speed:68.4,r:23,cost:0,role:'3분 이후 출현하는 대형 일반 생물'},
 stagBeetle:{name:'사슴벌레',icon:'⋎',hp:1100,damage:32,rate:1.5,range:34,speed:75.6,r:21,cost:0,role:'2분 이후 출현 · 큰 턱 · 기계류와 동일한 장갑'},
 rhinoBeetle:{name:'장수풍뎅이',icon:'⬟',hp:2200,damage:46,rate:1.8,range:40,speed:60,r:26,cost:0,role:'3분 이후 출현 · 큰 뿔 · 기계류와 동일한 장갑'},
 beetle:{name:'갑충',icon:'●',hp:420,damage:24,rate:1.4,range:30,speed:74.4,r:17,cost:0,role:'느리고 튼튼한 일반 생물'}
};
const ROSTER=['rifle','machinegun','sniper','guntruck','rocket','mortar','tank','medic','lucky'];
const MELEE=new Set(['bladeGuard','bayonetCaptain','bayonet','honeybee','hornet','ant','soldierAnt','beetle','bruteBeetle','stagBeetle','rhinoBeetle']);
const ARMORED=new Set(['crimsonAce','bikeRaider','repairBot','hornet','tank','guntruck','stagBeetle','rhinoBeetle','base','structure','artillery']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function multiplier(a,b){
 const armor=ARMORED.has(b);
 if(a==='rifle'||a==='machinegun'||a==='guntruck')return armor?.8:1;
 if(a==='mortar')return b==='base'||b==='structure'?1.2:1;
 if(a==='sniper')return armor?.5:1;
 if(a==='tank'||a==='crimsonAce'||a==='rocket')return armor?1:.5;
 return 1;
}
const PERMANENT={
 damage:{name:'공격력',icon:'✹',gain:4,unit:'%',max:10,detail:'아군 전체 공격력'},
 speed:{name:'이동속도',icon:'➜',gain:3,unit:'%',max:10,detail:'대장과 모든 분대원의 이동속도'},
 haste:{name:'공격속도',icon:'»',gain:3,unit:'%',max:10,detail:'사격·근접 공격 속도 · 의무병 치료 간격은 1초 고정'},
 critChance:{name:'치명타 확률',icon:'✧',gain:2,unit:'%p',max:10,detail:'기본 확률 5% · 치명타 발생 확률'},
 critDamage:{name:'치명타 피해',icon:'✦',gain:10,unit:'%p',max:10,detail:'치명타 배율 · 기본 150%'},
 gold:{name:'골드 획득량',icon:'◈',gain:10,unit:'%',max:10,detail:'처치·보급품·승리 골드만 증가'},
 capacity:{name:'유닛 수',icon:'▥',gain:1,unit:'기',max:10,detail:'대장 제외 편성 한도 · 기본 20기'},
 defense:{name:'방어력',icon:'⬟',gain:3,unit:'',max:10,detail:'방어력이 높을수록 받는 피해 감소'},
 turretHp:{name:'포탑 체력 증가',icon:'▣',gain:10,unit:'%',max:10,detail:'기관총·미사일 포탑 최대 체력 · 단계당 +10%'},
 turretDamage:{name:'포탑 데미지 증가',icon:'✹',gain:5,unit:'%',max:10,detail:'기관총·미사일 포탑 공격력 · 단계당 +5%'},
 turretDefense:{name:'포탑 방어력 증가',icon:'⬟',gain:3,unit:'',max:10,detail:'기관총·미사일 포탑 방어력 · 단계당 +3 · 기본 10'}
};
const ABILITIES={...Object.fromEntries(Object.entries(PERMANENT).filter(([k])=>!k.startsWith('turret')).map(([k,b])=>[k,{...b,max:5,gain:{damage:10,speed:6,haste:8,critChance:4,critDamage:15,gold:15,capacity:2,defense:5}[k]}])),health:{name:'체력',icon:'♥',gain:10,unit:'%',max:5,detail:'대장과 모든 분대원의 최대 체력 · 단계당 +10%'}};
const EVOLUTIONS={
 tank:{name:'공성 전차',ability:'damage',detail:'공격력 +35% · 폭발 범위 +35 · 사거리 +35 · 최대 체력 +20%'},
 guntruck:{name:'폭풍 전투트럭',ability:'haste',detail:'사격 속도 +33% · 공격력 +15% · 최대 체력 +10%'},
 rifle:{name:'기동 돌격병',ability:'health',detail:'이동속도 +15% · 공격력 +30% · 사거리 +20 · 최대 체력 +15%'},
 sniper:{name:'정예 저격병',ability:'critChance',detail:'치명타 확률 +25%p · 치명타 피해 +50%p · 사거리 +65'},
 rocket:{name:'파쇄 바주카병',ability:'critDamage',detail:'공격력 +25% · 폭발 범위 +30 · 치명타 확률 +20%p'},
 machinegun:{name:'보급 기관총병',ability:'gold',detail:'사격 속도 +33% · 공격력 +20% · 최대 체력 +20%'},
 mortar:{name:'중박격포 분대',ability:'capacity',detail:'공격력 +35% · 폭발 범위 +30 · 사거리 +70 · 낙탄 시간 2초 유지'},
 lucky:{name:'슈퍼 럭키 레토나',ability:'speed',detail:'꽝 40→30% · 스프레이 10→17% · 777 미사일 2→5% · 끈끈이 폭탄/지뢰 확률 유지'},
 medic:{name:'야전 의무관',ability:'defense',detail:'1초마다 최대 3명 치료 · 각 대상 치료량 +40% · 치료 범위 +60 · 방어력 +12 · 최대 체력 +20% · 10초마다 최대 5명의 빙결·치유 감소·둔화·중독 정화'}
};
const FIELD_CARDS={fieldSupply:{name:'현장 보급',icon:'▣',detail:'생산 자원 +90',kind:'supply'},fieldRepair:{name:'긴급 치료',icon:'✚',detail:'살아 있는 아군 최대 체력의 40% 회복',kind:'repair'},fieldGold:{name:'골드 상자',icon:'◈',detail:'기본 골드 +15 · 골드 획득량 보너스 적용',kind:'gold'}};
const ROOM_RULES={width:ROOM_CAMPAIGN.config.layout.width,height:ROOM_CAMPAIGN.config.layout.height,stage2At:120,stage3At:360,finalAt:WAVE_CONFIGS.survival.boss.final.at,assembly:2,sniperAim:.5,turretSpeed:5};
const BUILDINGS={mgTower:{name:'기관총 포탑',cost:125,hp:900,w:72,h:72,range:355,rate:.3,damage:TYPES.machinegun.damage*2,cap:3,type:'machinegun'},missileBase:{name:'미사일 포탑',cost:175,hp:650,w:90,h:82,range:600,minRange:0,rate:1.05,damage:180,splash:90,flightTime:1,cap:2,type:'rocket'},barricade:{name:'바리케이드',cost:50,hp:1950,defense:40,w:110,h:40,range:100,rate:0,damage:0,cap:4,type:'barricade'},repair:{name:'수리시설',cost:200,hp:420,w:86,h:86,range:260,rate:1.5,damage:0,cap:2,type:'repair'},repairBot:{name:'수리로봇',cost:50,hp:300,defense:10,w:30,h:24,range:85,rate:1,repair:15,speed:90,damage:0,cap:3,type:'repairBot',mobile:true}};
class FrontProfile{
 constructor(data={}){
  data=data&&typeof data==='object'?data:{};const upgrades=data.upgrades&&typeof data.upgrades==='object'?data.upgrades:{};
  this.version=1;this.gold=Number.isFinite(data.gold)?Math.round(clamp(data.gold,0,1e9)*100)/100:0;
  this.upgrades=Object.fromEntries(Object.entries(PERMANENT).map(([k,b])=>[k,Number.isFinite(upgrades[k])?Math.floor(clamp(upgrades[k],0,b.max)):0]));
 }
 cost(key){const b=PERMANENT[key],lv=this.upgrades[key];return !b||lv>=b.max?Infinity:80+60*lv+40*lv*lv;}
 snapshot(){return {version:1,gold:this.gold,upgrades:{...this.upgrades}};}
 static read(storage,key='plastic-front-profile-v1'){const raw=storage.getItem(key);return new FrontProfile(raw?JSON.parse(raw):{});}
 save(storage,key='plastic-front-profile-v1'){storage.setItem(key,JSON.stringify(this.snapshot()));}
}
class FrontGame{
 constructor(events={},profile=new FrontProfile(),settings={}){this.starExperiment=['livingroom-star','livingroom-star3'].includes(settings.map);this.starMax=settings.map==='livingroom-star3'?3:2;this.mapId=this.starExperiment?'livingroom':['livingroom','desktop'].includes(settings.map)?settings.map:'backyard';this.commanderId=['shino','blaze','shion'].includes(settings.commander)?settings.commander:'sarge';this.flameSkinId=settings.flameSkin==='hwarin'?'hwarin':'classic';this.sniperSkinId=['kayla','hayeon'].includes(settings.sniperSkin)?'kayla':'classic';this.medicSkinId=settings.medicSkin==='rina'?'rina':'classic';this.events=events;this.profile=profile instanceof FrontProfile?profile:new FrontProfile(profile);this.reset();}
 setCommander(id){if(!['sarge','shino','blaze','shion'].includes(id)||this.phase!=='ready')return false;this.commanderId=id;const c=this.commander(0);if(c){c.appearance=id;c.flameSkin=this.flameSkinId;this.refreshCommanderHealth();for(const u of this.alive(0).filter(u=>u.type!=='leader')){Object.assign(u,this.formationPoint(u,c));this.resolvePosition(u);}}return true;}
 setFlameSkin(id){if(!['classic','hwarin'].includes(id)||this.phase!=='ready')return false;this.flameSkinId=id;const c=this.commander(0);if(c?.type==='leader')c.flameSkin=id;return true;}
 setSniperSkin(id){if(id==='hayeon')id='kayla';if(!['classic','kayla'].includes(id)||this.phase!=='ready')return false;this.sniperSkinId=id;for(const u of this.units)if(u.type==='sniper'&&u.team===0)u.appearance=id;return true;}
 setMedicSkin(id){if(!['classic','rina'].includes(id)||this.phase!=='ready')return false;this.medicSkinId=id;for(const u of this.units)if(u.type==='medic'&&u.team===0)u.appearance=id;return true;}
 random(){return Math.random();}
 reset(mode=this.mode||'pve'){
  this.roomCampaign=null;this.bossIntro=null;this.roomHealthVersion=ROOM_CAMPAIGN.config.combat.healthVersion;this.roomHQAlarm=null;this.roomFenceVersion=0;this.roomEncounterVersion=0;this.enemyLuckySalvos=[];this.balanceVersion=BALANCE_VERSION;this.mode=['duel','crisis'].includes(mode)?mode:'pve';this.world={id:'backyard',width:1600,height:2800,scale:1};this.viewport=null;this.buildings=[];this.buildSerial=0;this.constructionLine=null;this.finalBattle={spawned:false,killed:false};this.roomEvents=0;
  this.mageShieldQuest=null;this.laserExposureQuest=null;this.roomGuardianVersion=0;this.roomFortificationVersion=0;this.roadCaptainVersion=0;this.guardianSiege=null;this.phase='ready';this.time=0;this.runGold=0;this.salvaged=0;this.nextRecoveryAt=0;this.stageSupplied=[];this.lastEnemyGrowth=-1;this.level=1;this.xp=0;this.kills=0;this.losses=[0,0];this.scouts=0;this.turnChoice=null;this.pendingChoice=null;this.navigationCache=new Map();this.cash=[135,135];this.trucks=[2,2];this.tech=[0,1].map(()=>Object.fromEntries(ROSTER.map(t=>[t,t==='rifle'?1:0])));
  this.cardShownCounts={};this.choiceKind='level';this.abilities=Object.fromEntries(Object.keys(ABILITIES).map(k=>[k,0]));this.evolved=Object.fromEntries(ROSTER.map(k=>[k,false]));this.bossState={nextAt:this.waveRules().boss.firstAt,warned:false,spawned:0,killed:0,rewards:0,claimed:0};
  this.aiHQTarget=null;this.ultimate={readyAt:0,activeUntil:0,startedAt:0,nextShotAt:0,shots:0,angle:-Math.PI/2};this.moveOrder=null;this.focusTarget=null;this.focusAutomatic=false;this.formationFacing=-Math.PI/2;this.formationEnemy=null;this.lastPressure=0;this.barrages=[];this.crisis={phase:this.mode==='duel'?'disabled':'idle',warnAt:this.mode==='crisis'?0:450,startAt:this.mode==='crisis'?15:480,nextSalvo:0,nextEscort:0,salvos:0,hits:0,dodges:0,canceled:0,battery:[]};
  this.units=[];this.shots=[];this.evolutionAttacks=[];this.evolutionBlasts=[];this.butterflyGusts=[];this.mortarShells=[];this.luckyMines=[];this.luckyGlues=[];this.luckyGlueHistory=[];this.luckySprays=[];this.luckySalvos=[];this.effects=[];this.serial=0;this.scoutUntil=0;this.report=null;this.enemyNext=15;this.enemyTechNext=40;this.enemyAdvanceAt=65;this.enemyPlan=['tank','sniper','guntruck','rocket','machinegun','mortar'][Math.floor(this.random()*6)];this.rallyUntil=0;this.rallyReady=0;this.camera={x:800,y:2170};this.input={x:0,y:0};
  this.bases=[{x:800,y:2600,hp:900,maxHp:900,team:0,base:true,r:85},{x:800,y:200,hp:900,maxHp:900,team:1,base:true,r:85}];
  this.swarm={nextAt:this.waveRules().swarm.firstAt,spawned:0};this.flyingSwarm=this.flyingStart();
  this.mission={stage:1,wave:1,totalWaves:this.waveRules().hunt.enabled?this.waveRules().hunt.total:1,nextWave:this.waveRules().hunt.enabled?this.waveRules().hunt.firstAt:Infinity,nextAssault:Infinity,stageStarted:0};this.structures=[];this.defenses=[];this.retreated=0;this.lastCommanderLoss=null;
  if(this.mode==='pve'){
   this.bases[1].hp=this.bases[1].maxHp=8000;
   this.structures=[{id:'west',name:'서쪽 전초기지',x:400,y:1320,hp:4500,maxHp:4500,team:1,structure:true,r:65,cooldown:0,nextGuard:0},{id:'east',name:'동쪽 전초기지',x:1170,y:930,hp:4500,maxHp:4500,team:1,structure:true,r:65,cooldown:0,nextGuard:0}];
  }
  if(this.mode==='pve')this.defenses=[
   ['west-mg','서부 기관총 벙커',590,1510,'bunker',2],['west-mortar','서부 박격포 진지',215,1420,'mortarPit',2],
   ['east-mg','동부 기관총 벙커',980,1100,'bunker',2],['east-mortar','동부 박격포 진지',1370,1000,'mortarPit',2],
   ['final-mg','본진 기관총 벙커',620,430,'bunker',3],['final-mortar','본진 박격포 진지',990,420,'mortarPit',3],
   ...ENEMY_MISSILE_SITES.map(([id,name,x,y,stage])=>[id,name,x,y,'missileTower',stage])
  ].map(([id,name,x,y,defenseKind,activeStage])=>({id,name,x,y,defenseKind,activeStage,hp:defenseKind==='missileTower'?ENEMY_MISSILE.hp:defenseKind==='bunker'?1500:1100,maxHp:defenseKind==='missileTower'?ENEMY_MISSILE.hp:defenseKind==='bunker'?1500:1100,team:1,structure:true,r:42,cooldown:1.5}));
  this.obstacles=[{x:360,y:2190,w:150,h:70,color:'#d4c58e',label:'A'},{x:1080,y:2180,w:125,h:85,color:'#a3b5bd',label:'B'},{x:480,y:1720,w:145,h:75,color:'#c5b39b',label:'C'},{x:1030,y:1670,w:165,h:75,color:'#d6c789',label:'D'},{x:230,y:1210,w:150,h:80,color:'#a9b8ad',label:'E'},{x:1180,y:1180,w:140,h:95,color:'#c4b69e',label:'F'},{x:510,y:790,w:155,h:75,color:'#d0c591',label:'G'},{x:1050,y:660,w:110,h:80,color:'#a3b5bd',label:'H'}];
  this.pickups=[{x:450,y:2330},{x:1160,y:2040},{x:350,y:1780},{x:1270,y:1460},{x:520,y:1330},{x:900,y:1050},{x:350,y:850},{x:1270,y:650}].map(p=>({...p,active:true}));
  this.addUnit(0,'leader',800,2370);this.addUnit(0,'rifle',760,2435);this.addUnit(0,'rifle',840,2435);
  if(this.mode==='duel'){
   this.addUnit(1,'leader',800,450);this.addUnit(1,'rifle',755,380);this.addUnit(1,'rifle',845,380);
   this.spawnPatrol(790,2080);this.spawnPatrol(490,1880);this.spawnPatrol(1130,1740);this.spawnPatrol(650,1370);this.spawnPatrol(1050,1030);
  }else if(this.mode==='pve'&&this.mapId!=='desktop'){for(const entry of this.waveRules().opening){const u=this.addUnit(2,entry.type,entry.x,entry.y,true);u.missionStage=1;u.assault=true;}}
  if(this.mode==='crisis'){
   this.units=[];this.structures=[];this.pickups=[];this.mission.stage=3;this.cash=[0,0];this.level=8;
   for(const t of ROSTER)this.tech[0][t]=1;
   this.addUnit(0,'leader',800,2370);
   ['rifle','rifle','sniper','guntruck','rocket','rocket','tank','medic'].forEach((type,i)=>{const a=i*2.39996;this.addUnit(0,type,800+Math.cos(a)*85,2370+Math.sin(a)*85);});
  }
  if(this.mode==='pve'&&this.mapId==='livingroom')this.setupLivingRoom();
  if(this.mode==='pve'&&this.mapId==='desktop'){this.setupDesktop();for(const entry of this.waveRules().opening){const u=this.addUnit(2,entry.type,entry.x,entry.y,true);u.assault=true;}}
  this.units.filter(u=>u.team===0&&u.type!=='leader').forEach(u=>{Object.assign(u,this.formationPoint(u,this.commander(0)));this.resolvePosition(u);});
  this.setupRoadCaptains();this.upgradeRoomCampaign();
  this.notify('reset');
 }
 upgradeBalance(){
  if(this.balanceVersion===BALANCE_VERSION)return false;
  // A saved operation keeps its HP percentages and casualties, not obsolete maxima.
  for(const u of this.units){if(!TYPES[u.type])continue;const alive=u.hp>0,ratio=alive?clamp(u.hp/Math.max(1,u.maxHp),0,1):0;u.maxHp=this.stats(u).hp;u.hp=alive?u.maxHp*ratio:0;}
  for(const b of this.buildings||[]){const kind=b.kind==='mortarPit'?'missileBase':b.kind,spec=this.buildingStats(kind,b.team);if(!spec)continue;const ratio=b.hp>0?clamp(b.hp/Math.max(1,b.maxHp),0,1):0;Object.assign(b,spec,{kind,maxHp:spec.hp,hp:spec.hp*ratio});}
  if(this.mode==='pve'&&!this.isDesktopDefense())for(const [id,name,x,y,activeStage]of ENEMY_MISSILE_SITES)if(!this.defenses.some(d=>d.id===id)){const scale=this.bounds().scale||1;this.defenses.push({id,name,x:x*scale,y:y*scale,defenseKind:'missileTower',activeStage,hp:ENEMY_MISSILE.hp,maxHp:ENEMY_MISSILE.hp,team:1,structure:true,r:42,cooldown:1.5});}
  this.balanceVersion=BALANCE_VERSION;return true;
 }
 isDesktopDefense(){return this.mode==='pve'&&this.bounds().id==='desktop';}
 hasInvulnerableHQ(){return this.mode==='pve'&&!this.isDesktopDefense();}
 setupDesktop(){
  this.world={id:'desktop',width:DESKTOP_RULES.width,height:DESKTOP_RULES.height,scale:1,layoutVersion:7};
  this.bases=[{x:1200,y:2110,hp:900,maxHp:900,team:0,base:true,r:85},{x:1200,y:100,hp:0,maxHp:900,team:1,base:true,r:85,hidden:true}];
  this.structures=[];this.defenses=[];this.units=[];this.crisis.phase='disabled';
  this.mission={stage:1,wave:0,totalWaves:0,nextWave:Infinity,nextAssault:this.waveRules().assault.firstAt,stageStarted:0};
  this.desktop={nextSupply:75,entries:0,stage:0};this.camera={x:1200,y:1760};
  this.obstacles=[['keyboard','기계식 키보드',410,100,1160,260],['notebook','작전 노트',65,1010,415,510],['mug','아이스 커피',1960,410,280,250],['tape','테이프',1910,1370,250,210],['eraser','지우개',725,697.875,170,89.25],['books','책 더미',105,1870,370,240],['pencilbox','연필 케이스',1930,1920,300,155]].map(([kind,label,x,y,w,h])=>({kind,label,x,y,w,h}));
  this.obstacles.push(...this.desktopCovers(),...this.desktopDecorations(),this.desktopPencil());
  this.pickups=[{x:1020,y:1670,active:true},{x:1430,y:1690,active:true},{x:1230,y:1330,active:true}];
  this.addUnit(0,'leader',1200,1760);this.addUnit(0,'rifle',1140,1700);this.addUnit(0,'rifle',1260,1700);
  for(const x of [1060,1340]){const spec=BUILDINGS.barricade;this.buildings.push({id:'built-'+(++this.buildSerial),...spec,kind:'barricade',x,y:1600,team:0,built:true,structure:true,r:spec.w/2,maxHp:spec.hp,buildAt:-ROOM_RULES.assembly,buildUntil:0,cooldown:0,face:-Math.PI/2,walk:0,starter:true});}
 }
 desktopCovers(){return [[650,1390,180,70],[1510,1390,180,70],[1060,1200,260,65],[1500,1780,180,70],[600,2010,220,60],[1110,2250,180,55]].map(([x,y,w,h],i)=>({x:x-w*.25,y:y-h*.25,w:w*1.5,h:h*1.5,kind:'deskCover',label:'멀티탭 '+(i+1),cover:true}));}
 desktopDecorations(){return [{kind:'smileMug',label:'스마일 머그컵',x:1720,y:1530,w:160,h:105},{kind:'toiletRoll',label:'세운 두루마리 휴지',x:2010,y:1720,w:155,h:100}];}
 desktopPencil(){return{kind:'mechanicalPencil',label:'샤프',x:1528,y:765,w:264,h:90};}
 resizeDesktopStationery(){for(const o of this.obstacles){const size=o.kind==='eraser'?[170,89.25]:o.kind==='mechanicalPencil'?[264,90]:null;if(!size)continue;const [w,h]=size;o.x+=(o.w-w)/2;o.y+=(o.h-h)/2;o.w=w;o.h=h;}}
 removeDesktopCovers(){this.obstacles=this.obstacles.filter(o=>o.kind!=='deskCover'||![[850,1825],[1660,2030]].some(([x,y])=>Math.hypot(o.x+o.w/2-x,o.y+o.h/2-y)<1));}
 upgradeDesktopLayout(){
  if(!this.isDesktopDefense()||this.world.layoutVersion>=7)return false;
  this.removeDesktopCovers();
  if(this.world.layoutVersion>=5){this.resizeDesktopStationery();this.world.layoutVersion=7;this.navigationCache.clear();for(const u of this.units){u.route=null;u.routeGoal=null;}return true;}
  const old=this.world.layoutVersion||1,blocks=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  // Enlarge the existing power strips about their centres and move only the toilet roll.
  if(old<5)for(const o of this.obstacles){if(o.kind==='deskCover'){o.x-=o.w*.25;o.y-=o.h*.25;o.w*=1.5;o.h*=1.5;}else if(o.kind==='toiletRoll')o.x=2010;else if(o.kind==='mug')o.label='아이스 커피';}
  const additions=[...(old<2?this.desktopCovers():[]),...(old<3?this.desktopDecorations().filter(p=>!this.obstacles.some(o=>o.kind===p.kind)):[]),...(!this.obstacles.some(o=>o.kind==='mechanicalPencil')?[this.desktopPencil()]:[])];
  for(const prop of additions){
   if(this.buildings.some(b=>b.hp>0&&!b.mobile&&blocks(prop,{x:b.x-b.w/2-10,y:b.y-b.h/2-10,w:b.w+20,h:b.h+20})))continue;
   if(old>=2&&this.obstacles.some(o=>blocks(prop,o)))continue;
   this.obstacles.push(prop);this.navigationCache.clear();
   const home={x:this.bases[0].x,y:this.bases[0].y-170},north={x:1200,y:520};if(!this.findPath(home,north,36).length)this.obstacles.pop();
  }
  this.resizeDesktopStationery();this.world.layoutVersion=7;this.navigationCache.clear();
  // Keep bought structures and casualties. Shift covered foundations into the nearest open floor.
  for(const b of this.buildings.filter(b=>b.hp>0&&!b.mobile)){const hp=b.hp;b.hp=0;if(this.solidObstacles().some(o=>blocks(o,{x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h})))this.resolvePosition(b,Math.hypot(b.w,b.h)/2+8);b.hp=hp;}
  for(const u of [...this.units,...this.buildings.filter(b=>b.mobile)])if(u.hp>0){this.resolvePosition(u);u.route=null;u.routeGoal=null;if(u.mobile){u.repairPath=null;u.repairGoal=null;u.repairReplanAt=0;}}
  for(const p of this.pickups)if(p.active)this.resolvePosition(p,24);
  this.moveOrder=null;return true;
 }
 spawnView(){
  const c=this.commander(0),b=this.bounds(),width=this.viewport?.width||(this.isDesktopDefense()?1600:1100),height=this.viewport?.height||1050;
  const tx=clamp(c.x,Math.min(b.width/2,width/2),Math.max(b.width/2,b.width-width/2)),ty=clamp(c.y-height*.16,Math.min(b.height/2,height/2),Math.max(b.height/2,b.height-height/2)),camera=this.camera||{x:tx,y:ty};
  // Enclose the rendered camera and its following destination, including background AI catch-up.
  return{left:Math.min(camera.x,tx)-width/2,right:Math.max(camera.x,tx)+width/2,top:Math.min(camera.y,ty)-height/2,bottom:Math.max(camera.y,ty)+height/2,width,height};
 }
 northernSpawn(index=this.serial+1,radius=50,preferred=null){
  const c=this.commander(0),b=this.bounds(),view=this.spawnView(),north=Math.min(this.isRoomCampaign()?Math.max(200,c.y-180):c.y-180,this.bases[0].y-250),margin=radius+65,points=[];
  const valid=p=>p&&p.y<=north&&p.y>=70&&p.y<=b.height-100&&this.freePosition(p.x,p.y,radius)&&(p.y+radius<view.top||p.x+radius<view.left||p.x-radius>view.right)&&this.alive(0).every(u=>dist(u,p)>radius+120);
  if(valid(preferred))return preferred;
  const top=Math.min(view.top-margin,north),x=clamp(100+((index*173)%Math.max(1,b.width-200)),75,b.width-75);
  for(const y of [top,top-90,top-180])for(const px of [x,b.width*.25,b.width*.5,b.width*.75,90,b.width-90])points.push({x:px,y});
  const y=Math.max(90,Math.min(north,view.top+view.height*.25));for(const px of [view.left-margin,view.right+margin])for(const py of [y,y-140,y-280,90])points.push({x:px,y:py});
  return points.find(valid)||null;
 }
 desktopEntry(index=++this.desktop.entries){
  // Fixed approaches on the far edge, never a spawn on top of the defending squad.
  const lanes=[{x:590,y:470},{x:1180,y:470},{x:1740,y:470},{x:170,y:470},{x:2300,y:470}],p=lanes[(index-1)%lanes.length],n=Math.floor((index-1)/lanes.length)%5;
  return this.northernSpawn(index,50,this.resolvePosition({x:p.x+(n-2)*(p.x>2250?8:32),y:p.y+(n%2)*45},50));
 }
 updateDesktopDefense(){
  if(this.time+1e-8>=DESKTOP_RULES.duration){this.time=DESKTOP_RULES.duration;this.finish(this.bases[0].hp>0?'win':'lose',this.bases[0].hp>0?'defense-time':'base');return;}
  const rules=this.waveRules(),stage=this.time>=rules.assault.finalStageAt?3:this.time>=rules.assault.firstAt?2:1;
  if(stage!==this.mission.stage){this.mission.stage=stage;this.mission.stageStarted=this.time;this.notify('toast',stage===2?`${rules.assault.firstAt}초 경과 · 장난감 병정 돌격대 합류`:'최종 방어 구간 / 20분까지 기지를 지키세요.');}
  if(this.time>=this.mission.nextAssault){this.mission.nextAssault=this.time+this.pressure().assaultInterval;this.spawnAssault();}
  if(this.time>=this.desktop.nextSupply){this.desktop.nextSupply=this.time+75;const points=[{x:960,y:1600},{x:1450,y:1580},{x:1200,y:1410},{x:1000,y:1890},{x:1440,y:1900}],live=this.pickups.filter(p=>p.active);if(live.length<5){const p=points.find(p=>!live.some(q=>dist(p,q)<90));if(p)this.pickups.push({...p,active:true});}}
 }
 setupLivingRoom(){
  this.world={id:'livingroom',width:ROOM_RULES.width,height:ROOM_RULES.height,scale:1.5};
  for(const p of [...this.units,...this.bases,...this.structures,...this.defenses,...this.pickups]){p.x*=1.5*ROOM_RULES.width/2400;p.y*=1.5*ROOM_RULES.height/4200;if(p.homeX!==undefined){p.homeX=p.x;p.homeY=p.y;}}
  const start=ROOM_CAMPAIGN.config.start;
  for(const u of this.alive(0)){u.x+=start.x-ROOM_RULES.width/2;u.y+=start.y-2370*1.5*ROOM_RULES.height/4200;u.homeX=u.x;u.homeY=u.y;}
  this.camera={x:start.x,y:start.y-168};
  this.world.layoutVersion=ROOM_CAMPAIGN.config.layout.version;this.world.remoteArtVersion=127;this.obstacles=this.livingRoomLayout();
  this.pickups.push(...[{x:1650,y:3200},{x:1100,y:2850},{x:2150,y:2350},{x:1020,y:1950},{x:820,y:1000}].map(p=>({...p,x:p.x*ROOM_RULES.width/2400,y:p.y*ROOM_RULES.height/4200,active:true})));
  for(const u of this.units)this.resolvePosition(u);
  for(const p of this.pickups)if(p.active)this.resolvePosition(p,24);
  this.setupRoomGuardians();
 }
 // Positions measure the HQ-to-HQ route, not elapsed time. Never used by other maps.
 setupRoomGuardians(){
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||this.roomGuardianVersion===ROOM_CAMPAIGN.config.guardians.version)return false;
  const previous=this.roomGuardianVersion||0,c=this.commander(0),old=this.time>0;
  // Waypoint guardians remain one-time encounters. Only the final HQ guard respawns.
  const mage=(id,x,y,stage)=>{if(old&&c.y<y-120)return;if(this.units.some(u=>u.guardianId===id))return;const u=this.addUnit(1,'blizzardMage',x,y,true);Object.assign(u,{guardianId:id,missionStage:stage,activeStage:stage,fixedGuard:true,cooldown:1.2,homeX:x,homeY:y});};
  const laser=(id,x,y,stage)=>{if(this.defenses.some(u=>u.id===id))return;const hp=this.roomTowerHp({id});this.defenses.push({id,name:'레이저 포탑',x,y,team:1,structure:true,defenseKind:'laserTower',activeStage:stage,hp,maxHp:hp,r:42,cooldown:1.2,face:Math.PI/2});};
  const a=this.bases[0],b=this.bases[1],at=f=>a.y+(b.y-a.y)*f,sites=ROOM_CAMPAIGN.config.guardians;
  if(previous<91){mage(sites.midMage.id,sites.midMage.x,at(sites.midMage.fraction),2);if(!old||c.y>=at(.5)-120)laser(sites.midLaser.id,sites.midLaser.x,at(sites.midLaser.fraction),2);}
  // Preserve guardian identity, HP, cooldowns and lesson state in saved operations.
  const midMage=this.units.find(u=>u.guardianId==='room-half-mage'),midLaser=this.defenses.find(u=>u.id==='room-threequarter-laser');
  for(const [u,x,y]of [[midMage,sites.midMage.x,at(sites.midMage.fraction)],[midLaser,sites.midLaser.x,at(sites.midLaser.fraction)]])if(u){Object.assign(u,{x,y,homeX:x,homeY:y});u.route=null;u.routeGoal=null;}
  const finalMages=[];
  for(const [i,site]of sites.finalMages.entries()){
   let m=this.units.find(u=>u.guardianId===site.id);
   if(!m){m=this.addUnit(1,'blizzardMage',site.x,b.y+site.offset,true);Object.assign(m,{guardianId:site.id,missionStage:3,activeStage:3,fixedGuard:true,cooldown:1.2+i*2.6});if(old&&previous>=91&&site.id==='room-final-mage'){m.hp=0;m.diedAt=this.time;m.respawnAt=this.time+GUARDIANS.respawnDelay;}}
   m.guardianSlot=i;finalMages.push([m,site.x,b.y+site.offset]);
  }
  const hqLasers=[...sites.finalLasers,...sites.rearLasers];
  for(const site of hqLasers)laser(site.id,site.x,b.y+site.offset,3);
  for(const [u,x,y]of [...finalMages,...hqLasers.map(site=>[this.defenses.find(p=>p.id===site.id),site.x,b.y+site.offset])]){
   Object.assign(u,{guardianRespawn:true,guardianSpawnX:x,guardianSpawnY:y,x,y,homeX:x,homeY:y,activeStage:2,missionStage:2});
   if(u.hp<=0&&!Number.isFinite(u.respawnAt))u.respawnAt=(u.diedAt??this.time)+GUARDIANS.respawnDelay;
  }
  this.roomGuardianVersion=sites.version;this.navigationCache.clear();this.setupRoomFortifications();return true;
 }
 updateGuardianRespawns(){
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||this.phase==='ended')return;
  for(const u of [...this.units,...this.defenses]){
   if(!u.guardianRespawn||u.hp>0||!Number.isFinite(u.respawnAt)||this.time+1e-8<u.respawnAt)continue;
   u.x=u.homeX=u.guardianSpawnX;u.y=u.homeY=u.guardianSpawnY;
   u.maxHp=u.type?this.stats(u).hp:this.roomTowerHp(u);u.hp=u.maxHp;
   u.diedAt=undefined;u.respawnAt=null;u.flash=0;u.iceShield=null;u.blizzardCast=null;u.laserAttack=null;u.laserNextTick=this.time;u.cooldown=u.type==='blizzardMage'?1.2+(u.guardianSlot||0)*2.6:0;
   u.guardianReturnedAt=this.time;
   this.effects.push({kind:u.type==='blizzardMage'?'guardianReturn':'towerRebuild',x:u.x,y:u.y,t:1.2,max:1.2,team:1});
  }
 }
 setupRoadCaptains(){
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||this.roadCaptainVersion===97)return false;
  this.roadCaptainVersion=97;const c=this.commander(0),old=this.time>0;
  for(const [id,type,name,y,stage]of ROOM_CAMPAIGN.config.roadCaptains){
   if(this.units.some(u=>u.guardianId===id)||old&&(this.mission.stage>stage||c.y<y-120))continue;
   const u=this.addUnit(2,type,ROOM_RULES.width/2,y,true);Object.assign(u,{guardianId:id,roadCaptain:true,roadStage:stage,missionStage:stage,boss:!this.isRoomCampaign(),bossName:name,assault:true,patrol:true,cooldown:1});
   u.hp=u.maxHp=this.stats(u).hp;this.resolvePosition(u);u.homeX=u.x;u.homeY=u.y;
  }return true;
 }
 updateRoadCaptain(u,dt){
  if(this.mission.stage<u.roadStage)return false;
  if(this.isRoomCampaign()&&u.roomGarrison&&u.guardianId?.startsWith('room-garrison-final-')&&this.time<(this.roomHQAlarm?.until||0)&&this.alive(0).some(a=>this.canTarget(u,a)&&dist(a,this.bases[1])<1250))return true;
  const home={x:u.homeX,y:u.homeY},leash=u.roomGarrison?ROOM_CAMPAIGN.config.fortifications.leash:750,engage=u.roomGarrison?ROOM_CAMPAIGN.config.fortifications.engage:650;
  if(!u.bikeAttack&&!u.bayonetAttack&&(dist(u,home)>leash||!this.alive(0).some(a=>this.canTarget(u,a)&&dist(a,home)<engage))){
   u.cooldown=Math.max(0,u.cooldown-dt);if(dist(u,home)>12)this.navigate(u,home.x,home.y,dt,this.stats(u).speed);return false;
  }return true;
 }
 healingMultiplier(target){return this.time<(target.healingReductionUntil||0)?1-BUTTERFLY.reduction:1;}
 medicHealingEfficiency(target,source){
  if(source?.type!=='medic'||source.team!==0||target.team!==0)return 1;
  // Stable arrival order: repeating your own pulse does not count as an extra healer.
  const active=(target.medicHealingSources||[]).filter(h=>this.time-h.at<=MEDIC_HEALING.window+1e-8&&this.units.some(u=>u.id===h.sourceId&&u.type==='medic'&&u.team===0&&u.hp>0));
  let entry=active.find(h=>h.sourceId===source.id);if(entry)entry.at=this.time;else{entry={sourceId:source.id,at:this.time};active.push(entry);}
  target.medicHealingSources=active;return MEDIC_HEALING.efficiencies[Math.min(active.indexOf(entry),MEDIC_HEALING.efficiencies.length-1)];
 }
 heal(target,amount,source=null){if(!target||target.hp<=0||target.hp>=target.maxHp||!Number.isFinite(amount)||amount<=0)return 0;const before=target.hp,efficiency=this.medicHealingEfficiency(target,source);target.hp=Math.min(target.maxHp,target.hp+amount*efficiency*this.healingMultiplier(target));return target.hp-before;}
 hasCleansableStatus(u){return this.time<(u.poisonUntil||0)||this.time<(u.slowUntil||0)||this.time<(u.rootedUntil||0)||this.time<(u.healingReductionUntil||0)||this.time<(u.luckySlowUntil||0);}
 updateMedicCleanses(){
  if(!this.evolved.medic)return;
  const medics=this.alive(0).filter(u=>u.type==='medic').sort((a,b)=>a.id-b.id);
  for(const medic of medics){if(this.time+1e-8<(medic.nextCleanseAt||0))continue;
   // Formation is automatic, so each medic cleanses up to five squad members without a radius check.
   const patients=[...this.alive(0),...this.buildings.filter(b=>b.kind==='repairBot'&&b.hp>0&&b.buildUntil<=this.time)].filter(u=>this.hasCleansableStatus(u)).sort((a,b)=>Number(this.time<(b.rootedUntil||0))-Number(this.time<(a.rootedUntil||0))||a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id).slice(0,MEDIC_CLEANSE.targets);
   if(!patients.length)continue;
   medic.nextCleanseAt=this.time+MEDIC_CLEANSE.cooldown;medic.lastCleanseAt=this.time;
   for(const patient of patients){patient.rootedUntil=0;patient.healingReductionUntil=0;patient.luckySlowUntil=0;patient.slowUntil=0;patient.poisonUntil=0;patient.poisonDps=0;patient.poisonSource=null;patient.poisonNextAt=0;this.effects.push({kind:'cleanse',x:patient.x,y:patient.y,target:patient,sourceId:medic.id,source:medic,wave:patient===patients[0],t:.85,max:.85,team:0});}
  }
 }
 butterflyTargets(source){return [...this.alive(0),...this.buildings.filter(b=>b.kind==='repairBot'&&b.hp>0&&b.buildUntil<=this.time)].filter(u=>u.hp>0&&dist(source,u)<=BUTTERFLY.range&&this.lineClear(source,u,0,{fireTeam:source.team}));}
 updateButterfly(u,dt){
  const cast=u.butterflyCast;
  if(cast){u.face=u.aimFace=cast.angle;if(this.time+1e-8<cast.fireAt)return;
   u.butterflyCast=null;u.windUntil=this.time+BUTTERFLY.flight;
   this.butterflyGusts.push({x:u.x,y:u.y,angle:cast.angle,source:u,team:u.team,started:this.time,ends:this.time+BUTTERFLY.flight,hitIds:[]});
   this.effects.push({kind:'butterflyWind',x:u.x,y:u.y,angle:cast.angle,range:BUTTERFLY.range,arc:BUTTERFLY.arc,t:BUTTERFLY.flight,max:BUTTERFLY.flight,team:u.team});return;
  }
  if(this.time<(u.windUntil||0))return;
  const candidates=this.butterflyTargets(u).sort((a,b)=>Number(this.time<(a.healingReductionUntil||0))-Number(this.time<(b.healingReductionUntil||0))||dist(u,a)-dist(u,b)),target=candidates[0];
  if(target){u.face=u.aimFace=Math.atan2(target.y-u.y,target.x-u.x);if(u.cooldown<=0){u.cooldown=this.stats(u).rate;u.butterflyCast={angle:u.face,started:this.time,fireAt:this.time+BUTTERFLY.windup};u.flightStrikeUntil=this.time+BUTTERFLY.windup+BUTTERFLY.flight;this.effects.push({kind:'butterflyWarn',x:u.x,y:u.y,angle:u.face,range:BUTTERFLY.range,arc:BUTTERFLY.arc,t:BUTTERFLY.windup,max:BUTTERFLY.windup,team:u.team});}return;}
  const chase=this.pursuitTarget(u);if(chase?.hp>0&&dist(u,chase)>BUTTERFLY.range*.8)this.navigate(u,chase.x,chase.y,dt,this.stats(u).speed);
 }
 updateButterflyGusts(){
  const active=[];for(const gust of this.butterflyGusts||[]){
   const progress=clamp((this.time-gust.started)/BUTTERFLY.flight,0,1),reach=BUTTERFLY.range*progress;
   for(const u of this.butterflyTargets(gust)){if(gust.hitIds.includes(u.id))continue;const dx=u.x-gust.x,dy=u.y-gust.y,along=dx*Math.cos(gust.angle)+dy*Math.sin(gust.angle),side=Math.abs(-dx*Math.sin(gust.angle)+dy*Math.cos(gust.angle));
    if(this.commanderReviveProtected(u)||along<0||along>reach+(TYPES[u.type]?.r||12)||side>Math.tan(BUTTERFLY.arc/2)*along+12)continue;
    u.healingReductionUntil=Math.max(u.healingReductionUntil||0,this.time+BUTTERFLY.duration);gust.hitIds.push(u.id);this.effects.push({kind:'healingWeaken',x:u.x,y:u.y,t:.9,max:.9,team:0});
   }if(this.time+1e-8<gust.ends)active.push(gust);
  }this.butterflyGusts=active;
 }
 updateBlizzard(u,dt=0){
  if(this.mission.stage<(u.activeStage||2))return;
  const s=this.stats(u),valid=a=>this.canTarget(u,a)&&dist(a,u)<=s.range&&this.lineClear(u,a,0,{fireTeam:u.team});
  if(u.mobileMage&&!u.blizzardCast){const target=this.alive(0).filter(a=>this.canTarget(u,a)).sort((a,b)=>dist(u,a)-dist(u,b))[0];if(target&&(dist(u,target)>s.range*.75||!this.lineClear(u,target,0,{fireTeam:u.team}))){u.face=u.aimFace=Math.atan2(target.y-u.y,target.x-u.x);this.navigate(u,target.x,target.y,dt,s.speed);}}
  const cast=u.blizzardCast;
  if(cast){if(this.time<cast.hitAt)return;u.blizzardCast=null;
   if(u.hp<=0)return;
   for(const a of this.alive(0))if(!this.commanderReviveProtected(a)&&valid(a)&&dist(a,cast)<=GUARDIANS.radius){a.rootedUntil=Math.max(a.rootedUntil||0,this.time+GUARDIANS.root);this.damage(a,s.damage,u);}
   this.effects.push({kind:'blizzard',x:cast.x,y:cast.y,radius:GUARDIANS.radius,t:1.1,max:1.1,team:1});return;
  }
  if(u.cooldown>0)return;
  const candidates=this.alive(0).filter(valid);if(!candidates.length)return;
  candidates.sort((a,b)=>candidates.filter(v=>dist(v,b)<=GUARDIANS.radius).length-candidates.filter(v=>dist(v,a)<=GUARDIANS.radius).length||dist(a,u)-dist(b,u));
  const target=candidates[0];u.face=u.aimFace=Math.atan2(target.y-u.y,target.x-u.x);u.cooldown=s.rate;u.recoil=.25;u.castUntil=this.time+1;
  u.blizzardCast={x:target.x,y:target.y,hitAt:this.time+GUARDIANS.windup};
 }
 updateLaser(p,dt){
  const s=this.defenseStats(p),valid=a=>a&&this.canTarget(p,a)&&dist(p,a)<=s.range&&this.lineClear(p,a,0,{fireTeam:1});
  let beam=p.laserAttack;
  if(!valid(beam?.target)){
   const target=this.alive(0).filter(valid).sort((a,b)=>dist(a,p)-dist(b,p))[0];
   if(!target){p.laserAttack=null;p.cooldown=0;return;}
   beam=p.laserAttack={target,fireAt:this.time,nextTick:Math.max(this.time,p.laserNextTick||0)};
  }
  // A continuous single-target beam: no windup or burst downtime, including old saves.
  const a=beam.target;p.face=Math.atan2(a.y-p.y,a.x-p.x);p.cooldown=0;beam.fireAt=this.time;
  if(this.time+1e-8>=(p.laserNextTick??this.time)){
   p.laserNextTick=this.time+GUARDIANS.laserTick;beam.nextTick=p.laserNextTick;
   this.recordLaserExposure(p,a,dt);this.damage(a,s.damage,p);this.effects.push({kind:'laserBeam',x:p.x,y:p.y,tx:a.x,ty:a.y,t:.22,max:.22,team:1});
  }
 }
 livingRoomLayout(){return [['sofa','소파',40,2920,1120,520,'#727c72'],['table','커피 테이블',1400,2580,630,360,'#a78359'],['cushion','쿠션',640,2460,250,170,'#bc8e70'],['remote','리모컨',1620,3300,112,270,'#474e50'],['slipper','슬리퍼',1960,3510,180,300,'#8c9c98'],['cabinet','TV장',140,670,700,190,'#82634d'],['table','사이드 테이블',1320,1370,620,300,'#a78359'],['cushion','쿠션',350,1850,220,190,'#b4a070'],['remote','게임 리모컨',1970,1890,115,260,'#53616a'],['sofa','암체어',170,1060,600,440,'#727c72'],['plant','화분',2070,3000,210,210,'#a87350'],['plant','화분',65,2270,210,210,'#a87350'],['books','쌓인 책',690,3630,240,165,'#6c8582'],['blocks','나무 블록',2070,2140,210,150,'#b68b58'],['lamp','스탠드 조명',2070,960,160,160,'#c9b586']].map(([kind,label,x,y,w,h,color])=>({kind,label,x:kind==='remote'?x+w/2-h*ROOM_REMOTE_SHAPE.width/ROOM_REMOTE_SHAPE.height/2:x,y,w:kind==='remote'?h*ROOM_REMOTE_SHAPE.width/ROOM_REMOTE_SHAPE.height:w,h,color})).map(o=>({...o,x:(o.x+o.w/2)*ROOM_RULES.width/2400-o.w/2,y:(o.y+o.h/2)*ROOM_RULES.height/4200-o.h/2})).concat(ROOM_CAMPAIGN.config.layout.extraProps.map(o=>({...o})));}
 upgradeLivingRoomLayout(){
  if(this.bounds().id!=='livingroom')return false;const remoteChanged=this.upgradeRoomRemote();if(this.world.layoutVersion>=ROOM_CAMPAIGN.config.layout.version)return remoteChanged;
  if(this.world.layoutVersion<3)this.obstacles=this.livingRoomLayout().slice(0,15).map(o=>({...o,x:(o.x+o.w/2)*this.world.width/ROOM_RULES.width-o.w/2,y:(o.y+o.h/2)*this.world.height/ROOM_RULES.height-o.h/2}));
  if(this.world.layoutVersion<4)for(const o of this.obstacles.filter(o=>o.kind==='remote')){const center=o.x+o.w/2;o.w=o.h*ROOM_REMOTE_SHAPE.width/ROOM_REMOTE_SHAPE.height;o.x=center-o.w/2;}
  return this.expandRoomLayout()||remoteChanged;
 }
 upgradeRoomRemote(){
  if(this.bounds().id!=='livingroom'||this.world.remoteArtVersion===127)return false;
  for(const o of this.obstacles.filter(o=>o.kind==='remote')){const center=o.x+o.w/2;o.w=o.h*ROOM_REMOTE_SHAPE.width/ROOM_REMOTE_SHAPE.height;o.x=center-o.w/2;}
  this.world.remoteArtVersion=127;this.navigationCache.clear();
  for(const u of this.units)if(u.hp>0&&!this.isFlying(u)){this.resolvePosition(u);u.route=null;u.routeGoal=null;}
  for(const p of this.pickups)if(p.active)this.resolvePosition(p,24);
  return true;
 }
 bounds(){return this.world||{id:'backyard',width:1600,height:2800,scale:1};}
 solidObstacles(fireTeam=null){const c=collisionState(this);if(!c.views.has(fireTeam))c.views.set(fireTeam,[...c.static.filter(o=>!o.firePass),...c.solid.filter(b=>!(b.team===fireTeam&&b.kind==='barricade')).map(b=>b.body)]);return c.views.get(fireTeam);}
 baseShielded(){if(this.isRoomCampaign())return false;return this.isDesktopDefense()||this.mode==='pve'&&(this.mission.stage<3||this.bounds().id==='livingroom'&&(this.time<ROOM_RULES.finalAt||!this.finalBattle?.killed||this.crisis.phase!=='cleared'));}
 notify(type,data){if(this.events[type])this.events[type](data);}
 start(){this.phase='playing';this.notify('change');}
 neededXP(){return 18+this.level*5;}
 waveRules(){if(this.isRoomCampaign())return ROOM_WAVES;return this.mode==='pve'&&(this.mapId==='desktop'||this.world?.id==='desktop')?WAVE_CONFIGS.defense:WAVE_CONFIGS.survival;}
 flyingStart(){const state={};for(const [type,r]of Object.entries(this.waveRules().flying)){state[type+'Next']=r.at;state[type+'Spawned']=0;}return state;}
 waveType(rule,n,wave=0,count=0){const pick=rule.mix.find(r=>{const pace=this.isDesktopDefense()?this.evolutionPace().progress:0,every=r.every===undefined?null:Math.max(1,Math.round(r.every/(1+(ROOM_CAMPAIGN.config.evolutionPacing.eliteTypes.includes(r.type)?ROOM_CAMPAIGN.config.evolutionPacing.eliteWeight*pace:0))));return this.time>=(r.at||0)&&wave>=(r.wave||0)&&(every===null||n%every===0)&&(r.firstFraction===undefined||n<Math.floor(count*r.firstFraction))&&(r.maxAlive===undefined||this.units.filter(u=>u.team!==0&&u.hp>0&&u.type===r.type).length<r.maxAlive);});return pick?.type||rule.fallback;}
 pressure(){if(this.isRoomCampaign())return this.roomPressure();const rules=this.waveRules(),tier=Math.max(0,Math.floor(this.time/60)),late=this.mode==='pve'&&this.time>=rules.lateAt,step=Math.max(0,tier-Math.floor(rules.lateAt/60)),phase=rules.pressure[late?'late':'early'],out={tier,late,hp:1+.12*tier,damage:1.25*(1+.10*tier),defense:3*tier};for(const [key,value]of Object.entries(phase))out[key]=waveValue(value,late&&!value?.absolute?step:tier);const pace=this.evolutionPace(),boss=!!this.activeBoss(),paceDensity=this.isDesktopDefense()&&!boss?(pace.relief?ROOM_CAMPAIGN.config.evolutionPacing.reliefDensity:pace.spawnScale):1,density=(this.mode==='pve'?(rules.crowdScale??1)*(boss?(rules.bossCrowdScale??1):1):1)*paceDensity;for(const k of ['swarmInterval','assaultInterval','postInterval','baseInterval'])out[k]/=density;for(const k of ['combatCap','soldierCap','swarmCap','postCap','baseCap'])out[k]=Math.max(1,Math.floor(out[k]*density));if(this.isDesktopDefense()&&!boss)for(const k of ['combatCap','soldierCap','swarmCap'])out[k]+=pace.capExtra;return out;}
 enemySpawnRoom(team){const p=this.pressure();if(!this.isDesktopDefense()&&!p.late)return this.waveRules().earlyTeamCap-this.units.filter(u=>u.team===team&&u.hp>0).length;const live=this.units.filter(u=>u.team!==0&&u.hp>0&&!u.boss&&!['leader','artillery'].includes(u.type));return Math.max(0,Math.min(p.combatCap-live.length,team===1?p.soldierCap-live.filter(u=>u.team===1).length:Infinity));}
 income(team){return 3.6;}
 truckCost(team){return Infinity;}
 alive(team){return this.units.filter(u=>u.team===team&&u.hp>0&&!u.patrol);}
 commander(team){return this.units.find(u=>u.team===team&&u.type==='leader')||this.bases[team];}
 flameLevel(){return 1+(['machinegun','rocket'].reduce((n,t)=>n+Math.max(0,(this.tech[0][t]||1)-1),0))*.5;}
 commanderLevel(u){if(u?.team!==0||u.type!=='leader')return 1;return this.isFlameCommander(u)?this.flameLevel():1+ROSTER.reduce((n,t)=>n+Math.max(0,(this.tech[0][t]||1)-1),0)*.3;}
 refreshCommanderHealth(){const c=this.commander(0);if(c?.type!=='leader')return;const hp=this.stats(c).hp;if(c.hp>0)c.hp=clamp(c.hp+hp-c.maxHp,0,hp);c.maxHp=hp;}
 refreshFlameHealth(){this.refreshCommanderHealth();}
 refreshSquadHealth(){for(const u of this.alive(0)){const hp=this.stats(u).hp;u.hp=clamp(u.hp+hp-u.maxHp,0,hp);u.maxHp=hp;}}
 isSwordCommander(u){return u?.team===0&&u.type==='leader'&&(u.appearance||this.commanderId)==='shion';}
 berserkerHaste(u){return this.isSwordCommander(u)&&u.hp>0&&u.maxHp>0?Math.min(19,Math.floor((1-clamp(u.hp/u.maxHp,0,1))*20+1e-8))*.02:0;}
 isFrontCommander(u){return this.isFlameCommander(u)||this.isSwordCommander(u);}
 isFlameCommander(u){return u?.team===0&&u.type==='leader'&&(u.appearance||this.commanderId)==='blaze';}
 // Balance multipliers apply when attacks are created, never again on impact.
 enemyDamageScale(u){if(!this.isRoomCampaign()||u?.team===0||u?.defenseKind==='laserTower')return 1;const r=ROOM_CAMPAIGN.config.combat,a=ROOM_CAMPAIGN.config.attrition,pressure=this.starExperiment&&this.starMax===2&&!this.coop&&this.time>=a.from&&u.roomWave&&!u.boss&&u.type!=='mortar'?(this.time>=a.lateAt?a.lateWaveDamage:a.soloTwoStarWaveDamage):1,mortar=u.type==='mortar'&&!u.boss?(this.time>=a.lateAt?a.lateMortarDamage:a.mortarDamage):1;return pressure*mortar*(r?.damageScale??1)*(u?.type==='bikeRaider'?(r?.bikeDamageScale??1):1)*(u?.boss?(r?.bossDamageScale??1):1)*(this.bossPatternRules(u)?.damageMultiplier??1);}
 enemyHealthScale(u){if(!this.isRoomCampaign()||u.team===0)return 1;const r=ROOM_CAMPAIGN.config.combat;return u.boss?(r.bossHpScale??1)*(r.bossHpExtra?.[u.type]??1):(r.hpScale??1);}
 stats(u){
  const b=u.type==='blizzardMage'&&u.mobileMage?{...TYPES.blizzardMage,speed:85,stationary:false,role:'이동형 얼음 마녀 · 광역 빙결 속박 · 아이스 실드 · 저격병 우선 공략'}:this.isFlameCommander(u)?{...TYPES.leader,name:'화염방사 대장',damage:FLAME.damage,rate:FLAME.rate,range:FLAME.range}:this.isSwordCommander(u)?{...TYPES.leader,name:'시온',damage:SWORD.damage,rate:SWORD.rate,range:SWORD.range}:TYPES[u.type],level=u.team===0&&u.type==='leader'?this.commanderLevel(u):ROSTER.includes(u.type)?Math.max(1,this.tech[u.team]?.[u.type]||1):1,p=this.profile.upgrades,ally=u.team===0,r=this.abilities,tier=u.threat||0,e=ally&&this.evolved[u.type]?u.type:null,fort=this.roomDefenseRules(u);
  const enemyPower=(this.mode==='pve'&&u.team===1&&ROSTER.includes(u.type)?(u.type==='sniper'?.6:.85):1.25)*(!ally?this.enemyDamageScale(u):1);
  const hpBonus=(e==='tank'||e==='medic'||e==='machinegun'?1.2:e==='rifle'?1.15:e==='guntruck'?1.1:1)*(this.isRoomCampaign()?(this.bossPatternRules(u)?.hpScale||1):1)*(fort?.hp||1)*(ally?1:u.evolutionWaveHp||1);
  const damageBonus=e==='tank'||e==='mortar'?1.35:e==='machinegun'?1.2:e==='rifle'?1.3:e==='rocket'?1.25:e==='guntruck'?1.15:1;
  const defense=({crimsonAce:34,bikeRaider:12,bladeGuard:8,bayonetCaptain:20,bayonet:10,hornet:30,soldierAnt:6,beetle:8,bruteBeetle:12,stagBeetle:30,rhinoBeetle:40}[u.type]??(ARMORED.has(u.type)?18:0))+(ally?p.defense*3+r.defense*5:tier*3)+(e==='medic'?12:0)+(fort?.defense||0);
  return {...b,name:e?EVOLUTIONS[e].name:b.name,hp:b.hp*(1+.18*(level-1))*(1+.12*tier)*(u.boss?({bayonetCaptain:4,bladeGuard:18,bikeRaider:7}[u.type]||(u.type==='hornet'?8:5)):1)*(u.boss?2:1)*hpBonus*this.enemyHealthScale(u)*(ally?1+.1*(r.health||0):1),damage:b.damage*(1+.18*(level-1))*(ally?(1+.04*p.damage)*(1+.1*r.damage):enemyPower)*(1+.10*tier)*(u.boss?1.69:1)*damageBonus*(fort?.damage||1),rate:u.type==='medic'?MEDIC_HEALING.interval:b.rate/(1+.09*(level-1))/(ally?(1+.03*p.haste)*(1+.08*r.haste):1)*(e==='guntruck'||e==='machinegun'?.75:1)*(!ally&&this.mode==='pve'&&u.type==='sniper'?1.25:1)*(fort?.rate||1)/(1+this.berserkerHaste(u)),speed:b.speed*(ally?(1+.03*p.speed)*(1+.06*r.speed):1)*(e==='rifle'?1.15:1)*(u.boss?u.type==='rhinoBeetle'?1.6:u.type==='stagBeetle'?1.5:1.35:1),defense,range:b.range+(e==='tank'?35:e==='rifle'?20:e==='sniper'?65:e==='medic'?60:e==='mortar'?70:0),splash:(b.splash||0)+(e==='tank'?35:e==='rocket'||e==='mortar'?30:0),critChance:ally?clamp(.05+p.critChance*.02+r.critChance*.04+(e==='sniper'?.25:e==='rocket'?.2:0),0,.95):0,critDamage:1.5+(ally?p.critDamage*.1+r.critDamage*.15:0)+(e==='sniper'?.5:0),heal:u.type==='medic'?MEDIC_HEALING.base*(1+MEDIC_HEALING.perLevel*(level-1))*(e==='medic'?MEDIC_HEALING.evolvedMultiplier:1):12*(1+.2*(level-1))};
 }
 selectedAbilities(){return Object.keys(ABILITIES).filter(k=>this.abilities[k]>0);}
 abilityKey(type){return typeof type==='string'&&type.startsWith('ability_')?type.slice(8):null;}
 eligibleCard(type){
  const key=this.abilityKey(type);if(key)return !!ABILITIES[key]&&this.abilities[key]<5&&(this.abilities[key]>0||this.selectedAbilities().length<5);
  if(ROSTER.includes(type))return this.tech[0][type]<5;
  return !!FIELD_CARDS[type];
 }
 checkEvolutions(){
  for(const [type,e]of Object.entries(EVOLUTIONS)){
   if(this.evolved[type]||this.tech[0][type]<5||this.abilities[e.ability]<5)continue;
   this.evolved[type]=true;
   this.alive(0).filter(u=>u.type===type).forEach(u=>{const hp=this.stats(u).hp;u.hp+=hp-u.maxHp;u.maxHp=hp;this.effects.push({kind:'evolve',x:u.x,y:u.y,t:1.2,max:1.2,team:0});});
   this.notify('toast',`${e.name} 진화! ${TYPES[type].name} Lv.5 + ${ABILITIES[e.ability].name} Lv.5`);
  }
 }

 unitCount(type,team=0){return this.units.filter(u=>u.team===team&&u.type===type&&u.hp>0).length;}
 unitTypeCap(team=0){return team===0?UNIT_TYPE_CAP:Infinity;}
 recruitmentRemaining(type,team=0){return Math.max(0,this.unitTypeCap(team)-this.unitCount(type,team));}
 abilityBonus(key,level=this.abilities[key]||0){return (ABILITIES[key]?.gain||0)*level;}
 abilityStep(key,level){return this.abilityBonus(key,level)-this.abilityBonus(key,Math.max(0,level-1));}
 capacity(team=0){return 20+(team===0?this.profile.upgrades.capacity+this.abilityBonus('capacity'):0);}
 awardGold(base){const amount=Math.round(base*(1+.1*this.profile.upgrades.gold)*(1+.15*this.abilities.gold)*100)/100;this.profile.gold=Math.round(Math.min(1e9,this.profile.gold+amount)*100)/100;this.runGold=Math.round((this.runGold+amount)*100)/100;this.notify('profile');return amount;}
 buyPermanent(key){
  this.lastPermanentAttempt=null;
  if(!['ready','paused','choice','resupply','ended'].includes(this.phase))return false;
  const cost=this.profile.cost(key);if(!Number.isFinite(cost)||this.profile.gold<cost)return false;
  if(this.profile.mode==='idle'&&typeof this.profile.purchase==='function'){this.lastPermanentAttempt=this.profile.purchase(key,()=>this.random());if(this.lastPermanentAttempt?.success)this.refreshBuildingStats();this.notify('profile');this.notify('change');return !!this.lastPermanentAttempt?.success;}
  this.profile.gold=Math.round((this.profile.gold-cost)*100)/100;this.profile.upgrades[key]++;this.refreshBuildingStats();this.notify('profile');this.notify('change');return true;
 }
 bossArmorPenetration(source){if(!this.isRoomCampaign()||!source?.boss||source.team===0)return 0;return clamp(ROOM_CAMPAIGN.config.combat.bossArmorPenetration?.[source.type]||0,0,1);}
 defenseFactor(target,source=null){if(target.fencePost)return 1;const defense=target.built?(this.buildingStats(target.kind,target.team)?.defense??10):TYPES[target.type]?this.stats(target).defense:target.base?18:target.structure?10:0,cover=target.team===0&&!target.structure?Math.max(this.buildings.some(b=>b.hp>0&&b.kind==='barricade'&&b.buildUntil<=this.time&&dist(b,target)<100)?20:0,this.isDesktopDefense()&&this.obstacles.some(slot=>{if(!slot.cover)return false;const o=slot.kind==='deskCover'?desktopCoverRect(slot):slot;return Math.hypot(Math.max(0,Math.abs(target.x-o.x-o.w/2)-o.w/2),Math.max(0,Math.abs(target.y-o.y-o.h/2)-o.h/2))<85;})?12:0):0;return 100/(100+(defense+(!TYPES[target.type]?(this.roomDefenseRules(target)?.defense||0):0))*(1-this.bossArmorPenetration(source))+cover);}
 fireUnitProjectiles(u,target,attack,s=this.stats(u)){const shot={x:u.x,y:u.y,target,source:u,damage:attack.damage,critical:attack.critical,splash:s.splash||0,speed:u.type==='rocket'?480:(u.type==='tank'||u.type==='crimsonAce')?580:u.type==='sniper'?1600:950,kind:u.type,team:u.team,life:1.5};this.shots.push(shot);return[shot];}
 attackRoll(u,random=()=>this.random()){const s=this.stats(u),critical=s.critChance>0&&random()<s.critChance;return {damage:s.damage*(critical?s.critDamage:1),critical};}
 canTarget(attacker,target){
  if(target===this.bases[0]&&this.hasInvulnerableHQ())return false;
  if(this.bossInvulnerable(target))return false;
  if(target.hp<=0||attacker.team===target.team||target.fixedGuard&&this.mission.stage<(target.activeStage||2)||target.roadCaptain&&this.mission.stage<target.roadStage)return false;
  if(attacker.roadCaptain&&dist(target,{x:attacker.homeX,y:attacker.homeY})>750)return false;
  if(this.mode==='pve'&&attacker.team!==0&&target.team!==0)return false;
  return true;
 }
 combatCandidates(){return [...this.units,...(this.mode==='pve'&&this.mission.stage>=2?[...this.activeDefenses(),...this.structures.filter(p=>p.hp>0)]:[]),...(this.mode!=='crisis'&&(this.mode!=='pve'||this.mission.stage>=3)?[this.bases[1]]:[])];}
 attackingEnemies(){
  const threats=new Set(),allies=[...this.alive(0),...this.buildings.filter(b=>b.hp>0),this.bases[0]].filter(u=>u.hp>0);
  for(const p of this.shots)if(p.team!==0&&p.target?.team===0&&p.target.hp>0&&p.life>0)threats.add(p.source);
  for(const p of [...this.mortarShells,...this.barrages])if(p.source&&p.source.team!==0&&p.landAt>this.time)threats.add(p.source);
  for(const e of [...this.units,...this.activeDefenses(),...this.structures.filter(p=>this.mission.stage>=(p.activeStage||2)),this.bases[1]]){
   if(e.team===0||e.hp<=0)continue;
   if(TYPES[e.type]?.charge){if(e.bikeAttack)threats.add(e);continue;}
   const s=TYPES[e.type]?this.stats(e):e.defenseKind?this.defenseStats(e):{damage:1,range:340,minRange:0};
   if((s.damage>0||e.type==='butterfly')&&allies.some(a=>this.canTarget(e,a)&&this.targetDistance(e,a)<s.range&&this.targetDistance(e,a)>=(s.minRange||0)))threats.add(e);
  }
  return threats;
 }
 combatPriority(u,target,threats){
  const low=target.hp<=target.maxHp*.3,heavy=target.boss||target.maxHp>=1000,kind=target.base?'base':target.structure?'structure':target.type,affinity=multiplier(u.type,kind),ranged=target.base||target.structure||target.type==='artillery'||(TYPES[target.type]&&!TYPES[target.type].charge&&this.stats(target).range>=100);
  const tier=threats.has(target)?0:low?1:heavy?3:2;
  return [tier,tier===0?Number(!ranged):0,tier===0?Number(!low):0,tier<2?target.hp:0,-affinity,tier===3?target.hp:0,this.targetDistance(u,target),target.id||0];
 }
 selectEnemyMortarTarget(u,s=this.stats(u)){
  const infantry=new Set(['rifle','machinegun','sniper','rocket','mortar','medic']),targets=this.units.filter(t=>this.canTarget(u,t)&&t.team===0&&infantry.has(t.type)&&this.targetDistance(u,t)>=(s.minRange||0)&&this.targetDistance(u,t)<s.range);
  const density=t=>targets.reduce((n,a)=>n+(dist(a,t)<=(s.splash||70)?1:0),0);
  return targets.sort((a,b)=>density(b)-density(a)||Number(b.type==='medic')-Number(a.type==='medic')||this.targetDistance(u,a)-this.targetDistance(u,b))[0]||null;
 }
 selectCombatTarget(u,candidates=this.combatCandidates(),threats=this.attackingEnemies(),s=this.stats(u)){
  if(u.team===0&&u.type==='sniper'){
   const priority=candidates.filter(a=>['blizzardMage','mortar'].includes(a.type)&&this.canTarget(u,a)&&this.visible(a)&&this.targetDistance(u,a)<s.range&&this.targetDistance(u,a)>=(s.minRange||0)&&this.lineClear(u,a,0,{fireTeam:u.team}));
   priority.sort((a,b)=>Number(a.type!=='blizzardMage')-Number(b.type!=='blizzardMage')||this.targetDistance(u,a)-this.targetDistance(u,b)||a.hp-b.hp);if(priority.length)return priority[0];
  }
  // Mortars neutralize reachable lasers before spending slow shells on mobile foes.
  // Only target selection changes; movement, minimum range and manual focus stay intact.
  if(u.team===0&&u.type==='mortar'){
   let laser=null;
   for(const a of candidates){
    if(a.defenseKind!=='laserTower'||!this.canTarget(u,a)||this.mission.stage<(a.activeStage||2)||!this.visible(a))continue;
    const distance=this.targetDistance(u,a);if(distance<(s.minRange||0)||distance>=s.range+35)continue;
    if(!laser||a.hp<laser.hp||a.hp===laser.hp&&distance<this.targetDistance(u,laser))laser=a;
   }
   if(laser)return laser;
  }
  const hq=this.aiHQTarget;if(hq&&this.canTarget(u,hq)&&this.targetDistance(u,hq)<s.range&&this.targetDistance(u,hq)>=(s.minRange||0)&&this.lineClear(u,hq,0,{fireTeam:0}))return hq;
  let best=null,rank=null;
  for(const a of candidates){if(!this.canTarget(u,a))continue;const d=this.targetDistance(u,a),extra=this.isSwordCommander(u)?0:a.base?45:a.structure?35:0;if(d<(s.minRange||0)||d>=s.range+extra)continue;
   const next=this.combatPriority(u,a,threats);let better=!rank;for(let i=0;rank&&i<next.length;i++){if(next[i]===rank[i])continue;better=next[i]<rank[i];break;}if(better){best=a;rank=next;}
  }
  return best;
 }
 syncEnemyGrowth(){
  const tier=this.pressure().tier;if(tier===this.lastEnemyGrowth)return;this.lastEnemyGrowth=tier;
  for(const u of this.units){if(u.team===0||u.hp<=0||tier<=(u.threat||0))continue;const ratio=u.hp/u.maxHp;u.threat=tier;u.maxHp=this.stats(u).hp;u.hp=u.maxHp*ratio;}
 }
 addUnit(team,type,x,y,patrol=false){const u={id:++this.serial,team,type,x,y,face:team===0?-Math.PI/2:Math.PI/2,hp:1,maxHp:1,threat:team!==0&&type!=='leader'?this.pressure().tier:0,cooldown:this.random()*.4,deadUntil:0,patrol,homeX:x,homeY:y,walk:0,flash:0,recoil:0};u.hp=u.maxHp=this.stats(u).hp;if(u.type==='tank'||u.type==='crimsonAce'||u.type==='guntruck'||u.type==='lucky')u.moveFace=u.face;if(u.type==='tank'||u.type==='crimsonAce'||u.type==='guntruck')u.turretFace=u.face;this.resolvePosition(u);u.homeX=u.x;u.homeY=u.y;if(type==='lucky'&&team===0){u.nextLuckyAt=this.time+LUCKY.interval;u.luckyInterval=LUCKY.interval;}if(type==='leader'&&team===0){u.appearance=this.commanderId||'sarge';u.flameSkin=this.flameSkinId||'classic';}if(type==='sniper'&&team===0)u.appearance=this.sniperSkinId||'classic';if(type==='medic'&&team===0)u.appearance=this.medicSkinId||'classic';this.units.push(u);return u;}
 spawnPatrol(x,y){this.addUnit(2,'ant',x-24,y,true);this.addUnit(2,'ant',x+24,y+34,true);}
 queueCost(queue,team=0){let total=0;for(const [type,n]of Object.entries(queue)){if(!Number.isInteger(n)||n<0||n>30)return Infinity;if(type==='truck'){if(n>0)return Infinity;}else if(ROSTER.includes(type))total+=TYPES[type].cost*n;else return Infinity;}return total;}
 supportValid(queue,team=0){
  if(this.choiceKind==='boss'||this.phase!=='choice'||this.turnChoice||!queue||typeof queue!=='object')return false;
  const cost=this.queueCost(queue,team),count=this.units.filter(u=>u.team===team&&u.hp>0&&!u.patrol&&u.type!=='leader'&&(!this.coop||u.coopOwner===this.coopOwner)).length;
  const troops=Object.entries(queue).filter(([t])=>t!=='truck').reduce((n,[t,q])=>n+q,0),trucks=queue.truck||0;
  return cost>0&&Number.isFinite(cost)&&cost<=this.cash[team]&&this.trucks[team]+trucks<=7&&count+troops<=this.capacity(team)&&!Object.entries(queue).some(([t,n])=>n>0&&t!=='truck'&&(!this.tech[team][t]||n>this.recruitmentRemaining(t,team)));
 }
 request(queue,team=0){
  if(!this.supportValid(queue,team))return false;
  for(const[t,n]of Object.entries(queue))for(let i=0;i<n;i++)this.buy(t,team);
  if(this.choiceKind==='recovery')this.nextRecoveryAt=this.time+90;
  this.turnChoice='support';this.phase='resupply';this.notify('change');return true;
 }
 recoveryReady(){return this.mode==='pve'&&this.phase==='playing'&&this.commander(0).hp>0&&this.losses[0]>0&&this.alive(0).filter(u=>u.type!=='leader').length<=Math.max(2,Math.floor(this.capacity()*.4))&&this.time>=this.nextRecoveryAt&&this.cash[0]>=TYPES.rifle.cost;}
 beginRecovery(){
  if(!this.recoveryReady())return false;
  this.choiceKind='recovery';this.currentOptions=[];this.phase='choice';this.turnChoice=null;this.pendingChoice=null;this.input={x:0,y:0};this.notify('level',[]);return true;
 }
 cancelRecovery(){
  if(this.phase!=='choice'||this.choiceKind!=='recovery')return false;
  this.phase='playing';this.choiceKind='level';this.pendingChoice=null;this.turnChoice=null;this.notify('change');return true;
 }
 stageChoice(type,queue){
  if(this.phase!=='choice'||this.turnChoice||type==='scout')return false;
  if(type==='support'){if(!this.supportValid(queue))return false;this.pendingChoice={type,queue:{...queue}};}
  else{if(this.choiceKind==='recovery')return false;if(!this.currentOptions?.includes(type)||!this.eligibleCard(type)||this.choiceKind==='boss'&&!this.bossRewardEligible(type))return false;this.pendingChoice={type};}
  return true;
 }
 confirmChoice(){
  const pending=this.pendingChoice;if(!pending||this.phase!=='choice')return false;
  const ok=pending.type==='support'?this.request(pending.queue):this.choose(pending.type);
  if(ok)this.pendingChoice=null;return ok;
 }

 buy(type,team=0){
  if(!['playing','choice','resupply'].includes(this.phase))return false;
  if(type==='truck')return false;
  if(!this.tech[team][type]||!TYPES[type]||this.recruitmentRemaining(type,team)<=0||this.cash[team]<TYPES[type].cost||this.units.filter(u=>u.team===team&&u.hp>0&&!u.patrol&&u.type!=='leader'&&(!this.coop||u.coopOwner===this.coopOwner)).length>=this.capacity(team))return false;
  this.cash[team]-=TYPES[type].cost;const leader=this.commander(team);const a=this.serial*2.4;
  const u=this.addUnit(team,type,leader.x+Math.cos(a)*65,leader.y+Math.sin(a)*65);u.x=clamp(u.x,55,this.bounds().width-55);u.y=clamp(u.y,90,this.bounds().height-90);
  if(team===0){Object.assign(u,this.formationPoint(u,leader));this.resolvePosition(u);}
  this.effects.push({kind:'drop',x:u.x,y:u.y,t:.8,max:.8,team});if(!team)this.notify('toast',`${TYPES[type].name} 합류 · −${TYPES[type].cost} 자원`);this.notify('change');return true;
 }
 options(){
  if(this.choiceKind==='boss'){const owned=new Set(this.alive(0).map(u=>u.type)),pool=[...ROSTER.filter(t=>owned.has(t)&&this.eligibleCard(t)),...Object.keys(ABILITIES).filter(k=>this.abilities[k]>0).map(k=>'ability_'+k).filter(t=>this.eligibleCard(t))];for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.length?pool.slice(0,3):['fieldGold','fieldRepair'];}
  const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
  // Owning or fielding a card does not increase its chance: locked units and
  // unselected abilities share the same eligible pools as existing upgrades.
  const units=shuffle(ROSTER.filter(t=>this.eligibleCard(t))),abilities=shuffle(Object.keys(ABILITIES).map(k=>'ability_'+k).filter(t=>this.eligibleCard(t)));
  const eligible=[...units,...abilities],picks=[];
  if(units.length)picks.push(units[0]);if(abilities.length)picks.push(abilities[0]);
  for(const t of shuffle(eligible))if(picks.length<3&&!picks.includes(t))picks.push(t);
  const early=this.level<8&&this.time<150;
  const unlock=this.mode==='pve'&&this.choiceKind!=='boss'?(early&&this.time>=45&&!this.tech[0].rocket&&!this.cardShownCounts.rocket?'rocket':early&&this.level>=3&&!this.tech[0].medic&&!this.cardShownCounts.medic?'medic':early&&this.level>=4&&!this.tech[0].lucky&&!this.cardShownCounts.lucky?'lucky':early&&this.time>=90&&!this.tech[0].tank&&!this.cardShownCounts.tank?'tank':this.mission.stage>=2&&!this.tech[0].mortar&&!this.cardShownCounts.mortar?'mortar':null):null;
  // An introductory unlock may appear once; declining it never pins a slot.
  if(unlock&&this.eligibleCard(unlock)&&!picks.includes(unlock)){if(picks.length>=3)picks[2]=unlock;else picks.push(unlock);}
  for(const t of Object.keys(FIELD_CARDS))if(picks.length<3)picks.push(t);
  const result=picks.slice(0,3);for(const t of result)this.cardShownCounts[t]=(this.cardShownCounts[t]||0)+1;
  return result;
 }

 bossRewardEligible(type){if(type==='fieldGold'||type==='fieldRepair')return true;const key=this.abilityKey(type);return this.eligibleCard(type)&&(key?this.abilities[key]>0:this.alive(0).some(u=>u.type===type));}
 choose(type){
  if(this.phase!=='choice'||this.turnChoice||type==='scout')return false;
  if(this.choiceKind==='recovery')return false;
  const boss=this.choiceKind==='boss',key=this.abilityKey(type);
  if(boss&&(this.bossState.rewards<=0||type==='scout'||!this.bossRewardEligible(type)))return false;
   if(!this.currentOptions?.includes(type)||!this.eligibleCard(type)||this.choiceKind==='boss'&&!this.bossRewardEligible(type))return false;
   if(key){this.abilities[key]++;if(key==='health')this.refreshSquadHealth();this.notify('toast',`${ABILITIES[key].name} Lv.${this.abilities[key]}/5 · 이번 작전 능력 ${this.selectedAbilities().length}/5종`);}
   else if(FIELD_CARDS[type]){if(type==='fieldSupply')this.cash[0]+=90;else if(type==='fieldRepair')this.alive(0).forEach(u=>{this.heal(u,u.maxHp*.4);});else this.awardGold(15);this.notify('toast',FIELD_CARDS[type].detail);}
   else{const old=this.tech[0][type];this.tech[0][type]++;this.alive(0).filter(u=>u.type===type).forEach(u=>{const hp=this.stats(u).hp;u.hp+=hp-u.maxHp;u.maxHp=hp;});this.notify('toast',old?`${TYPES[type].name} Lv.${this.tech[0][type]} · 병과 강화`:`${TYPES[type].name} 해금 · 다음 지원에서 충원 가능`);}
   this.checkEvolutions();this.refreshCommanderHealth();this.refreshBuildingStats();
  if(boss){this.bossState.rewards--;this.bossState.claimed++;}
  this.turnChoice=boss?'boss':'upgrade';this.phase='resupply';this.notify('change');return true;
 }

 gainXP(n){this.xp+=n;}
 levelCheck(){
  if(this.phase!=='playing'||this.mode==='crisis')return;
  if(this.bossState.rewards>0){this.choiceKind='boss';this.currentOptions=this.options();}
  else if(this.xp>=this.neededXP()){this.xp-=this.neededXP();this.level++;this.choiceKind='level';this.currentOptions=this.options();}
  else return;
  this.phase='choice';this.turnChoice=null;this.pendingChoice=null;this.input={x:0,y:0};this.notify('level',this.currentOptions);
 }
 activeBoss(){if(this.isRoomCampaign())return this.units.find(u=>u.boss&&!u.roadCaptain&&u.hp>0)||null;return this.units.find(u=>u.boss&&!u.roadCaptain&&u.hp>0)||this.units.find(u=>u.roadCaptain&&u.hp>0&&this.mission.stage>=u.roadStage&&dist(this.commander(0),u)<800)||null;}
 updateBosses(){
  if(this.mode!=='pve'||this.phase!=='playing')return;
  if(this.isRoomCampaign()){this.updateRoomBosses();return;}
  const rules=this.waveRules().boss,room=this.bounds().id==='livingroom',final=room&&this.time>=rules.final.at&&!this.finalBattle.spawned;
  if(!final&&(!rules.enabled||!rules.types.length))return;
  if(!final&&(this.units.some(u=>u.boss&&!u.roadCaptain&&u.hp>0)||room&&this.finalBattle.spawned))return;
  if(!final&&!this.bossState.warned&&this.time>=this.bossState.nextAt-rules.warningSeconds){this.bossState.warned=true;this.notify('toast',`보스 접근 · ${rules.warningSeconds}초 뒤 출현 / 처치 시 추가 강화`);}
  if(!final&&this.time<this.bossState.nextAt)return;
  const player=this.commander(0),type=final?rules.final.type:rules.types[this.bossState.spawned%rules.types.length];
  const spawn=this.isDesktopDefense()?this.desktopEntry():this.northernSpawn(this.serial+1,55);if(!spawn)return;const u=this.addUnit(2,type,spawn.x,spawn.y,true);
  u.boss=true;u.finalBoss=final;u.bossNumber=++this.bossState.spawned;u.bossName=final?rules.final.name:rules.names[type]||TYPES[type].name;u.assault=true;
  if(final)this.finalBattle.spawned=true;if(this.mission.stage===1)u.missionStage=1;
  u.hp=u.maxHp=this.stats(u).hp;this.resolvePosition(u);u.homeX=u.x;u.homeY=u.y;
  this.bossState.nextAt=this.time+rules.interval;this.bossState.warned=false;this.notify('toast',`${u.bossName} 출현 · 처치 시 추가 강화${final?' / 최종 기지 방어막 해제 조건':''}`);
 }

 visionRadius(u){return u.base?330:u.team===0&&(u.type==='sniper'||u.type==='mortar')?Math.max(380,this.stats(u).range):380;}
 visible(u){if(u.roadCaptain)return this.mission.stage>=u.roadStage&&(this.time<this.scoutUntil||this.alive(0).some(a=>dist(a,u)<800));if(this.isDesktopDefense())return true;if(u.team===0||u.battery||u.boss)return true;if(this.time<this.scoutUntil)return true;if((u.fixedGuard||u.defenseKind==='laserTower')&&this.alive(0).some(a=>dist(a,u)<TYPES.mortar.range+100))return true;return [...this.alive(0),...this.buildings.filter(b=>b.hp>0&&b.kind==='repairBot'&&b.buildUntil<=this.time)].some(a=>dist(a,u)<=this.visionRadius(a))||dist(this.bases[0],u)<330;}
 isFlying(u){return !!TYPES[u?.type]?.flying;}
 collisionRadius(u){return (TYPES[u.type]?.r||u.r||12)*(u.boss?1.35:1)+5;}
 frontline(){if(this.isDesktopDefense()||this.isRoomCampaign())return 70;return this.mode==='pve'?(this.mission.stage===1?1680*this.bounds().scale:this.mission.stage===2?620*this.bounds().scale:70):70;}
 freePosition(x,y,r,solids=this.solidObstacles()){return x>=45&&x<=this.bounds().width-45&&y>=70&&y<=this.bounds().height-70&&!solids.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);}
 // Apply this after spawning, movement, and crowd separation; no system can leave a body inside cover.
 resolvePosition(u,r=this.collisionRadius(u)){
  u.x=clamp(u.x,45,this.bounds().width-45);u.y=clamp(u.y,70,this.bounds().height-70);
  if(u.team===0)u.y=Math.max(u.y,this.frontline());
  if(this.isFlying(u))return u;
  const solids=this.solidObstacles();
  for(let pass=0;pass<solids.length+1;pass++){
   let changed=false;
   for(const o of solids){const left=o.x-r,right=o.x+o.w+r,top=o.y-r,bottom=o.y+o.h+r;
    if(u.x>left&&u.x<right&&u.y>top&&u.y<bottom){
     const exits=[{x:left-.5,y:u.y,d:u.x-left},{x:right+.5,y:u.y,d:right-u.x},{x:u.x,y:top-.5,d:u.y-top},{x:u.x,y:bottom+.5,d:bottom-u.y}].filter(p=>p.x>=45&&p.x<=this.bounds().width-45&&p.y>=70&&p.y<=this.bounds().height-70).sort((a,b)=>a.d-b.d);
     if(exits.length){u.x=exits[0].x;u.y=exits[0].y;changed=true;}
    }
   }
   if(!changed)break;
  }
  return u;
 }
 lineClear(a,b,r,{fireTeam=null,solids=null}={}){
  const dx=b.x-a.x,dy=b.y-a.y,minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y);
  for(const o of solids||this.solidObstacles(fireTeam)){
   const left=o.x-r,right=o.x+o.w+r,top=o.y-r,bottom=o.y+o.h+r;
   if(maxX<left||minX>right||maxY<top||minY>bottom)continue;
   let enter=0,leave=1;
   if(Math.abs(dx)<1e-8){if(a.x<=left||a.x>=right)continue;}
   else{let t0=(left-a.x)/dx,t1=(right-a.x)/dx;if(t0>t1){const swap=t0;t0=t1;t1=swap;}enter=Math.max(enter,t0);leave=Math.min(leave,t1);if(enter>leave)continue;}
   if(Math.abs(dy)<1e-8){if(a.y<=top||a.y>=bottom)continue;}
   else{let t0=(top-a.y)/dy,t1=(bottom-a.y)/dy;if(t0>t1){const swap=t0;t0=t1;t1=swap;}enter=Math.max(enter,t0);leave=Math.min(leave,t1);if(enter>leave)continue;}
   if(leave>1e-8&&enter<1-1e-8)return false;
  }
  return true;
 }
 navigationGraph(r){
  const solids=this.solidObstacles(),key=`${r}:${collisionCaches.get(this).signature}`;
  if(this.navigationCache.has(key))return this.navigationCache.get(key);
  const points=[];
  for(const o of solids)for(const x of [o.x-r-3,o.x+o.w+r+3])for(const y of [o.y-r-3,o.y+o.h+r+3])if(this.freePosition(x,y,r,solids))points.push({x,y});
  const edges=points.map(()=>[]);
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(this.lineClear(points[i],points[j],r,{solids})){const d=dist(points[i],points[j]);edges[i].push([j,d]);edges[j].push([i,d]);}
  const graph={points,edges};this.navigationCache.set(key,graph);return graph;
 }
 findPath(start,end,r){
  const solids=this.solidObstacles();
  if(this.lineClear(start,end,r,{solids}))return [{x:end.x,y:end.y}];
  const graph=this.navigationGraph(r),points=[{x:start.x,y:start.y},{x:end.x,y:end.y},...graph.points],edges=[[],[],...graph.edges.map(list=>list.map(([i,d])=>[i+2,d]))];
  for(let i=2;i<points.length;i++)for(const j of [0,1])if(this.lineClear(points[j],points[i],r,{solids})){const d=dist(points[j],points[i]);edges[j].push([i,d]);edges[i].push([j,d]);}
  const scores=points.map(()=>Infinity),previous=points.map(()=>-1),closed=new Set();scores[0]=0;
  for(let step=0;step<points.length;step++){
   let next=-1,best=Infinity;for(let i=0;i<points.length;i++)if(!closed.has(i)&&scores[i]+dist(points[i],end)<best){best=scores[i]+dist(points[i],end);next=i;}
   if(next<0)break;
   if(next===1){const path=[];for(let i=1;i!==0;i=previous[i])path.unshift({x:points[i].x,y:points[i].y});return path;}
   closed.add(next);for(const[j,d]of edges[next])if(!closed.has(j)&&scores[next]+d<scores[j]){scores[j]=scores[next]+d;previous[j]=next;}
  }
  return [];
 }
 navigate(u,x,y,dt,speed){
  if(this.isFlying(u)){u.route=null;this.move(u,x-u.x,y-u.y,dt,speed);return;}
  this.resolvePosition(u);const r=this.collisionRadius(u),goal=this.resolvePosition({x,y},r);
  if(this.lineClear(u,goal,r)){u.route=null;this.moveInCrowd(u,goal,dt,speed);return;}
  // Static cover does not change every 0.75 s. Keep the chosen side until
  // its corridor is blocked or the destination actually changes.
  if(!u.route||!u.route.length||!u.routeGoal||dist(goal,u.routeGoal)>60||!this.lineClear(u,u.route[0],r)){u.route=this.findPath(u,goal,r);u.routeGoal={...goal};u.routeAt=this.time;}
  while(u.route.length&&dist(u,u.route[0])<Math.max(3,speed*dt*.8))u.route.shift();
  while(u.route.length>1&&dist(u,u.route[0])<r+10&&this.lineClear(u,u.route[1],r))u.route.shift();
  const next=u.route[0];if(next)this.moveInCrowd(u,next,dt,speed);
 }
 moveInCrowd(u,goal,dt,speed){
  const dx=goal.x-u.x,dy=goal.y-u.y,length=Math.hypot(dx,dy),oldX=u.x,oldY=u.y;
  const nearby=u.team===0&&u.type!=='leader'?this.alive(0).filter(a=>a!==u&&dist(a,u)<110):[];
  if(!u.navCheck||this.time-u.navCheck.at>1){if(u.navCheck&&dist(u,u.navCheck)<18&&length>35)u.navUnjamUntil=this.time+.7;u.navCheck={x:u.x,y:u.y,at:this.time};}
  if(!nearby.length||length<Math.max(35,this.collisionRadius(u)+8)||this.time<(u.navUnjamUntil||0)){this.move(u,dx,dy,dt,speed);u.navVX=(u.x-oldX)/dt;u.navVY=(u.y-oldY)/dt;return;}
  const angle=Math.atan2(dy,dx),ahead=Math.min(length,speed*.24),r=this.collisionRadius(u),candidates=[];
  for(const offset of [0,Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2]){
   const vx=Math.cos(angle+offset),vy=Math.sin(angle+offset),point={x:u.x+vx*ahead,y:u.y+vy*ahead};if(!this.freePosition(point.x,point.y,r)||!this.lineClear(u,point,r)||u.team===0&&point.y<this.frontline())continue;
   let cost=(1-Math.cos(offset))*2.5+(u.avoidSide&&offset&&Math.sign(offset)!==u.avoidSide?.2:0);
   for(const a of nearby){const need=r+this.collisionRadius(a)+3,current=dist(u,a),future=dist(point,{x:a.x+(a.navVX||0)*.24,y:a.y+(a.navVY||0)*.24});const priority=['tank','guntruck'].includes(u.type)&&!['tank','guntruck','leader'].includes(a.type)?.25:1;cost+=Math.max(0,1-future/need)**2*18*priority;if(future<Math.min(current,need)-2)cost+=3*(1-future/need)*priority;}
   candidates.push({vx,vy,offset,cost});
  }
  const chosen=candidates.sort((a,b)=>a.cost-b.cost)[0];
  if(chosen){if(chosen.offset)u.avoidSide=Math.sign(chosen.offset);this.move(u,chosen.vx*length,chosen.vy*length,dt,speed);}else this.move(u,dx,dy,dt,speed);
  u.navVX=(u.x-oldX)/dt;u.navVY=(u.y-oldY)/dt;
 }

 isStationary(u){return !!TYPES[u.type]?.stationary&&!u.mobileMage;}
 move(u,dx,dy,dt,speed){
  if(this.time<(u.rootedUntil||0)||this.isStationary(u))return;
  if(this.time<(u.slowUntil||0))speed*=1-clamp(u.slowAmount||.3,0,.9);
  if(u.bossPattern==='soldierDash'){const p=this.bossPatternRules(u);if(p&&this.time%p.every<p.duration)speed*=p.speed;}
  if(this.time<(u.luckySlowUntil||0))speed*=1-(this.isFlying(u)?LUCKY.flyingSlow:LUCKY.groundSlow);
  this.resolvePosition(u);let n=Math.hypot(dx,dy);if(n<.01)return;dx/=n;dy/=n;const step=Math.min(n,speed*dt),r=this.collisionRadius(u),oldX=u.x,oldY=u.y;
  const nx=clamp(u.x+dx*step,45,this.bounds().width-45),ny=clamp(u.y+dy*step,70,this.bounds().height-70);
  if(this.isFlying(u)||this.freePosition(nx,ny,r)){u.x=nx;u.y=ny;}
  else if(this.freePosition(nx,u.y,r)){u.x=nx;}
  else if(this.freePosition(u.x,ny,r)){u.y=ny;}
  this.resolvePosition(u);const traveled=Math.hypot(u.x-oldX,u.y-oldY);u.walk+=traveled*.12;if(traveled>.01&&n>3){u.face=Math.atan2(dy,dx);if(u.type==='tank'||u.type==='crimsonAce'||u.type==='guntruck'||u.type==='lucky')u.moveFace=u.face;}
 }
 commanderReviveProtected(u){return u?.team===0&&u.type==='leader'&&u.hp>0&&this.time<(u.reviveProtectionUntil||0);}
 reviveCommander(u){
  if(u.team===0){const p=u.revivePoint||u;u.x=p.x;u.y=p.y;}
  else{const base=this.bases[u.team];u.x=base.x+(this.random()-.5)*90;u.y=base.y+70;}
  this.resolvePosition(u);u.route=null;u.routeGoal=null;u.regroup=null;u.aiEvade=null;u.hp=u.maxHp=this.stats(u).hp;u.deadUntil=0;u.diedAt=undefined;u.revivePoint=null;
  for(const key of ['poisonUntil','poisonDps','poisonNextAt','rootedUntil','slowUntil','windUntil','luckyRootUntil','luckySlowUntil','healingReductionUntil','hurtUntil'])u[key]=0;
  u.poisonSource=null;u.swordAttack=null;u.swordPose=null;u.ultimatePose=null;
  if(u.team===0)u.reviveProtectionUntil=this.time+COMMANDER_REVIVAL.protection;
  this.effects.push({kind:'drop',x:u.x,y:u.y,t:1,max:1,team:u.team});
  if(u.team===0)this.notify('toast',`대장 제자리 부활 · ${COMMANDER_REVIVAL.protection}초 보호`);
 }
 damage(target,amount,source){
  if(target===this.bases[0]&&this.hasInvulnerableHQ())return;
  if(target.roadCaptain&&this.mission.stage<target.roadStage)return;
  if(this.mode==='crisis'&&target.base&&target.team===1)return;
  if(this.mode==='pve'&&target.team===1){
   if((target.base&&this.baseShielded())||(target.structure&&this.mission.stage<(target.activeStage||2)))return;
   if((target.base||target.structure)&&target.defenseKind!=='laserTower'&&!target.fencePost)amount*=this.isFlameCommander(source)?.8:source.type==='mortar'?1:source.type==='machinegun'?.2:source.type==='sniper'?.2:source.type==='guntruck'?.3:source.type==='rifle'||source.type==='leader'?.3:.9;
  }
  if(target.hp<=0||this.commanderReviveProtected(target)||this.bossInvulnerable(target))return;
  if(this.time<(target.groggyUntil||0))amount*=this.bossPatternRules(target)?.vulnerable||1;
  if(target===this.bases[0]&&amount>0&&source&&source.team!==0){target.recentAttackers=[...(target.recentAttackers||[]).filter(h=>h.source!==source&&this.time-h.at<8),{source,at:this.time}].slice(-64);}
  if(this.isRoomCampaign()&&target===this.bases[1]&&amount>0&&source?.team===0)this.roomHQAlarm={until:this.time+8,x:source.x,y:source.y};
  const previousHp=target.hp;target.hp=Math.max(0,target.hp-amount*this.defenseFactor(target,source));
  if(this.isSwordCommander(source)&&source.hp>0&&target.team!==source.team&&target!==source)this.heal(source,Math.max(0,previousHp-target.hp)*.1);
  const dealt=previousHp-target.hp,heavy=['tank','crimsonAce','rocket','mortar','artillery','rhinoBeetle'].includes(source?.type)||dealt>target.maxHp*.16;
  const angle=Number.isFinite(source?.x)&&Number.isFinite(source?.y)?Math.atan2(target.y-source.y,target.x-source.x):0,power=clamp(.45+Math.sqrt(dealt/Math.max(1,target.maxHp))*2,.5,1.5);
  const react=dealt>0&&(!target.hitReaction||this.time<target.hitReaction.at||this.time+1e-8>=target.hitReaction.at+.5);
  if(react){
   target.hitReaction={at:this.time,angle,power,heavy};
   if(heavy&&(!this.impactPulse||this.time<this.impactPulse.at||this.time+1e-8>=this.impactPulse.at+.5))this.impactPulse={at:this.time,x:target.x,y:target.y,power};
   if(target.team===0&&target.type==='medic'&&target.appearance==='rina'){target.hurtStartedAt=this.time;target.hurtUntil=this.time+.32;target.hurtAngle=angle;}
   if(this.isSwordCommander(target)||this.isFlameCommander(target)&&target.flameSkin==='hwarin'){target.hurtUntil=this.time+.18;target.hurtAngle=angle;}
  }
  target.flash=.13;
  if(dealt>0&&this.time>=(target.nextHitEffectAt||0)){target.nextHitEffectAt=this.time+.065;this.effects.push({kind:'hit',x:target.x,y:target.y-(target.visualFlightHeight??TYPES[target.type]?.flightHeight??0),at:this.time,angle,power,damage:dealt,lift:target.team===2?8:24,t:.16,max:.16,team:target.team,armor:ARMORED.has(target.type)||target.type==='commando'});}
  if(target.hp<=0){
   if(this.isSwordCommander(target)){target.swordAttack=null;target.swordPose=null;}
   target.diedAt=this.time;if(target.type==='blizzardMage')target.iceShield=null;
   if(target.guardianRespawn){target.respawnAt=this.time+GUARDIANS.respawnDelay;target.laserAttack=null;target.blizzardCast=null;}
   this.effects.push({kind:'burst',x:target.x,y:target.y-(target.visualFlightHeight??TYPES[target.type]?.flightHeight??0),t:.5,max:.5,team:target.team});
   if(target.base){if(this.isRoomCampaign()&&target===this.bases[1]){this.roomPortalDestroyed();return;}this.finish(source.team===0?'win':'lose','base');return;}
   if(target.built){this.navigationCache.clear();return;}
   if(target.structure){if(target.fencePost)this.navigationCache.clear();if(source.team===0){const small=!!target.defenseKind;this.gainXP(small?25:60);this.cash[0]+=small?45:100;this.awardGold(small?10:20);this.notify('toast',`${target.name} 파괴 · +${small?45:100} 자원 / +${small?25:60} XP`);}return;}
   if(target.type==='artillery'){this.gainXP(60);this.cash[0]+=70;}
   if(source.team===0&&target.team!==0){
    this.kills++;this.awardGold(target.boss?30:ARMORED.has(target.type)||target.type==='hornet'?5:2);
    const originalXP={butterfly:28,crimsonAce:65,bikeRaider:28,bladeGuard:14,bayonetCaptain:35,bayonet:20,honeybee:18,hornet:50,rhinoBeetle:65,stagBeetle:38,bruteBeetle:45,tank:22,beetle:24,soldierAnt:20,ant:13},originalCash={butterfly:22,crimsonAce:60,bikeRaider:24,bladeGuard:12,bayonetCaptain:25,bayonet:16,honeybee:18,hornet:48,rhinoBeetle:65,stagBeetle:38,bruteBeetle:45,soldierAnt:20,ant:14,beetle:28};
    const pveCash={butterfly:16,crimsonAce:40,bikeRaider:16,bladeGuard:7,bayonetCaptain:16,bayonet:10,honeybee:10,hornet:26,rhinoBeetle:28,stagBeetle:20,bruteBeetle:20,soldierAnt:8,ant:6,beetle:12};
    const xp=originalXP[target.type]||9,cash=(this.mode==='pve'?pveCash:originalCash)[target.type]||8;
    this.gainXP(Math.ceil(xp*(target.ambient?.22:1)));this.cash[0]+=Math.ceil(cash*(target.ambient?.25:1));
   }
   if(target.finalBoss){this.finalBattle.killed=true;if(this.isRoomCampaign()){this.finish('win','finalBoss');return;}}
   if(target.boss||this.isRoomCampaign()&&target.roadCaptain){this.roomBossKilled(target);if(!target.roadCaptain){this.bossState.killed++;this.bossState.nextAt=Math.max(this.bossState.nextAt,this.time+this.waveRules().boss.minAfterKill);}this.bossState.rewards++;this.notify('toast',`${target.bossName} 격파 · 추가 강화 보상 확보`);}
   if(target.type==='artillery')this.checkCrisisClear();
   if(target.type==='leader'&&target.team===0){target.revivePoint={x:target.x,y:target.y};this.lastCommanderLoss=null;}
   if(target.type==='leader'&&target.team===0&&this.hasInvulnerableHQ()){this.retreated++;target.deadUntil=this.retreated<3?this.time+COMMANDER_REVIVAL.delay:0;if(this.retreated>=3)this.finish('lose','commander');else this.notify('toast',`대장 쓰러짐 · 남은 기회 ${3-this.retreated}회 / ${COMMANDER_REVIVAL.delay}초 후 제자리 부활`);return;}
   if(target.type==='leader'){const penalty=this.mode==='duel'?70:300;if(target.team===0)this.retreated++;this.bases[target.team].hp=Math.max(0,this.bases[target.team].hp-penalty);target.deadUntil=this.time+COMMANDER_REVIVAL.delay;if(!target.team)this.notify('toast',`대장 쓰러짐 · ${COMMANDER_REVIVAL.delay}초 후 제자리 부활${this.mode==='duel'?' / 본진 −70':` · 남은 기회 ${Math.max(0,3-this.retreated)}회`}`);if(this.bases[target.team].hp<=0)this.finish(target.team===0?'lose':'win','base');}
   else{target.deadUntil=0;if(target.team<2){this.losses[target.team]++;if(target.team===0){const survivor=this.recoverTwoStarLoss?.(target);if(survivor){this.notify('toast',`${TYPES[target.type].name} 2성 전사 · 같은 병과 1성 1기 복귀`);this.notify('change');return;}const recovered=this.mode==='pve'?Math.floor(TYPES[target.type].cost*.25):0;this.cash[0]+=recovered;this.salvaged+=recovered;this.notify('toast',`${TYPES[target.type].name} 전사 · 자동 복귀 없음${recovered?` · 장비 회수 +${recovered} 자원`:''}`);}}}
  }
 }
 screeningUnit(attacker,target){
  if(target.team!==0)return null;
  const dx=target.x-attacker.x,dy=target.y-attacker.y,length=Math.hypot(dx,dy);if(length<1)return null;
  let first=null,nearest=Infinity;
  for(const u of this.alive(0)){
   if(u===target||!this.isFrontCommander(u)&&!['tank','guntruck','rifle','machinegun','rocket'].includes(u.type))continue;
   const along=((u.x-attacker.x)*dx+(u.y-attacker.y)*dy)/length;
   const lateral=Math.abs((u.x-attacker.x)*dy-(u.y-attacker.y)*dx)/length;
   if(along>0&&along<length-10&&lateral<this.collisionRadius(u)+12&&along<nearest){first=u;nearest=along;}
  }
  return first;
 }
 commanderMoveSpeed(dx,dy){
  const c=this.commander(0),length=Math.hypot(dx,dy),normal=this.stats(c).speed;if(!length||this.isFrontCommander(c))return normal;
  const troops=this.alive(0),armor=troops.filter(u=>u.type==='tank'||u.type==='guntruck'),front=armor.length?armor:troops.filter(u=>u.type==='rifle'||u.type==='machinegun');
  if(!front.length)return normal;
  const lead=Math.max(...front.map(u=>((u.x-c.x)*dx+(u.y-c.y)*dy)/length));
  return lead<95?Math.min(normal,Math.min(...front.map(u=>this.stats(u).speed))*.9):normal;
 }
 // Melee can reach the outside of a solid building, never its occupied centre.
 targetDistance(u,target){
  if((this.isSwordCommander(u)||TYPES[u.type]?.stab||TYPES[u.type]?.charge||this.isDesktopDefense()&&MELEE.has(u.type))&&target.base)return Math.max(0,dist(u,target)-(target.r||0));
  if(this.isSwordCommander(u)&&target.structure&&!target.built)return Math.max(0,dist(u,target)-(target.r||0));
  if(!target.built||!this.isSwordCommander(u)&&!MELEE.has(u.type)&&!TYPES[u.type]?.charge)return dist(u,target);
  const dx=Math.max(0,Math.abs(u.x-target.x)-target.w/2),dy=Math.max(0,Math.abs(u.y-target.y)-target.h/2),growth=this.collisionRadius(u)-(TYPES[u.type].r+5);
  return Math.max(0,Math.hypot(dx,dy)-growth);
 }
 pursuitTarget(u){
  if(u.guardArrival){if(dist(u,u.guardArrival)>80)return u.guardArrival;u.guardArrival=null;}
  const roomGuard=this.isRoomCampaign()&&u.roomGarrison,hqDefense=roomGuard&&u.guardianId?.startsWith('room-garrison-final-')&&this.time<(this.roomHQAlarm?.until||0);
  const radius=roomGuard?ROOM_CAMPAIGN.config.fortifications.engage:u.assault?650:265,protect=u.team!==0?this.buildings.filter(b=>b.hp>0&&this.targetDistance(u,b)<radius):[];
  const troops=hqDefense?this.alive(0).filter(a=>dist(a,this.bases[1])<1250):u.assault?this.alive(0):this.units.filter(a=>dist(u,a)<radius);
  const candidates=[...troops,...protect,...((TYPES[u.type]?.stab||this.isDesktopDefense())&&u.team!==0&&dist(u,this.bases[0])<radius?[this.bases[0]]:[])].filter(a=>this.canTarget(u,a));
  const target=candidates.sort((a,b)=>this.targetDistance(u,a)-this.targetDistance(u,b))[0];
  return target?(this.screeningUnit(u,target)||target):this.isDesktopDefense()&&u.team!==0?this.bases[0]:{x:u.homeX,y:u.homeY};
 }
 pursuitPoint(u,target){
  if(this.isFlying(u))return target;
  if(!target.built)return target;
  const margin=this.collisionRadius(u)+2;
  const left=target.x-target.w/2,right=target.x+target.w/2,top=target.y-target.h/2,bottom=target.y+target.h/2;
  // Approach a face rather than an expanded corner, where collision can leave the jaws too far away.
  const points=[{x:left-margin,y:clamp(u.y,top,bottom)},{x:right+margin,y:clamp(u.y,top,bottom)},{x:clamp(u.x,left,right),y:top-margin},{x:clamp(u.x,left,right),y:bottom+margin}].filter(p=>this.freePosition(p.x,p.y,this.collisionRadius(u)));
  return points.sort((a,b)=>dist(u,a)-dist(u,b))[0]||target;
 }
 impact(p){
  if(p.team!==0){const screen=this.screeningUnit(p.source,p.target);if(screen)p.target=screen;}
  const center={x:p.target.x,y:p.target.y},type=p.source.type;
  const hit=(u,falloff=1)=>this.damage(u,p.damage*multiplier(type,u.base?'base':u.structure?'structure':u.type)*falloff,p.source);
  hit(p.target);if(p.critical)this.effects.push({kind:'critical',x:center.x,y:center.y-25,t:.7,max:.7,team:p.team});
  if(p.splash){
   for(const u of [...this.units,...this.structures,...this.defenses,...this.buildings,...this.bases]){
    if(u===p.target||u.hp<=0||u.team===p.team)continue;
    const d=dist(center,u);if(d<p.splash)hit(u,.65*(1-d/p.splash));
   }
   this.effects.push({kind:'explosion',...center,radius:p.splash,t:.65,max:.65,team:p.team});
   this.notify('explosion',{...center,team:p.team,kind:p.kind});
  }
 }

 buildingStats(kind,team=0){
  const b=BUILDINGS[kind];if(!b)return null;const p=this.profile.upgrades,turret=team===0&&['mgTower','missileBase'].includes(kind);
  if(team===0&&kind==='repairBot'){const medic=this.stats({type:'medic',team:0});return{...b,hp:b.hp*medic.hp/TYPES.medic.hp,repair:b.repair*medic.heal/MEDIC_HEALING.base*TYPES.medic.rate/medic.rate,range:b.range+medic.range-TYPES.medic.range,speed:b.speed*medic.speed/TYPES.medic.speed,defense:(b.defense??10)+medic.defense};}
  return {...b,hp:b.hp*(1+(turret?(p.turretHp||0)*.1:0)),damage:b.damage*(1+(turret?(p.turretDamage||0)*.05:0)),defense:(b.defense??10)+(turret?(p.turretDefense||0)*3:0)};
 }
 refreshBuildingStats(){
  for(const b of this.buildings||[]){if(b.team!==0||!['mgTower','missileBase','repairBot'].includes(b.kind))continue;const spec=this.buildingStats(b.kind,b.team),ratio=b.hp>0?clamp(b.hp/Math.max(1,b.maxHp),0,1):0;Object.assign(b,spec,{maxHp:spec.hp,hp:spec.hp*ratio});}
 }
 buildingCap(kind){return (BUILDINGS[kind]?.cap||0)*(this.isDesktopDefense()?2:1);}
 buildingCount(kind){return this.buildings.filter(b=>b.kind===kind&&b.hp>0).length;}
 beginConstructionLine(){const c=this.commander(0),line=this.constructionLine;if(line&&Math.hypot(c.x-line.commanderX,c.y-line.commanderY)<4)return;this.constructionLine={x:c.x,y:c.y,left:0,right:0,count:0,nextSide:1,commanderX:c.x,commanderY:c.y};}
 constructionPlan(kind){
  const spec=BUILDINGS[kind],c=this.commander(0);if(!spec||c.hp<=0)return null;
  const saved=this.constructionLine,line=saved&&Math.hypot(c.x-saved.commanderX,c.y-saved.commanderY)<4?{...saved}:{x:c.x,y:c.y,left:0,right:0,count:0,nextSide:1},slotW=spec.mobile?Math.max(spec.w,48):spec.w;
  const sides=line.count?[line.nextSide,-line.nextSide]:[0];
  for(const side of sides){
   const point={x:line.x+(side>0?line.right+slotW/2:side<0?line.left-slotW/2:0),y:line.y},rect={x:point.x-spec.w/2,y:point.y-spec.h/2,w:spec.w,h:spec.h};
   if(rect.x<45||rect.x+rect.w>this.bounds().width-45||rect.y<this.frontline()+4||rect.y+rect.h>this.bounds().height-70)continue;
   if(this.solidObstacles().some(o=>rect.x<o.x+o.w-.001&&rect.x+rect.w>o.x+.001&&rect.y<o.y+o.h-.001&&rect.y+rect.h>o.y+.001))continue;
   const overlaps=(u,p=u)=>Math.hypot(Math.max(0,Math.abs(p.x-point.x)-spec.w/2),Math.max(0,Math.abs(p.y-point.y)-spec.h/2))<this.collisionRadius(u)+5;
   if([...this.units.filter(u=>u.team!==0&&u.hp>0&&!this.isFlying(u)),...this.bases,...this.structures.filter(b=>b.hp>0),...this.activeDefenses()].some(u=>overlaps(u)))continue;
   const bodies=[...this.alive(0),...this.buildings.filter(b=>b.hp>0&&b.mobile)],affected=bodies.filter(u=>overlaps(u)).sort((a,b)=>Number(b===c)-Number(a===c)||this.collisionRadius(b)-this.collisionRadius(a)),reserved=bodies.filter(u=>!affected.includes(u)).map(u=>({x:u.x,y:u.y,r:this.collisionRadius(u)})),moves=[];
   let clear=true;
   for(const u of affected){
    const r=this.collisionRadius(u),margin=r+6,candidates=[];
    for(const offset of [0,r*2+10,-r*2-10,(r*2+10)*2,-(r*2+10)*2]){
     candidates.push({x:rect.x-margin,y:u.y+offset},{x:rect.x+rect.w+margin,y:u.y+offset},{x:u.x+offset,y:rect.y-margin},{x:u.x+offset,y:rect.y+rect.h+margin});
    }
    const target=candidates.filter(p=>p.y>=this.frontline()+r&&this.freePosition(p.x,p.y,r)&&!overlaps(u,p)&&reserved.every(q=>dist(p,q)>=r+q.r+4)&&this.lineClear(u,p,r)).sort((a,b)=>dist(u,a)-dist(u,b))[0];
    if(!target){clear=false;break;}moves.push({unit:u,from:{x:u.x,y:u.y},to:target});reserved.push({...target,r});
   }
   if(!clear)continue;
   if(!spec.mobile){
    this.obstacles.push(rect);this.navigationCache.clear();let valid=false;
    try{for(const m of moves)Object.assign(m.unit,m.to);const home=this.resolvePosition({x:this.bases[0].x,y:this.bases[0].y-160},36),forward=this.resolvePosition({x:this.bounds().width/2,y:this.frontline()+130},36),exit=this.resolvePosition({x:this.bases[1].x,y:this.bases[1].y+180},36);valid=this.freePosition(c.x,c.y,this.collisionRadius(c))&&!!this.findPath(c,home,this.collisionRadius(c)).length&&!!this.findPath(home,forward,36).length&&!!this.findPath(forward,exit,36).length;}finally{for(const m of moves)Object.assign(m.unit,m.from);this.obstacles.pop();this.navigationCache.clear();}
    if(!valid)continue;
   }
   return{point,moves,line:{...line,left:Math.min(line.left,point.x-line.x-slotW/2),right:Math.max(line.right,point.x-line.x+slotW/2),count:line.count+1,nextSide:side?-side:1}};
  }
  return null;
 }
 buildPosition(kind){return this.constructionPlan(kind)?.point||null;}
 build(kind){
  this.buildError='';const spec=this.buildingStats(kind);
  if(this.mode!=='pve'||!['playing','paused'].includes(this.phase)||!spec){this.buildError='돌파 작전의 전투 중에 건설할 수 있습니다.';return false;}
  if(this.commander(0).hp<=0){this.buildError='지휘관이 복귀한 뒤 건설하세요.';return false;}
  if(this.buildingCount(kind)>=this.buildingCap(kind)){this.buildError=`${spec.name} ${spec.mobile?'배치':'설치'} 한도 ${this.buildingCap(kind)}${spec.mobile?'기':'곳'}에 도달했습니다.`;return false;}
  if(this.cash[0]<spec.cost){this.buildError=`생산 자원 ◆ ${spec.cost} 필요 · 영구 강화 골드는 사용하지 않습니다.`;return false;}
  const plan=this.constructionPlan(kind);if(!plan){this.buildError='대장 위치와 좌우에 설치 공간·아군 회피 공간·진격 통로가 필요합니다. 넓은 곳으로 이동하세요.';return false;}
  for(const m of plan.moves){Object.assign(m.unit,m.to);m.unit.route=null;m.unit.routeGoal=null;m.unit.regroup=null;if(m.unit.mobile){m.unit.repairPath=null;m.unit.repairReplanAt=0;}}
  const c=this.commander(0);this.constructionLine={...plan.line,commanderX:c.x,commanderY:c.y};this.moveOrder=null;this.input={x:0,y:0};
  this.cash[0]-=spec.cost;this.buildings.push({id:'built-'+(++this.buildSerial),...plan.point,...spec,kind,team:0,built:true,structure:!spec.mobile,r:Math.max(spec.w,spec.h)/2,maxHp:spec.hp,buildAt:this.time,buildUntil:this.time+ROOM_RULES.assembly,cooldown:0,face:this.formationFacing,walk:0});this.navigationCache.clear();this.notify('change');return true;
 }
 repairStationAvailable(bot,point){
  const r=this.collisionRadius(bot);
  return this.buildings.filter(b=>b!==bot&&b.mobile&&b.hp>0).every(other=>{const gap=r+this.collisionRadius(other)+8;if(other.repairGoal&&dist(point,other.repairGoal)<gap)return false;return !!(other.repairGoal&&dist(other,other.repairGoal)>5)||dist(point,other)>=gap;});
 }
 repairBotThreats(bot){
  return [...this.units.filter(u=>u.team!==0&&u.hp>0&&this.visible(u)&&dist(bot,u)<1000),...this.activeDefenses().filter(u=>this.visible(u)&&dist(bot,u)<1000).map(u=>({...u,range:this.defenseStats(u).range}))];
 }
 repairStation(bot,anchor,threats=[]){
  const r=this.collisionRadius(bot),w=anchor.base?anchor.r*2:anchor.w,h=anchor.base?anchor.r*2:anchor.h,pad=r+12,points=[];
  for(const extra of [0,32,64])for(const side of [-1,1]){points.push({x:anchor.x+side*(w/2+pad+extra),y:anchor.y},{x:anchor.x,y:anchor.y+side*(h/2+pad+extra)});for(const corner of [-1,1])points.push({x:anchor.x+side*(w/2+pad+extra),y:anchor.y+corner*(h/2+pad+extra)});}
  return points.filter(p=>dist(p,anchor)<=this.buildingStats('repairBot',bot.team).range+(anchor.r||0)&&p.y>=this.frontline()+r&&this.freePosition(p.x,p.y,r)&&this.repairStationAvailable(bot,p)&&this.alive(0).every(u=>dist(u,p)>r+this.collisionRadius(u)+8)).sort((a,b)=>(this.regroupRisk(bot,a,threats)*180+dist(bot,a))-(this.regroupRisk(bot,b,threats)*180+dist(bot,b))).find(p=>this.findPath(bot,p,r).length)||null;
 }
 moveRepairBot(bot,goal,threats,dt){
  if(!bot.repairPathGoal||dist(goal,bot.repairPathGoal)>12||this.time>=(bot.repairReplanAt||0)||!bot.repairPath?.length){bot.repairPathGoal={...goal};bot.repairPath=threats.length?this.regroupPath(bot,goal,threats):this.findPath(bot,goal,this.collisionRadius(bot));bot.repairReplanAt=this.time+1.5;}
  while(bot.repairPath.length&&dist(bot,bot.repairPath[0])<10)bot.repairPath.shift();
  const next=bot.repairPath[0]||goal,before={x:bot.x,y:bot.y};bot.face=Math.atan2(next.y-bot.y,next.x-bot.x);this.navigate(bot,next.x,next.y,dt,this.buildingStats('repairBot',bot.team).speed);bot.walk=(bot.walk||0)+dist(bot,before)*.16;
 }
 updateRepairBot(bot,dt){
  const spec=this.buildingStats('repairBot',bot.team),threats=this.repairBotThreats(bot);bot.repairing=false;bot.repairPatient=null;
  const danger=this.regroupRisk(bot,bot,threats);
  if(danger>1||bot.hp<bot.maxHp*.3&&danger>.1){
   if(!bot.repairEvadeGoal||this.time>=(bot.repairEvadeUntil||0)||dist(bot,bot.repairEvadeGoal)<10){
    const points=[];for(const radius of [140,220])for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:bot.x+Math.cos(a)*radius,y:bot.y+Math.sin(a)*radius};if(p.y>=this.frontline()+this.collisionRadius(bot)&&this.freePosition(p.x,p.y,this.collisionRadius(bot))&&this.repairStationAvailable(bot,p))points.push(p);}
    bot.repairEvadeGoal=points.sort((a,b)=>(this.regroupRisk(bot,a,threats)*350+dist(bot,a)*.1)-(this.regroupRisk(bot,b,threats)*350+dist(bot,b)*.1))[0]||null;bot.repairEvadeUntil=this.time+2;
   }
   if(bot.repairEvadeGoal){this.moveRepairBot(bot,bot.repairEvadeGoal,threats,dt);return;}
  }else bot.repairEvadeGoal=null;
  if(this.time>=(bot.nextRepairScan||0)||!bot.repairAnchor||bot.repairAnchor.hp<=0){
   bot.nextRepairScan=this.time+1;
   const anchors=[...this.buildings.filter(b=>b.hp>0&&!b.mobile&&b.buildUntil<=this.time),this.bases[0]].filter(b=>b.hp>0),wounded=anchors.filter(b=>b.hp<b.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||dist(bot,a)-dist(bot,b));
   const candidates=wounded.length?wounded.slice(0,5):bot.repairAnchor?.hp>0?[bot.repairAnchor]:anchors.filter(b=>dist(bot,b)<600).sort((a,b)=>dist(bot,a)-dist(bot,b));
   let chosen=null;for(const anchor of candidates){const goal=this.repairStation(bot,anchor,threats);if(!goal)continue;const score=anchor.hp/anchor.maxHp*500+dist(bot,goal)*.15+this.regroupRisk(bot,goal,threats)*250-(anchor===bot.repairAnchor?30:0);if(!chosen||score<chosen.score)chosen={anchor,goal,score};}
   if(chosen){if(chosen.anchor!==bot.repairAnchor){bot.repairGoal=chosen.goal;bot.repairPath=null;}bot.repairAnchor=chosen.anchor;}
   else if(!bot.repairAnchor||bot.repairAnchor.hp<=0){bot.repairAnchor=null;bot.repairGoal=null;}
  }
  const anchor=bot.repairAnchor;if(!anchor)return;
  if(!bot.repairGoal||!this.freePosition(bot.repairGoal.x,bot.repairGoal.y,this.collisionRadius(bot))||!this.repairStationAvailable(bot,bot.repairGoal)||this.regroupRisk(bot,bot.repairGoal,threats)>.7)bot.repairGoal=this.repairStation(bot,anchor,threats);
  if(!bot.repairGoal)return;
  if(dist(bot,bot.repairGoal)>5){this.moveRepairBot(bot,bot.repairGoal,threats,dt);return;}
  // Idle beside a building; never follow the commander, self-heal or revive a casualty.
  const patients=[anchor,...this.buildings.filter(b=>b!==anchor&&!b.mobile)].filter(b=>b.hp>0&&b.hp<b.maxHp&&(b.base||b.buildUntil<=this.time)&&dist(bot,b)<=spec.range+(b.r||0)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
  const patient=patients[0];if(!patient)return;
  patient.hp=Math.min(patient.maxHp,patient.hp+spec.repair*dt);bot.repairPatient=patient;bot.repairing=true;bot.face=Math.atan2(patient.y-bot.y,patient.x-bot.x);
  bot.cooldown-=dt;if(bot.cooldown<=0){bot.cooldown=.65;this.effects.push({kind:'heal',x:patient.x,y:patient.y,t:.5,max:.5,team:0});}
 }
 updateBuildings(dt){
  if(this.phase!=='playing')return;
  for(const b of this.buildings){if(b.hp<=0||b.buildUntil>this.time)continue;this.coopSelectOwner?.(b.coopOwner);const spec=this.buildingStats(b.kind,b.team);if(!spec||b.kind==='barricade')continue;
   if(b.kind==='repairBot'){this.updateRepairBot(b,dt);continue;}
   b.cooldown-=dt;if(b.cooldown>0)continue;
   if(b.kind==='repair'){b.cooldown=spec.rate;let repaired=false;for(const u of [...this.alive(0).filter(u=>ARMORED.has(u.type)),this.bases[0]])if(dist(b,u)<spec.range+(u.base?80:0)&&u.hp<u.maxHp){this.heal(u,u.base?4:8);repaired=true;}if(repaired)this.effects.push({kind:'heal',x:b.x,y:b.y,t:.5,max:.5,team:0});continue;}
   const target=this.selectCombatTarget({...b,type:spec.type},this.units,this.attackingEnemies(),spec);if(!target)continue;
   b.cooldown=spec.rate;b.face=Math.atan2(target.y-b.y,target.x-b.x);
   if(b.kind==='missileBase')this.launchMissile(b,target);else{
    const angle=Math.round(b.face/(Math.PI/8))*(Math.PI/8);
    for(const side of [-1,1]){const muzzle={x:b.x+Math.cos(angle)*46-Math.sin(angle)*side*9,y:b.y+(Math.sin(angle)*46+Math.cos(angle)*side*9)*.8-31.2};this.shots.push({x:muzzle.x,y:muzzle.y+16,target,source:b,damage:spec.damage/2,speed:950,kind:'machinegun',team:0,life:1.5});this.effects.push({kind:'muzzle',x:b.x,y:b.y,muzzle,origin:true,t:.09,max:.09,team:0,weapon:'machinegun',angle:b.face});}
    this.notify('fire',{...b,type:'machinegun'});
   }
  }
 }
 activeDefenses(){return this.defenses.filter(p=>p.hp>0&&this.mission.stage>=p.activeStage);}
 launchMissile(source,target,attack={}){
  const spec=source.defenseKind==='missileTower'?ENEMY_MISSILE:this.buildingStats('missileBase',source.team),flightTime=source.type==='lucky'&&source.team===0?clamp(dist(source,target)/850,.35,.6):spec.flightTime;source.recoil=.3;this.mortarShells.push({kind:'missile',damageType:'rocket',x:target.x,y:target.y,fromX:source.x-(source.type==='lucky'?Math.sin(source.face)*(attack.side||1)*10:0),fromY:source.y+(source.type==='lucky'?Math.cos(source.face)*(attack.side||1)*8-24:0),radius:spec.splash,landAt:this.time+flightTime,delay:flightTime,source,team:source.team,damage:attack.damage??spec.damage,luckyLane:source.type==='lucky'?(attack.lane||0):0,...(source.type==='lucky'?{luckyRulesVersion:130}:{}),critical:false});this.effects.push({kind:'muzzle',x:source.x,y:source.y,t:.18,max:.18,team:source.team,weapon:'rocket',angle:source.face,origin:true});this.notify('fire',{...source,type:'rocket'});
 }
 launchMortar(source,target,attack){
  const s=source.structure?{splash:source.built?70:60}:this.stats(source);source.recoil=.25;this.effects.push({kind:'muzzle',x:source.x,y:source.y,t:.14,max:.14,team:source.team,weapon:'mortar',angle:Math.atan2(target.y-source.y,target.x-source.x),origin:true});
  this.mortarShells.push({x:target.x,y:target.y,fromX:source.x,fromY:source.y,radius:s.splash,landAt:this.time+2,delay:2,source,team:source.team,damage:attack.damage,critical:attack.critical||false});
  this.notify('fire',{...source,type:'mortar'});
 }
 // React to slow incoming mortar shells, including splash aimed at a nearby target.
 // The shield belongs to this mage; bullets, rockets and other units keep normal damage.
 isMortarShell(p){return p.kind!=='missile'&&(p.damageType||'mortar')==='mortar';}
 updateMageQuest(){
  if(this.mode!=='pve'||this.bounds().id!=='livingroom')return;
  const q=this.mageShieldQuest;if(q?.status==='completed'||q?.status==='notNeeded')return;
  if(this.tech[0].sniper>0){if(q)q.status='notNeeded';return;}
  if(q?.status==='active')return;
  const allies=this.alive(0),mage=this.units.find(u=>u.type==='blizzardMage'&&u.hp>0&&this.mission.stage>=(u.activeStage||2)&&this.visible(u)&&allies.some(a=>dist(a,u)<=GUARDIANS.lessonRange));
  if(!mage)return;
  this.mageShieldQuest={status:'active',count:0,startedAt:this.time};
  this.notify('toast','새 퀘스트 · 얼음 마녀가 아이스 실드를 2번 쓰게 하세요. 보상: 저격병 해금');this.notify('change');
 }
 mageShieldUsed(u){
  this.updateMageQuest();const q=this.mageShieldQuest;
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||u.type!=='blizzardMage'||u.team===0||q?.status!=='active'||this.tech[0].sniper>0)return;
  q.count=Math.min(ROOM_CAMPAIGN.config.lessons.mage.uses,q.count+1);
  if(q.count===ROOM_CAMPAIGN.config.lessons.mage.uses){q.status='completed';q.completedAt=this.time;this.tech[0].sniper=1;this.notify('toast','퀘스트 완료 · 저격병 해금! 다음 지원에서 충원할 수 있습니다.');}
  this.notify('change');
 }
 mageQuestView(){
  const q=this.mageShieldQuest;
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||['ready','ended'].includes(this.phase)||!q)return null;
  if(q.status==='active'&&!this.tech[0].sniper)return{title:'퀘스트 · 얼음 방패의 약점',progress:`아이스 실드를 2번 쓰게 하기 · ${q.count}/2`,reward:'보상 · 이번 작전 저격병 해금',hint:'박격포탄으로 실드를 유도하세요. 저격병은 실드에 막히지 않습니다.',announce:this.time-q.startedAt<GUARDIANS.lessonBannerTime};
  if(q.status==='completed'&&this.time-q.completedAt<6)return{title:'퀘스트 완료',progress:'아이스 실드 사용 유도 · 2/2',reward:'저격병 해금 · 지원에서 충원 가능',hint:'마법사 사거리 밖에서 저격하세요.',announce:this.time-q.completedAt<3};
  return null;
 }
 repairLaserLessonReward(){
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||this.laserExposureQuest?.status!=='completed')return false;
  const key=ROOM_CAMPAIGN.config.lessons.laser.unlock;if(this.tech[0][key]>0)return false;
  this.tech[0][key]=1;this.notify('toast','레이저 퀘스트 보상 복구 · 박격포병 해금! 지원에서 충원할 수 있습니다.');this.notify('change');return true;
 }
 updateLaserQuest(){
  if(this.mode!=='pve'||this.bounds().id!=='livingroom')return;
  this.repairLaserLessonReward();const q=this.laserExposureQuest;if(q?.status==='completed')return;
  if(q?.status==='notNeeded'){if(this.tech[0][ROOM_CAMPAIGN.config.lessons.laser.unlock]>0)return;q.status='pending';}
  if(this.tech[0][ROOM_CAMPAIGN.config.lessons.laser.unlock]>0){if(q)q.status='notNeeded';return;}
  if(q?.status==='active')return;
  const allies=this.alive(0),tower=this.activeDefenses().find(p=>p.defenseKind==='laserTower'&&this.visible(p)&&allies.some(a=>dist(a,p)<=GUARDIANS.lessonRange));
  if(!tower)return;
  this.laserExposureQuest={status:'active',seconds:0,startedAt:this.time,lastExposureAt:null};
  this.notify('toast','새 퀘스트 · 아군 병력이 레이저 포탑 공격을 한 번 맞기. 보상: 박격포병 해금');this.notify('change');
 }
 recordLaserExposure(p,target,dt){
  this.updateLaserQuest();const q=this.laserExposureQuest;
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||q?.status!=='active'||this.tech[0][ROOM_CAMPAIGN.config.lessons.laser.unlock]>0||p.hp<=0||p.team!==1||this.mission.stage<(p.activeStage||2)||target.team!==0||target.hp<=0||q.lastExposureAt===this.time)return;
  // A valid beam contact completes the lesson once; seconds is kept for save compatibility.
  const span=Math.min(.05,Math.max(0,dt));if(!Number.isFinite(span)||span<=0)return;
  q.lastExposureAt=this.time;q.seconds=1;
  if(q.seconds>=1-1e-8){q.seconds=1;q.status='completed';q.completedAt=this.time;this.tech[0][ROOM_CAMPAIGN.config.lessons.laser.unlock]=1;this.notify('toast','퀘스트 완료 · 박격포병 해금! 포탑 사거리 밖에서 공격하세요.');this.notify('change');}
 }
 laserQuestView(){
  const q=this.laserExposureQuest;
  if(this.mode!=='pve'||this.bounds().id!=='livingroom'||['ready','ended'].includes(this.phase)||!q)return null;
  if(q.status==='active'&&!this.tech[0][ROOM_CAMPAIGN.config.lessons.laser.unlock])return{title:'퀘스트 · 레이저 방어선 돌파',progress:`레이저 공격 한 번 맞기 · 0/1`,reward:'보상 · 이번 작전 박격포병 해금',hint:'한 번 맞으면 바로 완료됩니다. 박격포병은 사거리 밖에서 포탑을 공격합니다.',announce:this.time-q.startedAt<GUARDIANS.lessonBannerTime};
  if(q.status==='completed'&&this.time-q.completedAt<6)return{title:'퀘스트 완료',progress:'레이저 공격 한 번 맞기 · 1/1',reward:'박격포병 해금 · 지원에서 충원 가능',hint:'포탑 사거리 밖에서 포격하세요.',announce:this.time-q.completedAt<3};
  return null;
 }
 updateMageShields(){
  this.updateMageQuest();
  for(const u of this.units){
   if(u.type!=='blizzardMage'||u.hp<=0||this.mission.stage<(u.activeStage||2))continue;
   for(const p of this.mortarShells){
    if(p.team===u.team||!this.isMortarShell(p)||p.landAt-this.time>GUARDIANS.shieldNotice||p.landAt<this.time-.05||dist(u,p)>p.radius)continue;
    if(!u.iceShield||u.iceShield.until<this.time){u.iceShield={started:this.time,readyAt:this.time+GUARDIANS.shieldRaise,until:p.landAt+GUARDIANS.shieldHold,hitAt:null};this.mageShieldUsed(u);}
    else u.iceShield.until=Math.max(u.iceShield.until,p.landAt+GUARDIANS.shieldHold);
   }
  }
 }
 blockMageMortar(u,p){
  const shield=u.iceShield;
  if(u.type!=='blizzardMage'||!this.isMortarShell(p)||!shield||this.time+1e-8<shield.readyAt||this.time>shield.until)return false;
  if(shield.hitAt===null||this.time-shield.hitAt>.12)this.effects.push({kind:'iceShieldBlock',x:u.x,y:u.y-38,t:.6,max:.6,team:u.team});
  shield.hitAt=this.time;shield.blocked=(shield.blocked||0)+1;return true;
 }
 updateMortars(){
  this.updateMageShields();
  const landed=this.mortarShells.filter(p=>p.landAt<=this.time);this.mortarShells=this.mortarShells.filter(p=>p.landAt>this.time);
  for(const p of landed){
   for(const u of [...this.units,...this.structures,...this.defenses,...this.buildings,...this.bases]){
    if(u.hp<=0||u.team===p.team||(this.mode==='pve'&&p.team!==0&&u.team!==0))continue;
    const d=dist(u,p);if(d>p.radius)continue;
    const kind=u.base?'base':u.structure?'structure':u.type;
    if(this.blockMageMortar(u,p))continue;
    const jackpot=p.kind==='missile'&&p.source?.type==='lucky',alliedJackpot=jackpot&&p.team===0;
    const edge=alliedJackpot?LUCKY.alliedMissileEdge:jackpot?LUCKY.missileEdge:.45;
    const affinity=alliedJackpot&&!ARMORED.has(kind)?LUCKY.alliedMissileLight:multiplier(p.damageType||'mortar',kind);
    const amount=p.damage*affinity*(1-(1-edge)*d/p.radius);if(p.enemyJackpot)this.damageEnemyJackpot(u,amount,p);else this.damage(u,amount,p.source);
   }
   this.effects.push({kind:'explosion',x:p.x,y:p.y,radius:p.radius,t:.7,max:.7,team:p.team,visualKind:p.kind==='missile'&&p.source?.type==='lucky'?'jackpot':p.evoStyle||p.kind});
   if(p.evoStyle)this.effects.push({kind:'evoBlast',x:p.x,y:p.y,radius:p.radius,style:p.evoStyle,index:p.evoIndex,t:.7,max:.7,team:p.team});
   if(p.critical)this.effects.push({kind:'critical',x:p.x,y:p.y-25,t:.7,max:.7,team:p.team});
   this.notify('explosion',{x:p.x,y:p.y,kind:p.kind==='missile'?'rocket':'mortar',team:p.team});
  }
 }
 defenseStats(p){if(p.fencePost)return{range:0,rate:1,damage:0,minRange:0};if(p.defenseKind==='laserTower')return{range:this.isRoomCampaign()?ROOM_CAMPAIGN.config.laser.range:GUARDIANS.range,rate:GUARDIANS.laserTick,damage:GUARDIANS.laserDamage*(1+.10*this.pressure().tier),minRange:0};const missile=p.defenseKind==='missileTower',mortar=p.defenseKind==='mortarPit';return{range:missile?ENEMY_MISSILE.range:mortar?530:355,rate:missile?ENEMY_MISSILE.rate:mortar?4.8:.5,damage:(missile?ENEMY_MISSILE.damage:mortar?32:5)*(1+.10*this.pressure().tier)*(this.roomDefenseRules(p)?.damage||1)*this.enemyDamageScale(p),minRange:0};}
 updateDefenses(dt){
  for(const p of this.activeDefenses()){
   if(p.fencePost)continue;
   if(p.defenseKind==='laserTower'){this.updateLaser(p,dt);continue;}
   p.cooldown-=dt;if(p.cooldown>0)continue;
   const spec=this.defenseStats(p),missile=p.defenseKind==='missileTower',candidates=missile?[...this.alive(0),...this.buildings.filter(b=>b.hp>0&&b.buildUntil<=this.time)]:this.alive(0);
   const target=candidates.filter(u=>this.canTarget(p,u)&&dist(u,p)<spec.range).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(!target)continue;
   p.cooldown=spec.rate;p.face=Math.atan2(target.y-p.y,target.x-p.x);
   if(missile)this.launchMissile(p,target,{damage:spec.damage});
   else if(p.defenseKind==='mortarPit')this.launchMortar(p,target,{damage:spec.damage});
   else{this.shots.push({x:p.x,y:p.y,target,source:p,damage:spec.damage,speed:850,kind:'turret',team:1,life:1.5});this.notify('fire',{type:'machinegun',x:p.x,y:p.y,team:1});}
  }
 }

 setMoveOrder(x,y,announce=true){
  if(this.phase!=='playing'||!Number.isFinite(x)||!Number.isFinite(y))return false;
  const goal=this.resolvePosition({x:clamp(x,80,this.bounds().width-80),y:clamp(y,this.frontline()+100,this.bounds().height-140)},32);
  if(!this.moveOrder||dist(goal,this.moveOrder)>25)this.alive(0).forEach(u=>u.route=null);
  const leader=this.commander(0),angle=dist(goal,leader)>30?Math.atan2(goal.y-leader.y,goal.x-leader.x):this.formationFacing;this.moveOrder={x:goal.x,y:goal.y,facing:angle};
  if(announce)this.notify('toast','부대 이동 · 공격 중에도 목적지로 즉시 이동합니다.');return true;
 }
 setFocus(target,automatic=false){
  if(this.phase!=='playing'||!target||target.team===0||target.hp<=0||!this.visible(target))return false;
  if(target.base&&(this.mode==='crisis'||this.mode==='pve'&&this.mission.stage<3))return false;
  if(target.structure&&this.mission.stage<(target.activeStage||2))return false;
  this.focusTarget=target;this.focusAutomatic=automatic;this.notify('toast',`${target.name||TYPES[target.type]?.name||'적'} 집중 공격 · 사거리 안에서 우선 사격`);return true;
 }
 followCommander(){
  if(this.phase!=='playing')return false;this.moveOrder=null;this.focusTarget=null;
  this.alive(0).forEach(u=>u.route=null);this.notify('toast','지휘관 추종 · 조이스틱이나 WASD로 부대를 이끄세요.');return true;
 }
 updateFormationFacing(dt){
  const c=this.commander(0);let angle=this.formationFacing;
  const threats=[...this.units,...this.activeDefenses(),...this.structures,...this.bases.filter(b=>b.team!==0&&this.mode!=='crisis'&&(this.mode==='duel'||this.mission.stage===3)&&!this.baseShielded())].filter(u=>u.team!==0&&u.hp>0&&this.visible(u)&&dist(c,u)<520&&(!u.structure||this.mission.stage>=(u.activeStage||2)));
  const nearest=threats.sort((a,b)=>dist(c,a)-dist(c,b))[0],locked=this.formationEnemy,focus=threats.includes(this.focusTarget)?this.focusTarget:null;
  // A small change in nearest enemy must not spin the whole formation.
  const enemy=focus||(threats.includes(locked)&&nearest&&dist(c,locked)<=dist(c,nearest)*1.3?locked:nearest);
  this.formationEnemy=enemy||null;
  if(enemy)angle=Math.atan2(enemy.y-c.y,enemy.x-c.x);
  else if(this.moveOrder&&dist(c,this.moveOrder)>35)angle=this.moveOrder.facing;
  else if(this.input.x||this.input.y)angle=Math.atan2(this.input.y,this.input.x);
  const delta=Math.atan2(Math.sin(angle-this.formationFacing),Math.cos(angle-this.formationFacing));this.formationFacing+=clamp(delta,-dt*2.5,dt*2.5);
 }
 rearCombat(u){return u.team===0&&(u.type==='sniper'||u.type==='medic')&&this.formationEnemy?.hp>0&&this.visible(this.formationEnemy)&&dist(this.commander(0),this.formationEnemy)<520;}
 squadMoveAnchor(u){const c=this.commander(0);return u.type!=='leader'&&this.moveOrder&&dist(c,this.moveOrder)>140&&this.units.some(e=>e.team!==0&&e.hp>0&&this.visible(e)&&(dist(e,c)<650||dist(e,u)<400))?c:this.moveOrder;}
 regroupRisk(u,p,threats){return threats.reduce((sum,e)=>{const range=TYPES[e.type]?.range||e.range||30,radius=range<100?range+this.collisionRadius(u)+(TYPES[e.type]?.r||15)+28:((u.type==='sniper'||u.type==='medic'||u.type==='repairBot'||u.hp<u.maxHp*.35)?range+35:Math.min(190,range*.7));return sum+Math.max(0,1-dist(p,e)/radius)**2*12;},0);}
 regroupPath(u,goal,threats){
  // Enemy danger is a soft cost: a surrounded unit must still choose the least
  // dangerous exit. Static walls remain impassable, and the start is exact.
  const r=this.collisionRadius(u),step=56,pad=224,minX=Math.max(45,Math.min(u.x,goal.x)-pad),maxX=Math.min(this.bounds().width-45,Math.max(u.x,goal.x)+pad),minY=Math.max(this.frontline()+r,Math.min(u.y,goal.y)-pad),maxY=Math.min(this.bounds().height-70,Math.max(u.y,goal.y)+pad),open=[{x:u.x,y:u.y,g:0,f:dist(u,goal),key:'0,0',previous:null}],scores=new Map([['0,0',0]]),closed=new Set();
  for(let turns=0;open.length&&turns<1800;turns++){
   open.sort((a,b)=>b.f-a.f);const n=open.pop();if(closed.has(n.key))continue;closed.add(n.key);
   if(dist(n,goal)<step*1.5&&this.lineClear(n,goal,r)){const path=[{x:goal.x,y:goal.y}];for(let v=n;v.previous;v=v.previous)path.unshift({x:v.x,y:v.y});return path;}
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const x=n.x+dx*step,y=n.y+dy*step,key=Math.round((x-u.x)/step)+','+Math.round((y-u.y)/step),p={x,y};if(x<minX||x>maxX||y<minY||y>maxY||closed.has(key)||!this.freePosition(x,y,r)||!this.lineClear(n,p,r))continue;
    const risk=(this.regroupRisk(u,p,threats)+this.regroupRisk(u,{x:(x+n.x)/2,y:(y+n.y)/2},threats))/2,g=n.g+dist(n,p)*(1+risk);if(g>=(scores.get(key)??Infinity))continue;scores.set(key,g);open.push({x,y,key,g,f:g+dist(p,goal),previous:n});
   }
  }
  return this.findPath(u,goal,r);
 }
 safeSquadPoint(u,goal,threats){
  const c=this.commander(0),r=this.collisionRadius(u),points=[goal];for(const radius of [80,140,190])for(let i=0;i<12;i++){const a=i*Math.PI/6;points.push({x:c.x+Math.cos(a)*radius,y:c.y+Math.sin(a)*radius});}
  return points.filter(p=>p.y>=this.frontline()+r&&this.freePosition(p.x,p.y,r)).sort((a,b)=>(this.regroupRisk(u,a,threats)*180+dist(a,goal)*.6+dist(a,u)*.12)-(this.regroupRisk(u,b,threats)*180+dist(b,goal)*.6+dist(b,u)*.12))[0]||goal;
 }
 squadMovePoint(u,goal){
  if(u.team!==0||u.type==='leader'||u.mobile)return this.rearMovePoint(u,goal);
  const c=this.commander(0),threats=this.units.filter(e=>e.team!==0&&e.hp>0&&this.visible(e)&&(dist(u,e)<500||dist(c,e)<400)).sort((a,b)=>dist(u,a)-dist(u,b)).slice(0,16),risk=this.regroupRisk(u,u,threats),blocked=dist(u,goal)>90&&this.regroupRisk(u,{x:(u.x+goal.x)/2,y:(u.y+goal.y)/2},threats)>.5;
  let task=u.regroup;
  if(!task&&dist(u,c)<=240&&risk<.7&&!blocked)return this.rearMovePoint(u,goal);
  if(task&&dist(u,c)<210&&risk<.3&&this.regroupRisk(u,goal,threats)<.3&&dist(u,goal)<100){u.regroup=null;return this.rearMovePoint(u,goal);}
  if(!task)task=u.regroup={startedAt:this.time,goal:null,points:[],replanAt:0,progressAt:this.time,position:{x:u.x,y:u.y}};
  if(dist(u,task.position)>18){task.position={x:u.x,y:u.y};task.progressAt=this.time;}
  if(!task.goal||this.time>=task.replanAt||dist(goal,task.desired||goal)>140||this.time-task.progressAt>1.8||task.points[0]&&!this.lineClear(u,task.points[0],this.collisionRadius(u))){
   const safe=this.safeSquadPoint(u,goal,threats);task.goal={...safe};task.desired={...goal};task.points=this.regroupPath(u,safe,threats);task.replanAt=this.time+2.25;task.progressAt=this.time;task.position={x:u.x,y:u.y};
  }
  while(task.points.length&&dist(u,task.points[0])<12)task.points.shift();
  // A large chassis need not touch a corner exactly once the next leg is clear.
  const radius=this.collisionRadius(u);
  while(task.points.length>1&&dist(u,task.points[0])<radius+12&&this.lineClear(u,task.points[1],radius))task.points.shift();
  return task.points[0]||task.goal;
 }
 rearMovePoint(u,goal){
  if(!this.rearCombat(u))return goal;
  const threats=this.units.filter(e=>e.team!==0&&e.hp>0&&this.visible(e)&&dist(u,e)<240),length=dist(u,goal);if(!threats.length||length<8)return goal;
  const blocked=p=>threats.some(e=>{const dx=p.x-u.x,dy=p.y-u.y,t=clamp(((e.x-u.x)*dx+(e.y-u.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1),near={x:u.x+dx*t,y:u.y+dy*t};return dist(e,near)<Math.min((TYPES[e.type]?.r||15)+52,dist(e,u))-3;});
  if(!blocked(goal))return goal;
  const a=Math.atan2(goal.y-u.y,goal.x-u.x),c=this.commander(0),r=this.collisionRadius(u),limit=Math.max(u.type==='medic'?210:250,dist(c,u)+8),step=Math.min(75,length),candidates=[];
  for(const offset of [Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI*2/3,-Math.PI*2/3,Math.PI]){
   const p={x:u.x+Math.cos(a+offset)*step,y:u.y+Math.sin(a+offset)*step};if(dist(c,p)>limit||!this.freePosition(p.x,p.y,r)||u.team===0&&p.y<this.frontline()||!this.lineClear(u,p,r)||blocked(p))continue;
   const danger=threats.reduce((v,e)=>v+Math.max(0,(TYPES[e.type]?.r||15)+80-dist(e,p))**2,0);candidates.push({p,score:dist(p,goal)+danger*.3});
  }
  return candidates.sort((a,b)=>a.score-b.score)[0]?.p||{x:u.x,y:u.y};
 }
 formationPoint(u,anchor,facing=u.team===0?this.formationFacing:this.commander(u.team).face||Math.PI/2){
  const siege=this.guardianSiege;if(u.team===0&&u.type!=='leader'&&siege?.hp>0&&dist(this.commander(0),siege)<950){const c=this.commander(0),a=Math.atan2(c.y-siege.y,c.x-siege.x),peers=this.alive(0).filter(v=>v.type===u.type),i=peers.indexOf(u),radius=u.type==='sniper'?this.stats(u).range-40:u.type==='mortar'?this.stats(u).range-50:(siege.defenseKind?this.defenseStats(siege).range:this.stats(siege).range)+130+(u.id%2)*30,angle=a+(i-(peers.length-1)/2)*.09;return{x:siege.x+Math.cos(angle)*radius,y:siege.y+Math.sin(angle)*radius};}

  if(u.type==='leader')return{x:anchor.x,y:anchor.y};
  const rearCombat=this.rearCombat(u),commander=this.commander(u.team),flameFront=u.team===0&&this.isFrontCommander(commander);
  if(flameFront){anchor=commander;if(this.formationEnemy?.hp>0&&this.visible(this.formationEnemy))facing=Math.atan2(this.formationEnemy.y-commander.y,this.formationEnemy.x-commander.x);}
  if(rearCombat){anchor=commander;facing=Math.atan2(this.formationEnemy.y-commander.y,this.formationEnemy.x-commander.x);}
  const projection=p=>(p.x-commander.x)*Math.cos(facing)+(p.y-commander.y)*Math.sin(facing),behind=p=>(!flameFront||projection(p)<=12)&&(!rearCombat||projection(p)<=-24);
  const group=this.units.filter(a=>a.team===u.team&&a.hp>0&&!a.patrol&&a.type!=='leader'&&(!this.coop||u.team!==0||a.coopOwner===u.coopOwner)).sort((a,b)=>a.id-b.id),hasArmor=group.some(a=>a.type==='tank'||a.type==='guntruck');
  const bands=[{types:['tank','guntruck'],depth:120,spacing:72,row:65,cols:4},{types:['rifle'],depth:hasArmor?55:100,spacing:39,row:45,cols:6},{types:['machinegun','commando'],depth:hasArmor?25:50,spacing:44,row:46,cols:5},{types:['rocket'],depth:10,spacing:42,row:48,cols:5},{types:['lucky'],depth:10,spacing:64,row:65,cols:4},{types:['sniper'],depth:-78,spacing:42,row:46,cols:5},{types:['mortar'],depth:-102,spacing:46,row:48,cols:5},{types:['medic'],depth:u.team===0?-108:-124,spacing:u.team===0?40:42,row:u.team===0?36:46,cols:u.team===0?6:5}],slots=[];
  let cursor=flameFront?0:120;
  for(const band of bands){
   const members=group.filter(a=>band.types.includes(a.type));if(!members.length)continue;const depth=band.types[0]==='medic'&&u.team===0?Math.max(-136,Math.min(cursor,band.depth)):Math.min(cursor,band.depth),rows=Math.ceil(members.length/band.cols);
   members.forEach((unit,index)=>{const row=Math.floor(index/band.cols),cols=Math.min(band.cols,members.length-row*band.cols),column=index%band.cols,compact=(unit.team===0&&this.time<this.rallyUntil?.72:1)*(unit.star>=2?.86:1),forward=(depth-row*band.row)*compact,side=(column-(cols-1)/2)*band.spacing*compact;
    slots.push({unit,x:anchor.x+Math.cos(facing)*forward-Math.sin(facing)*side,y:anchor.y+Math.sin(facing)*forward+Math.cos(facing)*side});
   });cursor=depth-rows*band.row;
  }
  // Translate the formation together. Clamping each slot separately made
  // several soldiers aim at exactly the same point against a boundary.
  const low=u.team===0?this.frontline()+35:70,xs=[anchor.x,...slots.map(p=>p.x)],ys=[anchor.y,...slots.map(p=>p.y)],shiftX=Math.max(0,55-Math.min(...xs))+Math.min(0,this.bounds().width-55-Math.max(...xs)),shiftY=Math.max(0,low-Math.min(...ys))+Math.min(0,this.bounds().height-100-Math.max(...ys));
  const leader=this.commander(u.team),placed=[{x:anchor.x,y:anchor.y,radius:leader?.type?this.collisionRadius(leader):20}];let result={x:anchor.x,y:anchor.y};
  for(const slot of slots){const r=this.collisionRadius(slot.unit),raw={x:slot.x+shiftX,y:slot.y+shiftY},valid=p=>p.x>=55&&p.x<=this.bounds().width-55&&p.y>=low&&p.y<=this.bounds().height-100&&(slot.unit.type!=='medic'||slot.unit.team!==0||dist(p,anchor)<=210)&&(!flameFront||projection(p)<=12)&&(!rearCombat||slot.unit!==u||behind(p))&&this.freePosition(p.x,p.y,r)&&placed.every(q=>dist(p,q)>=(r+q.radius)*1.04);
   let point=raw;if(!valid(point)){
    let found=null;for(let ring=1;ring<=12&&!found;ring++)for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:raw.x+Math.cos(a)*ring*24,y:raw.y+Math.sin(a)*ring*24};if(valid(p)){found=p;break;}}
    point=found||((flameFront||rearCombat&&slot.unit===u)&&behind(u)&&this.freePosition(u.x,u.y,r)?{x:u.x,y:u.y}:this.resolvePosition({...raw},r));
   }
   placed.push({...point,radius:r});if(slot.unit===u){result=point;break;}
  }
  return{x:result.x,y:result.y};
 }
 medicFollowSpeed(u,goal,speed){
  if(u.team!==0||u.type!=='medic'||dist(u,goal)<=90)return speed;
  // Regroup promptly after a detour or a direction change; do not speed up a medic already in its rear slot.
  return dist(u,this.commander(0))>200?Math.max(speed,this.stats(u).speed*1.45):speed;
 }
 squadFollowSpeed(u,goal,speed){
  speed=this.medicFollowSpeed(u,goal,speed);
  if(u.team!==0||u.type!=='tank')return speed;
  const c=this.commander(0),error=dist(u,goal);
  if(!c||c.hp<=0||error<=40){u.tankCatchup=false;return speed;}
  const gap=dist(u,c);
  const manual=this.input.x||this.input.y,dx=manual?this.input.x:this.moveOrder?this.moveOrder.x-c.x:0,dy=manual?this.input.y:this.moveOrder?this.moveOrder.y-c.y:0,length=Math.hypot(dx,dy),moving=manual||length>15;
  const lead=moving?((u.x-c.x)*dx+(u.y-c.y)*dy)/length:0;
  if(moving&&lead<35&&error>70||gap>220)u.tankCatchup=true;
  if(moving&&lead>95||!moving&&gap<160&&error<90)u.tankCatchup=false;
  // Preserve the slow tank near its front slot, and catch up on foot via normal navigation.
  // Roots, slows, walls and crowd collision still apply inside move().
  return u.tankCatchup?Math.max(speed,this.stats(c).speed*1.2):speed;
 }
 separateCrowd(live){
  const valid=(u,p)=>(this.isFlying(u)?p.x>=45&&p.x<=this.bounds().width-45&&p.y>=70&&p.y<=this.bounds().height-70:this.freePosition(p.x,p.y,this.collisionRadius(u)))&&(u.team!==0||p.y>=this.frontline());
  for(let pass=0;pass<2;pass++)for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
   const a=live[i],b=live[j];if(a.team!==b.team||this.isFlying(a)!==this.isFlying(b))continue;const d=dist(a,b),need=this.collisionRadius(a)+this.collisionRadius(b);if(d>=need)continue;
   const overlap=need-d,angle=(a.id*13+b.id*7)*2.399963,dx=d?(a.x-b.x)/d:Math.cos(angle),dy=d?(a.y-b.y)/d:Math.sin(angle),canA=a.type!=='leader'&&!a.bikeAttack&&!this.isStationary(a)&&this.time>=(a.rootedUntil||0),canB=b.type!=='leader'&&!b.bikeAttack&&!this.isStationary(b)&&this.time>=(b.rootedUntil||0),massA=a.type==='tank'||a.type==='crimsonAce'?4:a.type==='guntruck'?3:1,massB=b.type==='tank'||b.type==='crimsonAce'?4:b.type==='guntruck'?3:1,amountA=overlap*(canA&&canB?massB/(massA+massB):1),amountB=overlap*(canA&&canB?massA/(massA+massB):1);
   const pa={x:a.x+dx*amountA,y:a.y+dy*amountA},pb={x:b.x-dx*amountB,y:b.y-dy*amountB},moveA=canA&&valid(a,pa),moveB=canB&&valid(b,pb);
   if(moveA){a.x=pa.x;a.y=pa.y;}if(moveB){b.x=pb.x;b.y=pb.y;}
   // If a wall blocks one body, give its share to the body with room.
   if(moveA&&!moveB&&canB){const p={x:a.x+dx*amountB,y:a.y+dy*amountB};if(valid(a,p)){a.x=p.x;a.y=p.y;}}
   if(moveB&&!moveA&&canA){const p={x:b.x-dx*amountA,y:b.y-dy*amountA};if(valid(b,p)){b.x=p.x;b.y=p.y;}}
  }
 }

 artilleryUnits(){return this.crisis.battery.filter(u=>u.hp>0);}
 beginArtillery(){
  const c=this.crisis,player=this.commander(0);c.phase='active';c.nextSalvo=this.time+1.5;c.nextEscort=this.time+13;
  const y=clamp(player.y-500,this.frontline()+100,this.bounds().height-350);
  for(const dx of [-165,165]){
   const u=this.addUnit(1,'artillery',clamp(player.x+dx,170,this.bounds().width-170),y,true);u.battery=true;c.battery.push(u);
   this.effects.push({kind:'drop',x:u.x,y:u.y,t:1,max:1,team:1});
  }
  // An escort creates a decision: shoot the screen or push through to the guns.
  c.battery.forEach(u=>{for(let i=0;i<(this.mode==='crisis'?2:3);i++){if(this.pressure().late&&this.enemySpawnRoom(1)<=0)break;const guard=this.addUnit(1,'rifle',u.x+(i-1)*43,u.y+115+(i%2)*35,true);guard.crisisEscort=true;}});
  this.notify('toast','포병 도착! 붉은 범위에서 부대 전체를 이동시키고 포병 2기를 파괴하세요.');
 }
 checkCrisisClear(){
  const c=this.crisis;
  const canceled=this.barrages.filter(b=>b.source.hp<=0);c.canceled+=canceled.length;this.barrages=this.barrages.filter(b=>b.source.hp>0);
  if(c.phase!=='active'||this.artilleryUnits().length)return;
  c.phase='cleared';this.barrages=[];this.focusTarget=null;
  this.notify('toast','포병 2기 격파! 모든 포격이 중단되었습니다.');
  if(this.mode==='crisis')this.finish('win','artillery');
 }
 updateArtillery(){
  const c=this.crisis;if(c.phase==='disabled'||c.phase==='cleared')return;
  if(c.phase==='idle'&&this.time>=c.warnAt){c.phase='warning';this.notify('toast',`북쪽 포병 도착 ${Math.ceil(c.startAt-this.time)}초 전 · 부대 이동과 집중 공격을 준비하세요.`);}
  if(c.phase==='warning'&&this.time>=c.startAt)this.beginArtillery();
  if(c.phase!=='active')return;
  this.checkCrisisClear();if(c.phase!=='active')return;
  const allies=this.alive(0).filter(u=>this.canTarget({team:1},u)),guns=this.artilleryUnits();
  if(this.time>=c.nextSalvo&&allies.length){
   c.salvos++;c.nextSalvo=this.time+8.5;
   guns.forEach((gun,i)=>{const target=allies[(c.salvos-1+i*3)%allies.length];this.barrages.push({x:target.x,y:target.y,radius:100,landAt:this.time+4.5,delay:4.5,source:gun});});
   this.notify('toast','포격 위치 고정 · 4.5초 안에 붉은 범위 밖으로 이동하세요!');
  }
  if(this.time>=c.nextEscort){
   c.nextEscort=this.time+14;
   const guards=this.units.filter(u=>u.crisisEscort&&u.hp>0);
   const room=(this.mode==='crisis'?6:10)-guards.length,count=Math.min(room,guns.length*2,this.pressure().late?this.enemySpawnRoom(1):Infinity);for(let i=0;i<count;i++){const gun=guns[i%guns.length],u=this.addUnit(1,i%4===3?'rocket':'rifle',gun.x+(i%2?35:-35),gun.y+110,true);u.crisisEscort=true;}
  }
  const landed=this.barrages.filter(b=>b.landAt<=this.time);this.barrages=this.barrages.filter(b=>b.landAt>this.time);
  for(const b of landed){
   if(b.source.hp<=0)continue;let hits=0;
   for(const u of this.alive(0)){const d=dist(u,b);if(d<b.radius+TYPES[u.type].r){hits++;this.damage(u,75*(1-.3*clamp(d/b.radius,0,1)),b.source);}}
   if(hits)c.hits++;else c.dodges++;
   this.effects.push({kind:'explosion',x:b.x,y:b.y,radius:b.radius,t:.8,max:.8,team:1});this.notify('explosion',{x:b.x,y:b.y,kind:'artillery',team:1});
  }
 }

 luckyOdds(){return this.evolved.lucky?LUCKY.evolved:LUCKY.normal;}
 luckyOutcome(value=this.random(),odds=this.luckyOdds()){let total=0;for(const[k,p]of Object.entries(odds)){total+=p;if(value<total)return k;}return'blank';}
 luckyEnemy(source,range=LUCKY.range){return this.selectCombatTarget(source,this.combatCandidates(),this.attackingEnemies(),{...this.stats(source),range,minRange:0});}
 updateLuckyInterval(u){
  if(u.luckyInterval===LUCKY.interval)return;
  const next=Number.isFinite(u.nextLuckyAt)?u.nextLuckyAt+LUCKY.interval-(u.luckyInterval||3):this.time+LUCKY.interval;
  u.nextLuckyAt=clamp(next,this.time,this.time+LUCKY.interval);u.luckyInterval=LUCKY.interval;
 }
 updateLuckyUnit(u){
  if(u.hp<=0||u.team!==0||u.type!=='lucky')return;
  this.updateLuckyInterval(u);
  const roll=u.luckyRoll;
  if(roll&&!roll.resolved&&this.time+1e-8>=roll.endsAt){roll.resolved=true;roll.resultAt=this.time;this.castLucky(u,roll.kind);}
  if(this.time+1e-8<u.nextLuckyAt)return;
  u.nextLuckyAt=Math.max(u.nextLuckyAt+LUCKY.interval,this.time+LUCKY.interval);
  u.luckyRoll={kind:this.luckyOutcome(this.random(),this.luckyOdds(u)),startedAt:this.time,endsAt:this.time+LUCKY.spin,resolved:false,enhanced:!!this.evolved.lucky,bossKillerAvailable:(this.luckyOdds(u).bossKiller||0)>0};
  this.notify('fire',{...u,luckySound:'slotSpin'});
 }
 luckyScale(u){return this.stats(u).damage/TYPES.lucky.damage;}
 luckyCluster(source,range,radius,{bugsOnly=false}={}){
  const candidates=this.units.filter(t=>t.team!==source.team&&t.hp>0&&(!bugsOnly||(MELEE.has(t.type)&&!TYPES[t.type]?.stab||t.type==='butterfly'))&&dist(source,t)<=range&&this.visible(t)&&this.lineClear(source,t,0,{fireTeam:source.team}));
  if(!candidates.length)return null;
  // Local buckets keep density selection bounded to neighboring cells, without RNG.
  const cells=new Map(),cell=t=>[Math.floor(t.x/radius),Math.floor(t.y/radius)];
  for(const t of candidates){const [x,y]=cell(t),key=x+':'+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(t);}
  let best=null,bestCount=-1,bestDistance=Infinity;
  for(const t of candidates){const [x,y]=cell(t);let count=0;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const n of cells.get((x+dx)+':'+(y+dy))||[])if((t.x-n.x)**2+(t.y-n.y)**2<=radius**2)count++;
   const distance=dist(source,t);if(count>bestCount||count===bestCount&&distance<bestDistance){best=t;bestCount=count;bestDistance=distance;}}
  return {x:best.x,y:best.y,count:bestCount,target:best};
 }
 luckyMissileTarget(u,salvo=null,range=LUCKY.missileRange){
  const candidates=this.units.filter(t=>(u.team===0?t.team!==0:t.team===0)&&t.hp>0&&this.canTarget(u,t)&&dist(u,t)<=range&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:u.team}));
  let best=null,assigned=Infinity,density=-1,nearest=Infinity;
  // Spread each volley across live targets before revisiting one. Bosses use the same rule.
  for(const t of candidates){const used=salvo?.missileAssignments?.[t.id]||0;if(used>assigned)continue;const count=candidates.filter(n=>(n.x-t.x)**2+(n.y-t.y)**2<=90**2).length,distance=dist(u,t);
   if(used<assigned||count>density||count===density&&distance<nearest){best=t;assigned=used;density=count;nearest=distance;}}
  return best?{x:best.x,y:best.y,target:best}:null;
 }
 recordLuckyMissile(salvo,target){const used=salvo.missileAssignments??={};used[target.id]=(used[target.id]||0)+1;}
 luckyGlueTarget(u){
  const history=this.luckyGlueHistory=this.luckyGlueHistory.filter(z=>this.time-z.at<12).slice(-24),best=this.luckyCluster(u,LUCKY.range,LUCKY.glueRadius);
  if(!best){const facing=Number.isFinite(this.formationFacing)?this.formationFacing:u.face;let chosen=null,score=-Infinity;
   for(const distance of [150,230,300])for(const offset of [0,-.45,.45,-.9,.9]){const angle=facing+offset,p={x:u.x+Math.cos(angle)*distance,y:u.y+Math.sin(angle)*distance};if(!this.freePosition(p.x,p.y,8)||!this.lineClear(u,p,0,{fireTeam:u.team}))continue;const separation=history.length?Math.min(...history.map(z=>dist(p,z))):200,value=Math.min(200,separation)-Math.abs(offset)*12-Math.abs(distance-180)*.06;if(value>score){score=value;chosen=p;}}
   return chosen||this.resolvePosition({x:u.x+Math.cos(facing)*110,y:u.y+Math.sin(facing)*110},8);
  }
  if(!history.length)return best;
  const enemies=this.units.filter(t=>t.team!==u.team&&t.hp>0&&dist(u,t)<=LUCKY.range+LUCKY.glueRadius&&this.visible(t)),points=enemies.filter(t=>dist(u,t)<=LUCKY.range).map(t=>({x:t.x,y:t.y}));
  for(let i=0;i<8;i++){const a=i*Math.PI/4,p={x:best.x+Math.cos(a)*LUCKY.glueRadius*.8,y:best.y+Math.sin(a)*LUCKY.glueRadius*.8};if(dist(u,p)<=LUCKY.range&&this.freePosition(p.x,p.y,4))points.push(p);}
  let chosen=best,score=-Infinity,distance=Infinity;for(const p of points){const count=enemies.filter(t=>dist(t,p)<=LUCKY.glueRadius).length;if(!count||!this.lineClear(u,p,0,{fireTeam:u.team}))continue;let overlap=0;for(const z of history)overlap=Math.max(overlap,Math.max(0,1-dist(p,z)/(LUCKY.glueRadius*1.8))*(1-(this.time-z.at)/12));const value=count*(1-.6*overlap),d=dist(u,p);if(value>score+1e-8||Math.abs(value-score)<1e-8&&d<distance){chosen={x:p.x,y:p.y,count};score=value;distance=d;}}
  return chosen;
 }
 luckySprayTarget(u,current=null){
  const half=Math.PI/5,items=this.units.filter(t=>t.team!==u.team&&t.hp>0&&(MELEE.has(t.type)&&!TYPES[t.type]?.stab||t.type==='butterfly')&&dist(u,t)<=LUCKY.sprayRange+(TYPES[t.type]?.r||0)&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:u.team})).map(t=>({t,a:Math.atan2(t.y-u.y,t.x-u.x)})).sort((a,b)=>a.a-b.a);
  if(!items.length)return null;const n=items.length,list=items.concat(items.map(p=>({...p,a:p.a+Math.PI*2})));let end=0,best=null,score=-Infinity;
  for(let start=0;start<n;start++){end=Math.max(end,start);while(end<start+n&&list[end].a-list[start].a<=half*2+1e-8)end++;const mid=(list[start].a+list[end-1].a)/2,turn=Math.abs(Math.atan2(Math.sin(mid-u.face),Math.cos(mid-u.face))),keep=current&&Math.abs(Math.atan2(Math.sin(Math.atan2(current.y-u.y,current.x-u.x)-mid),Math.cos(Math.atan2(current.y-u.y,current.x-u.x)-mid)))<=half,value=end-start+(keep?.2:0)-turn*.005;if(value>score){score=value;best={start,end,mid};}}
  let anchor=list[best.start];for(let i=best.start+1;i<best.end;i++)if(Math.abs(list[i].a-best.mid)<Math.abs(anchor.a-best.mid))anchor=list[i];return{target:anchor.t,offset:best.mid-anchor.a,count:best.end-best.start};
 }
 migrateLuckyObjects(){
  for(const u of this.units){if(u.type==='lucky'&&u.team===0)this.updateLuckyInterval(u);if(u.luckyRootUntil!==undefined){if(u.luckyRootUntil>this.time)u.luckySlowUntil=Math.max(u.luckySlowUntil||0,u.luckyRootUntil);delete u.luckyRootUntil;}}
  this.luckyGlues??=[];this.luckyGlueHistory??=[];for(const z of this.luckyGlues)if((z.rulesVersion||0)<78){z.expires=z.landAt+LUCKY.glueLife;z.rulesVersion=78;}
  for(const m of this.luckyMines)if((m.rulesVersion||0)<85){if((m.rulesVersion||0)<76){m.placedAt=m.placedAt??m.expires-9;m.expires=m.placedAt+LUCKY.mineLife;}m.damage=LUCKY.mineDamage*this.luckyScale(m.source);m.rulesVersion=85;}
  for(const s of this.luckySprays)if((s.rulesVersion||0)<99){if((s.rulesVersion||0)<76){s.startedAt=s.startedAt??s.expires-2;s.expires=s.startedAt+LUCKY.sprayDuration;}s.damage=LUCKY.sprayDamage*this.luckyScale(s.source);s.nextAimAt=this.time;s.rulesVersion=99;}
  for(const v of this.luckySalvos)if((v.rulesVersion||0)<99){v.remaining+=LUCKY.missiles-(v.total??6);v.total=LUCKY.missiles;v.damage=LUCKY.missileDamage*this.luckyScale(v.source);v.rulesVersion=99;}
  for(const p of this.mortarShells)if(p.source?.type==='lucky'&&(p.luckyRulesVersion||0)<99){p.damage=LUCKY.missileDamage*this.luckyScale(p.source);p.luckyRulesVersion=99;}
  // Rebalance old reserves and airborne missiles once without refilling ammunition.
  for(const v of this.luckySalvos)if((v.rulesVersion||0)<130){v.damage=LUCKY.missileDamage*this.luckyScale(v.source);v.rulesVersion=130;}
  for(const p of this.mortarShells)if(p.source?.type==='lucky'&&(p.luckyRulesVersion||0)<130){p.damage=LUCKY.missileDamage*(p.source.team===0?this.luckyScale(p.source):1);p.luckyRulesVersion=130;}
  this.checkEvolutions();
 }
 castLucky(u,kind){
  if(kind==='blank'){this.notify('fire',{...u,luckySound:'slotBlank'});return;}
  const scale=this.luckyScale(u);u.recoil=.2;
  if(kind==='missiles'){
   const waiting=!(this.luckyMissileTarget(u));this.luckySalvos.push({source:u,rouletteChannel:u.activeLuckyChannel??0,remaining:LUCKY.missiles,total:LUCKY.missiles,nextAt:this.time,waiting,damage:LUCKY.missileDamage*scale,rulesVersion:130});if(u.luckyRoll?.kind==='missiles')u.luckyRoll.stored=waiting;
   this.effects.push({kind:'luckyJackpot',x:u.x,y:u.y,t:1,max:1,team:0});this.notify('fire',{...u,luckySound:'jackpot'});this.notify('toast',waiting?`777! 미사일 ${LUCKY.missiles}발 저장 · 적 접근 시 자동 발사`:'777! 럭키 레토나 · 미사일 난사');return;
  }
  if(kind==='glue'){
   const target=this.luckyGlueTarget(u);if(!target)return;this.luckyGlueHistory.push({x:target.x,y:target.y,at:this.time,ownerId:u.id});
   u.face=Math.atan2(target.y-u.y,target.x-u.x);
   this.luckyGlues.push({x:target.x,y:target.y,fromX:u.x,fromY:u.y,source:u,team:0,radius:LUCKY.glueRadius,landAt:this.time+LUCKY.glueFlight,expires:this.time+LUCKY.glueFlight+LUCKY.glueLife,rulesVersion:78,hitIds:[]});
   this.effects.push({kind:'luckyGlueThrow',x:u.x,y:u.y,tx:target.x,ty:target.y,radius:LUCKY.glueRadius,t:LUCKY.glueFlight,max:LUCKY.glueFlight,team:0});return;
  }
  if(kind==='mine'){
   // Each winning reel places its own mine; keep their visible footprints apart.
   const owned=this.luckyMines.filter(m=>m.ownerId===u.id);if(owned.length>=(Math.ceil(LUCKY.mineLife/LUCKY.interval)+1)*(u.star>=2?3:1)){const oldest=owned[0];this.luckyMines=this.luckyMines.filter(m=>m!==oldest);}
   const angle=Number.isFinite(u.moveFace)?u.moveFace:u.face||0;let point={x:u.x,y:u.y};for(const d of [38,24,0]){const near={x:u.x+Math.cos(angle)*d,y:u.y+Math.sin(angle)*d};if(this.freePosition(near.x,near.y,10)&&this.lineClear(u,near,10)){point=near;break;}}
   if(this.starExperiment&&u.star>=2){
    const channel=u.activeLuckyChannel??0,lane=channel===1?-32:channel===2?32:0,existing=this.luckyMines.filter(m=>m.ownerId===u.id&&m.expires>this.time);let best=-1,found=false;
    for(const d of [38,62,86,24,0]){for(const side of [lane,lane-32,lane+32,lane-64,lane+64]){
     const near={x:u.x+Math.cos(angle)*d-Math.sin(angle)*side,y:u.y+Math.sin(angle)*d+Math.cos(angle)*side};
     if(!this.freePosition(near.x,near.y,10)||!this.lineClear(u,near,10))continue;
     const gap=existing.length?Math.min(...existing.map(m=>dist(m,near))):Infinity;
     if(gap>best){best=gap;point=near;}if(gap>=26){found=true;break;}
    }if(found)break;}
   }
   this.luckyMines.push({x:point.x,y:point.y,ownerId:u.id,source:u,rouletteChannel:u.activeLuckyChannel??0,team:0,damage:LUCKY.mineDamage*scale,armAt:this.time+.35,placedAt:this.time,expires:this.time+LUCKY.mineLife,rulesVersion:85});return;
  }
  if(kind==='spray'){
   const aim=this.luckySprayTarget(u);
   if(aim)u.face=Math.atan2(aim.target.y-u.y,aim.target.x-u.x)+aim.offset;
   const channel=u.activeLuckyChannel??0,previous=this.luckySprays.find(s=>s.source===u&&(s.rouletteChannel||0)===channel);
   if(previous){previous.expires=this.time+LUCKY.sprayDuration;previous.damage=LUCKY.sprayDamage*scale;previous.nextAimAt=this.time;return;}
   this.luckySprays.push({x:u.x,y:u.y,angle:u.face,target:aim?.target||null,aimOffset:aim?.offset||0,emitting:true,source:u,rouletteChannel:channel,team:0,damage:LUCKY.sprayDamage*scale,nextAt:this.time,nextAimAt:this.time,startedAt:this.time,expires:this.time+LUCKY.sprayDuration,rulesVersion:99});
  }
 }
 updateLuckyObjects(dt){
  const glues=[];for(const z of this.luckyGlues){if(this.time>=z.expires)continue;if(this.time+1e-8>=z.landAt){if(!z.landed){z.landed=true;this.effects.push({kind:'luckyGlue',x:z.x,y:z.y,radius:z.radius,t:.35,max:.35,team:0});}for(const t of this.units){if(z.team!==0&&t.team!==0||t.team===z.team||t.hp<=0||this.commanderReviveProtected(t)||z.hitIds.includes(t.id)||(t.x-z.x)**2+(t.y-z.y)**2>z.radius**2||!this.lineClear(z,t,0,{fireTeam:z.team}))continue;t.luckySlowUntil=Math.max(t.luckySlowUntil||0,this.time+LUCKY.slowDuration);z.hitIds.push(t.id);}}glues.push(z);}this.luckyGlues=glues;
  const mines=[];for(const m of this.luckyMines){if(this.time>=m.expires)continue;const trigger=this.time>=m.armAt&&this.units.some(t=>(m.team===0||t.team===0)&&t.team!==m.team&&t.hp>0&&!this.isFlying(t)&&(t.x-m.x)**2+(t.y-m.y)**2<(30+(TYPES[t.type]?.r||0))**2);if(!trigger){mines.push(m);continue;}for(const t of this.units){if(m.team!==0&&t.team!==0||t.team===m.team||t.hp<=0)continue;const d=dist(t,m);if(d<=LUCKY.mineRadius)this.damage(t,m.damage*multiplier('rocket',t.type)*(1-.45*d/LUCKY.mineRadius),m.source);}this.effects.push({kind:'explosion',x:m.x,y:m.y,radius:LUCKY.mineRadius,t:.65,max:.65,team:0});this.notify('explosion',{x:m.x,y:m.y,kind:'rocket',team:0});}this.luckyMines=mines;
  const sprays=[];for(const s of this.luckySprays){if(s.source.hp<=0||this.time>=s.expires)continue;s.x=s.source.x;s.y=s.source.y;
   if(this.time>=(s.nextAimAt||0)||!s.target||s.target.hp<=0||dist(s,s.target)>LUCKY.sprayRange+(TYPES[s.target.type]?.r||0)){const aim=this.luckySprayTarget(s.source,s.target);s.target=aim?.target||null;s.aimOffset=aim?.offset||0;s.nextAimAt=this.time+.15;}
   s.emitting=true;if(s.target){s.aimX=s.target.x+clamp(s.target.navVX||0,-200,200)*.08;s.aimY=s.target.y+clamp(s.target.navVY||0,-200,200)*.08;s.aimHeight=(TYPES[s.target.type]?.flightHeight||0)+9;s.angle=Math.atan2(s.aimY-s.y,s.aimX-s.x)+(s.aimOffset||0);s.source.face=s.source.aimFace=s.angle;}else{s.aimX=s.x+Math.cos(s.angle)*LUCKY.sprayRange;s.aimY=s.y+Math.sin(s.angle)*LUCKY.sprayRange;s.aimHeight=9;}
   while(s.nextAt<=this.time+1e-8&&s.nextAt<s.expires-1e-8){s.nextAt+=.25;if(!s.emitting)continue;for(const t of this.units){if(t.team===s.team||t.hp<=0||!(MELEE.has(t.type)&&!TYPES[t.type]?.stab||t.type==='butterfly'))continue;const d=dist(t,s),r=TYPES[t.type]?.r||0;if(d>LUCKY.sprayRange+r)continue;const angle=Math.atan2(t.y-s.y,t.x-s.x),delta=Math.abs(Math.atan2(Math.sin(angle-s.angle),Math.cos(angle-s.angle)));if(delta>Math.PI/5+Math.asin(Math.min(1,r/Math.max(1,d)))||!this.lineClear(s,t,0,{fireTeam:s.team}))continue;this.damage(t,s.damage*.25,s.source);}}
   sprays.push(s);}this.luckySprays=sprays;
  const salvos=[],firing=new Set();for(const v of this.luckySalvos){if(v.source.hp<=0)continue;
   const firingKey=this.starExperiment&&v.source.star>=2?v.source.id+':'+(v.rouletteChannel||0):v.source.id;if(firing.has(firingKey)){salvos.push(v);continue;}firing.add(firingKey);
   const pick=()=>this.luckyMissileTarget(v.source,v);let target=pick();
   if(!target){v.waiting=true;v.nextAt=this.time;salvos.push(v);continue;}if(v.waiting){v.nextAt=this.time;v.waiting=false;}
   while(v.remaining>0&&v.nextAt<=this.time+1e-8){target=pick();if(!target){v.waiting=true;v.nextAt=this.time;break;}v.nextAt+=v.source.team===0?LUCKY.alliedMissileInterval:LUCKY.missileInterval;v.remaining--;this.recordLuckyMissile(v,target.target);v.source.face=Math.atan2(target.y-v.source.y,target.x-v.source.x);this.launchMissile(v.source,target,{damage:v.damage,side:v.remaining%2?1:-1,lane:[-50,50,-25,25,-75,75,0][(v.total||LUCKY.missiles)-v.remaining-1]||0});}
   if(v.remaining>0)salvos.push(v);}this.luckySalvos=salvos;
 }
 swordTargets(c,angle,range,arc=Math.PI*2){
  return [...this.units,...this.activeDefenses(),...this.structures,...this.bases].filter((t,i,all)=>all.indexOf(t)===i&&t!==c&&this.canTarget(c,t)&&!t.hidden&&this.visible(t)&&this.targetDistance(c,t)<=range&&Math.abs(Math.atan2(Math.sin(Math.atan2(t.y-c.y,t.x-c.x)-angle),Math.cos(Math.atan2(t.y-c.y,t.x-c.x)-angle)))<=arc/2&&this.lineClear(c,t,0,{fireTeam:0}));
 }
 beginSwordAttack(c,target,attack=this.attackRoll(c)){
  if(c.hp<=0||c.swordAttack||this.ultimateStatus().active)return false;
  const angle=Math.atan2(target.y-c.y,target.x-c.x),rate=this.stats(c).rate,tempo=Math.min(1,rate/SWORD.rate);c.face=c.aimFace=angle;c.cooldown=rate;c.swordAttack={angle,hitAt:this.time+SWORD.windup*tempo,endsAt:this.time+SWORD.recovery*tempo,startedAt:this.time,hit:false,...attack};c.swordPose={...c.swordAttack};return true;
 }
 updateSwordAttack(c){
  const a=c.swordAttack;if(!a)return;if(c.hp<=0||this.ultimateStatus().active){c.swordAttack=null;c.swordPose=null;return;}
  if(!a.hit&&this.time+1e-8>=a.hitAt){a.hit=true;const targets=this.swordTargets(c,a.angle,this.stats(c).range,SWORD.arc).sort((a,b)=>dist(c,a)-dist(c,b)).slice(0,SWORD.targets);for(const t of targets)this.damage(t,a.damage,c);this.effects.push({kind:'shionSlash',source:c,x:c.x,y:c.y,angle:a.angle,range:this.stats(c).range,arc:SWORD.arc,t:.28,max:.28,team:0,critical:a.critical});this.notify('fire',{...c,sword:true});}
  if(this.time>=a.endsAt)c.swordAttack=null;
 }
 flameTargets(c,angle,range,arc){return [...this.units,...this.activeDefenses(),...this.structures,...this.bases,...this.buildings].filter(t=>t!==c&&t.team!==c.team&&t.hp>0&&!t.hidden&&this.visible(t)&&dist(c,t)<=range+(t.r||TYPES[t.type]?.r||0)&&Math.abs(Math.atan2(Math.sin(Math.atan2(t.y-c.y,t.x-c.x)-angle),Math.cos(Math.atan2(t.y-c.y,t.x-c.x)-angle)))<=arc/2&&this.lineClear(c,t,0,{fireTeam:c.team}));}
 flamePulse(c,angle,boost=false){
  if(!this.isFlameCommander(c)||c.hp<=0||this.phase!=='playing')return 0;
  const range=boost?FLAME.ultimateRange:FLAME.range,arc=boost?FLAME.ultimateArc:FLAME.arc,targets=this.flameTargets(c,angle,range,arc),attack=this.attackRoll(c);
  for(const t of targets)this.damage(t,attack.damage*(boost?FLAME.ultimateDamage:1)*(ARMORED.has(t.type)?FLAME.armor:1),c);
  c.flameAngle=angle;c.flameUntil=this.time+.18;c.recoil=.08;this.effects.push({kind:'flame',source:c,sourceId:c.id,at:this.time,x:c.x,y:c.y,angle,appearance:'blaze',flameSkin:c.flameSkin||'classic',range,arc,boost,team:c.team,t:.18,max:.18});this.notify('fire',{...c,flame:true,ultimate:boost});return targets.length;
 }
 ultimateStatus(){const u=this.ultimate||{},c=this.commander(0);return{unlocked:this.level>=ULTIMATE.level,active:c.hp>0&&this.time<(u.activeUntil||0),remaining:Math.max(0,(u.activeUntil||0)-this.time),cooldown:Math.max(0,(u.readyAt||0)-this.time),ready:this.phase==='playing'&&c.hp>0&&this.level>=ULTIMATE.level&&this.time>=(u.readyAt||0)&&this.time>=(u.activeUntil||0)};}
 ultimateTargets(){const c=this.commander(0);if(this.isSwordCommander(c))return this.swordTargets(c,0,SWORD.ultimateRange);return [...this.units,...this.activeDefenses(),...this.structures,...this.bases].filter(u=>u.team!==0&&u.hp>0&&this.visible(u)&&dist(c,u)<=(this.isSwordCommander(c)?SWORD.ultimateRange:this.isFlameCommander(c)?FLAME.ultimateRange:ULTIMATE.range)+(u.r||0)&&this.lineClear(c,u,0,{fireTeam:c.team}));}
 useUltimate(){
  if(!this.ultimateStatus().ready)return false;
  const c=this.commander(0);
  if(this.isSwordCommander(c)){const angle=c.aimFace??c.face;c.swordAttack=null;c.swordPose=null;this.ultimate={readyAt:this.time+ULTIMATE.cooldown,startedAt:this.time,activeUntil:this.time+ULTIMATE.duration,nextShotAt:this.time,shots:0,angle};c.ultimatePose={active:true,angle,shotAt:this.time,startedAt:this.time,sword:true};this.notify('toast','궁극기 · 홍련 회전베기! 4초간 주변 360° 공격');this.notify('change');return true;}
  const targets=this.ultimateTargets(),focus=targets.includes(this.focusTarget)?this.focusTarget:null;
  // Aim at the densest observed front; a deliberate focus command takes priority.
  const score=t=>{const a=Math.atan2(t.y-c.y,t.x-c.x);return targets.reduce((sum,u)=>sum+(Math.abs(Math.atan2(Math.sin(Math.atan2(u.y-c.y,u.x-c.x)-a),Math.cos(Math.atan2(u.y-c.y,u.x-c.x)-a)))<=(this.isFlameCommander(c)?FLAME.ultimateArc:ULTIMATE.arc)/2?(u.boss?3:1):0),0);};
  const target=focus||targets.sort((a,b)=>score(b)-score(a)||dist(c,a)-dist(c,b))[0],angle=target?Math.atan2(target.y-c.y,target.x-c.x):(c.aimFace??c.face);
  this.ultimate={readyAt:this.time+ULTIMATE.cooldown,startedAt:this.time,activeUntil:this.time+ULTIMATE.duration,nextShotAt:this.time,shots:0,angle};c.ultimatePose={active:true,hand:null,shotAt:-1,angle};c.face=c.aimFace=angle;
  this.notify('toast',this.isFlameCommander(c)?'궁극기 · 지옥불 분사! 4초간 강화 화염':'궁극기 · 쌍권총 난사! 4초간 전방 광역 사격');this.notify('change');return true;
 }
 updateUltimate(){
  const state=this.ultimate,c=this.commander(0);if(!state||!c)return;
  if(this.isSwordCommander(c)){if(c.hp<=0){state.activeUntil=Math.min(state.activeUntil,this.time);if(c.ultimatePose)c.ultimatePose.active=false;return;}if(!this.ultimateStatus().active){if(c.ultimatePose)c.ultimatePose.active=false;return;}while(state.nextShotAt<=this.time+1e-8&&state.nextShotAt<state.activeUntil-1e-8&&this.phase==='playing'){state.nextShotAt+=SWORD.ultimateInterval;state.shots++;const attack=this.attackRoll(c);for(const t of this.swordTargets(c,0,SWORD.ultimateRange))this.damage(t,attack.damage*SWORD.ultimateDamage,c);this.effects.push({kind:'shionSpin',source:c,sourceId:c.id,at:state.nextShotAt-SWORD.ultimateInterval,x:c.x,y:c.y,angle:state.angle,range:SWORD.ultimateRange,t:SWORD.ultimateInterval,max:SWORD.ultimateInterval,team:0,shot:state.shots});this.notify('fire',{...c,sword:true,ultimate:true});}const angle=state.angle+(this.time-state.startedAt)/SWORD.ultimateInterval*Math.PI*2;c.ultimatePose={active:this.time<state.activeUntil,angle,shotAt:this.time,startedAt:state.startedAt,sword:true};c.face=c.aimFace=angle;return;}

  if(this.isFlameCommander(c)){if(c.hp<=0){state.activeUntil=Math.min(state.activeUntil,this.time);if(c.ultimatePose)c.ultimatePose.active=false;return;}while(state.nextShotAt<=this.time+1e-8&&state.nextShotAt<state.activeUntil-1e-8&&this.phase==='playing'){state.nextShotAt+=FLAME.rate;state.shots++;c.ultimatePose={active:true,hand:null,shotAt:this.time,angle:state.angle};this.flamePulse(c,state.angle,true);}if(c.ultimatePose)c.ultimatePose.active=this.time<state.activeUntil;return;}
  if(c.hp<=0){state.activeUntil=Math.min(state.activeUntil,this.time);if(c.ultimatePose)c.ultimatePose.active=false;return;}
  while(state.nextShotAt<=this.time+1e-8&&state.nextShotAt<state.activeUntil-1e-8&&this.phase==='playing'){
   const hand=state.shots%2===0?'right':'left',shotAt=state.nextShotAt;state.nextShotAt+=ULTIMATE.interval;state.shots++;c.ultimatePose={active:true,hand,shotAt,angle:state.angle};c.recoil=.18;
   const targets=this.ultimateTargets().filter(u=>Math.abs(Math.atan2(Math.sin(Math.atan2(u.y-c.y,u.x-c.x)-state.angle),Math.cos(Math.atan2(u.y-c.y,u.x-c.x)-state.angle)))<=ULTIMATE.arc/2);
   const attack=this.attackRoll(c);for(const target of targets)this.damage(target,attack.damage*ULTIMATE.damage,c);
   this.effects.push({kind:'ultimateVolley',source:c,sourceId:c.id,at:shotAt,x:c.x,y:c.y,angle:state.angle,appearance:c.appearance,hand,team:0,t:.20,max:.20,range:ULTIMATE.range,arc:ULTIMATE.arc,shot:state.shots});this.notify('fire',{...c,ultimate:true});
  }
  if(c.ultimatePose)c.ultimatePose.active=this.time<state.activeUntil;
 }
 rally(){if(this.phase!=='playing'||this.time<this.rallyReady)return false;this.rallyUntil=this.time+5;this.rallyReady=this.time+15;this.notify('toast','집결 명령 · 5초간 대형 간격 축소');return true;}
 enemyAct(){
  const t=1;if(this.time>this.enemyTechNext){this.enemyTechNext+=22;let pick=this.enemyPlan;if(!this.tech[t][pick]||this.tech[t][pick]<3)this.tech[t][pick]++;else{const choices=ROSTER.filter(t=>t!=='lucky');pick=choices[Math.floor(this.random()*choices.length)];this.tech[t][pick]=Math.min(5,this.tech[t][pick]+1);}this.units.filter(u=>u.team===t&&u.type===pick).forEach(u=>{const h=this.stats(u).hp;if(u.hp>0)u.hp+=h-u.maxHp;u.maxHp=h;});}
  if(this.time>this.enemyNext){this.enemyNext=this.time+3;
   const build=[this.enemyPlan,this.enemyPlan,'rifle',this.time>40?'medic':'rifle','rocket'];let p=build[Math.floor(this.random()*build.length)];if(!this.tech[t][p])p='rifle';this.buy(p,t);
  }
 }
 spawnHuntWave(){
  const rules=this.waveRules().hunt;if(!rules.enabled)return;
  const p=this.pressure(),room=p.late?Math.min(this.enemySpawnRoom(2),p.swarmCap-this.units.filter(u=>u.team===2&&u.hp>0&&!u.boss&&!this.isFlying(u)).length):rules.earlyCap-this.units.filter(u=>u.team===2&&u.hp>0).length;if(p.late&&room<=0){this.mission.nextWave=this.time+rules.fullRetry;return;}
  if(!this.northernSpawn(this.serial+1,50)){this.mission.nextWave=this.time+this.waveRules().retrySeconds;return;}
  this.mission.wave++;const player=this.commander(0),wave=this.mission.wave,tier=p.tier,count=Math.max(0,Math.min(waveValue(rules.batch,tier,wave),room));
  for(let i=0;i<count;i++){
   const angle=this.formationFacing+((i+.5)/count-.5)*2.3,radius=350+(i%3)*35,type=this.waveType(rules,i,wave,count);
   const spawn=this.northernSpawn(this.serial+1,50);if(!spawn)break;const u=this.addUnit(2,type,spawn.x,spawn.y,true);u.missionStage=1;u.assault=true;
  }
  this.notify('toast',`벌레 무리 ${wave}/${this.mission.totalWaves} · 이동하며 거리를 유지하세요`);
 }
 updateFlyingSwarm(){
  if(this.mode!=='pve'||this.phase!=='playing')return;
  // Old saves start with the first due group; never replay a backlog of waves.
  this.flyingSwarm=this.flyingSwarm||this.flyingStart();
  const c=this.commander(0);if(c.hp<=0)return;
  for(const [type,rule]of Object.entries(this.waveRules().flying)){
   if(!rule.enabled)continue;
   const key=type+'Next',countKey=type+'Spawned';if(this.time<(this.flyingSwarm[key]??rule.at))continue;
   this.flyingSwarm[key]=this.time+rule.interval;
   if(this.units.filter(u=>u.hp>0&&u.type===type&&u.team===2).length+rule.batch>rule.cap||(this.pressure().late||this.isDesktopDefense())&&this.enemySpawnRoom(2)<rule.batch)continue;
   const first=!this.flyingSwarm[countKey];for(let i=0;i<rule.batch;i++){
    const n=this.flyingSwarm[countKey]||0,angle=this.formationFacing+(i-(rule.batch-1)/2)*.32+(n%2?.18:-.18),radius=430+(i%2)*35;
    const spawn=this.isDesktopDefense()?this.desktopEntry():this.northernSpawn(this.serial+1,50);if(!spawn){this.flyingSwarm[key]=this.time+this.waveRules().retrySeconds;break;}const u=this.addUnit(2,type,spawn.x,spawn.y,true);u.assault=true;u.ambient=true;this.stampEvolutionWave(u);this.flyingSwarm[countKey]=(this.flyingSwarm[countKey]||0)+1;
   }
   if(first&&this.flyingSwarm[countKey])this.notify('toast',`${rule.at}초 경과 · ${TYPES[type].name} ${rule.batch}마리 출현!`);
  }
 }
 updateSwarm(){
  if(this.isRoomCampaign()){this.updateRoomWaves();return;}
  this.updateFlyingSwarm();
  if(this.mode!=='pve'||this.phase!=='playing'||this.time<this.swarm.nextAt||!this.waveRules().swarm.enabled)return;
  const p=this.pressure(),player=this.commander(0),count=Math.max(0,Math.min(p.swarmBatch,p.swarmCap-this.units.filter(u=>u.team===2&&u.hp>0&&!u.boss&&!this.isFlying(u)).length,p.late||this.isDesktopDefense()?this.enemySpawnRoom(2):Infinity));
  this.swarm.nextAt=this.time+p.swarmInterval;
  for(let i=0;i<count;i++){
   const n=this.swarm.spawned+1,angle=this.formationFacing+((n%7)-3)*.3,radius=380+(n%3)*30;
   const type=this.waveType(this.waveRules().swarm,n);
   const spawn=this.isDesktopDefense()?this.desktopEntry():this.northernSpawn(this.serial+1,50);if(!spawn){this.swarm.nextAt=this.time+this.waveRules().retrySeconds;break;}this.swarm.spawned++;const u=this.addUnit(2,type,spawn.x,spawn.y,true);u.assault=true;u.ambient=true;this.stampEvolutionWave(u);
  }
 }
 enterStage(stage){
  this.mission.stage=stage;this.mission.stageStarted=this.time;this.mission.nextAssault=this.time+(stage===3&&this.pressure().late?this.waveRules().assault.lateFinalDelay:this.waveRules().assault.stageDelay);
  if(stage===2){
   Object.assign(this.tech[1],{rifle:1,rocket:1,sniper:1,guntruck:1,tank:1,machinegun:1,mortar:1});
   this.structures.forEach(post=>{post.nextGuard=this.time+this.waveRules().guards.postFirstDelay;for(const type of this.waveRules().guards.postInitial)this.spawnGuard(post,type);});
   this.notify('toast','사냥 구역 돌파! 북쪽의 전초기지 2곳을 파괴하세요.');
  }else if(stage===3){
   this.tech[1].rifle=2;this.tech[1].tank=1;this.bases[1].nextGuard=this.time+(this.pressure().late?this.waveRules().guards.lateBaseFirstDelay:this.waveRules().guards.baseFirstDelay);this.bases[1].cooldown=0;
   for(const type of (this.pressure().late?this.waveRules().guards.lateBaseInitial:this.waveRules().guards.baseInitial))this.spawnGuard(this.bases[1],type);
   this.notify('toast','최종 구역 개방! 포병과 최종 방어선을 돌파하세요.');
  }
  if(this.mode==='pve'&&!this.stageSupplied.includes(stage)){
   this.stageSupplied.push(stage);const supply=stage===2?100:180;this.cash[0]+=supply;
   this.alive(0).forEach(u=>{this.heal(u,u.maxHp*.4);});
   this.notify('toast',`구역 돌파 보급 · +${supply} 자원 / 생존 아군 체력 40% 회복 · 다음 목표로 진격하세요.`);
  }
  this.notify('change');
 }
 spawnGuard(post,type='rifle'){
  if(this.pressure().late&&this.enemySpawnRoom(1)<=0)return null;
  const angle=this.serial*2.4,spawn=this.northernSpawn(this.serial+1,50,{x:post.x+Math.cos(angle)*115,y:post.y+Math.sin(angle)*115});if(!spawn)return null;const u=this.addUnit(1,type,spawn.x,spawn.y,true);u.guardId=post.id||'final';u.guardArrival=this.resolvePosition({x:post.x+Math.cos(angle)*115,y:post.y+Math.sin(angle)*115},this.collisionRadius(u));u.homeX=u.guardArrival.x;u.homeY=u.guardArrival.y;u.missionStage=this.mission.stage;return u;
 }
 fireDefense(post,dt){
  if(post.hp<=0)return;post.cooldown-=dt;
  const target=this.alive(0).filter(u=>this.canTarget(post,u)&&dist(u,post)<340).sort((a,b)=>dist(a,post)-dist(b,post))[0];
  if(target&&post.cooldown<=0){post.cooldown=post.base?1.1:1.45;this.shots.push({x:post.x,y:post.y,target,source:post,damage:(post.base?20:13)*(1+.10*this.pressure().tier)*(this.roomDefenseRules(post)?.damage||1)*this.enemyDamageScale(post),speed:650,kind:'turret',team:1,life:1.5});}
  if(this.isRoomCampaign())return;
  if(this.time>=post.nextGuard){
   const p=this.pressure();post.nextGuard=this.time+(post.base?p.baseInterval:p.postInterval);
   const guards=this.units.filter(u=>u.team===1&&u.guardId===(post.id||'final')&&u.hp>0),cap=post.base?p.baseCap:p.postCap;
   const count=Math.min(post.base?p.baseBatch:p.postBatch,cap-guards.length,this.enemySpawnRoom(1));
   const types=waveRoster(this.waveRules().guards.rosters,this.time,!!post.base);if(!types.length)return;
   post.reinforcementCycle=(post.reinforcementCycle||0)+1;for(let i=0;i<count;i++)this.spawnGuard(post,types[(i+post.reinforcementCycle-1)%types.length]);
  }
 }
 spawnAssault(){
  const rules=this.waveRules().assault;if(!rules.enabled)return;const p=this.pressure(),types=waveRoster(rules.rosters,this.time);if(!types.length)return;
  const count=Math.max(0,Math.min(p.assaultBatch,this.enemySpawnRoom(1)));if(!count)return;
  let spawned=0;for(let i=0;i<count;i++){const spawn=this.isDesktopDefense()?this.desktopEntry():this.northernSpawn(this.serial+1,50);if(!spawn)break;spawned++;const u=this.addUnit(1,types[i%types.length],spawn.x,spawn.y,true);u.assault=true;this.stampEvolutionWave(u);}
  if(spawned)this.notify('toast',`적 돌격대 ${spawned}기 접근 · 시간이 지날수록 증원 규모와 중장갑 비중이 늘어납니다.`);
 }
 updateMission(dt){
  if(this.phase!=='playing')return;
  if(this.isDesktopDefense()){this.updateDesktopDefense();return;}
  if(this.isRoomCampaign()){this.updateRoomMission(dt);return;}
  if(this.mission.stage===1){
   const remaining=this.units.filter(u=>u.missionStage===1&&u.hp>0).length;
   if(this.mission.wave<this.mission.totalWaves&&this.time>=this.mission.nextWave){this.mission.nextWave=this.time+waveValue(this.waveRules().hunt.interval,this.pressure().tier);this.spawnHuntWave();}
   else if(this.mission.wave===this.mission.totalWaves&&remaining===0&&(this.bounds().id!=='livingroom'||this.time>=ROOM_RULES.stage2At))this.enterStage(2);
  }else if(this.mission.stage===2){this.structures.forEach(post=>this.fireDefense(post,dt));if(this.structures.every(post=>post.hp<=0)&&!this.units.some(u=>u.roadCaptain&&u.roadStage===2&&u.hp>0))this.enterStage(3);}
  else this.fireDefense(this.bases[1],dt);
  if(this.mission.stage>=2&&this.time>=this.mission.nextAssault){this.mission.nextAssault=this.time+this.pressure().assaultInterval;this.spawnAssault();}
 }
 objective(){
  if(this.isDesktopDefense()){
   const left=Math.max(0,Math.ceil(DESKTOP_RULES.duration-this.time)),boss=this.activeBoss(),home=this.bases[0],threat=this.units.filter(u=>u.team!==0&&u.hp>0).sort((a,b)=>dist(a,home)-dist(b,home))[0];
   return{title:'책상 디펜스 / 20분 동안 버티세요',progress:`남은 시간 ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')} · 기지 ${Math.ceil(home.hp)}/${home.maxHp}${boss?' · 보스 '+boss.bossName:''}`,target:threat||{x:home.x,y:home.y-370},targetName:threat?'접근 중인 적':'방어선 유지',showMarker:!!threat};
  }
  if(this.crisis.phase==='active'){
   const player=this.commander(0),guns=this.artilleryUnits().sort((a,b)=>dist(a,player)-dist(b,player));
   return{title:'긴급 / 포병 2기 파괴',progress:`남은 포병 ${guns.length}기 · 피격 ${this.crisis.hits}회 · 이동으로 포격 회피`,target:guns[0]||player,targetName:'적 포병'};
  }
  if(this.mode==='crisis'&&this.crisis.phase==='cleared')return{title:'포병 위기 연습 / 완료',progress:`포병 2기 격파 · 피격 ${this.crisis.hits}회 · 완전 회피 ${this.crisis.dodges}회`,target:this.commander(0),showMarker:false};
  if(this.mode==='crisis')return{title:'포병 위기 연습 / 이동 준비',progress:`${Math.max(0,Math.ceil(this.crisis.startAt-this.time))}초 뒤 포병 출현 · 전차까지 범위 밖으로 이동`,target:{x:800,y:1900},targetName:'북쪽 전선'};
  const boss=this.activeBoss(),bosses=this.isRoomCampaign()?this.units.filter(u=>u.boss&&!u.roadCaptain&&u.hp>0):[];if(bosses.length>1)return{title:'보스 2기 / '+bosses.map(u=>u.bossName).join(' + '),progress:bosses.map(u=>u.bossName+' '+Math.ceil(u.hp/u.maxHp*100)+'%').join(' · ')+' · 각 보스 처치 시 강화 보상',target:boss,targetName:boss.bossName};if(this.mode==='pve'&&boss)return{title:`보스 / ${boss.bossName}`,progress:`HP ${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)} · 처치 시 추가 강화 1회${this.bossArmorPenetration(boss)?' · 방어 관통 '+Math.round(this.bossArmorPenetration(boss)*100)+'%':''}`,target:boss,targetName:boss.bossName};
  if(this.isRoomCampaign())return this.roomObjective();
  if(this.mode==='duel')return{title:'1대1 훈련 · 상대 본진 파괴',progress:'3분 종료 시 남은 본진 체력으로 판정',target:this.bases[1]};
  if(this.mission.stage===1){
   const bugs=this.units.filter(u=>u.missionStage===1&&u.hp>0),player=this.commander(0);bugs.sort((a,b)=>dist(a,player)-dist(b,player));
   const incoming=this.units.filter(u=>u.ambient&&u.hp>0).sort((a,b)=>dist(a,player)-dist(b,player))[0],supply=this.pickups.filter(p=>p.active&&p.y>=this.frontline()).sort((a,b)=>dist(a,player)-dist(b,player))[0];
   return{title:'01 / 사냥 구역 돌파',progress:`벌레 무리 ${this.mission.wave}/${this.mission.totalWaves} · 남은 목표 ${bugs.length} · 적 지속 유입${!bugs.length&&this.mission.wave<this.mission.totalWaves?` · 다음 무리 ${Math.max(0,Math.ceil(this.mission.nextWave-this.time))}초`:''}`,target:bugs[0]||incoming||supply||{x:player.x,y:player.y},targetName:bugs.length?'사냥 대상':incoming?'접근 중인 무리':supply?'보급품':'다음 무리 준비',showMarker:!!bugs.length||!!incoming||!!supply};
  }
  if(this.mission.stage===2){const posts=this.structures.filter(p=>p.hp>0),player=this.commander(0),captains=this.units.filter(u=>u.roadCaptain&&u.roadStage===2&&u.hp>0).sort((a,b)=>dist(a,player)-dist(b,player));posts.sort((a,b)=>dist(a,player)-dist(b,player));return{title:'02 / 전초기지 파괴',progress:`전초기지 ${2-posts.length}/2 파괴${this.bounds().id==='livingroom'?' · 경로 대장 '+captains.length+'명 남음':''} · 수비 건물 ${this.activeDefenses().length}곳 가동`,target:posts[0]||captains[0]||this.units.find(u=>u.team!==0&&u.hp>0&&this.visible(u))||{x:this.commander(0).x,y:this.commander(0).y},targetName:posts.length?'전초기지':captains[0]?.bossName||'최종 방어선'};}
  if(this.bounds().id==='livingroom'&&this.baseShielded()){const c=this.commander(0),threat=this.units.filter(u=>u.hp>0&&u.team!==0&&this.visible(u)).sort((a,b)=>dist(a,c)-dist(b,c))[0],defense=this.activeDefenses().find(d=>this.visible(d));return{title:this.time<600?'최종 방어선 / 10분 공세 준비':'최종 방어선 / 잔여 목표',progress:this.time<600?`10:00 최종 보스 · ${Math.ceil(600-this.time)}초 후 / 7:30 예고·8:00 포격`:'최종 보스와 포병을 격파하면 기지 방어막 해제',target:threat||defense||{x:this.bases[1].x,y:this.bases[1].y+450},targetName:threat?'접근 중인 적':'최종 방어선'};}
  return{title:'03 / 최종 기지 파괴',progress:`기지 HP ${Math.ceil(this.bases[1].hp)} / ${this.bases[1].maxHp} · 파괴하면 승리 · 수비 건물 ${this.activeDefenses().length}곳 가동`,target:this.bases[1]};
 }
 bikeHazards(){
  const hazards=[];
  for(const u of this.units){const a=u.bikeAttack;if(u.hp<=0||u.team===0||!a)continue;
   const length=Math.max(0,a.distance-(a.phase==='charge'?a.traveled:0)),start=a.phase==='charge'?u:a.origin,n=Math.max(1,Math.ceil(length/70));
   for(let i=0;i<=n;i++){const d=length*i/n;hazards.push({x:start.x+Math.cos(a.angle)*d,y:start.y+Math.sin(a.angle)*d,radius:(a.halfWidth||BIKE.halfWidth)+36,landAt:a.chargeAt+a.distance/(a.speed||BIKE.speed),source:u,bike:true});}
  }return hazards;
 }
 infantryChargeDamage(fraction){
  const types=['rifle','machinegun','sniper','rocket','mortar','medic'],troops=this.units.filter(u=>u.team===0&&u.hp>0&&types.includes(u.type));
  const samples=troops.length?troops:(this.coop?[0,1]:[0]).flatMap(owner=>types.map(type=>({team:0,type,coopOwner:owner})));
  return samples.reduce((total,u)=>total+(troops.length?u.maxHp:this.stats(u).hp),0)/samples.length*fraction;
 }
 startBikeCharge(u,target,rules=BIKE){
  if(u.hp<=0||!target||!this.canTarget(u,target)||this.targetDistance(u,target)>(rules.range??this.stats(u).range)||u.cooldown>0)return false;
  if(!target.built&&!target.base&&!this.lineClear(u,target,this.collisionRadius(u)))return false;
  const angle=Math.atan2(target.y-u.y,target.x-u.x),origin={x:u.x,y:u.y},r=this.collisionRadius(u);let distance=0;
  // Preview exactly the same straight corridor that the bike can physically travel.
  for(let d=8;d<=rules.distance;d+=8){const p={x:u.x+Math.cos(angle)*d,y:u.y+Math.sin(angle)*d};if(p.x<45||p.x>this.bounds().width-45||p.y<70||p.y>this.bounds().height-70||!this.lineClear(origin,p,r))break;distance=d;}
  if(distance<12){if(!target.built||this.targetDistance(u,target)>r+8)return false;distance=8;}
  u.bikeAttack={phase:'windup',origin,angle,startedAt:this.time,chargeAt:this.time+rules.windup,distance,remaining:distance,traveled:0,hit:[],target,halfWidth:rules.halfWidth,speed:rules.speed};
  if(rules.infantryHpDamage!==undefined)u.bikeAttack.impactDamage=this.infantryChargeDamage(rules.infantryHpDamage);
  u.face=u.moveFace=u.aimFace=angle;u.route=null;u.cooldown=rules.cooldown;return true;
 }
 updateBike(u,dt,rules=BIKE){
  const s=this.stats(u),a=u.bikeAttack;
  if(a){
   if(rules.infantryHpDamage!==undefined&&!Number.isFinite(a.impactDamage))a.impactDamage=this.infantryChargeDamage(rules.infantryHpDamage);
   u.face=u.moveFace=u.aimFace=a.angle;
   if(a.phase==='windup'){if(this.time+1e-8<a.chargeAt)return;a.phase='charge';this.notify('fire',u);}
   let remaining=Math.min(a.remaining,rules.speed*dt*(this.time<(u.luckySlowUntil||0)?1-LUCKY.groundSlow:1));
   const victims=[...this.units,...this.buildings.filter(b=>b.hp>0),this.bases[0]],r=this.collisionRadius(u);
   while(remaining>1e-6&&this.phase==='playing'){
    const step=Math.min(8,remaining),from={x:u.x,y:u.y},next={x:u.x+Math.cos(a.angle)*step,y:u.y+Math.sin(a.angle)*step};
    const blocked=next.x<45||next.x>this.bounds().width-45||next.y<70||next.y>this.bounds().height-70||!this.lineClear(from,next,r);
    if(blocked){next.x=from.x;next.y=from.y;}else{u.x=next.x;u.y=next.y;u.walk+=step*.12;a.traveled+=step;a.remaining-=step;remaining-=step;}
    for(const target of victims){
     if(a.hit.includes(target)||!this.canTarget(u,target))continue;
     const dx=next.x-from.x,dy=next.y-from.y,t=clamp(((target.x-from.x)*dx+(target.y-from.y)*dy)/(step*step),0,1),p={x:from.x+dx*t,y:from.y+dy*t};
     const distance=target.built?Math.hypot(Math.max(0,Math.abs(p.x-target.x)-target.w/2),Math.max(0,Math.abs(p.y-target.y)-target.h/2)):Math.max(0,dist(p,target)-(target.r||TYPES[target.type]?.r||12));
     if(distance>(target.built?Math.max(r+8,rules.halfWidth):rules.halfWidth+1))continue;
     a.hit.push(target);const impact=rules.infantryHpDamage!==undefined?a.impactDamage/this.defenseFactor(target,u):s.damage*(rules.damageScale??1);this.damage(target,impact,u);
     this.effects.push({kind:'bikeImpact',x:p.x,y:p.y,angle:a.angle,t:.3,max:.3,team:u.team});
     if(target.built||target.base){a.remaining=0;remaining=0;break;}
    }
    if(blocked){a.remaining=0;break;}
   }
   if(a.remaining<=1e-6){u.bikeAttack=null;u.bikeRecoverUntil=this.time+rules.recovery;u.route=null;this.effects.push({kind:'bikeBrake',x:u.x,y:u.y,angle:a.angle,t:.45,max:.45,team:u.team});}
   else if(a.phase==='charge'&&this.time>=(u.nextBikeDust||0)){u.nextBikeDust=this.time+.08;this.effects.push({kind:'bikeDust',x:u.x-Math.cos(a.angle)*20,y:u.y-Math.sin(a.angle)*20,angle:a.angle,t:.4,max:.4,team:u.team});}
   return;
  }
  if(this.time<(u.bikeRecoverUntil||0))return;
  const candidates=[...this.alive(0),...this.buildings.filter(b=>b.hp>0),this.bases[0]].filter(t=>this.canTarget(u,t));
  const target=candidates.sort((a,b)=>this.targetDistance(u,a)-this.targetDistance(u,b))[0];
  if(!target)return;
  const goal=this.pursuitPoint(u,target);
  if(u.cooldown<=0){
   if(this.startBikeCharge(u,target,rules))return;
   if(dist(u,goal)>12)this.navigate(u,goal.x,goal.y,dt,s.speed);
  }else if(dist(u,target)<165){
   // Give a visible breather after the charge rather than inflict contact damage.
   const angle=Math.atan2(u.y-target.y,u.x-target.x),p={x:u.x+Math.cos(angle)*100,y:u.y+Math.sin(angle)*100};
   if(this.lineClear(u,p,this.collisionRadius(u)))this.move(u,p.x-u.x,p.y-u.y,dt,s.speed*.55);
  }else if(dist(u,goal)>12){
   // Reposition during recharge too; only the brief braking phase stops movement.
   this.navigate(u,goal.x,goal.y,dt,s.speed);
  }
 }
 updateBayonet(u,target,s){
  const pending=u.bayonetAttack;
  if(pending){
   u.face=u.aimFace=pending.angle;
   if(this.time+1e-8<pending.hitAt)return;
   const victim=pending.target,angle=victim?Math.atan2(victim.y-u.y,victim.x-u.x):pending.angle,delta=Math.abs(Math.atan2(Math.sin(angle-pending.angle),Math.cos(angle-pending.angle))),hit=victim&&this.canTarget(u,victim)&&this.targetDistance(u,victim)<=s.range+4&&delta<=(s.slash?.95:.65);
   u.bayonetAttack=null;u.bayonetThrustUntil=this.time+.16;u.bayonetRecoverUntil=this.time+.36;
   this.effects.push({kind:s.slash?'bladeSlash':'bayonetThrust',x:u.x,y:u.y,angle:pending.angle,range:s.range,hit:!!hit,team:u.team,t:s.slash?.28:.2,max:s.slash?.28:.2});
   if(s.slash)this.notify('fire',u);
   if(hit)this.damage(victim,this.attackRoll(u).damage,u);
   return;
  }
  if(this.time<(u.bayonetRecoverUntil||0))return;
  if(!target)return;
  if(this.targetDistance(u,target)>s.range)return;
  u.face=u.aimFace=Math.atan2(target.y-u.y,target.x-u.x);
  if(u.cooldown>0)return;
  u.cooldown=s.rate;u.bayonetAttack={target,angle:u.face,startedAt:this.time,hitAt:this.time+s.windup};
  this.effects.push({kind:'bayonetWarn',x:u.x,y:u.y,angle:u.face,range:s.range,slash:!!s.slash,team:u.team,t:s.windup,max:s.windup});
 }
 update(dt){
  if(this.phase!=='playing')return;dt=Math.min(dt,.05);if(this.bossIntro?.remaining>0){this.bossIntro.remaining=Math.max(0,this.bossIntro.remaining-dt);return;}this.time+=dt;this.syncEnemyGrowth();this.updateGuardianRespawns();this.updateMageQuest();this.updateLaserQuest();
  if(this.coop)this.coopIncome(dt);else for(let t=0;t<2;t++)this.cash[t]+=this.income(t)*dt;
  if(!this.coop&&this.mode!=='crisis')this.gainXP(dt*(this.mode==='pve'?1.3:3.1));if(this.mode==='duel')this.enemyAct();else if(this.mode==='pve')this.updateMission(dt);if(this.phase!=='playing')return;
  this.updateSwarm();this.updateBosses();if(this.bossIntro?.remaining>0)return;this.updateArtillery();if(this.mode==='pve')this.updateDefenses(dt);this.updateBuildings(dt);this.coopSelectOwner?.(0);if(this.phase!=='playing')return;
  if(this.focusTarget&&(this.focusTarget.hp<=0||!this.visible(this.focusTarget)))this.focusTarget=null;
  if(this.input.x||this.input.y)this.moveOrder=null;
  const player=this.commander(0),enemy=this.commander(1);this.updateFormationFacing(dt);this.updateUltimate();if(this.phase!=='playing')return;
  const pressure=this.pressure().tier;if(pressure>this.lastPressure){this.lastPressure=pressure;this.notify('toast',`위협 Lv.${pressure+1} · 증원 증가 / 강한 적 출현 / 새 적의 체력·공격력 상승`);}
  this.updateEvolutionCombat();
  const combatThreats=this.attackingEnemies(),combatCandidates=this.combatCandidates();
  for(const u of this.units){
   this.coopSelectOwner?.(u.team===0?u.coopOwner:0);
   const player=this.commander(0);
   if(u.hp<=0){if(u.type==='leader'&&u.deadUntil&&this.time>=u.deadUntil)this.reviveCommander(u);continue;}
   if((u.roadCaptain||u.roomGarrison)&&!this.updateRoadCaptain(u,dt))continue;
   if(u.type==='lucky'){if(u.team===0)this.updateLuckyUnit(u);else if(this.isRoomCampaign())this.updateEnemyLucky(u);}
   u.flash=Math.max(0,u.flash-dt);u.recoil=Math.max(0,(u.recoil||0)-dt);const s=this.stats(u);u.cooldown-=dt;
   if(u.type==='blizzardMage'){this.updateBlizzard(u,dt);continue;}
   if(u.type==='butterfly'){this.updateButterfly(u,dt);continue;}
   if(u.type==='artillery')continue;
   if(this.updateBossPattern(u,dt))continue;
   if(u.type==='bikeRaider'){this.updateBike(u,dt,u.bossPattern==='rapidBike'?{...BIKE,...this.bossPatternRules(u)}:BIKE);continue;}
   const channeling=u===player&&this.ultimateStatus().active;if(this.isSwordCommander(u))this.updateSwordAttack(u);if(u.type!=='tank'&&u.type!=='crimsonAce'&&u.type!=='guntruck'&&!channeling)u.aimFace=null;
   let target=null,nearest=Infinity;
   if(u.type==='medic'){
    const patients=[...new Set([...this.units,...this.buildings.filter(b=>b.kind==='repairBot'&&b.buildUntil<=this.time)])].filter(a=>a.team===u.team&&a.hp>0&&a.hp<a.maxHp&&dist(u,a)<s.range).sort((a,b)=>(u.team===0?Number(b.type==='leader')-Number(a.type==='leader'):0)||dist(u,a)-dist(u,b)).slice(0,this.evolutionEnabled(u)?3:1);
    target=patients[0]||null;if(target)nearest=dist(u,target);
    if(target&&u.cooldown<=1e-8){for(const patient of patients){this.heal(patient,s.heal,u);this.effects.push({kind:'heal',x:patient.x,y:patient.y,t:.5,max:.5,team:u.team});}u.healStartedAt=this.time;u.healUntil=this.time+.7;u.healAngle=Math.atan2(target.y-u.y,target.x-u.x);u.cooldown=s.rate;}
   }else{
    if(u.team===0)target=this.selectCombatTarget(u,combatCandidates,combatThreats,s);else for(const a of [...this.units,...this.buildings.filter(b=>b.hp>0)]){if(!this.canTarget(u,a))continue;const d=this.targetDistance(u,a),score=d/Math.max(.25,multiplier(u.type,a.type));if(d<s.range&&d>=(s.minRange||0)&&score<nearest){target=a;nearest=score;}}
    // Finish the turret's aim before reconsidering almost equidistant moving targets.
    if(u.team!==0&&u.type==='tank'){
     const locked=[...this.units,...this.buildings].find(a=>a.id===u.tankAimTargetId);
     if(locked&&this.canTarget(u,locked)&&this.targetDistance(u,locked)<s.range&&this.targetDistance(u,locked)>=(s.minRange||0))target=locked;
     u.tankAimTargetId=target?.id??null;
    }
    if(u.team!==0&&u.type==='mortar'&&u.roomWave)target=this.selectEnemyMortarTarget(u,s)||target;
    if(target&&u.team!==0&&u.type!=='mortar'){const screen=this.screeningUnit(u,target);if(screen&&dist(u,screen)<s.range)target=screen;}
    const b=(u.team===1||u.team!==0&&(this.isDesktopDefense()||TYPES[u.type]?.stab))?this.bases[0]:null;if(!target&&b&&this.canTarget(u,b)&&(TYPES[u.type]?.stab||this.isDesktopDefense()&&MELEE.has(u.type)?this.targetDistance(u,b)<s.range:dist(u,b)>=(s.minRange||0)&&dist(u,b)<s.range+45))target=b;
    if(u.team===0&&this.focusTarget&&!this.focusAutomatic&&dist(u,this.focusTarget)>=(s.minRange||0)&&dist(u,this.focusTarget)<s.range+(this.focusTarget.base||this.focusTarget.structure?35:0))target=this.focusTarget;
    if(u.type==='sniper'){const windup=Math.min(ROOM_RULES.sniperAim,s.rate*.7);if(!target)u.sniperAim=null;else if(u.cooldown<=windup&&(!u.sniperAim||u.sniperAim.target!==target)){u.sniperAim={target,started:this.time,fireAt:this.time+windup};u.cooldown=Math.max(u.cooldown,windup);}}
    if(TYPES[u.type]?.stab){if(u.bossPattern!=='wideSlash')this.updateBayonet(u,target,s);}
    else if(target&&!channeling){u.face=Math.atan2(target.y-u.y,target.x-u.x);u.aimFace=u.face;let aligned=true;if(u.type==='tank'||u.type==='crimsonAce'||u.type==='guntruck'){const delta=Math.atan2(Math.sin(u.aimFace-(u.turretFace??u.aimFace)),Math.cos(u.aimFace-(u.turretFace??u.aimFace)));u.turretFace=(u.turretFace??u.aimFace)+clamp(delta,-ROOM_RULES.turretSpeed*dt,ROOM_RULES.turretSpeed*dt);aligned=Math.abs(delta)<.13;}if(u.cooldown<=0&&aligned&&(u.type!=='sniper'||u.sniperAim&&this.time>=u.sniperAim.fireAt)){if(u.type==='sniper')u.sniperAim=null;const attack=this.attackRoll(u);u.cooldown=this.isFlameCommander(u)?Math.max(u.cooldown,-dt)+s.rate:s.rate;if(this.isSwordCommander(u)){this.beginSwordAttack(u,target,attack);}else if(this.isFlameCommander(u)){this.flamePulse(u,u.face);}else if(u.type==='mortar'){this.launchMortar(u,target,attack);u.recoil=.25;}else if(MELEE.has(u.type)){if(this.isFlying(u)){u.flightStrikeUntil=this.time+.22;u.recoil=.18;this.effects.push({kind:'sting',x:u.x,y:u.y,tx:target.x,ty:target.y,flightHeight:s.flightHeight,t:.2,max:.2,team:u.team});}this.damage(target,attack.damage,u);}else{this.fireUnitProjectiles(u,target,attack,s);u.recoil=(u.type==='tank'||u.type==='crimsonAce')?.24:u.type==='rocket'?.2:.16;this.notify('fire',u);this.effects.push({kind:'muzzle',x:u.x,y:u.y,origin:true,t:.12,max:.12,team:u.team,weapon:u.appearance==='shino'?'shino':u.type,boss:!!u.boss,...(u.type==='sniper'&&['kayla','hayeon'].includes(u.appearance)?{appearance:u.appearance}:{}),angle:u.face});if(u.type==='sniper')this.effects.push({kind:'tracer',x:u.x,y:u.y,tx:target.x,ty:target.y,t:.12,max:.12,team:u.team});}}}
   }
   if(TYPES[u.type]?.stab&&(u.bayonetAttack||this.time<(u.bayonetRecoverUntil||0)))continue;
   if(u.team===0&&u.aiEvade&&u.aiEvade.until>this.time){const goal=u.aiEvade;if(dist(u,goal)>3)this.move(u,goal.x-u.x,goal.y-u.y,dt,s.speed);}
   else if(u.team===0&&this.moveOrder){const goal=this.squadMovePoint(u,this.formationPoint(u,this.squadMoveAnchor(u)));if(dist(u,goal)>8)this.navigate(u,goal.x,goal.y,dt,u.type==='leader'?this.commanderMoveSpeed(goal.x-u.x,goal.y-u.y):this.squadFollowSpeed(u,u.regroup?.goal||goal,s.speed));}
   else if(u.type==='leader'&&u.team===0){if(this.input.x||this.input.y)this.move(u,this.input.x*1000,this.input.y*1000,dt,this.commanderMoveSpeed(this.input.x,this.input.y));}
   else if(u.type==='leader'){
    let dest=this.time<this.enemyAdvanceAt?{x:800,y:450}:{x:800+Math.sin(this.time*.022)*330,y:2280};const seen=this.alive(0).filter(a=>this.canTarget(u,a)&&dist(u,a)<450);if(seen.length){dest=seen[0];if(u.hp<u.maxHp*.3)dest={x:800,y:360};}
    if((!target||dist(u,dest)>s.range*.82)&&dist(u,dest)>15)this.navigate(u,dest.x,dest.y,dt,s.speed*.58);
   }else if(u.team!==0&&this.followRoomEscort(u,dt,s)){}
   else if(u.patrol){const chase=this.pursuitTarget(u),c=this.pursuitPoint(u,chase);if(!target&&dist(u,c)>(chase.built?1:8))this.navigate(u,c.x,c.y,dt,s.speed);}
   else{
    const c=u.team?enemy:player,facing=u.team?Math.atan2(player.y-c.y,player.x-c.x):this.formationFacing,goal=this.squadMovePoint(u,this.formationPoint(u,c,facing));
    if(dist(u,goal)>12)this.navigate(u,goal.x,goal.y,dt,this.squadFollowSpeed(u,u.regroup?.goal||goal,s.speed*(dist(u,c)>280?1.3:1)));
   }
  }
  this.coopSelectOwner?.(0);
  if(player.ultimatePose?.active)player.face=player.aimFace=player.ultimatePose.angle;
  const live=this.units.filter(u=>u.hp>0);
  this.updateLuckyObjects(dt);
  this.separateCrowd(live);
  live.forEach(u=>this.resolvePosition(u));
  if(this.coop)this.coopCollectPickups();
  for(const p of this.pickups){if(!this.coop&&p.active&&player.hp>0&&dist(p,player)<60){this.collectFieldSupply(p);}}
  for(const p of this.shots){p.life-=dt;if(p.target.hp<=0){p.life=0;continue;}if(p.kind==='bossKiller'&&p.guidedFlight&&this.updateBossKillerFlight){this.updateBossKillerFlight(p,dt);continue;}const d=dist(p,p.target),step=p.speed*dt;if(d<step+10){this.impact(p);p.life=0;}else{p.x+=(p.target.x-p.x)/d*step;p.y+=(p.target.y-p.y)/d*step;}}
  this.updateMortars();this.updateButterflyGusts();this.updateMedicCleanses();this.updatePoisons();
  this.units=this.units.filter(u=>u.type==='leader'||u.guardianRespawn||u.hp>0||u.diedAt===undefined||this.time-u.diedAt<(u.type==='medic'&&u.team===0&&u.appearance==='rina'?1.2:.8));
  this.shots=this.shots.filter(p=>p.life>0);this.effects.forEach(e=>e.t-=dt);this.effects=this.effects.filter(e=>e.t>0);
  if(this.mode==='duel'&&this.time>=180&&this.phase==='playing'){const d=this.bases[0].hp-this.bases[1].hp;this.finish(d>0?'win':d<0?'lose':'draw','time');return;}
  this.levelCheck();
 }
 finish(result,reason){if(this.phase==='ended')return;this.phase='ended';this.result=result;if(result==='win')this.awardGold(80);this.notify('end',{result,reason});}
}
Object.assign(FrontGame.prototype,ROOM_CAMPAIGN.methods);
if(typeof module!=='undefined'&&module.exports){require('./evolution-combat.js')({FrontGame,TYPES,LUCKY,multiplier,EVOLUTIONS});require('./field-supplies.js')({FrontGame,TYPES});require('./evolution-links.js')({FrontGame});}
root.FrontRoomCampaign=ROOM_CAMPAIGN;root.FrontButterfly=BUTTERFLY;root.FrontMedicCleanse=MEDIC_CLEANSE;root.FrontMedicHealing=MEDIC_HEALING;root.FrontGuardians=GUARDIANS;root.FrontBike=BIKE;root.FrontLucky=LUCKY;root.FrontDesktopItems={art:DESKTOP_ITEM_ART,sprite:desktopItemSprite,bodies:desktopItemBodies,floor:desktopItemFloor};root.FrontUnitTypeCap=UNIT_TYPE_CAP;root.FrontFlame=FLAME;root.FrontSword=SWORD;root.FrontWaveConfigs=WAVE_CONFIGS;root.FrontDesktopNotebook={art:DESKTOP_NOTEBOOK_ART,rect:desktopNotebookRect,bodies:desktopNotebookBodies};root.FrontDesktopProps={art:DESKTOP_PROP_ART,sprite:desktopPropSprite,bodies:desktopPropBodies};root.FrontDesktopCover={art:DESKTOP_COVER_ART,style:desktopCoverStyle,rect:desktopCoverRect};root.FrontRemoteShape=ROOM_REMOTE_SHAPE;root.FrontDesktopRules=DESKTOP_RULES;root.FrontFlyingWaves=FLYING_WAVES;root.FrontUltimate=ULTIMATE;root.FrontBuildings=BUILDINGS;root.FrontRoomRules=ROOM_RULES;root.FrontAbilities=ABILITIES;root.FrontEvolutions=EVOLUTIONS;root.FrontFieldCards=FIELD_CARDS;root.FrontProfile=FrontProfile;root.FrontPermanent=PERMANENT;root.FrontGame=FrontGame;root.FrontTypes=TYPES;root.FrontMultiplier=multiplier;root.FrontRoster=ROSTER;if(typeof module!=='undefined')module.exports={SWORD,BUTTERFLY,MEDIC_CLEANSE,MEDIC_HEALING,GUARDIANS,BIKE,LUCKY,DESKTOP_ITEM_ART,desktopItemSprite,desktopItemBodies,desktopItemFloor,UNIT_TYPE_CAP,FLAME,DESKTOP_NOTEBOOK_ART,desktopNotebookRect,desktopNotebookBodies,DESKTOP_PROP_ART,desktopPropSprite,desktopPropBodies,WAVE_CONFIGS,DESKTOP_COVER_ART,desktopCoverStyle,desktopCoverRect,ROOM_REMOTE_SHAPE,DESKTOP_RULES,FLYING_WAVES,ULTIMATE,BUILDINGS,ROOM_RULES,FrontGame,FrontProfile,PERMANENT,ABILITIES,EVOLUTIONS,FIELD_CARDS,TYPES,multiplier,ROSTER};
})(typeof window==='undefined'?globalThis:window);
