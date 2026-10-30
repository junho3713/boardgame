'use strict';
window.RoomTools=(()=>{
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 let config,room=null,sequence=-1,generation=0,timer,opened=false,unread=0,sending=false,observer,panel,toggle,list,input,error,empty,sendButton,status;
 function button(text,action,cls){const b=make('button',text,cls);b.type='button';b.onclick=action;return b;}
 function notify(text){status.textContent=text;status.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>status.hidden=true,3500);}
 async function copy(kind){
  if(!room)return;const text=kind==='code'?room.code:location.origin+config.invitePath+encodeURIComponent(room.code);
  try{await navigator.clipboard.writeText(text);notify(kind==='code'?'방 코드 '+room.code+'를 복사했어요.':'초대 링크를 복사했어요.');}
  catch{
   const box=make('dialog',undefined,'rt-clipboard'),heading=make('h2',kind==='code'?'방 코드 복사':'초대 링크 복사'),field=make('input');
   field.value=text;field.readOnly=true;field.setAttribute('aria-label',heading.textContent);const close=()=>{box.close();box.remove();};
   box.append(heading,make('p','아래 내용을 선택해서 복사해 주세요.'),field,button('닫기',close));box.addEventListener('cancel',()=>box.remove());document.body.append(box);box.showModal();field.focus();field.select();
  }
 }
 function actions(){const row=make('div',undefined,'rt-copy-actions');row.append(button('초대 링크 복사',()=>copy('link')),button('방 코드 복사',()=>copy('code'),'rt-copy-code'));return row;}
 function installCopies(){
  if(!room)return;
  document.querySelectorAll(config.copyTargets||'#shareLobby,#share,#invite').forEach(anchor=>{
   if(anchor.dataset.rtCopy)return;anchor.dataset.rtCopy='1';anchor.textContent='초대 링크 복사';
   anchor.after(button('방 코드 복사',()=>copy('code'),'rt-copy-code'));
  });
  for(const selector of config.fallbackTargets||[])document.querySelectorAll(selector).forEach(anchor=>{
   if(anchor.dataset.rtCopy)return;anchor.dataset.rtCopy='1';anchor.after(actions());
  });
 }
 function title(){toggle.textContent='방 채팅'+(unread?' · 새 메시지 '+unread:'');}
 function open(value){opened=value;panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));if(value){unread=0;list.scrollTop=list.scrollHeight;input.focus();}else toggle.focus();title();}
 function receive(snapshot){
  if(!room||snapshot.code!==room.code||!snapshot.chat||snapshot.chat.version<=sequence)return;
  const fresh=sequence<0,chat=snapshot.chat,stick=list.scrollHeight-list.scrollTop-list.clientHeight<35,incoming=chat.messages.filter(m=>m.id>sequence);
  for(const m of incoming){
   const item=make('li',undefined,'rt-message'+(m.player===room.me?' rt-mine':'')),meta=make('div',undefined,'rt-meta'),time=make('time',new Date(m.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));
   time.dateTime=new Date(m.at).toISOString();meta.append(make('b',m.name+(m.player===room.me?' (나)':'')),time);item.append(meta,make('p',m.text));list.append(item);
  }
  while(list.children.length>80)list.firstElementChild.remove();empty.hidden=chat.messages.length>0;
  if(!fresh&&!opened)unread+=incoming.filter(m=>m.player!==room.me).length;
  sequence=chat.version;title();if(stick||fresh||incoming.some(m=>m.player===room.me))list.scrollTop=list.scrollHeight;
 }
 async function poll(){
  if(!room||config.chat===false)return;const ticket=generation;
  try{const snapshot=await config.transport();if(ticket===generation)receive(snapshot);}
  catch(e){if(ticket===generation){if(e.status===401||e.status===403){hide();return;}error.textContent='채팅 연결을 다시 시도하고 있어요.';}}
  finally{if(room&&ticket===generation)timer=setTimeout(poll,1500);}
 }
 async function send(event){
  event.preventDefault();const text=input.value.trim();if(!text||sending||!room)return;
  const ticket=generation;sending=true;sendButton.disabled=true;error.textContent='';
  try{const snapshot=await config.transport({text});if(ticket===generation){if(input.value.trim()===text)input.value='';receive(snapshot);}}
  catch(e){if(ticket===generation)error.textContent=e.message||'메시지를 보내지 못했어요.';}
  finally{sending=false;sendButton.disabled=false;}
 }
 function mount(){
  status=make('div',undefined,'rt-status');status.hidden=true;status.setAttribute('role','status');document.body.append(status);
  if(config.chat===false)return;
  toggle=button('방 채팅',()=>open(!opened),'rt-toggle');toggle.hidden=true;toggle.setAttribute('aria-controls','rt-room-chat');toggle.setAttribute('aria-expanded','false');
  panel=make('section',undefined,'rt-chat');panel.id='rt-room-chat';panel.hidden=true;panel.setAttribute('aria-labelledby','rt-chat-title');
  const head=make('div',undefined,'rt-header'),heading=make('h2','방 채팅');heading.id='rt-chat-title';
  head.append(heading,button('접기',()=>open(false),'rt-close'));
  empty=make('p','아직 대화가 없어요. 첫 인사를 보내 보세요!','rt-empty');list=make('ol',undefined,'rt-messages');list.setAttribute('role','log');list.setAttribute('aria-label','방 채팅 메시지');list.setAttribute('aria-live','polite');list.setAttribute('aria-relevant','additions');list.tabIndex=0;
  const form=make('form',undefined,'rt-form'),label=make('label','메시지 · 최대 300자'),row=make('div');
  input=make('input');input.id='rt-chat-input';input.maxLength=300;input.autocomplete='off';input.placeholder='메시지를 입력하세요';label.htmlFor=input.id;
  sendButton=make('button','보내기');sendButton.type='submit';row.append(input,sendButton);error=make('p',undefined,'rt-error');error.setAttribute('role','status');
  form.append(label,row,error);form.onsubmit=send;
  panel.append(head,make('p','이 방의 참가자에게만 보여요. 최근 80개를 보관해요.','rt-help'),actions(),empty,list,form);document.body.append(toggle,panel);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened&&!document.querySelector('dialog[open]'))open(false);});
 }
 function init(options){if(config)return;config=options;mount();observer=new MutationObserver(installCopies);observer.observe(document.body,{subtree:true,childList:true});}
 function update(snapshot){
  if(!config||!snapshot?.code)return;
  if(room?.code!==snapshot.code){clearTimeout(timer);generation++;room={code:String(snapshot.code),me:snapshot.me};sequence=-1;unread=0;installCopies();if(config.chat!==false){list.replaceChildren();input.value='';error.textContent='';empty.hidden=false;toggle.hidden=false;title();poll();}}
  else {room.me=snapshot.me;installCopies();}
 }
 function hide(){clearTimeout(timer);generation++;room=null;if(toggle){toggle.hidden=true;panel.hidden=true;opened=false;}unread=0;sequence=-1;}
 addEventListener('pagehide',()=>{clearTimeout(timer);generation++;});
 return{init,update,hide,code:()=>room?.code||''};
})();
