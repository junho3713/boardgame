// GPL-3.0-only. npm install && npm run build
const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const deps=process.env.PRINCESS_BUILD_DEPS||root;
const {createRequire}=require('node:module');
const resolve=createRequire(path.join(deps,'package.json'));
const esbuild=resolve('esbuild'),{compile}=resolve('svelte/compiler');
const sveltePlugin={name:'svelte',setup(build){build.onLoad({filter:/\.svelte$/},args=>{const source=fs.readFileSync(args.path,'utf8');const out=compile(source,{filename:args.path,generate:'client',css:'injected',warningFilter:()=>false});return {contents:out.js.code,loader:'js',resolveDir:path.dirname(args.path)};});}};
(async()=>{
 await esbuild.build({entryPoints:[path.join(root,'src/main.ts')],outfile:path.join(root,'public/app.js'),bundle:true,format:'esm',platform:'browser',minify:true,plugins:[sveltePlugin],nodePaths:[path.join(deps,'node_modules')],alias:{$lib:path.join(root,'src/lib'),'$app/paths':path.join(root,'src/paths.ts'),'$app/navigation':path.join(root,'src/navigation.ts')},define:{'process.env.NODE_ENV':'"production"'}});
 await esbuild.build({entryPoints:[path.join(root,'src/rules-entry.ts')],outfile:path.join(root,'vendor/rules.mjs'),bundle:true,format:'esm',platform:'node',minify:false});
 fs.writeFileSync(path.join(root,'public/index.html'),'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#21162b"><title>프린세스의 반란 · 찐막보드게임</title></head><body><div id="app"></div><script type="module" src="/princess/app.js"></script></body></html>');
 console.log('Built Princess client and authoritative rules');
})().catch(e=>{console.error(e);process.exitCode=1;});
