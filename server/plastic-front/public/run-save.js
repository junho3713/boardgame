/* Personal manual-mode checkpoint. The browser's own storage is the only destination. */
(function(root){'use strict';
const api=typeof module!=='undefined'&&module.exports?require('./autoplay.js'):root.FrontGameState,engine=typeof module!=='undefined'&&module.exports?require('./engine.js'):root;
class FrontRunSave{
 constructor(storage,{key='plastic-front-run-v1',now=()=>Date.now(),id}={}){this.storage=storage;this.key=key;this.leaseKey=key+'-owner';this.now=now;this.id=id||this.now().toString(36)+'-'+Math.random().toString(36).slice(2);this.error='';}
 read(){try{const raw=this.storage.getItem(this.key);if(!raw)return null;if(raw.length>12000000)throw Error('저장 파일이 너무 큽니다.');const v=JSON.parse(raw);if(v?.version!==1||!['pve','duel','crisis'].includes(v.mode)||!Number.isFinite(v.savedAt)||!Array.isArray(v.engine?.nodes)||!['playing','paused','choice','resupply'].includes(v.engine?.fields?.phase))throw Error('저장된 작전을 읽을 수 없습니다.');return v;}catch(e){this.error='저장된 작전을 읽지 못했습니다. 기존 데이터는 유지합니다.';return null;}}
 claim(){try{const lease=JSON.parse(this.storage.getItem(this.leaseKey)||'null');if(lease&&lease.id!==this.id&&lease.until>this.now()){this.error='다른 창에서 일반 작전을 진행 중입니다. 그 창에서 저장하고 나와주세요.';return false;}this.storage.setItem(this.leaseKey,JSON.stringify({id:this.id,until:this.now()+10000}));return true;}catch{this.error='브라우저 저장 공간에 접근할 수 없습니다.';return false;}}
 release(){try{const lease=JSON.parse(this.storage.getItem(this.leaseKey)||'null');if(lease?.id===this.id)this.storage.removeItem(this.leaseKey);}catch{}}
 begin(game){if(!this.claim())return false;game.localRunId=this.id+'-'+this.now();return true;}
 save(game,mode=game.mode){if(!['pve','duel','crisis'].includes(mode)||!['playing','paused','choice','resupply'].includes(game.phase))return false;if(!this.claim())return false;try{const snapshot=api.pack(game);delete snapshot.profile;const v={version:1,runId:game.localRunId||this.id,mode,savedAt:this.now(),engine:snapshot};this.storage.setItem(this.key,JSON.stringify(v));this.error='';return true;}catch{this.error='저장 실패 · 기존 저장은 유지됩니다. 저장 공간을 확인하세요.';return false;}}
 load(events,profile){const v=this.read();if(!v||!this.claim())return null;try{const Game=engine.FrontGame,Profile=engine.FrontProfile,live=profile||new Profile(),g=new Game({},live);api.unpack(g,{...v.engine,profile:live.snapshot()});g.profile=live;g.events=events||{};g.input={x:0,y:0};g.aiHQTarget=null;for(const u of g.alive(0))u.aiEvade=null;g.localRunId=v.runId;if(g.phase!=='choice')g.phase='paused';this.error='';return{game:g,mode:v.mode,savedAt:v.savedAt};}catch{this.release();this.error='작전을 복구하지 못했습니다. 기존 저장은 유지합니다.';return null;}}
 clear(game){try{const v=this.read();if(!v||v.runId===game.localRunId){this.storage.removeItem(this.key);this.release();}}catch{}}
}
root.FrontRunSave=FrontRunSave;if(typeof module!=='undefined'&&module.exports)module.exports={FrontRunSave};
})(typeof window==='undefined'?globalThis:window);
