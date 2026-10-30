// work/boardgame-catalog/server/princess/src/lib/setup.ts
var SUITS = ["fairies", "queens", "princes", "pets"];
var PRINCESSES = [
  ["snow-white", "\uBC31\uC124\uACF5\uC8FC"],
  ["little-mermaid", "\uC778\uC5B4\uACF5\uC8FC"],
  ["cinderella", "\uC2E0\uB370\uB810\uB77C"],
  ["pocahontas", "\uD3EC\uCE74\uD63C\uD0C0\uC2A4"],
  ["sleeping-beauty", "\uC7A0\uC790\uB294 \uC232\uC18D\uC758 \uACF5\uC8FC"],
  ["alice", "\uC568\uB9AC\uC2A4"],
  ["mulan", "\uBBAC\uB780"],
  ["scheherazade", "\uC170\uC5D0\uB77C\uC790\uB4DC"],
  ["pea-princess", "\uC644\uB450\uCF69 \uACF5\uC8FC"],
  ["ice-princess", "\uC5BC\uC74C \uACF5\uC8FC"],
  ["rapunzel", "\uB77C\uD47C\uC824"],
  ["thumbelina", "\uC5C4\uC9C0\uACF5\uC8FC"]
];
var ROUND_RULES = [
  ["once-upon-a-time", "\uC61B\uB0A0 \uC61B\uC801\uC5D0"],
  ["late-to-the-ball", "\uBB34\uB3C4\uD68C\uC5D0 \uB2A6\uC5C8\uC5B4\uC694"],
  ["magic-beans", "\uB9C8\uBC95\uC758 \uCF69"],
  ["three-times-a-lady", "\uC138 \uBC88\uC740 \uC219\uB140\uB2F5\uAC8C"],
  ["arranged-marriage", "\uC815\uB7B5\uACB0\uD63C"],
  ["royal-decree", "\uC655\uC2E4\uC758 \uBA85\uB839"],
  ["always-the-bridesmaid", "\uC5B8\uC81C\uB098 \uB4E4\uB7EC\uB9AC"],
  ["crystal-clear", "\uC218\uC815\uCC98\uB7FC \uD22C\uBA85\uD558\uAC8C"],
  ["masquerade-ball", "\uAC00\uBA74\uBB34\uB3C4\uD68C"],
  ["pets-revenge", "\uB3D9\uBB3C \uCE5C\uAD6C\uC758 \uBCF5\uC218"],
  ["musical-chairs", "\uC758\uC790 \uBE8F\uAE30"],
  ["sisterhood", "\uC790\uB9E4\uC560"],
  ["after-party", "\uB4A4\uD480\uC774"],
  ["late-for-a-very-important-date", "\uC544\uC8FC \uC911\uC694\uD55C \uC57D\uC18D\uC5D0 \uB2A6\uC5C8\uC5B4\uC694"],
  ["wedding-gift", "\uACB0\uD63C \uC120\uBB3C"],
  ["haggle-with-the-hag", "\uB9C8\uB140\uC640 \uD765\uC815"],
  ["blind-mans-bluff", "\uB208\uBA3C \uC220\uB798"],
  ["poisoned-apple", "\uB3C5 \uC0AC\uACFC"],
  ["odds-and-evens", "\uD640\uC218\uC640 \uC9DD\uC218"],
  ["single-fairy", "\uB3C5\uC2E0 \uC694\uC815"],
  ["prince-rings-twice", "\uC655\uC790\uB294 \uC5B8\uC81C\uB098 \uB450 \uBC88 \uBCA8\uC744 \uC6B8\uB9B0\uB2E4"],
  ["midnight-makeover", "\uC790\uC815\uC758 \uBCC0\uC2E0"],
  ["pass-the-bouquet", "\uBD80\uCF00 \uB3CC\uB9AC\uAE30"],
  ["upside-down", "\uAC70\uAFB8\uB85C"],
  ["bathroom-break", "\uC7A0\uAE50 \uD654\uC7A5\uC2E4"],
  ["dancing-queens", "\uCDA4\uCD94\uB294 \uC5EC\uC655"]
];
var ROUND_RULE_TEXT = {
  "once-upon-a-time": "\uCD94\uAC00 \uADDC\uCE59\uC774 \uC5C6\uC5B4\uC694. \uC120\uB450 \uBB34\uB2AC\uB97C \uB530\uB974\uACE0 \uADF8 \uBB34\uB2AC\uC758 \uAC00\uC7A5 \uD070 \uC218\uAC00 \uC774\uACA8\uC694.",
  invitation: "\uCD94\uAC00 \uADDC\uCE59\uC774 \uC5C6\uC5B4\uC694. \uC120\uB450 \uBB34\uB2AC\uB97C \uB530\uB974\uACE0 \uADF8 \uBB34\uB2AC\uC758 \uAC00\uC7A5 \uD070 \uC218\uAC00 \uC774\uACA8\uC694.",
  "magic-beans": "\uB0B4\uC57C \uD558\uB294 \uBB34\uB2AC\uC758 \uAC00\uC7A5 \uD070 \uC218 \uB610\uB294 \uAC00\uC7A5 \uC791\uC740 \uC218 \uCE74\uB4DC\uB9CC \uB0BC \uC218 \uC788\uC5B4\uC694.",
  "three-times-a-lady": "3 \uCE74\uB4DC\uB294 \uAC01\uAC01 \u22123\uC810\uC774\uC5D0\uC694. \uC655\uC790 3\uC740 \uAE30\uBCF8 +1\uC810\uACFC \uD569\uCCD0 \u22122\uC810\uC774\uC5D0\uC694.",
  "arranged-marriage": "\uB77C\uC6B4\uB4DC \uB05D\uC5D0 \uD2B8\uB9AD\uC744 \uD558\uB098\uB3C4 \uAC00\uC838\uC624\uC9C0 \uC54A\uC740 \uC0AC\uB78C\uC740 +5\uC810\uC744 \uBC1B\uC544\uC694.",
  "always-the-bridesmaid": "\uC120\uB450 \uBB34\uB2AC\uC5D0\uC11C \uB450 \uBC88\uC9F8\uB85C \uD070 \uC218\uAC00 \uC774\uACA8\uC694. \uB2E4\uB978 \uC0AC\uB78C\uC774 \uBAA8\uB450 \uADF8 \uBB34\uB2AC\uAC00 \uC5C6\uC73C\uBA74 \uC120\uB450\uAC00 \uC774\uACA8\uC694.",
  sisterhood: "\uC120\uB450 \uC22B\uC790\uC640 \uCC28\uC774\uAC00 \uAC00\uC7A5 \uD070 \uCE74\uB4DC\uAC00 \uC774\uACA8\uC694. \uC120\uB450 \uBB34\uB2AC\uAC00 \uC5C6\uB2E4\uBA74 \uBAA8\uB4E0 \uBB34\uB2AC\uB85C \uBE44\uAD50\uD574\uC694.",
  "late-for-a-very-important-date": "\uAC01\uC790 \uB9C8\uC9C0\uB9C9 \uC190\uD328 3\uC7A5\uC740 \uB0B4\uC9C0 \uC54A\uACE0 \uC790\uC2E0\uC774 \uAC00\uC838\uC628 \uCE74\uB4DC\uB85C \uACC4\uC0B0\uD574\uC694.",
  "masquerade-ball": "\uC120\uB450\uB9CC \uC55E\uBA74\uC73C\uB85C \uB0B4\uC694. \uB098\uBA38\uC9C0\uB294 \uB4B7\uBA74\uC73C\uB85C \uB0B8 \uB4A4 \uBAA8\uB450 \uD568\uAED8 \uACF5\uAC1C\uD574 \uC2B9\uC790\uB97C \uC815\uD574\uC694.",
  "royal-decree": "\uC5EC\uC655\uC774 \uD56D\uC0C1 \uC774\uACA8\uC694. \uC5EC\uC655\uC774 \uC5EC\uB7EC \uC7A5\uC774\uBA74 \uAC00\uC7A5 \uD070 \uC5EC\uC655\uC774 \uC774\uACA8\uC694.",
  "musical-chairs": "\uD2B8\uB9AD\uC774 \uB05D\uB0A0 \uB54C\uB9C8\uB2E4 \uBAA8\uB450 \uC190\uD328 1\uC7A5\uC744 \uACE8\uB77C \uB3D9\uC2DC\uC5D0 \uC624\uB978\uCABD \uC0AC\uB78C\uC5D0\uAC8C \uB118\uACA8\uC694.",
  "pets-revenge": "\uB3D9\uBB3C \uCE5C\uAD6C\uB3C4 \uD55C \uC7A5\uB9C8\uB2E4 +1\uC810\uC774\uC5D0\uC694. \uAC1C\uAD6C\uB9AC 8\uC740 \uAE30\uBCF8 +5\uC810\uACFC \uD569\uCCD0 +6\uC810\uC774\uC5D0\uC694.",
  "late-to-the-ball": "\uCD08\uAE30 \uAD50\uD658 \uD6C4 \uCE74\uB4DC 1\uC7A5\uC744 \uB530\uB85C \uBCF4\uAD00\uD574\uC694. \uB9C8\uC9C0\uB9C9 \uD2B8\uB9AD\uC5D0 \uADF8 \uCE74\uB4DC\uB97C \uB0B4\uC57C \uD574\uC694.",
  "poisoned-apple": "\uC120\uB450 \uBB34\uB2AC\uAC00 \uC5C6\uB294 \uC0AC\uB78C\uC774 \uB0B8 \uCE74\uB4DC\uAC00 \uC774\uACA8\uC694. \uC5EC\uB7EC \uBA85\uC774\uBA74 \uD070 \uC218, \uB3D9\uB960\uC774\uBA74 \uBA3C\uC800 \uB0B8 \uCE74\uB4DC\uAC00 \uC774\uACA8\uC694.",
  "crystal-clear": "\uC190\uD328 \uC911 \uBB34\uB2AC \uD558\uB098\uB97C \uACE8\uB77C \uADF8 \uBB34\uB2AC \uCE74\uB4DC\uB97C \uC804\uBD80 \uACF5\uAC1C\uD574\uC694. \uC190\uD328\uC5D0 \uB450\uACE0 \uD3C9\uC18C\uCC98\uB7FC \uC0AC\uC6A9\uD574\uC694.",
  "upside-down": "\uC774 \uD2B8\uB9AD\uC5D0 6\uC774 \uB098\uC62C \uB54C\uB9C8\uB2E4 \uC22B\uC790 \uBE44\uAD50\uAC00 \uB4A4\uC9D1\uD600\uC694. \uB450 \uBC88\uC9F8 6\uC774 \uB098\uC624\uBA74 \uB2E4\uC2DC \uC6D0\uB798\uB300\uB85C\uC608\uC694.",
  "dancing-queens": "\uAC19\uC740 \uC218\uC758 \uC655\uC790\xB7\uC5EC\uC655 \uD55C \uC30D\uC740 +3\uC810, \uB2E4\uB978 \uC218\uC758 \uD55C \uC30D\uC740 +2\uC810, \uC9DD \uC5C6\uB294 \uC655\uC790\uB294 +1\uC810\uC774\uC5D0\uC694.",
  "prince-rings-twice": "\uAC01\uC790 \uD55C \uD2B8\uB9AD\uC5D0 2\uC7A5\uC529 \uB0B4\uC694. \uC120\uB450 \uBB34\uB2AC \uC22B\uC790 \uD569\uC774 \uD070 \uC0AC\uB78C\uC774 \uC774\uACA8\uC694. \uB3D9\uB960\uC774\uBA74 \uAC00\uC7A5 \uD070 \uCE74\uB4DC\uB85C \uBE44\uAD50\uD574\uC694.",
  "wedding-gift": "\uB9E4 \uD2B8\uB9AD \uC804\uC5D0 \uAC01\uC790 \uCE74\uB4DC 1\uC7A5\uC744 \uB4B7\uBA74\uC73C\uB85C \uC120\uBB3C \uB354\uBBF8\uC5D0 \uB0B4\uC694. \uD2B8\uB9AD \uC2B9\uC790\uAC00 \uC120\uBB3C\uB3C4 \uAC00\uC838\uAC00\uC694.",
  "after-party": "\uC190\uD328\uB97C \uC808\uBC18\uC529 \uB098\uB204\uC138\uC694. \uBA3C\uC800 \uC4F8 \uC808\uBC18\uC744 \uB2E4 \uB0B8 \uD6C4 \uBCF4\uAD00\uD55C \uB098\uBA38\uC9C0 \uC808\uBC18\uC744 \uC0AC\uC6A9\uD574\uC694.",
  "bathroom-break": "\uC655\uC790\uAC00 +2\uC810\uC774 \uB3FC\uC694. \uB2E8, \uD604\uC7AC \uB204\uC801 \uCCAD\uD63C \uC810\uC218\uAC00 \uAC00\uC7A5 \uB192\uC740 \uC0AC\uB78C\uC740 \uAE30\uBCF8 +1\uC810\uC73C\uB85C \uACC4\uC0B0\uD574\uC694.",
  "single-fairy": "\uAC00\uC838\uC628 \uC694\uC815 \uD55C \uC7A5\uB9C8\uB2E4 \u22121\uC810\uC774\uC5D0\uC694. \uB77C\uC6B4\uB4DC \uC810\uC218\uB294 \uC74C\uC218\uAC00 \uB420 \uC218 \uC788\uC5B4\uC694.",
  "midnight-makeover": "\uC694\uC815\uC740 \uC120\uB450 \uBB34\uB2AC\uB97C \uB300\uC2E0\uD574 \uB0BC \uC218 \uC788\uC5B4\uC694. \uC120\uB450 \uBB34\uB2AC \uB610\uB294 \uC694\uC815 \uC911 \uD070 \uC218\uAC00 \uC774\uAE30\uACE0, \uB3D9\uB960\uC774\uBA74 \uB098\uC911 \uCE74\uB4DC\uAC00 \uC774\uACA8\uC694.",
  "blind-mans-bluff": "\uCC98\uC74C \uBC1B\uC740 \uCE74\uB4DC\uC758 \uC808\uBC18\uC744 \uB0B8 \uB4A4 \uB0A8\uC740 \uC190\uD328\uB97C \uC624\uB978\uCABD \uC0AC\uB78C\uC5D0\uAC8C \uB118\uACA8\uC11C \uACC4\uC18D \uD50C\uB808\uC774\uD574\uC694.",
  "odds-and-evens": "\uAC00\uB2A5\uD558\uBA74 \uC120\uB450 \uCE74\uB4DC\uC758 \uBB34\uB2AC\uC640 \uD640\uC9DD\uC744 \uBAA8\uB450 \uB530\uB974\uC138\uC694. \uBB34\uB2AC\uB97C \uC6B0\uC120\uD558\uACE0, \uBB34\uB2AC\uAC00 \uC5C6\uC5B4\uB3C4 \uAC00\uB2A5\uD55C \uD640\uC9DD\uC744 \uB530\uB77C\uC694.",
  "pass-the-bouquet": "\uCC98\uC74C \uB4F1\uC7A5\uD558\uB294 \uC0C8 \uBB34\uB2AC\uAC00 \uC120\uB450 \uBB34\uB2AC\uB97C \uBC14\uAFD4\uC694. \uB9C8\uC9C0\uB9C9\uC73C\uB85C \uC0C8\uB85C \uB098\uC628 \uBB34\uB2AC\uC758 \uAC00\uC7A5 \uD070 \uC218\uAC00 \uC774\uACA8\uC694.",
  "haggle-with-the-hag": "\uD2B8\uB9AD \uC2B9\uC790\uB294 \uC790\uC2E0\uC758 \uC190\uD328 1\uC7A5\uC744 \uBC29\uAE08 \uAC00\uC838\uC628 \uCE74\uB4DC 1\uC7A5\uACFC \uAD50\uD658\uD560 \uC218 \uC788\uC5B4\uC694. \uC790\uC2E0\uC774 \uB0C8\uB358 \uCE74\uB4DC\uB294 \uACE0\uB97C \uC218 \uC5C6\uC5B4\uC694."
};
function deckForPlayers(playerCount) {
  if (playerCount < 3 || playerCount > 6) throw new Error("Rebel Princess requires 3\u20136 players");
  const removed = playerCount === 3 ? /* @__PURE__ */ new Set([1, 11, 12]) : playerCount < 6 ? /* @__PURE__ */ new Set([11, 12]) : /* @__PURE__ */ new Set();
  return SUITS.flatMap((suit) => Array.from({ length: 12 }, (_, index) => index + 1).filter((rank) => !removed.has(rank)).map((rank) => ({ suit, rank })));
}
function seededRandom(seed) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 1831565813;
    let value = hash;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function princessOptionsForPlayers(playerUids, seed) {
  const pool = PRINCESSES.map(([id]) => id);
  const random = seededRandom(`${seed}:princesses`);
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return Object.fromEntries(playerUids.map((uid, index) => [uid, pool.slice(index * 2, index * 2 + 2)]));
}
function roundPowersForGame(seed) {
  const pool = ROUND_RULES.map(([id]) => id);
  const random = seededRandom(`${seed}:round-powers`);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, 5);
}
function dealForPlayers(playerUids, seed) {
  const deck = deckForPlayers(playerUids.length);
  const random = seededRandom(seed);
  for (let index = deck.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  const hands = Object.fromEntries(playerUids.map((uid) => [uid, []]));
  deck.forEach((card, index) => hands[playerUids[index % playerUids.length]].push(card));
  for (const hand of Object.values(hands)) hand.sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);
  return hands;
}
function cardLabel(card) {
  return `${{ fairies: "\uC694\uC815", queens: "\uC5EC\uC655", princes: "\uC655\uC790", pets: "\uB3D9\uBB3C", hidden: "\uBE44\uACF5\uAC1C" }[card.suit]} ${card.rank}`;
}

