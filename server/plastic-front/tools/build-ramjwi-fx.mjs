// Offline PixelFX export: use the local residual current, omitting the baked incoming bolt.
import {writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),checkout=resolve(process.argv[2]||join(here,'../../../../pixelfx'));
const {loadEffect,renderFrames,spriteSheet}=await import(pathToFileURL(join(checkout,'tools/lib/fxlib.mjs')));
const fx=await loadEffect('lightning/zap-hit'),options={seed:3,light:.24,palette:['#826438','#ba9246','#dfbb65','#f3d883','#ffe6a3','#fff0bd','#fff7da','#fffef0']};
// The original back pass paints burn marks. Keep only the electrical front pass.
const create=fx.mod.create;fx.mod={...fx.mod,create(o){const current=create(o);return{update:dt=>current.update(dt),draw:p=>current.draw(p)};}};
const rendered=renderFrames(fx,{actor:false,options}),frames={...rendered,n:16,frames:rendered.frames.slice(10,26)},atlas=spriteSheet(fx,frames,'ramjwi-current-v20261114b');
atlas.json.meta.source={repository:'https://github.com/patch-gg/pixelfx',commit:'5294518ce7c72e48b6100a744596e0acf57f2826',effect:'lightning/zap-hit',firstFrame:10,omitBurnMarks:true,options};
const out=resolve(here,'../public/assets/support-toys/pixelfx');mkdirSync(out,{recursive:true});
writeFileSync(join(out,'ramjwi-current-v20261114b.png'),atlas.png);writeFileSync(join(out,'ramjwi-current-v20261114b.json'),JSON.stringify(atlas.json,null,1)+'\n');
for(const [source,target]of [['LICENSE','LICENSE.txt'],['NOTICE.md','NOTICE.txt']])copyFileSync(join(checkout,source),join(out,target));
console.log(JSON.stringify({bytes:atlas.png.length,size:atlas.json.meta.size,frames:frames.n,columns:atlas.json.meta.pixelfx.columns}));
