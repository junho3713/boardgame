import { SUITS, cardLabel, type Card } from './setup';

export type PassDirection = 'left' | 'right' | 'split';
export interface PassInstruction { direction: PassDirection; count: number }

const PASS_BY_ROUND: Record<string, PassInstruction> = {
  'once-upon-a-time': { direction: 'right', count: 3 },
  'late-to-the-ball': { direction: 'right', count: 1 },
  'magic-beans': { direction: 'left', count: 3 },
  'three-times-a-lady': { direction: 'right', count: 3 },
  'arranged-marriage': { direction: 'split', count: 2 },
  'royal-decree': { direction: 'right', count: 3 },
  'always-the-bridesmaid': { direction: 'right', count: 1 },
  'crystal-clear': { direction: 'right', count: 2 },
  'masquerade-ball': { direction: 'left', count: 1 },
  'pets-revenge': { direction: 'split', count: 2 },
  'musical-chairs': { direction: 'right', count: 1 },
  sisterhood: { direction: 'right', count: 2 },
  'after-party': { direction: 'left', count: 1 },
  'late-for-a-very-important-date': { direction: 'right', count: 2 },
  'wedding-gift': { direction: 'split', count: 2 },
  'haggle-with-the-hag': { direction: 'left', count: 1 },
  'blind-mans-bluff': { direction: 'right', count: 1 },
  'poisoned-apple': { direction: 'left', count: 2 },
  'odds-and-evens': { direction: 'right', count: 2 },
  'single-fairy': { direction: 'left', count: 1 },
  'prince-rings-twice': { direction: 'split', count: 2 },
  'midnight-makeover': { direction: 'left', count: 3 },
  'pass-the-bouquet': { direction: 'left', count: 3 },
  'upside-down': { direction: 'left', count: 2 },
  'bathroom-break': { direction: 'left', count: 2 },
  'dancing-queens': { direction: 'right', count: 2 },
  invitation: { direction: 'right', count: 2 }
};

export function passInstruction(roundId: string): PassInstruction {
  return PASS_BY_ROUND[roundId] ?? { direction: 'left', count: 1 };
}

export function resolvePasses(
  playerUids: string[],
  hands: Record<string, Card[]>,
  submissions: Record<string, Card[]>,
  instruction: PassInstruction
): Record<string, Card[]> {
  if (playerUids.some((uid) => submissions[uid]?.length !== instruction.count)) throw new Error('Every player must submit the required cards');
  const result = Object.fromEntries(playerUids.map((uid) => {
    const outgoing = new Set(submissions[uid].map(cardLabel));
    if (outgoing.size !== instruction.count || [...outgoing].some((card) => !hands[uid].some((held) => cardLabel(held) === card))) throw new Error('Pass contains missing or duplicate cards');
    return [uid, hands[uid].filter((card) => !outgoing.has(cardLabel(card)))] as const;
  }));
  const give = (from: number, to: number, cards: Card[]) => result[playerUids[to]].push(...cards);
  playerUids.forEach((uid, index) => {
    const cards = submissions[uid];
    if (instruction.direction === 'left') give(index, (index + 1) % playerUids.length, cards);
    else if (instruction.direction === 'right') give(index, (index - 1 + playerUids.length) % playerUids.length, cards);
    else {
      const midpoint = Math.ceil(cards.length / 2);
      give(index, (index + 1) % playerUids.length, cards.slice(0, midpoint));
      give(index, (index - 1 + playerUids.length) % playerUids.length, cards.slice(midpoint));
    }
  });
  for (const hand of Object.values(result)) hand.sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);
  return result;
}
