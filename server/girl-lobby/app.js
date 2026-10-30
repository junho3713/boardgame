'use strict';
const $=id=>document.getElementById(id);let token=sessionStorage.getItem('girl-test-token')||'',state=null,selected=null,pollTimer,botTimer,busy=false;
const TYPES={};const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const atlas={president:[212,63,106,132],class:[326,63,105,132],genius:[439,63,104,132],discipline:[550,63,106,132],health:[203,206,106,142],library:[322,206,105,142],lady:[438,206,105,142],newspaper:[550,206,108,142]};
function art(c){const official={alien:[480,56,390,550],infected:[480,662,390,550],homecoming:[470,2356,390,550]},special={criminal:[257,165,198,250],accomplice:[458,168,198,249]},ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),img=document.createElementNS(ns,'image');svg.setAttribute('viewBox',(atlas[c.id]||official[c.id]||special[c.id]).join(' '));svg.setAttribute('class','card-art');svg.setAttribute('aria-hidden','true');img.setAttribute('href','/assets/'+(atlas[c.id]?'ordinary.png':official[c.id]?'official-roles.jpg':'criminals.png'));img.setAttribute('width',official[c.id]?'1000':'1265');img.setAttribute('height',official[c.id]?'3800':'712');svg.append(img);return svg;}
function button(text,fn,primary=false){const b=el('button',text,primary?'primary':'');b.type='button';b.onclick=fn;return b;}
async function api(route,body){const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await r.json();}catch{throw Error('서버가 아직 시작 중일 수 있어요. 잠시 후 다시 시도해 주세요.');}if(!r.ok)throw Error(data.error||'연결하지 못했어요. 다시 시도해 주세요.');return data;}
function focusPanel(){const p=$('actionPanel');p.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});p.focus({preventScroll:true});}
async function send(route,body={}){if(busy)return;busy=true;clearTimeout(botTimer);$('status').textContent='';try{render(await api(route,{...body,version:state.version}));}catch(e){$('status').textContent=e.message;try{render(await api('state'),true);}catch{}$('status').scrollIntoView({block:'center'});}finally{busy=false;scheduleBot();}}
async function enter(route){if(busy)return;busy=true;$('status').textContent='게임을 준비하고 있어요…';try{const d=await api(route,{name:$('name').value.trim()||'나',bots:Number($('bots').value),code:$('code').value});token=d.token;sessionStorage.setItem('girl-test-token',token);state=null;selected=null;render(d.state);$('status').textContent='';poll();}catch(e){$('status').textContent=e.message;}finally{busy=false;scheduleBot();}}
function render(s,force=false){RoomTools.update(s);
 if(!force&&state&&state.code===s.code&&state.phase===s.phase&&state.version===s.version&&s.phase!=='lobby')return;
 const previous=state;state=s;$('entry').hidden=true;$('game').hidden=s.phase==='lobby';$('lobby').hidden=s.phase!=='lobby';
 if(s.phase==='lobby'){renderLobby(s);return;}
 const mine=s.players.find(p=>p.id===s.me),current=s.players.find(p=>p.id===s.current);$('name').value=mine.name;$('bots').value=String(Math.max(2,s.players.filter(p=>p.bot).length));
 $('turnTitle').textContent=s.phase==='finished'?'게임이 끝났어요.':s.myTurn?'내 차례예요. 손에서 카드 1장을 골라 주세요.':s.pending&&!s.pending.waiting?'내가 선택할 특기 효과가 있어요.':mine.locked?'마지막 정체가 보호됐어요. 다른 사람의 진행을 지켜보세요.':current.name+'님의 차례예요.';
 $('turnHelp').textContent=s.phase==='finished'?'아래에서 조합·감금·우선순위 판정을 확인해 보세요.':s.pending?'특기의 선택이 끝나면 게임이 이어져요.':'차례 끝에 1장이 남으면 그 카드가 내 정체가 돼요.';
 $('roomCode').textContent=s.code;$('turnNumber').textContent='차례 '+s.turn;$('poolSummary').textContent=`뒷면 ${s.poolCount}장 · 성공 목표 ${s.target} MP`;
 $('poolCards').replaceChildren(...Array.from({length:s.poolCount},()=>el('span',undefined,'back-card')));
 $('players').replaceChildren(...s.players.map(p=>{const a=el('article',undefined,'player'+(p.id===s.current&&s.phase==='playing'?' current':''));a.append(el('h3',p.name+(p.id===s.me?' (나)':'')+(p.bot?' · 컴퓨터':'')),el('p',`손패 ${p.cards}장 · 받은 의혹 ${p.suspicionCount}장`),el('p',p.locked?'마지막 정체 보호 중':'아직 차례에 참여해요','small'),el('p','사용한 특기: '+(p.used.map(c=>c.name).join(' · ')||'없음'),'used'));return a;}));
 if(!s.hand.some(c=>c.uid===selected))selected=null;
 $('hand').replaceChildren(...s.hand.map(c=>{const b=button('',()=>{selected=c.uid;renderPanel();$('hand').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.uid===selected)));focusPanel();});b.className='hand-card';b.dataset.uid=c.uid;b.setAttribute('aria-pressed',String(c.uid===selected));b.setAttribute('aria-label',`${c.name}, MP ${c.mp}, 카드 선택`);b.append(art(c),el('strong',c.name),el('span',`MP ${c.mp} · 우선순위 ${c.priority}`));return b;}));
 $('handHelp').textContent=mine.locked?'마지막 1장은 낼 수 없어요. 카드를 눌러 승리 조건을 읽어 보세요.':'카드를 누르면 능력과 사용할 수 있는 행동을 보여줘요.';
 renderPanel();$('publicLog').replaceChildren(...s.log.slice(-12).reverse().map(t=>el('li',t)));$('intel').replaceChildren(...s.intel.slice(0,8).map(x=>el('p',`차례 ${x.turn} · ${x.message}`,'private-note')));if(!s.intel.length)$('intel').append(el('p','아직 비공개로 확인한 정보가 없어요.','small'));
 renderResult();$('botStep').hidden=!(s.phase==='playing'&&!s.pending&&current.bot);scheduleBot();
 if(s.pending&&!s.pending.waiting&&JSON.stringify(s.pending)!==JSON.stringify(previous?.pending))focusPanel();
 else if(s.phase==='finished'&&previous?.phase!=='finished')$('result').scrollIntoView({block:'start'});
 else if(s.myTurn&&!previous?.myTurn)$('handHelp').scrollIntoView({block:'start'});
}
function renderLobby(s){$('lobbyCode').textContent=s.code;$('lobbyPlayers').replaceChildren(...s.players.map(p=>el('li',p.name+(p.id===s.me?' (나)':'')+(p.id===s.host?' · 방장':''))));$('deal').hidden=s.me!==s.host;$('deal').disabled=s.players.length<3;}
function renderPanel(){
 const s=state,p=$('actionPanel');p.replaceChildren();if(!s)return;
 if(s.phase==='finished'){p.append(el('h3','정체가 모두 공개됐어요.'),el('p','승패 판정에서 높은 우선순위가 먼저 충족됐는지 확인해 보세요.'));return;}
 if(s.pending){const q=s.pending;p.append(el('h3',q.title),el('p',q.help,'help'));if(q.waiting)return;
  const form=el('form',undefined,'choice-form'),selects={};for(const f of q.fields||[]){const id='choice-'+f.key,label=el('label',f.label);label.htmlFor=id;const select=el('select');select.id=id;select.name=f.key;for(const o of f.options){const option=el('option',o.label);option.value=o.value;select.append(option);}selects[f.key]=select;form.append(label,select);}
  if(selects.suspicion){const update=()=>{const owner=q.fields.find(f=>f.key==='suspicion').options.find(o=>o.value===selects.suspicion.value).owner;for(const o of selects.target.options)o.disabled=o.value===owner;if(selects.target.value===owner)selects.target.value=Array.from(selects.target.options).find(o=>!o.disabled).value;};selects.suspicion.onchange=update;update();}
  const go=button(q.submit||'이 선택으로 진행',()=>{} ,true);go.type='submit';form.append(go);form.onsubmit=e=>{e.preventDefault();const a={};for(const [k,v]of Object.entries(selects))a[k]=v.value;send('answer',a);};p.append(form);return;
 }
 const nextBot=()=>{if(!s.myTurn&&s.players.find(x=>x.id===s.current).bot)p.append(button('다음 컴퓨터 차례 보기',()=>send('bot-step')));};
 const c=s.hand.find(c=>c.uid===selected);if(!c){p.append(el('h3',s.myTurn?'손패에서 카드를 골라 주세요.':'카드 설명을 미리 읽어볼 수 있어요.'),el('p','왼쪽 또는 위쪽의 카드를 누르면 능력·승리 조건과 행동 버튼이 나와요.'));nextBot();return;}
 const top=el('div',undefined,'chosen'),name=el('div');name.append(el('h3',c.name),el('p',`MP ${c.mp} · 우선순위 ${c.priority}`,'small'));top.append(art(c),name);p.append(top,el('h4','특기 능력'),el('p',c.ability),el('h4','마지막 정체로 남기면'),el('p',c.win,'help'));
 const more=el('details'),summary=el('summary','사용 예시와 예외 보기');more.append(summary,el('p',c.example),el('p',c.note));p.append(more);
 if(!s.myTurn){p.append(el('p','내 일반 행동 차례가 되면 아래 행동을 고를 수 있어요.','small'));nextBot();return;}
 const disabled=c.id==='criminal';if(disabled)p.append(el('p','범인은 일반 행동으로 낼 수 없어요. 다른 카드를 골라 주세요.','help'));
 const skill=button('특기로 사용하기',()=>send('action',{card:c.uid,mode:'skill'}),true);skill.disabled=disabled;p.append(skill,el('p','앞면으로 내 앞에 놓고 능력을 처리해요.','small'));
 const embalm=button(`조합에 넣기 · MP ${c.mp}`,()=>send('action',{card:c.uid,mode:'embalm'}));embalm.disabled=disabled;p.append(embalm,el('p','뒷면으로 공용 조합에 넣어요. 합계는 마지막에 공개해요.','small'));
 const label=el('label','의혹을 보낼 상대');label.htmlFor='accuseTarget';const target=el('select');target.id='accuseTarget';for(const x of s.players.filter(p=>p.id!==s.me)){const o=el('option',x.name+(x.locked?' · 마지막 정체 보호 중':''));o.value=x.id;target.append(o);}p.append(label,target);const accuse=button('선택한 상대에게 의혹 보내기',()=>send('action',{card:c.uid,mode:'accuse',target:target.value}));accuse.disabled=disabled;p.append(accuse,el('p','뒷면으로 상대 앞에 놓아요. 의혹 합계가 높으면 감금될 수 있어요. 마지막 1장이 보호된 사람에게도 보낼 수 있어요.','small'));
}
function renderResult(){const box=$('result');box.hidden=state.phase!=='finished';if(box.hidden)return;box.replaceChildren();const r=state.result,names=r.players.filter(p=>r.winners.includes(p.id)).map(p=>p.name);box.append(el('h2',names.length?names.join(', ')+' 승리':'이번 게임에는 승자가 없어요.'),el('p',`조합 ${r.total} MP / 목표 ${r.target} MP → ${r.success?'성공':'실패'}`),el('p',r.reason),el('p',r.imprisoned.length?'감금: '+r.players.filter(p=>r.imprisoned.includes(p.id)).map(p=>p.name).join(', '):'전원의 의혹 합계가 같아 아무도 감금되지 않았어요.'),el('p','처음 승자가 나온 우선순위에서 판정을 멈춰요. 뒤 순위는 조건을 만족해도 승리하지 않아요. 감금 자체가 자동 패배는 아니에요.','help'));const ul=el('ul');for(const p of r.players)ul.append(el('li',`${p.name}: ${p.identity.name} · 우선순위 ${p.identity.priority} · 의혹 ${p.suspicion} MP${r.imprisoned.includes(p.id)?' · 감금':''}${r.winners.includes(p.id)?' · 승리':''}`,r.winners.includes(p.id)?'winner':''));box.append(ul);const details=el('details');details.append(el('summary','공개된 조합·의혹 카드 확인'),el('p','조합: '+(r.pool.map(c=>c.name+'('+c.mp+')').join(' · ')||'없음')));for(const p of r.players)details.append(el('p',p.name+'님의 의혹: '+(p.cards.map(c=>c.name+'('+c.mp+')').join(' · ')||'없음')));box.append(details,button('컴퓨터와 새 게임',()=>enter('solo'),true));}
function scheduleBot(){clearTimeout(botTimer);if(busy||!state||state.phase!=='playing'||state.pending||!$('autoCpu').checked)return;const p=state.players.find(p=>p.id===state.current);if(p.bot)botTimer=setTimeout(()=>send('bot-step'),1100);}
function poll(){clearTimeout(pollTimer);pollTimer=setTimeout(async()=>{if(token&&!busy){try{render(await api('state'));}catch(e){$('status').textContent=e.message;}}poll();},4000);}
$('solo').onclick=()=>enter('solo');$('create').onclick=()=>enter('rooms');$('join').onclick=()=>enter('join');$('deal').onclick=()=>send('deal');$('botStep').onclick=()=>send('bot-step');$('autoCpu').onchange=scheduleBot;
for(const b of document.querySelectorAll('[data-leave]'))b.onclick=()=>{sessionStorage.removeItem('girl-test-token');location.reload();};
fetch('/cards.json').then(r=>r.json()).then(cs=>cs.forEach(c=>TYPES[c.id]=c)).catch(()=>{});
if(token)api('state').then(s=>{render(s);poll();}).catch(()=>{token='';sessionStorage.removeItem('girl-test-token');$('status').textContent='이전 시험 방이 만료됐어요. 새 게임을 시작해 주세요.';});

RoomTools.init({transport:body=>api('chat',body),invitePath:'/?room=',fallbackTargets:['#lobby h2','#game .controls']});
$('code').value=new URLSearchParams(location.search).get('room')||$('code').value;
