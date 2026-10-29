'use strict';
const list=document.querySelector('#cardList'), detail=document.querySelector('#cardDetail');
const atlas={president:[212,63,106,132],class:[326,63,105,132],genius:[439,63,104,132],discipline:[550,63,106,132],health:[203,206,106,142],library:[322,206,105,142],lady:[438,206,105,142],newspaper:[550,206,108,142]};
function cardImage(card,decorative=false){
 const official={alien:[480,56,390,550],infected:[480,662,390,550],homecoming:[470,2356,390,550]},special={criminal:[257,165,198,250],accomplice:[458,168,198,249]};
 const rect=atlas[card.id]||official[card.id]||special[card.id],file=atlas[card.id]?'ordinary.png':official[card.id]?'official-roles.jpg':'criminals.png';
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),img=document.createElementNS(ns,'image');
 svg.setAttribute('viewBox',rect.join(' '));svg.setAttribute('class','card-art');
 if(decorative)svg.setAttribute('aria-hidden','true');else{svg.setAttribute('role','img');svg.setAttribute('aria-label',`${card.name} 원본 카드`);}
 img.setAttribute('href',official[card.id]?'https://mtsgames.kr/web/upload/NNEditor/20260326/fe26f45ed47be6cc789d92815eb95990.jpg':`assets/${file}`);img.setAttribute('width',official[card.id]?'1000':'1265');img.setAttribute('height',official[card.id]?'3800':'712');svg.append(img);return svg;
}
function textNode(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function selectCard(card,button,move){
  list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const top=document.createElement('div');top.className='detail-top';const title=document.createElement('div');const h=textNode('h3',card.name);h.id='cardName';title.append(h);if(card.alias)title.append(textNode('p',`다른 판본 표기: ${card.alias}`,'alias'));title.append(textNode('p',`MP ${card.mp} · 5인 기준 ${card.copies}장 · 우선순위 ${card.priority}`,'stats'));top.append(cardImage(card),title);detail.replaceChildren(top);
  for(const [heading,value,cls] of [['마지막 정체로 남기면',card.win,'win'],['특기로 사용하면',card.ability,''],['이렇게 생각해 보세요',card.example,''],['헷갈리기 쉬워요',card.note,'']])detail.append(textNode('h4',heading),textNode('p',value,cls));
  if(move){detail.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});detail.focus({preventScroll:true});}
}
fetch('cards.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(cards=>{for(const card of cards){const b=document.createElement('button');b.type='button';b.className='card-choice';b.setAttribute('aria-pressed','false');b.setAttribute('aria-controls','cardDetail');b.setAttribute('aria-label',`${card.name}, MP ${card.mp}, 자세히 보기`);b.append(cardImage(card,true),textNode('strong',card.name),textNode('small',`MP ${card.mp} · ${card.copies}장`));b.addEventListener('click',()=>selectCard(card,b,true));list.append(b);}selectCard(cards[0],list.firstElementChild,false);}).catch(()=>{detail.replaceChildren(textNode('p','카드 설명을 불러오지 못했어요. 페이지를 새로고침해 주세요.'));});
