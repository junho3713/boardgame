export const SUITS = ['fairies', 'queens', 'princes', 'pets'] as const;
export type Suit = (typeof SUITS)[number];
export interface Card { suit: Suit; rank: number }

export const PRINCESSES = [
  ['snow-white', '백설공주'], ['little-mermaid', '인어공주'],
  ['cinderella', '신데렐라'], ['pocahontas', '포카혼타스'],
  ['sleeping-beauty', '잠자는 숲속의 공주'], ['alice', '앨리스'], ['mulan', '뮬란'],
  ['scheherazade', '셰에라자드'], ['pea-princess', '완두콩 공주'],
  ['ice-princess', '얼음 공주'], ['rapunzel', '라푼젤'],
  ['thumbelina', '엄지공주']
] as const;

export const ROUND_RULES = [
  ['once-upon-a-time', '옛날 옛적에'], ['late-to-the-ball', '무도회에 늦었어요'],
  ['magic-beans', '마법의 콩'], ['three-times-a-lady', '세 번은 숙녀답게'],
  ['arranged-marriage', '정략결혼'], ['royal-decree', '왕실의 명령'],
  ['always-the-bridesmaid', '언제나 들러리'], ['crystal-clear', '수정처럼 투명하게'],
  ['masquerade-ball', '가면무도회'], ['pets-revenge', '동물 친구의 복수'],
  ['musical-chairs', '의자 뺏기'], ['sisterhood', '자매애'],
  ['after-party', '뒤풀이'], ['late-for-a-very-important-date', '아주 중요한 약속에 늦었어요'],
  ['wedding-gift', '결혼 선물'], ['haggle-with-the-hag', '마녀와 흥정'],
  ['blind-mans-bluff', '눈먼 술래'], ['poisoned-apple', '독 사과'],
  ['odds-and-evens', '홀수와 짝수'], ['single-fairy', '독신 요정'],
  ['prince-rings-twice', '왕자는 언제나 두 번 벨을 울린다'], ['midnight-makeover', '자정의 변신'],
  ['pass-the-bouquet', '부케 돌리기'], ['upside-down', '거꾸로'],
  ['bathroom-break', '잠깐 화장실'], ['dancing-queens', '춤추는 여왕']
] as const;