// work/boardgame-catalog/server/princess/src/lib/passing.ts
var PASS_BY_ROUND = {
  "once-upon-a-time": { direction: "right", count: 3 },
  "late-to-the-ball": { direction: "right", count: 1 },
  "magic-beans": { direction: "left", count: 3 },
  "three-times-a-lady": { direction: "right", count: 3 },
  "arranged-marriage": { direction: "split", count: 2 },
  "royal-decree": { direction: "right", count: 3 },
  "always-the-bridesmaid": { direction: "right", count: 1 },
  "crystal-clear": { direction: "right", count: 2 },
  "masquerade-ball": { direction: "left", count: 1 },
  "pets-revenge": { direction: "split", count: 2 },
  "musical-chairs": { direction: "right", count: 1 },
  sisterhood: { direction: "right", count: 2 },
  "after-party": { direction: "left", count: 1 },
  "late-for-a-very-important-date": { direction: "right", count: 2 },
  "wedding-gift": { direction: "split", count: 2 },
  "haggle-with-the-hag": { direction: "left", count: 1 },
  "blind-mans-bluff": { direction: "right", count: 1 },
  "poisoned-apple": { direction: "left", count: 2 },
  "odds-and-evens": { direction: "right", count: 2 },
  "single-fairy": { direction: "left", count: 1 },
  "prince-rings-twice": { direction: "split", count: 2 },
  "midnight-makeover": { direction: "left", count: 3 },
  "pass-the-bouquet": { direction: "left", count: 3 },
  "upside-down": { direction: "left", count: 2 },
  "bathroom-break": { direction: "left", count: 2 },
  "dancing-queens": { direction: "right", count: 2 },
  invitation: { direction: "right", count: 2 }
};
function passInstruction(roundId) {
  return PASS_BY_ROUND[roundId] ?? { direction: "left", count: 1 };
}
function resolvePasses(playerUids, hands, submissions, instruction) {
  if (playerUids.some((uid) => submissions[uid]?.length !== instruction.count)) throw new Error("Every player must submit the required cards");
  const result = Object.fromEntries(playerUids.map((uid) => {
    const outgoing = new Set(submissions[uid].map(cardLabel));
    if (outgoing.size !== instruction.count || [...outgoing].some((card) => !hands[uid].some((held) => cardLabel(held) === card))) throw new Error("Pass contains missing or duplicate cards");
    return [uid, hands[uid].filter((card) => !outgoing.has(cardLabel(card)))];
  }));
  const give = (from, to, cards) => result[playerUids[to]].push(...cards);
  playerUids.forEach((uid, index) => {
    const cards = submissions[uid];
    if (instruction.direction === "left") give(index, (index + 1) % playerUids.length, cards);
    else if (instruction.direction === "right") give(index, (index - 1 + playerUids.length) % playerUids.length, cards);
    else {
      const midpoint = Math.ceil(cards.length / 2);
      give(index, (index + 1) % playerUids.length, cards.slice(0, midpoint));
      give(index, (index - 1 + playerUids.length) % playerUids.length, cards.slice(midpoint));
    }
  });
  for (const hand of Object.values(result)) hand.sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);
  return result;
}

