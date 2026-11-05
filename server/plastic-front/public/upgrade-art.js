/* Supplied toy-style art; shared by cards, ability slots and build settings. */
(function(root){'use strict';
 const files={damage:'damage',health:'health',speed:'speed',haste:'haste',critChance:'crit-chance',critDamage:'crit-damage',gold:'gold',capacity:'capacity',defense:'defense',turretHp:'health',turretDamage:'damage',turretDefense:'defense',fieldRepair:'health',fieldGold:'gold',fieldSupply:'capacity'};
 const path=key=>files[key]?`assets/ui/upgrades-v139/${files[key]}.webp`:null;
 const icon=(key,fallback='')=>path(key)?`<img class="upgrade-art" src="${path(key)}" alt="" decoding="sync" draggable="false">`:fallback;
 const ready=root.FrontArtLoader?.preload(Object.keys(files).map(path))||Promise.resolve([]);
 const api={files,path,icon,ready};root.FrontUpgradeArt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
