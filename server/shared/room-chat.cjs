'use strict';
const fs=require('node:fs'),path=require('node:path');
const empty=()=>({version:0,messages:[]});
function serve(req,res){
 const route=new URL(req.url,'http://local').pathname;
 const file={'/room-tools.js':['room-tools.js','text/javascript; charset=utf-8'],'/room-tools.css':['room-tools.css','text/css; charset=utf-8']}[route];
 if(!file)return false;
 if(req.method!=='GET'){res.writeHead(405);res.end();return true;}
 res.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(fs.readFileSync(path.join(__dirname,file[0])));return true;
}
function respond(req,res,room,person,body,json){
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'지원하지 않는 요청이에요.'});
 if(req.method==='POST'){
  const text=typeof body.text==='string'?body.text.trim():'';
  if(!text||text.length>300)return json(res,400,{error:'채팅은 1~300자로 입력해 주세요.'});
  const now=Date.now(),last=room.chatLastSent?.get(person.id);
  if(last!==undefined&&now-last<700)return json(res,429,{error:'잠깐 기다렸다가 보내 주세요.'});
  room.chatLastSent??=new Map();room.chatLastSent.set(person.id,now);
  room.roomChat??=empty();
  room.roomChat.messages.push({id:++room.roomChat.version,player:person.id,name:person.name,text,at:now});
  room.roomChat.messages=room.roomChat.messages.slice(-80);
 }
 return json(res,200,{code:room.code,me:person.id,chat:room.roomChat||empty()});
}
module.exports={serve,respond};
