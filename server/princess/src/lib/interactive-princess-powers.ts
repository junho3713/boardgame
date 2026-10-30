import { cardLabel, SUITS, type Card } from './setup';
import type { TrickPlay } from './trick-taking';

export function deterministicCards(hand: Card[], key: string, count: number): Card[] {
  if (!hand.length) return [];
  const start = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0) % hand.length;
  return Array.from({ length: Math.min(count, hand.length) }, (_, offset) => hand[(start + offset) % hand.length]);
}

export function sortedHand(hand: Card[]): Card[] {
  return [...hand].sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank);
}

export function exchangeCards(actorHand: Card[], targetHand: Card[], taken: Card, given: Card): { actor: Card[]; target: Card[] } {
  return {
    actor: sortedHand([...actorHand.filter((card) => cardLabel(card) !== cardLabel(given)), taken]),
    target: sortedHand([...targetHand.filter((card) => cardLabel(card) !== cardLabel(taken)), given])
  };
}

export function redistributeCards(hands: Record<string, Card[]>, recipients: string[], cards: Card[]): Record<string, Card[]> {
  const next = Object.fromEntries(Object.entries(hands).map(([uid, hand]) => [uid, [...hand]]));
  recipients.forEach((uid, index) => next[uid] = sortedHand([...next[uid], cards[index]]));
  return next;
}

export function returnedTrickCards(plays: TrickPlay[], playerCount: number, key: string): Card[] {
  if (plays.length !== playerCount || plays.some((play) => play.card.suit === 'pets' && play.card.rank === 8)) return [];
  return deterministicCards(plays.map((play) => play.card), key, playerCount);
}
