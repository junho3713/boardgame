// Deterministic open-field battle comparison using the real attacks, AI and reinforcement economy.
const path=require('node:path'),base=path.join(__dirname,'../public');
const {FrontGame,TYPES}=require(path.join(base,'engine.js'));require(path.join(base,'two-star.js'));
const wave=require(path.join(base,'wave-test.js')),{FrontAutoPilot,PRESETS}=require(path.join(base,'autoplay.js')),{config}=require(path.join(base,'room-campaign.js'));
const cases=[{name:'mini-35',spawn:.35,hp:.30,weight:.65,cap:8,mini:true},{name:'mini-50',spawn:.5,hp:.30,weight:.65,cap:8,mini:true}];
const seed=Number(process.argv[2]||177),starts=(process.argv[3]||'660,780').split(',').map(Number);
for(const start of starts)for(const choice of cases){
 Object.assign(config.evolutionPacing,{spawnIncrease:choice.spawn,eliteHp:choice.hp,eliteWeight:choice.weight,capExtra:choice.cap});
 const g=wave.fork(new FrontGame({},undefined,{map:'livingroom-star'}));wave.seek(g,start);const loadout=wave.recommended(g,start);
 if(start>=600){for(const t of ['rifle','machinegun','medic'])loadout.tech[t]=5;loadout.abilities={...Object.fromEntries(Object.keys(loadout.abilities).map(k=>[k,0])),damage:5,health:5,defense:5,gold:5,speed:5};loadout.counts={rifle:9,machinegun:9,medic:6,rocket:6,tank:3,mortar:3,sniper:3,lucky:3,guntruck:0};}
 wave.applyLoadout(g,loadout);g.phase='playing';g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.units=g.units.filter(u=>u.team===0);g.updateMission=()=>{};g.updateArtillery=()=>{};
 const c=g.commander(0),dx=1500-c.x,dy=6200-c.y;for(const u of g.units){u.x+=dx;u.y+=dy;u.route=null;}g.camera={x:c.x,y:c.y};
 g.northernSpawn=()=>({x:Math.max(100,Math.min(2900,c.x+(g.random()-.5)*650)),y:Math.max(100,c.y-780)});
 if(!choice.mini)g.updateRoomMiniBosses=()=>{};
 const pilot=new FrontAutoPilot(g,PRESETS.roomBalanced,seed);pilot.active=true;pilot.permanent=pilot.construct=()=>{};
 let spawned=0,miniSpawned=0,bought=0,spent=0,replacementValue=0;const spawn=g.spawnRoomEnemy,add=g.addUnit,buy=g.buy,damage=g.damage;
 g.spawnRoomEnemy=function(...args){const u=spawn.apply(this,args);if(u)spawned++;return u;};
 g.addUnit=function(...args){const u=add.apply(this,args);if(args[0]===2&&args[4]===true&&config.bosses.some(b=>b.type===args[1]))miniSpawned++;return u;};
 g.buy=function(type,...args){const cash=this.cash[0],ok=buy.call(this,type,...args);if(ok){bought++;spent+=cash-this.cash[0];}return ok;};
 g.damage=function(t,...args){const hp=t.hp,star=t.star||1;damage.call(this,t,...args);if(hp>0&&t.hp<=0&&t.team===0&&t.type!=='leader')replacementValue+=TYPES[t.type].cost*(star===2?2:1);};
 const linksBefore=g.evolutionLinks().filter(l=>l.active).map(l=>l.name),aliveBefore=g.alive(0).length,seconds=pilot.advance(60,{silent:true});
 console.log(JSON.stringify({seed,start,case:choice.name,linksBefore,seconds,spawned,losses:g.losses[0],replacementValue,bought,spent,cash:Math.round(g.cash[0]),aliveBefore,aliveAfter:g.alive(0).length,commanderRetreats:g.retreated,phase:g.phase,minis:g.units.filter(u=>u.miniBoss).map(u=>({type:u.type,hp:Math.round(u.hp),max:Math.round(u.maxHp),withdrawn:!!u.miniBossWithdrawn})),activeLinks:g.evolutionLinks().filter(l=>l.active).map(l=>l.name)}));
}
