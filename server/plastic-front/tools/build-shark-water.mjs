// Offline asset export; PixelFX never runs in the game's update loop.
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync,copyFileSync,readFileSync} from 'node:fs';
const here=dirname(fileURLToPath(import.meta.url));
const checkout=resolve(process.argv[2]||join(here,'../../../../pixelfx'));
const {loadEffect,renderFrames,spriteSheet}=await import(pathToFileURL(join(checkout,'tools/lib/fxlib.mjs')));
const fx=await loadEffect('water/splash');
const options={stone:false,seed:3,light:.24,palette:['#153b43','#205e68','#308a96','#4db4bf','#7bd9dc','#b6f0ed','#e8fff6','#ffffff']};
const frames=renderFrames(fx,{actor:false,options});
const atlas=spriteSheet(fx,frames,'shark-water-v20261114');
const out=resolve(here,'../public/assets/support-toys/pixelfx');
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'shark-water-v20261114.png'),atlas.png);
atlas.json.meta.source={repository:'https://github.com/patch-gg/pixelfx',commit:'5294518ce7c72e48b6100a744596e0acf57f2826',effect:'water/splash',options};
writeFileSync(join(out,'shark-water-v20261114.json'),JSON.stringify(atlas.json,null,1)+'\n');
copyFileSync(join(checkout,'LICENSE'),join(out,'LICENSE.txt'));
copyFileSync(join(checkout,'NOTICE.md'),join(out,'NOTICE.txt'));
console.log(JSON.stringify({frames:frames.n,size:[frames.w,frames.h],bytes:atlas.png.length,version:JSON.parse(readFileSync(join(checkout,'package.json'))).version}));
