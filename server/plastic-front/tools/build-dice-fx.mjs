// Authoring only: node tools/build-dice-fx.mjs /path/to/pixelfx
// Uses the official ground-explosion simulation, independently from support-toy FX.
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),checkout=resolve(process.argv[2]||join(here,'../../../../pixelfx'));
const {loadEffect,renderFrames,spriteSheet,contactSheet}=await import(pathToFileURL(join(checkout,'tools/lib/fxlib.mjs')));
const id='explosions/small-explosion',name='dice-impact-v20261124',effect=await loadEffect(id);
const options={size:.72,seed:37,stone:'#918b6b',palette:['#473d31','#83532e','#bc783c','#e9a54d','#f8cf76','#ffe7a7','#fff5d5','#fffef5']};
// Capture the contact, bloom and cooling dust; gameplay owns its short duration.
const capture={size:[256,224],origin:[128,178],duration:1.4,fps:20};
const fx={...effect,meta:{...effect.meta,...capture}},frames=renderFrames(fx,{actor:false,options}),atlas=spriteSheet(fx,frames,name);
atlas.json.meta.source={repository:'https://github.com/patch-gg/pixelfx',commit:'5294518ce7c72e48b6100a744596e0acf57f2826',effect:id,options,capture};
const out=resolve(here,'../public/assets/effects/pixelfx');mkdirSync(out,{recursive:true});
writeFileSync(join(out,name+'.png'),atlas.png);writeFileSync(join(out,name+'.json'),JSON.stringify(atlas.json,null,1)+'\n');
if(process.argv[3])writeFileSync(resolve(process.argv[3]),contactSheet(fx,frames,{max:12,width:1200}));
console.log(JSON.stringify({frames:frames.n,bytes:atlas.png.length,meta:atlas.json.meta}));
