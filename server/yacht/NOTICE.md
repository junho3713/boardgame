# Yacht Dice · 찐막보드게임

This online implementation supports 2–10 players, computer seats, twelve scoring categories, three rolls per turn, and a 35-point bonus for an upper-section total of at least 63. It does not use the thirteen-category Yahtzee rules or extra five-of-a-kind bonuses. Full House requires 3+2 of different values; five of a kind does not count.

Reference: https://github.com/kali1402/yacht_dice
Reference source tree: 9463efde77611711ca0ed199187de7657fcfe282
The reference is a local two-player HTML/JavaScript implementation licensed under MIT. Its license is preserved in LICENSE.upstream. Its published twelve-category definitions were consulted; the authoritative multiplayer engine, computer decisions, transport, Korean interface, score table, and SVG dice here are newly implemented. No Nintendo illustrations, interface assets, or sounds are used.

Complete online source: https://github.com/junho3713/boardgame/tree/main/server/yacht
Start with `node server/girl-lobby/server.cjs` from the repository root and visit `/yacht/`. No additional runtime dependencies, external identity provider, database, or paid service is required. Rooms and reconnection tokens live in server memory and expire after two hours of inactivity. Restarting the free service clears games.