// work/boardgame-catalog/server/princess/src/lib/trick-taking.ts
function legalCards(hand, trick, princesBroken) {
  if (trick.plays.length === 0) {
    if (trick.requiredSuit && (trick.forcePrinceLead || trick.requiredSuit !== "princes" || princesBroken || hand.every((card) => card.suit === "princes"))) {
      const required = hand.filter((card) => card.suit === trick.requiredSuit);
      if (required.length) return required;
    }
    const nonPrinces = hand.filter((card) => card.suit !== "princes");
    return princesBroken || nonPrinces.length === 0 ? hand : nonPrinces;
  }
  const ledSuit = trick.plays[0].card.suit;
  const following = hand.filter((card) => card.suit === ledSuit);
  return following.length ? following : hand;
}
function trickWinner(trick) {
  const ledSuit = trick.plays[0].card.suit;
  return trick.plays.filter((play) => play.card.suit === ledSuit).reduce((winner, play) => {
    const rank = play.effectiveRank ?? play.card.rank;
    const winnerRank = winner.effectiveRank ?? winner.card.rank;
    return trick.reversed ? rank < winnerRank ? play : winner : rank > winnerRank ? play : winner;
  }).uid;
}
function breaksPrinces(trick, card) {
  return trick.plays.length > 0 && card.suit === "princes" && trick.plays[0].card.suit !== "princes";
}

// work/boardgame-catalog/server/princess/src/lib/princess-powers.ts
function legalCardsWithPeaPower(hand, trick, princesBroken, active) {
  const legal = legalCards(hand, trick, princesBroken);
  if (!active) return legal;
  const high = legal.filter((card) => card.rank > 5);
  return high.length ? high : legal;
}
function snowWhiteCanZero(card) {
  return card.rank <= 7;
}
function mulanReplacements(hand, play) {
  if (play.card.suit === "pets" && play.card.rank === 8) return [];
  return hand.filter((card) => card.suit === play.card.suit && cardLabel(card) !== cardLabel(play.card));
}
function thumbelinaCanPlay(card) {
  return card.suit !== "princes" && !(card.suit === "pets" && card.rank === 8);
}

// work/boardgame-catalog/server/princess/src/lib/interactive-princess-powers.ts
function deterministicCards(hand, key, count) {
  if (!hand.length) return [];
  const start = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0) % hand.length;
  return Array.from({ length: Math.min(count, hand.length) }, (_, offset) => hand[(start + offset) % hand.length]);
}
function sortedHand(hand) {
  return [...hand].sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank);
}
function exchangeCards(actorHand, targetHand, taken, given) {
  return {
    actor: sortedHand([...actorHand.filter((card) => cardLabel(card) !== cardLabel(given)), taken]),
    target: sortedHand([...targetHand.filter((card) => cardLabel(card) !== cardLabel(taken)), given])
  };
}
function redistributeCards(hands, recipients, cards) {
  const next = Object.fromEntries(Object.entries(hands).map(([uid, hand]) => [uid, [...hand]]));
  recipients.forEach((uid, index) => next[uid] = sortedHand([...next[uid], cards[index]]));
  return next;
}
function returnedTrickCards(plays, playerCount, key) {
  if (plays.length !== playerCount || plays.some((play) => play.card.suit === "pets" && play.card.rank === 8)) return [];
  return deterministicCards(plays.map((play) => play.card), key, playerCount);
}

