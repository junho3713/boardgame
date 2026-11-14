// Authoring only. Export PixelFX accents; no runtime package dependency.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),checkout=resolve(process.argv[2]||join(here,'../../../../pixelfx'));
const {loadEffect,renderFrames,spriteSheet}=await import(pathToFileURL(join(checkout,'tools/lib/fxlib.mjs')));
const out=resolve(here,'../public/assets/effects/pixelfx');mkdirSync(out,{recursive:true});
for(const [id,name] of [['impacts/hit-spark','hit-spark-v20261114'],['impacts/crit-hit','heavy-impact-v20261114']]){
 const fx=await loadEffect(id),options={height:20,seed:4,light:.25,palette:['#58432b','#987044','#c39453','#dcb069','#ead294','#fff0c3','#fff9df','#ffffff']};
 const frames=renderFrames(fx,{actor:false,options}),atlas=spriteSheet(fx,frames,name);
 atlas.json.meta.source={repository:'https://github.com/patch-gg/pixelfx',commit:'5294518ce7c72e48b6100a744596e0acf57f2826',effect:id,options};
 writeFileSync(join(out,name+'.png'),atlas.png);writeFileSync(join(out,name+'.json'),JSON.stringify(atlas.json,null,1)+'\n');
 console.log(JSON.stringify({id,frames:frames.n,bytes:atlas.png.length,atlas:atlas.json.meta.size,columns:atlas.json.meta.pixelfx.columns,pivot:atlas.json.meta.pixelfx.pivot}));
}
for(const [source,target]of [['LICENSE','LICENSE.txt'],['NOTICE.md','NOTICE.txt']])copyFileSync(join(checkout,source),join(out,target));