export const ROUND_RULE_TEXT: Record<string, string> = {
  'once-upon-a-time': "추가 규칙이 없어요. 선두 무늬를 따르고 그 무늬의 가장 큰 수가 이겨요.",
  invitation: "추가 규칙이 없어요. 선두 무늬를 따르고 그 무늬의 가장 큰 수가 이겨요.",
  'magic-beans': "내야 하는 무늬의 가장 큰 수 또는 가장 작은 수 카드만 낼 수 있어요.",
  'three-times-a-lady': "3 카드는 각각 −3점이에요. 왕자 3은 기본 +1점과 합쳐 −2점이에요.",
  'arranged-marriage': "라운드 끝에 트릭을 하나도 가져오지 않은 사람은 +5점을 받아요.",
  'always-the-bridesmaid': "선두 무늬에서 두 번째로 큰 수가 이겨요. 다른 사람이 모두 그 무늬가 없으면 선두가 이겨요.",
  sisterhood: "선두 숫자와 차이가 가장 큰 카드가 이겨요. 선두 무늬가 없다면 모든 무늬로 비교해요.",
  'late-for-a-very-important-date': "각자 마지막 손패 3장은 내지 않고 자신이 가져온 카드로 계산해요.",
  'masquerade-ball': "선두만 앞면으로 내요. 나머지는 뒷면으로 낸 뒤 모두 함께 공개해 승자를 정해요.",
  'royal-decree': "여왕이 항상 이겨요. 여왕이 여러 장이면 가장 큰 여왕이 이겨요.",
  'musical-chairs': "트릭이 끝날 때마다 모두 손패 1장을 골라 동시에 오른쪽 사람에게 넘겨요.",
  'pets-revenge': "동물 친구도 한 장마다 +1점이에요. 개구리 8은 기본 +5점과 합쳐 +6점이에요.",
  'late-to-the-ball': "초기 교환 후 카드 1장을 따로 보관해요. 마지막 트릭에 그 카드를 내야 해요.",
  'poisoned-apple': "선두 무늬가 없는 사람이 낸 카드가 이겨요. 여러 명이면 큰 수, 동률이면 먼저 낸 카드가 이겨요.",
  'crystal-clear': "손패 중 무늬 하나를 골라 그 무늬 카드를 전부 공개해요. 손패에 두고 평소처럼 사용해요.",
  'upside-down': "이 트릭에 6이 나올 때마다 숫자 비교가 뒤집혀요. 두 번째 6이 나오면 다시 원래대로예요.",
  'dancing-queens': "같은 수의 왕자·여왕 한 쌍은 +3점, 다른 수의 한 쌍은 +2점, 짝 없는 왕자는 +1점이에요.",
  'prince-rings-twice': "각자 한 트릭에 2장씩 내요. 선두 무늬 숫자 합이 큰 사람이 이겨요. 동률이면 가장 큰 카드로 비교해요.",
  'wedding-gift': "매 트릭 전에 각자 카드 1장을 뒷면으로 선물 더미에 내요. 트릭 승자가 선물도 가져가요.",
  'after-party': "손패를 절반씩 나누세요. 먼저 쓸 절반을 다 낸 후 보관한 나머지 절반을 사용해요.",
  'bathroom-break': "왕자가 +2점이 돼요. 단, 현재 누적 청혼 점수가 가장 높은 사람은 기본 +1점으로 계산해요.",
  'single-fairy': "가져온 요정 한 장마다 −1점이에요. 라운드 점수는 음수가 될 수 있어요.",
  'midnight-makeover': "요정은 선두 무늬를 대신해 낼 수 있어요. 선두 무늬 또는 요정 중 큰 수가 이기고, 동률이면 나중 카드가 이겨요.",
  'blind-mans-bluff': "처음 받은 카드의 절반을 낸 뒤 남은 손패를 오른쪽 사람에게 넘겨서 계속 플레이해요.",
  'odds-and-evens': "가능하면 선두 카드의 무늬와 홀짝을 모두 따르세요. 무늬를 우선하고, 무늬가 없어도 가능한 홀짝을 따라요.",
  'pass-the-bouquet': "처음 등장하는 새 무늬가 선두 무늬를 바꿔요. 마지막으로 새로 나온 무늬의 가장 큰 수가 이겨요.",
  'haggle-with-the-hag': "트릭 승자는 자신의 손패 1장을 방금 가져온 카드 1장과 교환할 수 있어요. 자신이 냈던 카드는 고를 수 없어요."
};

export function deckForPlayers(playerCount: number): Card[] {
  if (playerCount < 3 || playerCount > 6) throw new Error('Rebel Princess requires 3–6 players');
  const removed = playerCount === 3 ? new Set([1, 11, 12]) : playerCount < 6 ? new Set([11, 12]) : new Set<number>();
  return SUITS.flatMap((suit) => Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((rank) => !removed.has(rank)).map((rank) => ({ suit, rank })));
}

function seededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function princessOptionsForPlayers(playerUids: string[], seed: string): Record<string, string[]> {
  const pool = PRINCESSES.map(([id]) => id);
  const random = seededRandom(`${seed}:princesses`);
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return Object.fromEntries(playerUids.map((uid, index) => [uid, pool.slice(index * 2, index * 2 + 2)]));
}

export function roundPowersForGame(seed: string): string[] {
  const pool = ROUND_RULES.map(([id]) => id);
  const random = seededRandom(`${seed}:round-powers`);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, 5);
}

export function dealForPlayers(playerUids: string[], seed: string): Record<string, Card[]> {
  const deck = deckForPlayers(playerUids.length);
  const random = seededRandom(seed);
  for (let index = deck.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  const hands = Object.fromEntries(playerUids.map((uid) => [uid, [] as Card[]]));
  deck.forEach((card, index) => hands[playerUids[index % playerUids.length]].push(card));
  for (const hand of Object.values(hands)) hand.sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);
  return hands;
}

export function cardLabel(card: Card): string {
  return `${({fairies:'요정',queens:'여왕',princes:'왕자',pets:'동물',hidden:'비공개'} as any)[card.suit]} ${card.rank}`;
}