// work/boardgame-catalog/server/princess/src/lib/round-rules.ts
function roundLegalCards(hand, trick, princesBroken, roundId, peaActive = false) {
  if (roundId === "pass-the-bouquet" && trick.plays.length) {
    const seen = /* @__PURE__ */ new Set();
    let current = trick.plays[0].card.suit;
    for (const play of trick.plays) {
      if (!seen.has(play.card.suit)) current = play.card.suit;
      seen.add(play.card.suit);
    }
    const following = hand.filter((card) => card.suit === current);
    const legal2 = following.length ? following : hand;
    const high = peaActive ? legal2.filter((card) => card.rank > 5) : [];
    return high.length ? high : legal2;
  }
  const legal = legalCardsWithPeaPower(hand, trick, princesBroken, peaActive);
  if (roundId === "midnight-makeover" && trick.plays.length) {
    const ledSuit = trick.plays[0].card.suit;
    const follows = hand.filter((card) => card.suit === ledSuit || card.suit === "fairies");
    return hand.some((card) => card.suit === ledSuit) && follows.length ? follows : legal;
  }
  if (roundId === "odds-and-evens" && trick.plays.length) {
    const parity = trick.plays[0].card.rank % 2;
    const matching = legal.filter((card) => card.rank % 2 === parity);
    return matching.length ? matching : legal;
  }
  if (roundId !== "magic-beans") return legal;
  return legal.filter((card) => {
    const ranks = legal.filter((candidate) => candidate.suit === card.suit).map((candidate) => candidate.rank);
    return card.rank === Math.min(...ranks) || card.rank === Math.max(...ranks);
  });
}
function roundTrickWinner(trick, roundId) {
  if (roundId === "pass-the-bouquet") {
    const seen = /* @__PURE__ */ new Set();
    let current = trick.plays[0]?.card.suit;
    for (const play of trick.plays) {
      if (!seen.has(play.card.suit)) current = play.card.suit;
      seen.add(play.card.suit);
    }
    const eligible = trick.plays.filter((play) => play.card.suit === current);
    return eligible.reduce((winner, play) => (play.effectiveRank ?? play.card.rank) > (winner.effectiveRank ?? winner.card.rank) ? play : winner).uid;
  }
  if (roundId === "midnight-makeover") {
    const ledSuit = trick.plays[0]?.card.suit;
    const eligible = trick.plays.filter((play) => play.card.suit === ledSuit || play.card.suit === "fairies");
    return eligible.reduce((winner, play) => (play.effectiveRank ?? play.card.rank) >= (winner.effectiveRank ?? winner.card.rank) ? play : winner).uid;
  }
  if (roundId === "prince-rings-twice") {
    const ledSuit = trick.plays[0]?.card.suit;
    const totals = /* @__PURE__ */ new Map();
    for (const play of trick.plays) {
      const current = totals.get(play.uid) ?? { total: 0, high: 0 };
      const rank = play.effectiveRank ?? play.card.rank;
      if (play.card.suit === ledSuit) {
        current.total += rank;
        current.high = Math.max(current.high, rank);
      }
      totals.set(play.uid, current);
    }
    return [...totals].reduce((winner, entry) => entry[1].total > winner[1].total || entry[1].total === winner[1].total && entry[1].high > winner[1].high ? entry : winner)[0];
  }
  if (roundId === "poisoned-apple") {
    const ledSuit = trick.plays[0]?.card.suit;
    const voids = trick.plays.filter((play) => play.card.suit !== ledSuit);
    if (!voids.length) return trickWinner(trick);
    return voids.reduce((winner, play) => {
      const rank = play.effectiveRank ?? play.card.rank;
      const winnerRank = winner.effectiveRank ?? winner.card.rank;
      return trick.reversed ? rank < winnerRank ? play : winner : rank > winnerRank ? play : winner;
    }).uid;
  }
  if (roundId === "sisterhood") {
    const lead = trick.plays[0];
    if (!lead) return trick.leaderUid;
    const suited = trick.plays.filter((play) => play.card.suit === lead.card.suit);
    const candidates = suited.length > 1 ? suited : trick.plays;
    const leadRank = lead.effectiveRank ?? lead.card.rank;
    return candidates.reduce((winner, play) => {
      const rank = play.effectiveRank ?? play.card.rank;
      const winnerRank = winner.effectiveRank ?? winner.card.rank;
      const distance = Math.abs(rank - leadRank);
      const winnerDistance = Math.abs(winnerRank - leadRank);
      return distance > winnerDistance || distance === winnerDistance && rank > winnerRank ? play : winner;
    }).uid;
  }
  if (roundId === "always-the-bridesmaid") {
    const ledSuit = trick.plays[0]?.card.suit;
    const followers = trick.plays.filter((play) => play.card.suit === ledSuit);
    if (followers.length === 1) return followers[0].uid;
    const ordered = [...followers].sort((left, right) => {
      const leftRank = left.effectiveRank ?? left.card.rank;
      const rightRank = right.effectiveRank ?? right.card.rank;
      return trick.reversed ? leftRank - rightRank : rightRank - leftRank;
    });
    return ordered[1].uid;
  }
  if (roundId !== "royal-decree") return trickWinner(trick);
  const queens = trick.plays.filter((play) => play.card.suit === "queens");
  if (!queens.length) return trickWinner(trick);
  return queens.reduce((winner, play) => {
    const rank = play.effectiveRank ?? play.card.rank;
    const winnerRank = winner.effectiveRank ?? winner.card.rank;
    return trick.reversed ? rank < winnerRank ? play : winner : rank > winnerRank ? play : winner;
  }).uid;
}
function cardsPerTrick(roundId) {
  return roundId === "prince-rings-twice" ? 2 : 1;
}
function isRebelOfBall(cards, roundId, princeCountInDeck) {
  return roundId !== "wedding-gift" && princeCountInDeck >= 9 && cards.filter((card) => card.suit === "princes").length === princeCountInDeck && cards.some((card) => card.suit === "pets" && card.rank === 8);
}
function roundCardScore(cards, roundId, bathroomExempt = false, princeCountInDeck = Number.POSITIVE_INFINITY) {
  const princes = cards.filter((card) => card.suit === "princes").length;
  const frog = cards.some((card) => card.suit === "pets" && card.rank === 8) ? 5 : 0;
  const princeRanks = cards.filter((card) => card.suit === "princes").map((card) => card.rank);
  const queenRanks = cards.filter((card) => card.suit === "queens").map((card) => card.rank);
  const matchingCouples = princeRanks.filter((rank) => queenRanks.includes(rank)).length;
  const unmatchedCouples = Math.min(princeRanks.length - matchingCouples, queenRanks.length - matchingCouples);
  const roundRule = roundId === "pets-revenge" ? cards.filter((card) => card.suit === "pets").length : roundId === "three-times-a-lady" ? -3 * cards.filter((card) => card.rank === 3).length : roundId === "single-fairy" ? -cards.filter((card) => card.suit === "fairies").length : roundId === "bathroom-break" && !bathroomExempt ? princes : roundId === "dancing-queens" ? matchingCouples * 2 + unmatchedCouples : roundId === "arranged-marriage" && cards.length === 0 ? 5 : 0;
  if (isRebelOfBall(cards, roundId, princeCountInDeck)) return { princes, frog, roundRule: -10 - princes - frog, total: -10 };
  return { princes, frog, roundRule, total: princes + frog + roundRule };
}
function isMasqueradeHidden(roundId, trick, uid, playerCount) {
  return roundId === "masquerade-ball" && trick.plays.length > 0 && trick.plays.length < playerCount && uid !== trick.leaderUid;
}

// work/boardgame-catalog/server/princess/src/lib/choice-commitment.ts
var SHA256_CONSTANTS = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
];
var rotateRight = (value, count) => value >>> count | value << 32 - count;
function sha256(value) {
  const input = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 128;
  const view = new DataView(padded.buffer);
  const bitLength = input.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const hash = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const prior15 = words[index - 15];
      const prior2 = words[index - 2];
      const sigma0 = rotateRight(prior15, 7) ^ rotateRight(prior15, 18) ^ prior15 >>> 3;
      const sigma1 = rotateRight(prior2, 17) ^ rotateRight(prior2, 19) ^ prior2 >>> 10;
      words[index] = words[index - 16] + sigma0 + words[index - 7] + sigma1 >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = e & f ^ ~e & g;
      const temporary1 = h + sum1 + choice + SHA256_CONSTANTS[index] + words[index] >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = a & b ^ a & c ^ b & c;
      const temporary2 = sum0 + majority >>> 0;
      h = g;
      g = f;
      f = e;
      e = d + temporary1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temporary1 + temporary2 >>> 0;
    }
    hash[0] = hash[0] + a >>> 0;
    hash[1] = hash[1] + b >>> 0;
    hash[2] = hash[2] + c >>> 0;
    hash[3] = hash[3] + d >>> 0;
    hash[4] = hash[4] + e >>> 0;
    hash[5] = hash[5] + f >>> 0;
    hash[6] = hash[6] + g >>> 0;
    hash[7] = hash[7] + h >>> 0;
  }
  return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
}
function choiceCommitment(scope, choice, nonce) {
  return sha256(JSON.stringify([scope, choice, nonce]));
}
function princessChoiceScope(gameId, gameNumber, uid) {
  return `princess:${gameId}:${gameNumber}:${uid}`;
}
function crystalClearChoiceScope(gameId, gameNumber, roundIndex, uid) {
  return `crystal-clear:${gameId}:${gameNumber}:${roundIndex}:${uid}`;
}

