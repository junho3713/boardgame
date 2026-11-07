'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
test('run levels 10/20/30 add commander HP and armor without altering ordinary troops or attack power',()=>{
 for(const appearance of ['sarge','shino','blaze','shion']){
  const g=new FrontGame();g.setCommander(appearance);g.start();const c=g.commander(0),base=g.stats(c),rifle=g.stats({type:'rifle',team:0});
  for(const level of [9,10,19,20,30]){g.level=level;const s=g.stats(c),steps=Math.floor(level/10);near(s.hp,base.hp*(1+.2*steps));near(s.defense,base.defense+6*steps);near(s.damage,base.damage);a.deepEqual(g.stats({type:'rifle',team:0}),rifle);}
 }
});
test('crossing the milestone updates real HP immediately and preserves existing missing health',()=>{
 const g=new FrontGame();g.start();const c=g.commander(0),before=c.maxHp;c.hp-=73;g.level=9;g.xp=g.neededXP();g.levelCheck();a.equal(g.level,10);near(c.maxHp,before*1.2);near(c.maxHp-c.hp,73);
});
test('loading an old high-level save applies growth exactly once and never revives a fallen commander',()=>{
 for(const dead of [false,true]){const g=new FrontGame();g.start();g.level=20;const c=g.commander(0),oldMax=c.maxHp;c.hp=dead?0:oldMax-57;let restored=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g)))),r=restored.commander(0);near(r.maxHp,oldMax*1.4);near(r.hp,dead?0:r.maxHp-57);const hp=r.hp;restored=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(restored))));near(restored.commander(0).hp,hp);}
});
test('cooperative level growth and save migration remain independent for both owners',()=>{
 const g=new CoopGame();g.start();for(const owner of [0,1])g.withOwner(owner,()=>{g.level=owner?20:9;});
 const restored=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));
 for(const owner of [0,1])restored.withOwner(owner,()=>{const c=restored.commander(0),s=restored.stats(c);near(c.maxHp,s.hp);near(s.hp,400*(owner?1.4:1));near(s.defense,owner?12:0);});
});
