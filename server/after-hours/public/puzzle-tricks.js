import {EVAC_NODES,LUGGAGE_IMPRINT,LINEN_TAGS} from './puzzle-evidence.js?v=20261117-tricks1';

export const TRICK_DEFAULTS={faucetHot:false,bathSteam:0,bathSteamSeen:false,rubbingPrepared:false,rubbingBlank:false,rubbingAligned:false,rubbingOffset:[1,-1],rubbingTurn:1,rubbingMarks:[0,0,0,0,0,0],routeTurns:[1,0,1]};
export const GARMENT_PATHS=[
 'M9 3h11v6h-6v17H7V9h2ZM14 19h7v7h-7M8 27v3m3-3v3m5-3v3m4-3v3',
 'M10 4 4 8l-3 8 6 2 2-5v17h14V13l2 5 6-2-3-8-6-4-3 4h-6Z',
 'M4 4h24v24H4Zm3 3h18v18H7Zm11 11 7 7M18 18v7h7'
];
export const garmentSvg=(i)=>`<svg viewBox="0 0 32 34" role="img" aria-label="${LINEN_TAGS[i].name} 기호"><path d="${GARMENT_PATHS[i]}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/></svg>`;
export const steamClueSvg=()=>`<div class="steam-clue" aria-label="접수 순서: 회색 목도리, 남색 셔츠, 흰 손수건">${[0,1,2].map((i)=>garmentSvg(i)).join('<span aria-hidden="true">→</span>')}</div>`;

// Condensation responds to water temperature; remembering a clue never opens a lock.
export function updateBathSteam(s,dt){
 if(!Number.isFinite(dt)||dt<=0)return false;
 const before=s.bathSteamSeen;
 s.bathSteam=Math.max(0,Math.min(1,(s.bathSteam||0)+(s.faucetOn&&s.faucetHot?.22:-.035)*Math.min(dt,10)));
 if(s.bathSteam>=.78)s.bathSteamSeen=true;
 return !before&&s.bathSteamSeen;
}
export const rubbingTools=s=>['pencil','receipt','tag'].every(id=>s.inventory.includes(id));
export function prepareRubbing(s){if(!rubbingTools(s))return false;s.rubbingPrepared=true;return true;}
export function alignRubbing(s){
 if(!rubbingTools(s)||!s.rubbingPrepared||!s.rubbingBlank||s.rubbingTurn!==0||!s.rubbingOffset.every(n=>n===0))return false;
 s.rubbingAligned=true;return true;
}
export function rubImprint(s,i){
 if(!rubbingTools(s)||!s.rubbingAligned||!Number.isInteger(i)||i<0||i>=6||s.rubbingMarks[i]>=3)return false;
 s.rubbingMarks[i]++;s.tagRubbed=s.rubbingMarks.every(n=>n===3);return true;
}
export const rubbingDigit=(s,i)=>s.rubbingMarks[i*2]===3&&s.rubbingMarks[i*2+1]===3?LUGGAGE_IMPRINT[i]:null;

// These are the two different torn edges shared by adjoining pieces, top to bottom.
const cutShapes=[[0,7,-4,5,-7,3,-3,6,0],[0,-6,4,-7,3,-5,7,-3,0]];
const edgePoints=(edge)=>edge===0||edge===3?[[edge*160,0],[edge*160,255]]:cutShapes[edge-1].map((dx,i)=>[edge*160+dx,i*255/8]);
function fragmentOutline(i){return [...edgePoints(i),...[...edgePoints(i+1)].reverse()].map(p=>p.join(',')).join(' ');}
export function routeFits(order,turns){
 if(!Array.isArray(order)||order.length!==3||new Set(order).size!==3||!order.every(n=>Number.isInteger(n)&&n>=0&&n<3)||!Array.isArray(turns)||turns.length!==3||!turns.every(n=>n===0||n===1))return false;
 const edges=order.map(i=>turns[i]?[-(i+1),-i]:[i,i+1]);
 return edges[0][0]===0&&edges[2][1]===3&&edges[0][1]===edges[1][0]&&edges[1][1]===edges[2][0];
}
export function evacuationArtwork(){
 const xy=id=>{const n=EVAC_NODES.find(v=>v.id===id);return[n.x*76+45,n.y*76+45];};
 const lines=[['317','corridor'],['corridor','junction'],['junction','stairs'],['316','junction'],['corridor','lift']];
 return `<rect width="480" height="255" fill="#dfd4b9"/><path d="M20 20H460V235H20Z" stroke="#b7a889" fill="none"/>${lines.map(([a,b])=>`<path d="M${xy(a).join(' ')}L${xy(b).join(' ')}" stroke="#879c8e" stroke-width="16"/>`).join('')}${EVAC_NODES.map(n=>{const[x,y]=xy(n.id);return `<circle cx="${x}" cy="${y}" r="8" fill="#344940"/><text x="${x}" y="${y+(n.id==='corridor'?31:-18)}" text-anchor="middle" font-size="14" fill="#253b32">${{corridor:'복도 접점',junction:'서쪽 접점',stairs:'계단',lift:'고장'}[n.id]||n.id}</text>`;}).join('')}<path d="M410 177l30 35m0-35-30 35" stroke="#894e3f" stroke-width="4"/><path d="M40 65V27m-6 10 6-10 6 10" stroke="#344940" fill="none"/><text x="40" y="18" text-anchor="middle" fill="#253b32" font-size="14">N</text>`;
}
export const evacuationSvg=()=>`<svg class="evidence-map" viewBox="0 0 480 255" role="img" aria-label="복원한 대피도. 북쪽은 위. 317호에서 아래로 복도 접점, 왼쪽으로 서쪽 접점, 왼쪽으로 계단. 오른쪽 엘리베이터는 고장.">${evacuationArtwork()}</svg>`;
export function routeFragmentSvg(i,turn){
 const id='routeClip'+i;return `<svg viewBox="${i*160-8} 0 176 255" role="img" aria-label="${i+1}번 대피도 조각, ${turn?'반바퀴 돌아간':'인쇄면 위쪽'} 방향"><defs><clipPath id="${id}"><polygon points="${fragmentOutline(i)}"/></clipPath></defs><g transform="rotate(${turn*180} ${i*160+80} 127.5)"><g clip-path="url(#${id})">${evacuationArtwork()}</g><polygon points="${fragmentOutline(i)}" fill="none" stroke="#98866b" stroke-width="1.5"/></g></svg>`;
}