// work/boardgame-catalog/server/princess/src/lib/rules-engine.ts
var SCHEMA_VERSION = 1;
var REDUCER_VERSION = 1;
function nextRoundLeader(playerUids, totalScores, lastLeaderUid) {
  if (!playerUids.length) return null;
  const lowest = Math.min(...playerUids.map((uid) => totalScores[uid] ?? 0));
  const lastIndex = Math.max(0, playerUids.indexOf(lastLeaderUid));
  for (let offset = 1; offset <= playerUids.length; offset += 1) {
    const uid = playerUids[(lastIndex + offset) % playerUids.length];
    if ((totalScores[uid] ?? 0) === lowest) return uid;
  }
  return playerUids[0];
}
function gameWinners(playerUids, totalScores, zeroRounds) {
  if (!playerUids.length) return [];
  const lowestScore = Math.min(...playerUids.map((uid) => totalScores[uid] ?? 0));
  const scoreLeaders = playerUids.filter((uid) => (totalScores[uid] ?? 0) === lowestScore);
  const mostZeroRounds = Math.max(...scoreLeaders.map((uid) => zeroRounds[uid] ?? 0));
  return scoreLeaders.filter((uid) => (zeroRounds[uid] ?? 0) === mostZeroRounds);
}
function normalizeGameId(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}
function eventId(actorUid, clientSeq) {
  return `${actorUid.replace(/[^A-Za-z0-9_-]/g, "_")}-${String(clientSeq).padStart(10, "0")}`;
}
function isGameEvent(value) {
  if (!value || typeof value !== "object") return false;
  const event = value;
  const payload = event.payload;
  const common = ["game/created", "game/rematched", "player/joined", "player/princess-committed", "player/configured", "game/dealt", "pass/submitted", "pass/retracted", "card/played", "power/activated", "power/contributed", "power/declined", "round/card-set-aside", "round/pass-submitted", "round/suit-committed", "round/suit-revealed", "round/half-selected", "round/gift-submitted", "round/haggle-swapped", "round/haggle-declined"].includes(String(event.type)) && typeof event.actorUid === "string" && Number.isInteger(event.clientSeq) && event.schemaVersion === SCHEMA_VERSION && event.reducerVersion === REDUCER_VERSION && !!payload && typeof payload.gameId === "string";
  if (!common) return false;
  if (event.type === "game/created" || event.type === "player/joined") return typeof payload.displayName === "string";
  if (event.type === "player/princess-committed" || event.type === "round/suit-committed") return typeof payload.commitment === "string" && /^[a-f0-9]{64}$/.test(payload.commitment);
  if (event.type === "player/configured") return (payload.princessId === void 0 || typeof payload.princessId === "string") && (payload.nonce === void 0 || typeof payload.nonce === "string") && typeof payload.ready === "boolean";
  if (event.type === "game/dealt") return typeof payload.seed === "string" && Array.isArray(payload.roundIds) && payload.roundIds.length === 5 && !!payload.hands && typeof payload.hands === "object";
  if (event.type === "pass/submitted") return Array.isArray(payload.cards) && payload.cards.length > 0;
  if (event.type === "card/played") return !!payload.card && typeof payload.card === "object";
  if (event.type === "power/activated") return typeof payload.powerId === "string";
  if (event.type === "power/contributed") return payload.powerId === "sleeping-beauty" && !!payload.card;
  if (event.type === "power/declined") return payload.powerId === "mulan" || payload.powerId === "scheherazade";
  if (event.type === "round/card-set-aside" || event.type === "round/pass-submitted" || event.type === "round/gift-submitted") return !!payload.card;
  if (event.type === "round/suit-revealed") return typeof payload.suit === "string" && SUITS.includes(payload.suit) && (payload.nonce === void 0 || typeof payload.nonce === "string");
  if (event.type === "round/half-selected") return Array.isArray(payload.cards) && payload.cards.length > 0;
  if (event.type === "round/haggle-swapped") return Array.isArray(payload.cards) && payload.cards.length === 2;
  if (event.type === "round/haggle-declined") return Object.keys(payload).length === 1;
  return Object.keys(payload).length === 1;
}
function orderEvents(events) {
  return [...events].sort((left, right) => {
    const time = (left.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) - (right.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER);
    return time || left.id.localeCompare(right.id);
  });
}
function eventCursor(events) {
  const last = orderEvents(events).at(-1);
  return last ? { createdAtMillis: last.createdAt?.toMillis() ?? null, eventId: last.id } : null;
}
function deriveGame(events) {
  const ordered = orderEvents(events);
  const players = /* @__PURE__ */ new Map();
  let gameId = "";
  let roundIds = [];
  let seed = null;
  const lastRematchIndex = ordered.findLastIndex((event) => event.type === "game/rematched");
  const gameNumber = ordered.filter((event) => event.type === "game/rematched").length;
  const usesSealedPrincesses = ordered.some((event, index) => index > lastRematchIndex && event.type === "player/princess-committed");
  const firstDealIndex = ordered.findIndex((event) => event.type === "game/dealt");
  let artworkOption = "classic";
  for (const [index, event] of ordered.entries()) {
    gameId ||= event.payload.gameId;
    const roomOpen = firstDealIndex < 0 || index < firstDealIndex;
    if ((event.type === "game/created" || event.type === "player/joined") && !players.has(event.actorUid) && players.size < 6 && roomOpen) {
      players.set(event.actorUid, {
        uid: event.actorUid,
        displayName: event.payload.displayName ?? "Player",
        host: event.type === "game/created",
        ready: false
      });
    }
    if (event.payload.artworkOption) {
      artworkOption = event.payload.artworkOption;
    }
  }
  const setupPlayers = [...players.values()];
  const princessOptions = princessOptionsForPlayers(setupPlayers.map((player) => player.uid), gameNumber ? `${gameId}:rematch:${gameNumber}` : gameId);
  const princessCommitments = {};
  const princessReveals = {};
  for (const [index, event] of ordered.entries()) {
    if (index <= lastRematchIndex) continue;
    const player = players.get(event.actorUid);
    if (event.type === "player/princess-committed" && player && event.payload.commitment && !princessReveals[player.uid]) {
      princessCommitments[player.uid] = event.payload.commitment;
    }
    if (event.type !== "player/configured" || !player) continue;
    if (!usesSealedPrincesses) {
      players.set(player.uid, { ...player, princessId: event.payload.princessId, ready: event.payload.ready === true });
      continue;
    }
    const princessId = event.payload.princessId;
    const nonce = event.payload.nonce;
    if (!princessId || !nonce || event.payload.ready !== true || princessReveals[player.uid] || !setupPlayers.every((candidate) => princessCommitments[candidate.uid])) continue;
    if (!princessOptions[player.uid]?.includes(princessId)) continue;
    if (choiceCommitment(princessChoiceScope(gameId, gameNumber, player.uid), princessId, nonce) !== princessCommitments[player.uid]) continue;
    princessReveals[player.uid] = princessId;
  }
  if (usesSealedPrincesses && setupPlayers.length >= 3 && setupPlayers.every((player) => princessReveals[player.uid])) {
    for (const player of setupPlayers) players.set(player.uid, { ...player, princessId: princessReveals[player.uid], ready: true });
  }
  const playerList = [...players.values()];
  const deals = ordered.map((event, index) => ({ event, index })).filter(({ event, index }) => event.type === "game/dealt" && index > lastRematchIndex);
  const emptyCounts = () => Object.fromEntries(playerList.map((player) => [player.uid, 0]));
  const emptyTricks = () => Object.fromEntries(playerList.map((player) => [player.uid, []]));
  const replayRound = (deal, segment, leaderUid2, priorTotals) => {
    const originalHandSize = deal.payload.hands?.[playerList[0]?.uid]?.length ?? 0;
    const blindTransferAfterTricks = originalHandSize / 2;
    let roundHands = deal.payload.hands ? Object.fromEntries(Object.entries(deal.payload.hands).map(([uid, cards]) => [uid, cards.map((card) => ({ ...card }))])) : null;
    const submissions = {};
    for (const event of segment) {
      if (event.type === "pass/submitted") submissions[event.actorUid] = event.payload.cards ?? [];
      if (event.type === "pass/retracted") delete submissions[event.actorUid];
    }
    const completePass = Boolean(roundHands && playerList.length >= 3 && playerList.every((player) => submissions[player.uid]));
    const roundNumber = deals.findIndex(({ event }) => event === deal);
    const roundId = deal.payload.roundIds?.[roundNumber] ?? "";
    if (completePass && roundHands) roundHands = resolvePasses(playerList.map((player) => player.uid), roundHands, submissions, passInstruction(deal.payload.roundIds?.[roundNumber] ?? ""));
    let roundTrick = completePass ? { leaderUid: leaderUid2, plays: [] } : null;
    let turnUid = ["late-to-the-ball", "crystal-clear", "after-party", "wedding-gift"].includes(roundId) && completePass ? null : roundTrick?.leaderUid ?? null;
    let broken = false;
    let trickCount = 0;
    const counts = emptyCounts();
    const tricks = emptyTricks();
    let latest = null;
    let lastWinnerUid = null;
    const exhausted = /* @__PURE__ */ new Set();
    let powersThisTrick = [];
    let powerTargets = {};
    let peaActive = false;
    let pendingMulanUid = null;
    let pendingPower = null;
    const forcedCards = {};
    let awaitingRoundAction = roundId === "late-to-the-ball" && completePass ? "set-aside" : roundId === "crystal-clear" && completePass ? "reveal-suit" : roundId === "after-party" && completePass ? "split-hand" : roundId === "wedding-gift" && completePass ? "wedding-gift" : null;
    let roundActionSubmissions = {};
    let roundCardSubmissions = {};
    const revealedSuits = {};
    const pendingRevealedSuits = {};
    const suitCommitments = {};
    const usesSealedSuits = segment.some((event) => event.type === "round/suit-committed");
    const retainedCards = Object.fromEntries(playerList.map((player) => [player.uid, []]));
    const afterPartyReserves = {};
    let afterPartyReleased = false;
    let giftPile = [];
    let haggleWinnerUid = null;
    let blindTransferComplete = false;
    const setAsideCards = {};
    let lateCardsReleased = false;
    const snowZero = /* @__PURE__ */ new Map();
    const thumbelinaPlays = /* @__PURE__ */ new Map();
    const resolveTrick = () => {
      if (!roundTrick || roundTrick.plays.length !== playerList.length * cardsPerTrick(roundId)) return;
      const winner = roundTrickWinner(roundTrick, roundId);
      counts[winner] += roundTrick.plays.length;
      const completed = roundTrick.plays.map((play) => ({ ...play, card: { ...play.card } }));
      tricks[winner].push([...completed, ...giftPile.map((play) => ({ ...play, card: { ...play.card } }))]);
      latest = { winnerUid: winner, plays: completed };
      lastWinnerUid = winner;
      trickCount += 1;
      roundTrick = { leaderUid: winner, plays: [] };
      turnUid = winner;
      pendingMulanUid = null;
      peaActive = false;
      powersThisTrick = [];
      powerTargets = {};
      giftPile = [];
      if (roundId === "blind-mans-bluff" && trickCount === blindTransferAfterTricks && !blindTransferComplete) {
        const before = Object.fromEntries(playerList.map((player) => [player.uid, roundHands[player.uid]]));
        playerList.forEach((player, index) => {
          roundHands[playerList[(index - 1 + playerList.length) % playerList.length].uid] = before[player.uid];
        });
        blindTransferComplete = true;
      }
      if (roundId === "late-to-the-ball" && !lateCardsReleased && playerList.every((player) => roundHands?.[player.uid].length === 0) && playerList.every((player) => setAsideCards[player.uid])) {
        playerList.forEach((player) => roundHands[player.uid].push(setAsideCards[player.uid]));
        lateCardsReleased = true;
      } else if (roundId === "musical-chairs" && playerList.some((player) => roundHands?.[player.uid].length)) {
        awaitingRoundAction = "musical-pass";
        turnUid = "";
      } else if (roundId === "after-party" && !afterPartyReleased && playerList.every((player) => roundHands?.[player.uid].length === 0)) {
        playerList.forEach((player) => roundHands[player.uid].push(...afterPartyReserves[player.uid]));
        playerList.forEach((player) => sortHand(player.uid));
        afterPartyReleased = true;
      } else if (roundId === "late-for-a-very-important-date" && playerList.every((player) => roundHands?.[player.uid].length === 3)) {
        playerList.forEach((player) => {
          retainedCards[player.uid] = roundHands[player.uid].map((card) => ({ ...card }));
          roundHands[player.uid] = [];
        });
      } else if (roundId === "wedding-gift" && playerList.some((player) => roundHands?.[player.uid].length)) {
        awaitingRoundAction = "wedding-gift";
        turnUid = "";
      } else if (roundId === "haggle-with-the-hag" && roundHands?.[winner].length) {
        awaitingRoundAction = "haggle";
        haggleWinnerUid = winner;
        turnUid = "";
      }
    };
    const randomCards = (uid, count, powerId) => {
      const hand = roundHands?.[uid] ?? [];
      return deterministicCards(hand, `${deal.payload.seed}:${trickCount}:${powerId}:${uid}`, count);
    };
    const sortHand = (uid) => roundHands?.[uid]?.sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank);
    if (roundHands && roundTrick) for (const event of segment.filter((entry) => ["card/played", "power/activated", "power/contributed", "power/declined", "round/card-set-aside", "round/pass-submitted", "round/suit-committed", "round/suit-revealed", "round/half-selected", "round/gift-submitted", "round/haggle-swapped", "round/haggle-declined"].includes(entry.type))) {
      const player = playerList.find((candidate) => candidate.uid === event.actorUid);
      if (event.type === "round/haggle-declined") {
        const activeAction = awaitingRoundAction;
        if (activeAction !== "haggle" || event.actorUid !== haggleWinnerUid) continue;
        awaitingRoundAction = null;
        turnUid = haggleWinnerUid;
        haggleWinnerUid = null;
        continue;
      }
      if (event.type === "round/haggle-swapped") {
        const [offered, taken] = event.payload.cards ?? [];
        const won = haggleWinnerUid ? tricks[haggleWinnerUid].at(-1) : void 0;
        const completed = latest;
        const ownPlay = completed?.plays.find((play) => play.uid === haggleWinnerUid)?.card;
        const activeAction = awaitingRoundAction;
        if (activeAction !== "haggle" || event.actorUid !== haggleWinnerUid || !offered || !taken || !won || !ownPlay || !roundHands[event.actorUid].some((card2) => cardLabel(card2) === cardLabel(offered)) || !won.some((play) => cardLabel(play.card) === cardLabel(taken)) || cardLabel(ownPlay) === cardLabel(taken)) continue;
        roundHands[event.actorUid] = roundHands[event.actorUid].filter((card2) => cardLabel(card2) !== cardLabel(offered));
        roundHands[event.actorUid].push(taken);
        sortHand(event.actorUid);
        const takenPlay = won.find((play) => cardLabel(play.card) === cardLabel(taken));
        takenPlay.card = offered;
        awaitingRoundAction = null;
        turnUid = haggleWinnerUid;
        haggleWinnerUid = null;
        continue;
      }
      if (event.type === "round/gift-submitted") {
        const card2 = event.payload.card;
        if (awaitingRoundAction !== "wedding-gift" || !player || !card2 || roundActionSubmissions[player.uid] || !roundHands[player.uid].some((held) => cardLabel(held) === cardLabel(card2))) continue;
        roundActionSubmissions[player.uid] = card2;
        if (playerList.every((candidate) => roundActionSubmissions[candidate.uid])) {
          giftPile = playerList.map((candidate) => ({ uid: candidate.uid, card: roundActionSubmissions[candidate.uid] }));
          playerList.forEach((candidate) => {
            roundHands[candidate.uid] = roundHands[candidate.uid].filter((held) => cardLabel(held) !== cardLabel(roundActionSubmissions[candidate.uid]));
          });
          roundActionSubmissions = {};
          awaitingRoundAction = null;
          turnUid = roundTrick.leaderUid;
        }
        continue;
      }
      if (event.type === "round/half-selected") {
        const cards = event.payload.cards ?? [];
        const hand = player ? roundHands[player.uid] : [];
        if (awaitingRoundAction !== "split-hand" || !player || roundCardSubmissions[player.uid] || cards.length * 2 !== hand.length || new Set(cards.map(cardLabel)).size !== cards.length || !cards.every((card2) => hand.some((held) => cardLabel(held) === cardLabel(card2)))) continue;
        roundCardSubmissions[player.uid] = cards;
        afterPartyReserves[player.uid] = hand.filter((held) => !cards.some((card2) => cardLabel(card2) === cardLabel(held)));
        roundHands[player.uid] = cards.map((card2) => ({ ...card2 }));
        sortHand(player.uid);
        if (playerList.every((candidate) => roundCardSubmissions[candidate.uid])) {
          awaitingRoundAction = null;
          turnUid = roundTrick.leaderUid;
        }
        continue;
      }
      if (event.type === "round/suit-committed") {
        if (awaitingRoundAction !== "reveal-suit" || !player || !event.payload.commitment || suitCommitments[player.uid]) continue;
        suitCommitments[player.uid] = event.payload.commitment;
        continue;
      }
      if (event.type === "round/suit-revealed") {
        const suit = event.payload.suit;
        if (awaitingRoundAction !== "reveal-suit" || !player || !suit || pendingRevealedSuits[player.uid] || !roundHands[player.uid].some((card2) => card2.suit === suit)) continue;
        if (usesSealedSuits) {
          if (!event.payload.nonce || !playerList.every((candidate) => suitCommitments[candidate.uid])) continue;
          if (choiceCommitment(crystalClearChoiceScope(gameId, gameNumber, roundNumber, player.uid), suit, event.payload.nonce) !== suitCommitments[player.uid]) continue;
        }
        pendingRevealedSuits[player.uid] = suit;
        if (playerList.every((candidate) => pendingRevealedSuits[candidate.uid])) {
          Object.assign(revealedSuits, pendingRevealedSuits);
          awaitingRoundAction = null;
          turnUid = roundTrick.leaderUid;
        }
        continue;
      }
      if (event.type === "round/card-set-aside") {
        if (awaitingRoundAction !== "set-aside" || !player || !event.payload.card || setAsideCards[player.uid] || !roundHands[player.uid].some((card2) => cardLabel(card2) === cardLabel(event.payload.card))) continue;
        setAsideCards[player.uid] = event.payload.card;
        roundActionSubmissions[player.uid] = event.payload.card;
        roundHands[player.uid] = roundHands[player.uid].filter((card2) => cardLabel(card2) !== cardLabel(event.payload.card));
        if (playerList.every((candidate) => setAsideCards[candidate.uid])) {
          awaitingRoundAction = null;
          roundActionSubmissions = {};
          turnUid = roundTrick.leaderUid;
        }
        continue;
      }
      if (event.type === "round/pass-submitted") {
        const activeRoundAction = awaitingRoundAction;
        if (activeRoundAction !== "musical-pass" || !player || !event.payload.card || roundActionSubmissions[player.uid] || !roundHands[player.uid].some((card2) => cardLabel(card2) === cardLabel(event.payload.card))) continue;
        roundActionSubmissions[player.uid] = event.payload.card;
        if (playerList.every((candidate) => roundActionSubmissions[candidate.uid])) {
          const nextHands = Object.fromEntries(playerList.map((candidate) => [candidate.uid, roundHands[candidate.uid].filter((card2) => cardLabel(card2) !== cardLabel(roundActionSubmissions[candidate.uid]))]));
          playerList.forEach((candidate, index) => nextHands[playerList[(index - 1 + playerList.length) % playerList.length].uid].push(roundActionSubmissions[candidate.uid]));
          roundHands = Object.fromEntries(Object.entries(nextHands).map(([uid, hand]) => [uid, hand.sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank)]));
          roundActionSubmissions = {};
          awaitingRoundAction = null;
          turnUid = roundTrick.leaderUid;
        }
        continue;
      }
      if (event.type === "power/contributed") {
        if (pendingPower?.powerId !== "sleeping-beauty" || !event.payload.card || pendingPower.cards.some((entry) => entry.uid === event.actorUid)) continue;
        if (!roundHands[event.actorUid]?.some((card2) => cardLabel(card2) === cardLabel(event.payload.card))) continue;
        roundHands[event.actorUid] = roundHands[event.actorUid].filter((card2) => cardLabel(card2) !== cardLabel(event.payload.card));
        pendingPower.cards.push({ uid: event.actorUid, card: event.payload.card });
        pendingPower.cards.sort(
          (left, right) => playerList.findIndex((player2) => player2.uid === left.uid) - playerList.findIndex((player2) => player2.uid === right.uid)
        );
        continue;
      }
      if (event.type === "power/declined") {
        if (pendingMulanUid === event.actorUid) resolveTrick();
        if (pendingPower?.powerId === "scheherazade" && pendingPower.actorUid === event.actorUid) {
          exhausted.add(event.actorUid);
          powersThisTrick.push("scheherazade");
          pendingPower = null;
        }
        continue;
      }
      if (event.type === "power/activated") {
        const powerId = event.payload.powerId;
        if (!player || player.princessId !== powerId || !powerId) continue;
        if (powerId === "mulan" && pendingMulanUid === player.uid) {
          if (!event.payload.card || !roundTrick) continue;
          const play = roundTrick.plays.find((entry) => entry.uid === player.uid);
          if (!play || !mulanReplacements(roundHands[player.uid], play).some((card2) => cardLabel(card2) === cardLabel(event.payload.card))) continue;
          roundHands[player.uid] = roundHands[player.uid].filter((card2) => cardLabel(card2) !== cardLabel(event.payload.card));
          roundHands[player.uid].push(play.card);
          roundHands[player.uid].sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank);
          play.card = event.payload.card;
          exhausted.add(player.uid);
          powersThisTrick.push(powerId);
          resolveTrick();
          continue;
        }
        const activePending = pendingPower;
        if (activePending?.actorUid === player.uid && activePending.powerId === powerId) {
          if (powerId === "ice-princess" && activePending.targetUid && event.payload.card && activePending.cards.some((entry) => cardLabel(entry.card) === cardLabel(event.payload.card))) {
            forcedCards[activePending.targetUid] = event.payload.card;
            if (event.payload.card.suit === "princes") broken = true;
            powerTargets[powerId] = activePending.targetUid;
            exhausted.add(player.uid);
            powersThisTrick.push(powerId);
            pendingPower = null;
          } else if (powerId === "scheherazade" && activePending.targetUid && event.payload.card && roundHands[player.uid].some((card2) => cardLabel(card2) === cardLabel(event.payload.card))) {
            const taken = activePending.cards[0].card;
            const exchanged = exchangeCards(roundHands[player.uid], roundHands[activePending.targetUid], taken, event.payload.card);
            roundHands[player.uid] = exchanged.actor;
            roundHands[activePending.targetUid] = exchanged.target;
            exhausted.add(player.uid);
            powersThisTrick.push(powerId);
            pendingPower = null;
          } else if (powerId === "sleeping-beauty" && event.payload.cards?.length === playerList.length && activePending.cards.length === playerList.length) {
            const contributed = new Set(activePending.cards.map((entry) => cardLabel(entry.card)));
            if (event.payload.cards.every((card2) => contributed.has(cardLabel(card2))) && new Set(event.payload.cards.map(cardLabel)).size === playerList.length) {
              const recipients = [player.uid, ...playerList.filter((candidate) => candidate.uid !== player.uid).map((candidate) => candidate.uid)];
              roundHands = redistributeCards(roundHands, recipients, event.payload.cards);
              exhausted.add(player.uid);
              powersThisTrick.push(powerId);
              pendingPower = null;
            }
          }
          continue;
        }
        if (pendingPower) continue;
        if (exhausted.has(player.uid)) continue;
        if (lateCardsReleased && (powerId === "sleeping-beauty" || powerId === "scheherazade")) continue;
        if (powerId === "mulan") continue;
        if (powerId === "alice") {
          const completed = latest;
          if (!completed || completed.winnerUid !== player.uid || completed.plays.some((play) => play.card.suit === "pets" && play.card.rank === 8)) continue;
          const won = tricks[player.uid].pop();
          if (!won) continue;
          if (won.some((play) => play.card.suit === "princes")) broken = true;
          counts[player.uid] -= won.length;
          const returned = returnedTrickCards(won, playerList.length, `${deal.payload.seed}:alice:${trickCount}`);
          playerList.forEach((recipient, index) => roundHands[recipient.uid].push(returned[index]));
          playerList.forEach((recipient) => sortHand(recipient.uid));
          exhausted.add(player.uid);
          powersThisTrick.push(powerId);
          latest = null;
          continue;
        }
        if (powerId === "snow-white") {
          if (turnUid !== player.uid || !event.payload.card || !snowWhiteCanZero(event.payload.card)) continue;
          if (!roundLegalCards(roundHands[player.uid], roundTrick, broken, roundId, peaActive).some((card2) => cardLabel(card2) === cardLabel(event.payload.card))) continue;
          snowZero.set(player.uid, cardLabel(event.payload.card));
        } else if (powerId === "thumbelina") {
          if (turnUid !== player.uid || roundTrick.plays.length === 0 || !event.payload.card || !thumbelinaCanPlay(event.payload.card)) continue;
          if (!roundHands[player.uid].some((card2) => cardLabel(card2) === cardLabel(event.payload.card))) continue;
          thumbelinaPlays.set(player.uid, cardLabel(event.payload.card));
        } else {
          if (roundTrick.plays.length) continue;
          if (powerId === "little-mermaid" && powerTargets["ice-princess"] === roundTrick.leaderUid) continue;
          if (powerId === "rapunzel" && powersThisTrick.some((id) => id === "little-mermaid" || id === "ice-princess")) continue;
          if (powerId === "little-mermaid" && powersThisTrick.some((id) => id === "rapunzel")) continue;
          if (powerId === "pocahontas" && powersThisTrick.some((id) => id === "little-mermaid" || id === "rapunzel")) continue;
          if (powerId === "sleeping-beauty" && powersThisTrick.some((id) => id === "little-mermaid" || id === "ice-princess" || id === "rapunzel")) continue;
          if (powerId === "scheherazade" && event.payload.targetUid === roundTrick.leaderUid && powersThisTrick.some((id) => id === "little-mermaid" || id === "ice-princess" || id === "rapunzel")) continue;
          if (powerId === "cinderella") roundTrick.reversed = true;
          else if (powerId === "little-mermaid" && event.payload.suit && SUITS.includes(event.payload.suit)) {
            roundTrick.requiredSuit = event.payload.suit;
            powerTargets[powerId] = roundTrick.leaderUid;
          } else if (powerId === "ice-princess" && event.payload.targetUid && playerList.some((candidate) => candidate.uid === event.payload.targetUid)) {
            pendingPower = { powerId, actorUid: player.uid, targetUid: event.payload.targetUid, cards: randomCards(event.payload.targetUid, 2, powerId).map((card2) => ({ uid: event.payload.targetUid, card: card2 })) };
            continue;
          } else if (powerId === "scheherazade" && event.payload.targetUid && event.payload.targetUid !== player.uid && playerList.some((candidate) => candidate.uid === event.payload.targetUid)) {
            pendingPower = { powerId, actorUid: player.uid, targetUid: event.payload.targetUid, cards: randomCards(event.payload.targetUid, 1, powerId).map((card2) => ({ uid: event.payload.targetUid, card: card2 })) };
            continue;
          } else if (powerId === "sleeping-beauty") {
            pendingPower = { powerId, actorUid: player.uid, cards: [] };
            continue;
          } else if (powerId === "pocahontas") {
            if (!playerList.some((candidate) => candidate.uid === event.payload.targetUid)) continue;
            roundTrick.leaderUid = event.payload.targetUid;
            turnUid = event.payload.targetUid;
          } else if (powerId === "rapunzel") {
            roundTrick.requiredSuit = "princes";
            roundTrick.forcePrinceLead = true;
          } else if (powerId === "pea-princess") peaActive = true;
          else continue;
        }
        exhausted.add(player.uid);
        powersThisTrick.push(powerId);
        continue;
      }
      const card = event.payload.card;
      const forced = forcedCards[event.actorUid];
      const thumbelina = card && thumbelinaPlays.get(event.actorUid) === cardLabel(card);
      if (awaitingRoundAction || pendingMulanUid || pendingPower || !card || event.actorUid !== turnUid || !roundHands[event.actorUid]?.some((held) => held.suit === card.suit && held.rank === card.rank) || (forced ? cardLabel(forced) !== cardLabel(card) : !thumbelina && !roundLegalCards(roundHands[event.actorUid], roundTrick, broken, roundId, peaActive).some((held) => cardLabel(held) === cardLabel(card)))) continue;
      broken ||= breaksPrinces(roundTrick, card);
      roundHands[event.actorUid] = roundHands[event.actorUid].filter((held) => held.suit !== card.suit || held.rank !== card.rank);
      delete forcedCards[event.actorUid];
      const zero = snowZero.get(event.actorUid) === cardLabel(card);
      if (roundId === "upside-down" && card.rank === 6) roundTrick.reversed = !roundTrick.reversed;
      roundTrick.plays.push({ uid: event.actorUid, card, ...zero ? { effectiveRank: 0 } : {} });
      snowZero.delete(event.actorUid);
      thumbelinaPlays.delete(event.actorUid);
      if (roundTrick.plays.length === playerList.length * cardsPerTrick(roundId)) {
        const mulan = playerList.find((candidate) => candidate.princessId === "mulan" && !exhausted.has(candidate.uid));
        const mulanPlay = mulan ? roundTrick.plays.find((play) => play.uid === mulan.uid) : void 0;
        if (mulan && mulanPlay && mulanReplacements(roundHands[mulan.uid], mulanPlay).length) {
          pendingMulanUid = mulan.uid;
          turnUid = "";
        } else resolveTrick();
      } else turnUid = playerList[(playerList.findIndex((player2) => player2.uid === event.actorUid) + 1) % playerList.length].uid;
    }
    const finished = Boolean(roundHands && !pendingPower && Object.values(roundHands).every((hand) => hand.length === 0));
    const princeCountInDeck = Object.values(deal.payload.hands ?? {}).flat().filter((card) => card.suit === "princes").length;
    const capturedCards = Object.fromEntries(playerList.map((player) => [player.uid, [...tricks[player.uid].flat().map((play) => play.card), ...retainedCards[player.uid]]]));
    const rebelUids = playerList.filter((player) => isRebelOfBall(capturedCards[player.uid], roundId, princeCountInDeck)).map((player) => player.uid);
    const scores = Object.fromEntries(playerList.map((player) => {
      const cards = capturedCards[player.uid];
      const highestPrior = Math.max(...playerList.map((candidate) => priorTotals[candidate.uid] ?? 0));
      const bathroomExempt = roundId === "bathroom-break" && (priorTotals[player.uid] ?? 0) === highestPrior;
      return [player.uid, roundCardScore(cards, roundId, bathroomExempt, princeCountInDeck)];
    }));
    return { hands: roundHands, passSubmissions: submissions, passComplete: completePass, trick: roundTrick, currentTurnUid: finished ? null : turnUid || null, princesBroken: broken, capturedCounts: counts, capturedTricks: tricks, lastCompletedTrick: latest, completedTricks: trickCount, roundComplete: finished, roundScores: scores, lastWinnerUid, exhaustedPrincessUids: [...exhausted], powerIdsThisTrick: powersThisTrick, pendingMulanUid, pendingPower, forcedCards, awaitingRoundAction, roundActionSubmissions, roundCardSubmissions, revealedSuits, suitCommitments, retainedCards, haggleWinnerUid, blindTransferComplete, rebelUids };
  };
  let leaderUid = playerList[0]?.uid ?? "";
  let active = { hands: null, passSubmissions: {}, passComplete: false, trick: null, currentTurnUid: null, princesBroken: false, capturedCounts: emptyCounts(), capturedTricks: emptyTricks(), lastCompletedTrick: null, completedTricks: 0, roundComplete: false, roundScores: Object.fromEntries(playerList.map((player) => [player.uid, { princes: 0, frog: 0, roundRule: 0, total: 0 }])), lastWinnerUid: null, exhaustedPrincessUids: [], powerIdsThisTrick: [], pendingMulanUid: null, pendingPower: null, forcedCards: {}, awaitingRoundAction: null, roundActionSubmissions: {}, roundCardSubmissions: {}, revealedSuits: {}, suitCommitments: {}, retainedCards: Object.fromEntries(playerList.map((player) => [player.uid, []])), haggleWinnerUid: null, blindTransferComplete: false, rebelUids: [] };
  const totalScores = emptyCounts();
  const zeroRounds = emptyCounts();
  const roundScoreHistory = [];
  deals.forEach(({ event: deal, index }, dealIndex) => {
    const nextIndex = deals[dealIndex + 1]?.index ?? ordered.length;
    const segment = ordered.slice(index + 1, nextIndex);
    active = replayRound(deal, segment, leaderUid, totalScores);
    roundIds = deal.payload.roundIds ?? roundIds;
    seed = deal.payload.seed ?? seed;
    if (active.roundComplete) {
      roundScoreHistory.push(Object.fromEntries(playerList.map((player) => [player.uid, { ...active.roundScores[player.uid] }])));
      for (const player of playerList) {
        totalScores[player.uid] += active.roundScores[player.uid].total;
        if (active.roundScores[player.uid].total === 0) zeroRounds[player.uid] += 1;
      }
      leaderUid = nextRoundLeader(playerList.map((player) => player.uid), totalScores, leaderUid) ?? leaderUid;
    }
  });
  const roundIndex = Math.max(0, deals.length - 1);
  const gameComplete = deals.length === 5 && active.roundComplete;
  let winnerUids = [];
  if (gameComplete) winnerUids = gameWinners(playerList.map((player) => player.uid), totalScores, zeroRounds);
  const { lastWinnerUid: _lastWinnerUid, ...activeProjection } = active;
  return { gameId, players: playerList, roundIds, seed, ...activeProjection, roundScoreHistory, totalScores, roundIndex, nextLeaderUid: leaderUid || null, princessOptions, princessCommitments, gameNumber, gameComplete, zeroRounds, winnerUids, artworkOption };
}

