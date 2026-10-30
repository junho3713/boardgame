(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LexioRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const suits=['구름','별','달','해'],labels={1:'싱글',2:'페어',3:'트리플',4:'스트레이트',5:'플러시',6:'풀하우스',7:'포카드',8:'스트레이트 플러시'};
 const strength=n=>n===2?17:n===1?16:n;
 const compare=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d;}return 0;};
 function analyze(cards,max=15){
  if(![1,2,3,5].includes(cards.length))throw Error(cards.length===4?'4개 조합은 없어요. 같은 숫자 4개에 다른 타일 1개를 더하면 포카드예요.':'1·2·3·5개 중 하나로 골라 주세요.');
  if(new Set(cards.map(c=>c.id)).size!==cards.length)throw Error('같은 타일을 두 번 선택할 수 없어요.');
  const groups=new Map();for(const c of cards){if(!Number.isInteger(c.rank)||c.rank<1||c.rank>max||!Number.isInteger(c.suit)||c.suit<0||c.suit>3)throw Error('타일 정보를 확인해 주세요.');if(!groups.has(c.rank))groups.set(c.rank,[]);groups.get(c.rank).push(c);}
  const ordered=cards.slice().sort((a,b)=>strength(b.rank)-strength(a.rank)||b.suit-a.suit),high=ordered[0],count=cards.length;
  let kind,key,reason;
  if(count===1){kind=1;key=[strength(high.rank),high.suit];reason=high.rank+' '+suits[high.suit]+' · 숫자를 먼저, 같으면 문양을 비교해요.';}
  else if(count<5){if(groups.size!==1)throw Error((count===2?'페어':'트리플')+'는 같은 숫자끼리만 만들 수 있어요.');kind=count;key=[strength(high.rank),...(count===2?[high.suit]:[])];reason=high.rank+' '+(count===2?'2개 · 숫자가 같으면 해가 있는 페어가 강해요.':'3개 · 트리플 숫자로 비교해요.');}
  else{
   const ranks=[...groups.keys()].sort((a,b)=>a-b),normal=ranks.length===5&&ranks.every((n,i)=>!i||n===ranks[i-1]+1),wrapped=ranks.length===5&&ranks[0]===1&&ranks.slice(1).every((n,i)=>n===max-3+i),straight=normal||wrapped,flush=cards.every(c=>c.suit===cards[0].suit),triple=[...groups].find(x=>x[1].length===3),four=[...groups].find(x=>x[1].length===4);
   if(straight&&flush){kind=8;key=[...ordered.map(c=>strength(c.rank)),high.suit];reason='연속된 숫자 5개가 모두 같은 문양이에요.';}
   else if(four){kind=7;key=[strength(four[0])];reason=four[0]+' 4개 + 다른 타일 1개 · 네 개짜리 숫자로 비교해요.';}
   else if(triple&&groups.size===2){kind=6;key=[strength(triple[0])];reason=triple[0]+' 트리플 + 페어 · 트리플 숫자로 비교해요.';}
   else if(flush){kind=5;key=[...ordered.map(c=>strength(c.rank)),high.suit];reason=suits[high.suit]+' 5개 · 강한 숫자부터 차례로 비교해요.';}
   else if(straight){kind=4;key=[...ordered.map(c=>strength(c.rank)),high.suit];reason='연속된 숫자 5개 · 가장 강한 타일은 '+high.rank+' '+suits[high.suit]+'이에요.';}
   else throw Error('5개는 연속 숫자·같은 문양·3+2·4+1 중 하나여야 해요.');
  }
  return {count,kind,key,label:labels[kind],reason};
 }
 function beats(a,b){return !b||a.count===b.count&&compare(a.count===5?[a.kind,...a.key]:a.key,b.count===5?[b.kind,...b.key]:b.key)>0;}
 function check(cards,top,max){const combo=analyze(cards,max);if(top&&combo.count!==top.count)throw Error('지금은 같은 개수인 '+top.count+'개를 내야 해요.');if(!beats(combo,top))throw Error(combo.label+'이지만 바닥보다 강하지 않아요. 숫자·문양·족보를 더 높여 주세요.');return combo;}
 function enumerate(hand,top,max){const out=[];for(const count of top?[top.count]:[1,2,3,5]){const chosen=[];function walk(start){if(chosen.length===count){try{const c=analyze(chosen,max);if(beats(c,top))out.push({...c,ids:chosen.map(t=>t.id)});}catch{}return;}for(let i=start;i<=hand.length-(count-chosen.length);i++){chosen.push(hand[i]);walk(i+1);chosen.pop();}}walk(0);}return out;}
 function recommend(options,hand){return options.slice().sort((a,b)=>{const value=c=>c.count*12+(c.count===hand.length?1000:0)+c.ids.filter(id=>hand.find(t=>t.id===id)?.rank===2).length*3-c.kind*.3-c.key[0]*.08;return value(b)-value(a);})[0];}
 return {suits,labels,strength,compare,analyze,beats,check,enumerate,recommend};
});
