/* Shared portraits, for standard troops and their specialist variants. */
(function(root){'use strict';
 const atlas='assets/ui/unit-portraits-v140.webp',width=1254,height=1254;
 const specialists={rifle:0,drone:2},specialistAtlas='assets/ui/specialist-portraits-v211.webp';
 const engineerAtlas='assets/ui/block-engineer-portraits-v212.webp';
 const radioAtlas='assets/ui/radio-portraits-v213.webp';
 const crop={width:360,height:328};
 const cells={rifle:[49,37],machinegun:[447,37],sniper:[845,37],rocket:[49,435],mortar:[447,435],medic:[845,435],guntruck:[49,839],tank:[447,839],lucky:[845,839]};
 const icon=(type,fallback='',evolved=false)=>{
  const rankAtlas=type==='guntruck'?radioAtlas:type==='rocket'?engineerAtlas:null;
  if(rankAtlas)return `<span class="unit-art unit-art-${type}${evolved?' unit-art-evolved':''}" aria-hidden="true" style="background-image:url('${rankAtlas}');background-size:200% 100%;background-position:${evolved?100:0}% center"></span>`;
  if(Object.hasOwn(specialists,type))return `<span class="unit-art unit-art-${type}" aria-hidden="true" style="background-image:url('${specialistAtlas}');background-size:300% 100%;background-position:${specialists[type]*50}% center"></span>`;
  const cell=cells[type];if(!cell)return fallback;
  const x=(cell[0]/(width-crop.width)*100).toFixed(5),y=(cell[1]/(height-crop.height)*100).toFixed(5);
  return `<span class="unit-art unit-art-${type}" aria-hidden="true" style="--unit-x:${x}%;--unit-y:${y}%"></span>`;
 };
 const ready=root.FrontArtLoader?.preload([atlas,specialistAtlas,engineerAtlas,radioAtlas])||Promise.resolve([]);
 const api={atlas,width,height,crop,cells,engineerAtlas,radioAtlas,icon,ready};root.FrontUnitArt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
