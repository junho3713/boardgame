/* Approved v140 board, displayed as a shared atlas without repainting its art. */
(function(root){'use strict';
 const atlas='assets/ui/unit-portraits-v140.webp',width=1254,height=1254;
 const crop={width:360,height:328};
 const cells={rifle:[49,37],machinegun:[447,37],sniper:[845,37],rocket:[49,435],mortar:[447,435],medic:[845,435],guntruck:[49,839],tank:[447,839],lucky:[845,839]};
 const icon=(type,fallback='')=>{
  const cell=cells[type];if(!cell)return fallback;
  const x=(cell[0]/(width-crop.width)*100).toFixed(5),y=(cell[1]/(height-crop.height)*100).toFixed(5);
  return `<span class="unit-art unit-art-${type}" aria-hidden="true" style="--unit-x:${x}%;--unit-y:${y}%"></span>`;
 };
 const ready=root.FrontArtLoader?.preload([atlas])||Promise.resolve([]);
 const api={atlas,width,height,crop,cells,icon,ready};root.FrontUnitArt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