// work/boardgame-catalog/server/princess/src/lib/action-ownership.ts
var IDLE = { state: "idle", label: "" };
function simultaneousChoice(submitted, activeLabel, completeLabel) {
  return submitted ? { state: "complete", label: completeLabel } : { state: "active", label: activeLabel };
}
function actionOwnership(game, uid) {
  if (game.roundComplete) return IDLE;
  if (!game.passComplete) {
    return simultaneousChoice(Boolean(game.passSubmissions[uid]), "\uAD50\uD658\uD560 \uCE74\uB4DC \uC120\uD0DD", "\uAD50\uD658 \uC120\uD0DD \uC644\uB8CC");
  }
  if (game.awaitingRoundAction) {
    if (game.awaitingRoundAction === "haggle") {
      return game.haggleWinnerUid === uid ? { state: "active", label: "\uAD50\uD658 \uC5EC\uBD80 \uC120\uD0DD" } : IDLE;
    }
    if (game.awaitingRoundAction === "reveal-suit") {
      return simultaneousChoice(Boolean(game.suitCommitments[uid]), "\uACF5\uAC1C \uBB34\uB2AC \uC120\uD0DD", "\uBB34\uB2AC \uD655\uC815");
    }
    if (game.awaitingRoundAction === "split-hand") {
      return simultaneousChoice(Boolean(game.roundCardSubmissions[uid]), "\uBA3C\uC800 \uC4F8 \uC190\uD328 \uC120\uD0DD", "\uC190\uD328 \uC120\uD0DD \uC644\uB8CC");
    }
    const labels = {
      "set-aside": ["\uB9C8\uC9C0\uB9C9 \uCE74\uB4DC \uC120\uD0DD", "\uBCF4\uAD00 \uC644\uB8CC"],
      "musical-pass": ["\uCE74\uB4DC \uC120\uD0DD", "\uC120\uD0DD \uC644\uB8CC"],
      "wedding-gift": ["\uC120\uBB3C \uCE74\uB4DC \uC120\uD0DD", "\uC120\uBB3C \uC120\uD0DD \uC644\uB8CC"]
    };
    const [activeLabel, completeLabel] = labels[game.awaitingRoundAction] ?? ["\uCE74\uB4DC \uC120\uD0DD", "\uC900\uBE44 \uC644\uB8CC"];
    return simultaneousChoice(Boolean(game.roundActionSubmissions[uid]), activeLabel, completeLabel);
  }
  if (game.pendingMulanUid) {
    return game.pendingMulanUid === uid ? { state: "active", label: "\uBBAC\uB780 \uAD50\uCCB4 \uC120\uD0DD" } : IDLE;
  }
  if (game.pendingPower) {
    if (game.pendingPower.powerId === "sleeping-beauty") {
      const allCardsCollected = game.pendingPower.cards.length === game.players.length;
      if (allCardsCollected && game.pendingPower.actorUid === uid) return { state: "active", label: "\uCE74\uB4DC \uC7AC\uBD84\uBC30" };
      return simultaneousChoice(game.pendingPower.cards.some((entry) => entry.uid === uid), "\uCE74\uB4DC \uC120\uD0DD", "\uCE74\uB4DC \uC81C\uCD9C \uC644\uB8CC");
    }
    return game.pendingPower.actorUid === uid ? { state: "active", label: "\uB2A5\uB825 \uC120\uD0DD" } : IDLE;
  }
  return game.currentTurnUid === uid ? { state: "active", label: "\uB0BC \uCE74\uB4DC \uC120\uD0DD" } : IDLE;
}
export {
  PRINCESSES,
  REDUCER_VERSION,
  ROUND_RULES,
  ROUND_RULE_TEXT,
  SCHEMA_VERSION,
  SUITS,
  actionOwnership,
  cardLabel,
  cardsPerTrick,
  choiceCommitment,
  crystalClearChoiceScope,
  dealForPlayers,
  deckForPlayers,
  deriveGame,
  eventCursor,
  eventId,
  gameWinners,
  isGameEvent,
  isMasqueradeHidden,
  isRebelOfBall,
  nextRoundLeader,
  normalizeGameId,
  orderEvents,
  passInstruction,
  princessChoiceScope,
  princessOptionsForPlayers,
  resolvePasses,
  roundCardScore,
  roundLegalCards,
  roundPowersForGame,
  roundTrickWinner,
  sha256
};
