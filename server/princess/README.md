# 프린세스의 반란 · 무료 멀티

GPL-3.0-only adaptation of [anicolao/rebelprincess](https://github.com/anicolao/rebelprincess), pinned at `47cc88dc9848ecc9454102865588267d64f61b8b`. The upstream rule reducer, Svelte interface, sprite components, and generated artwork are preserved with Korean localization and a new authoritative server. See LICENSE, ARTWORK.md, NOTICE.md, and THIRD_PARTY.txt.

## Build and run

Node.js 22 or newer. From this directory run `npm install` and `npm run build`. `src/` contains all modified client and rules source; `build.cjs` bundles Svelte into `public/app.js` and the rule reducer into `vendor/rules.mjs`. The checked-in bundles allow the existing free service to start without installing build dependencies.

Run the repository entry point `node server/girl-lobby/server.cjs`, then open `/princess/`. `server.cjs` uses only Node standard modules. No Firebase project, API key, database, paid service, or upstream online service is used. Static generated art is provided in `public/assets/*.webp`; original PNG sheets and generation prompts are linked in ARTWORK.md at the pinned upstream revision.

Rooms support 3–6 players, computer seats, five rounds, twelve Princess powers, and twenty-six round rules. The host starts each round. Only the server deals cards. Every connection receives a private projection, not the event stream or opponents' hands. Each optional Princess ability is once per round. Computers choose legal basic plays and resolve required choices; they do not strategically activate optional abilities.

Turn limits are optional and apply per card/required action after dealing. Sealed simultaneous suit declarations wait for the original browser's confirmation rather than bypass the commitment. Sessions and rooms are held in memory; restarting the free service clears games. Reconnect in the same browser tab to retain your identity and sealed-choice keys. A room expires after two hours of inactivity.

This is an unofficial digital adaptation using the upstream project's original GPL generated illustrations, not the commercial board game's printed art.
