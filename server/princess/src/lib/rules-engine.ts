import { cardLabel, princessOptionsForPlayers, SUITS, type Card } from './setup';
import { passInstruction, resolvePasses } from './passing';
import { breaksPrinces, trickWinner, type TrickPlay, type TrickState } from './trick-taking';
import { mulanReplacements, snowWhiteCanZero, thumbelinaCanPlay } from './princess-powers';
import { deterministicCards, exchangeCards, redistributeCards, returnedTrickCards } from './interactive-princess-powers';
import { cardsPerTrick, isRebelOfBall, roundCardScore, roundLegalCards, roundTrickWinner } from './round-rules';
import { choiceCommitment, crystalClearChoiceScope, princessChoiceScope } from './choice-commitment';

export const SCHEMA_VERSION = 1;
export const REDUCER_VERSION = 1;

export type GameEventType = 'game/created' | 'game/rematched' | 'player/joined' | 'player/princess-committed' | 'player/configured' | 'game/dealt' | 'pass/submitted' | 'pass/retracted' | 'card/played' | 'power/activated' | 'power/contributed' | 'power/declined' | 'round/card-set-aside' | 'round/pass-submitted' | 'round/suit-committed' | 'round/suit-revealed' | 'round/half-selected' | 'round/gift-submitted' | 'round/haggle-swapped' | 'round/haggle-declined';
export type GameEventPayload = {
  gameId: string;
  displayName?: string;
  princessId?: string;
  ready?: boolean;
  seed?: string;
  roundIds?: string[];
  hands?: Record<string, Card[]>;
  cards?: Card[];
  card?: Card;
  powerId?: string;
  targetUid?: string;
  suit?: Card['suit'];
  commitment?: string;
  nonce?: string;
  artworkOption?: string;
};

export interface GameEvent {
  id: string;
  type: GameEventType;
  payload: GameEventPayload;
  actorUid: string;
  clientSeq: number;
  createdAt: { toMillis(): number } | null;
  schemaVersion: typeof SCHEMA_VERSION;
  reducerVersion: typeof REDUCER_VERSION;
}

export type RoundScore = { princes: number; frog: number; roundRule: number; total: number };

export interface GameProjection {
  gameId: string;
  players: Array<{ uid: string; displayName: string; host: boolean; princessId?: string; ready: boolean }>;
  roundIds: string[];
  hands: Record<string, Card[]> | null;
  seed: string | null;
  passSubmissions: Record<string, Card[]>;
  passComplete: boolean;
  trick: TrickState | null;
  currentTurnUid: string | null;
  princesBroken: boolean;
  capturedCounts: Record<string, number>;
  capturedTricks: Record<string, TrickPlay[][]>;
  lastCompletedTrick: { winnerUid: string; plays: TrickPlay[] } | null;
  completedTricks: number;
  roundIndex: number;
  roundComplete: boolean;
  roundScores: Record<string, RoundScore>;
  roundScoreHistory: Array<Record<string, RoundScore>>;
  totalScores: Record<string, number>;
  nextLeaderUid: string | null;
  princessOptions: Record<string, string[]>;
  princessCommitments: Record<string, string>;
  gameNumber: number;
  gameComplete: boolean;
  zeroRounds: Record<string, number>;
  winnerUids: string[];
  exhaustedPrincessUids: string[];
  powerIdsThisTrick: string[];
  pendingMulanUid: string | null;
  pendingPower: { powerId: string; actorUid: string; targetUid?: string; cards: Array<{ uid: string; card: Card }> } | null;
  forcedCards: Record<string, Card>;
  awaitingRoundAction: 'set-aside' | 'musical-pass' | 'reveal-suit' | 'split-hand' | 'wedding-gift' | 'haggle' | null;
  roundActionSubmissions: Record<string, Card>;
  roundCardSubmissions: Record<string, Card[]>;
  revealedSuits: Record<string, Card['suit']>;
  suitCommitments: Record<string, string>;
  retainedCards: Record<string, Card[]>;
  haggleWinnerUid: string | null;
  blindTransferComplete: boolean;
  rebelUids: string[];
  artworkOption?: string;
}

export function nextRoundLeader(playerUids: string[], totalScores: Record<string, number>, lastLeaderUid: string): string | null {
  if (!playerUids.length) return null;
  const lowest = Math.min(...playerUids.map((uid) => totalScores[uid] ?? 0));
  const lastIndex = Math.max(0, playerUids.indexOf(lastLeaderUid));
  for (let offset = 1; offset <= playerUids.length; offset += 1) {
    const uid = playerUids[(lastIndex + offset) % playerUids.length];
    if ((totalScores[uid] ?? 0) === lowest) return uid;
  }
  return playerUids[0];
}

export function gameWinners(playerUids: string[], totalScores: Record<string, number>, zeroRounds: Record<string, number>): string[] {
  if (!playerUids.length) return [];
  const lowestScore = Math.min(...playerUids.map((uid) => totalScores[uid] ?? 0));
  const scoreLeaders = playerUids.filter((uid) => (totalScores[uid] ?? 0) === lowestScore);
  const mostZeroRounds = Math.max(...scoreLeaders.map((uid) => zeroRounds[uid] ?? 0));
  return scoreLeaders.filter((uid) => (zeroRounds[uid] ?? 0) === mostZeroRounds);
}

export interface EventCursor {
  createdAtMillis: number | null;
  eventId: string;
}

export function normalizeGameId(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function eventId(actorUid: string, clientSeq: number): string {
  return `${actorUid.replace(/[^A-Za-z0-9_-]/g, '_')}-${String(clientSeq).padStart(10, '0')}`;
}

export function isGameEvent(value: unknown): value is Omit<GameEvent, 'id'> {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  const payload = event.payload as Record<string, unknown> | undefined;
  const common = (
    ['game/created', 'game/rematched', 'player/joined', 'player/princess-committed', 'player/configured', 'game/dealt', 'pass/submitted', 'pass/retracted', 'card/played', 'power/activated', 'power/contributed', 'power/declined', 'round/card-set-aside', 'round/pass-submitted', 'round/suit-committed', 'round/suit-revealed', 'round/half-selected', 'round/gift-submitted', 'round/haggle-swapped', 'round/haggle-declined'].includes(String(event.type)) &&
    typeof event.actorUid === 'string' &&
    Number.isInteger(event.clientSeq) &&
    event.schemaVersion === SCHEMA_VERSION &&
    event.reducerVersion === REDUCER_VERSION &&
    !!payload &&
    typeof payload.gameId === 'string'
  );
  if (!common) return false;
  if (event.type === 'game/created' || event.type === 'player/joined') return typeof payload.displayName === 'string';
  if (event.type === 'player/princess-committed' || event.type === 'round/suit-committed') return typeof payload.commitment === 'string' && /^[a-f0-9]{64}$/.test(payload.commitment);
  if (event.type === 'player/configured') return (payload.princessId === undefined || typeof payload.princessId === 'string') && (payload.nonce === undefined || typeof payload.nonce === 'string') && typeof payload.ready === 'boolean';
  if (event.type === 'game/dealt') return typeof payload.seed === 'string' && Array.isArray(payload.roundIds) && payload.roundIds.length === 5 && !!payload.hands && typeof payload.hands === 'object';
  if (event.type === 'pass/submitted') return Array.isArray(payload.cards) && payload.cards.length > 0;
  if (event.type === 'card/played') return !!payload.card && typeof payload.card === 'object';
  if (event.type === 'power/activated') return typeof payload.powerId === 'string';
  if (event.type === 'power/contributed') return payload.powerId === 'sleeping-beauty' && !!payload.card;
  if (event.type === 'power/declined') return payload.powerId === 'mulan' || payload.powerId === 'scheherazade';
  if (event.type === 'round/card-set-aside' || event.type === 'round/pass-submitted' || event.type === 'round/gift-submitted') return !!payload.card;
  if (event.type === 'round/suit-revealed') return typeof payload.suit === 'string' && SUITS.includes(payload.suit as Card['suit']) && (payload.nonce === undefined || typeof payload.nonce === 'string');
  if (event.type === 'round/half-selected') return Array.isArray(payload.cards) && payload.cards.length > 0;
  if (event.type === 'round/haggle-swapped') return Array.isArray(payload.cards) && payload.cards.length === 2;
  if (event.type === 'round/haggle-declined') return Object.keys(payload).length === 1;
  return Object.keys(payload).length === 1;
}

export function orderEvents(events: GameEvent[]): GameEvent[] {
  return [...events].sort((left, right) => {
    const time = (left.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) -
      (right.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER);
    return time || left.id.localeCompare(right.id);
  });
}

export function eventCursor(events: GameEvent[]): EventCursor | null {
  const last = orderEvents(events).at(-1);
  return last ? { createdAtMillis: last.createdAt?.toMillis() ?? null, eventId: last.id } : null;
}

export function deriveGame(events: GameEvent[]): GameProjection {
  const ordered = orderEvents(events);
  const players = new Map<string, { uid: string; displayName: string; host: boolean; princessId?: string; ready: boolean }>();
  let gameId = '';
  let roundIds: string[] = [];
  let seed: string | null = null;
  const lastRematchIndex = ordered.findLastIndex((event) => event.type === 'game/rematched');
  const gameNumber = ordered.filter((event) => event.type === 'game/rematched').length;
  const usesSealedPrincesses = ordered.some((event, index) => index > lastRematchIndex && event.type === 'player/princess-committed');
  const firstDealIndex = ordered.findIndex((event) => event.type === 'game/dealt');

  let artworkOption = 'classic';
  for (const [index, event] of ordered.entries()) {
    gameId ||= event.payload.gameId;
    const roomOpen = firstDealIndex < 0 || index < firstDealIndex;
    if ((event.type === 'game/created' || event.type === 'player/joined') && !players.has(event.actorUid) && players.size < 6 && roomOpen) {
      players.set(event.actorUid, {
        uid: event.actorUid,
        displayName: event.payload.displayName ?? 'Player',
        host: event.type === 'game/created',
        ready: false
      });
    }
    if (event.payload.artworkOption) {
      artworkOption = event.payload.artworkOption;
    }
  }

  const setupPlayers = [...players.values()];
  const princessOptions = princessOptionsForPlayers(setupPlayers.map((player) => player.uid), gameNumber ? `${gameId}:rematch:${gameNumber}` : gameId);
  const princessCommitments: Record<string, string> = {};
  const princessReveals: Record<string, string> = {};
  for (const [index, event] of ordered.entries()) {
    if (index <= lastRematchIndex) continue;
    const player = players.get(event.actorUid);
    if (event.type === 'player/princess-committed' && player && event.payload.commitment && !princessReveals[player.uid]) {
      princessCommitments[player.uid] = event.payload.commitment;
    }
    if (event.type !== 'player/configured' || !player) continue;
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
  const deals = ordered.map((event, index) => ({ event, index })).filter(({ event, index }) => event.type === 'game/dealt' && index > lastRematchIndex);
  const emptyCounts = () => Object.fromEntries(playerList.map((player) => [player.uid, 0]));
  const emptyTricks = () => Object.fromEntries(playerList.map((player) => [player.uid, [] as TrickPlay[][]]));
  type RoundProjection = Pick<GameProjection, 'hands' | 'passSubmissions' | 'passComplete' | 'trick' | 'currentTurnUid' | 'princesBroken' | 'capturedCounts' | 'capturedTricks' | 'lastCompletedTrick' | 'completedTricks' | 'roundComplete' | 'roundScores' | 'exhaustedPrincessUids' | 'powerIdsThisTrick' | 'pendingMulanUid' | 'pendingPower' | 'forcedCards' | 'awaitingRoundAction' | 'roundActionSubmissions' | 'roundCardSubmissions' | 'revealedSuits' | 'suitCommitments' | 'retainedCards' | 'haggleWinnerUid' | 'blindTransferComplete' | 'rebelUids'> & { lastWinnerUid: string | null };
  const replayRound = (deal: GameEvent, segment: GameEvent[], leaderUid: string, priorTotals: Record<string, number>): RoundProjection => {
    const originalHandSize = deal.payload.hands?.[playerList[0]?.uid]?.length ?? 0;
    const blindTransferAfterTricks = originalHandSize / 2;
    let roundHands = deal.payload.hands
      ? Object.fromEntries(Object.entries(deal.payload.hands).map(([uid, cards]) => [uid, cards.map((card) => ({ ...card }))]))
      : null;
    const submissions: Record<string, Card[]> = {};
    for (const event of segment) {
      if (event.type === 'pass/submitted') submissions[event.actorUid] = event.payload.cards ?? [];
      if (event.type === 'pass/retracted') delete submissions[event.actorUid];
    }
    const completePass = Boolean(roundHands && playerList.length >= 3 && playerList.every((player) => submissions[player.uid]));
    const roundNumber = deals.findIndex(({ event }) => event === deal);
    const roundId = deal.payload.roundIds?.[roundNumber] ?? '';
    if (completePass && roundHands) roundHands = resolvePasses(playerList.map((player) => player.uid), roundHands, submissions, passInstruction(deal.payload.roundIds?.[roundNumber] ?? ''));
    let roundTrick: TrickState | null = completePass ? { leaderUid, plays: [] } : null;
    let turnUid = ['late-to-the-ball', 'crystal-clear', 'after-party', 'wedding-gift'].includes(roundId) && completePass ? null : roundTrick?.leaderUid ?? null;
    let broken = false;
    let trickCount = 0;
    const counts = emptyCounts();
    const tricks = emptyTricks();
    let latest: { winnerUid: string; plays: TrickPlay[] } | null = null;
    let lastWinnerUid: string | null = null;
    const exhausted = new Set<string>();
    let powersThisTrick: string[] = [];
    let powerTargets: Record<string, string> = {};
    let peaActive = false;
    let pendingMulanUid: string | null = null;
    let pendingPower: GameProjection['pendingPower'] = null;
    const forcedCards: Record<string, Card> = {};
    let awaitingRoundAction: GameProjection['awaitingRoundAction'] = roundId === 'late-to-the-ball' && completePass ? 'set-aside' : roundId === 'crystal-clear' && completePass ? 'reveal-suit' : roundId === 'after-party' && completePass ? 'split-hand' : roundId === 'wedding-gift' && completePass ? 'wedding-gift' : null;
    let roundActionSubmissions: Record<string, Card> = {};
    let roundCardSubmissions: Record<string, Card[]> = {};
    const revealedSuits: Record<string, Card['suit']> = {};
    const pendingRevealedSuits: Record<string, Card['suit']> = {};
    const suitCommitments: Record<string, string> = {};
    const usesSealedSuits = segment.some((event) => event.type === 'round/suit-committed');
    const retainedCards: Record<string, Card[]> = Object.fromEntries(playerList.map((player) => [player.uid, []]));
    const afterPartyReserves: Record<string, Card[]> = {};
    let afterPartyReleased = false;
    let giftPile: TrickPlay[] = [];
    let haggleWinnerUid: string | null = null;
    let blindTransferComplete = false;
    const setAsideCards: Record<string, Card> = {};
    let lateCardsReleased = false;
    const snowZero = new Map<string, string>();
    const thumbelinaPlays = new Map<string, string>();
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
      if (roundId === 'blind-mans-bluff' && trickCount === blindTransferAfterTricks && !blindTransferComplete) {
        const before = Object.fromEntries(playerList.map((player) => [player.uid, roundHands![player.uid]]));
        playerList.forEach((player, index) => { roundHands![playerList[(index - 1 + playerList.length) % playerList.length].uid] = before[player.uid]; });
        blindTransferComplete = true;
      }
      if (roundId === 'late-to-the-ball' && !lateCardsReleased && playerList.every((player) => roundHands?.[player.uid].length === 0) && playerList.every((player) => setAsideCards[player.uid])) {
        playerList.forEach((player) => roundHands![player.uid].push(setAsideCards[player.uid]));
        lateCardsReleased = true;
      } else if (roundId === 'musical-chairs' && playerList.some((player) => roundHands?.[player.uid].length)) {
        awaitingRoundAction = 'musical-pass';
        turnUid = '';
      } else if (roundId === 'after-party' && !afterPartyReleased && playerList.every((player) => roundHands?.[player.uid].length === 0)) {
        playerList.forEach((player) => roundHands![player.uid].push(...afterPartyReserves[player.uid]));
        playerList.forEach((player) => sortHand(player.uid));
        afterPartyReleased = true;
      } else if (roundId === 'late-for-a-very-important-date' && playerList.every((player) => roundHands?.[player.uid].length === 3)) {
        playerList.forEach((player) => { retainedCards[player.uid] = roundHands![player.uid].map((card) => ({ ...card })); roundHands![player.uid] = []; });
      } else if (roundId === 'wedding-gift' && playerList.some((player) => roundHands?.[player.uid].length)) {
        awaitingRoundAction = 'wedding-gift'; turnUid = '';
      } else if (roundId === 'haggle-with-the-hag' && roundHands?.[winner].length) {
        awaitingRoundAction = 'haggle'; haggleWinnerUid = winner; turnUid = '';
      }
    };
    const randomCards = (uid: string, count: number, powerId: string) => {
      const hand = roundHands?.[uid] ?? [];
      return deterministicCards(hand, `${deal.payload.seed}:${trickCount}:${powerId}:${uid}`, count);
    };
    const sortHand = (uid: string) => roundHands?.[uid]?.sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank);
    if (roundHands && roundTrick) for (const event of segment.filter((entry) => ['card/played', 'power/activated', 'power/contributed', 'power/declined', 'round/card-set-aside', 'round/pass-submitted', 'round/suit-committed', 'round/suit-revealed', 'round/half-selected', 'round/gift-submitted', 'round/haggle-swapped', 'round/haggle-declined'].includes(entry.type))) {
      const player = playerList.find((candidate) => candidate.uid === event.actorUid);
      if (event.type === 'round/haggle-declined') {
        const activeAction = awaitingRoundAction as GameProjection['awaitingRoundAction'];
        if (activeAction !== 'haggle' || event.actorUid !== haggleWinnerUid) continue;
        awaitingRoundAction = null; turnUid = haggleWinnerUid; haggleWinnerUid = null; continue;
      }
      if (event.type === 'round/haggle-swapped') {
        const [offered, taken] = event.payload.cards ?? [];
        const won = haggleWinnerUid ? tricks[haggleWinnerUid].at(-1) : undefined;
        const completed = latest as { winnerUid: string; plays: TrickPlay[] } | null;
        const ownPlay = completed?.plays.find((play) => play.uid === haggleWinnerUid)?.card;
        const activeAction = awaitingRoundAction as GameProjection['awaitingRoundAction'];
        if (activeAction !== 'haggle' || event.actorUid !== haggleWinnerUid || !offered || !taken || !won || !ownPlay || !roundHands[event.actorUid].some((card) => cardLabel(card) === cardLabel(offered)) || !won.some((play) => cardLabel(play.card) === cardLabel(taken)) || cardLabel(ownPlay) === cardLabel(taken)) continue;
        roundHands[event.actorUid] = roundHands[event.actorUid].filter((card) => cardLabel(card) !== cardLabel(offered)); roundHands[event.actorUid].push(taken); sortHand(event.actorUid);
        const takenPlay = won.find((play) => cardLabel(play.card) === cardLabel(taken))!; takenPlay.card = offered;
        awaitingRoundAction = null; turnUid = haggleWinnerUid; haggleWinnerUid = null; continue;
      }
      if (event.type === 'round/gift-submitted') {
        const card = event.payload.card;
        if (awaitingRoundAction !== 'wedding-gift' || !player || !card || roundActionSubmissions[player.uid] || !roundHands[player.uid].some((held) => cardLabel(held) === cardLabel(card))) continue;
        roundActionSubmissions[player.uid] = card;
        if (playerList.every((candidate) => roundActionSubmissions[candidate.uid])) {
          giftPile = playerList.map((candidate) => ({ uid: candidate.uid, card: roundActionSubmissions[candidate.uid] }));
          playerList.forEach((candidate) => { roundHands![candidate.uid] = roundHands![candidate.uid].filter((held) => cardLabel(held) !== cardLabel(roundActionSubmissions[candidate.uid])); });
          roundActionSubmissions = {}; awaitingRoundAction = null; turnUid = roundTrick.leaderUid;
        }
        continue;
      }
      if (event.type === 'round/half-selected') {
        const cards = event.payload.cards ?? [];
        const hand = player ? roundHands[player.uid] : [];
        if (awaitingRoundAction !== 'split-hand' || !player || roundCardSubmissions[player.uid] || cards.length * 2 !== hand.length || new Set(cards.map(cardLabel)).size !== cards.length || !cards.every((card) => hand.some((held) => cardLabel(held) === cardLabel(card)))) continue;
        roundCardSubmissions[player.uid] = cards;
        afterPartyReserves[player.uid] = hand.filter((held) => !cards.some((card) => cardLabel(card) === cardLabel(held)));
        roundHands[player.uid] = cards.map((card) => ({ ...card })); sortHand(player.uid);
        if (playerList.every((candidate) => roundCardSubmissions[candidate.uid])) { awaitingRoundAction = null; turnUid = roundTrick.leaderUid; }
        continue;
      }
      if (event.type === 'round/suit-committed') {
        if (awaitingRoundAction !== 'reveal-suit' || !player || !event.payload.commitment || suitCommitments[player.uid]) continue;
        suitCommitments[player.uid] = event.payload.commitment;
        continue;
      }
      if (event.type === 'round/suit-revealed') {
        const suit = event.payload.suit;
        if (awaitingRoundAction !== 'reveal-suit' || !player || !suit || pendingRevealedSuits[player.uid] || !roundHands[player.uid].some((card) => card.suit === suit)) continue;
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
      if (event.type === 'round/card-set-aside') {
        if (awaitingRoundAction !== 'set-aside' || !player || !event.payload.card || setAsideCards[player.uid] || !roundHands[player.uid].some((card) => cardLabel(card) === cardLabel(event.payload.card!))) continue;
        setAsideCards[player.uid] = event.payload.card;
        roundActionSubmissions[player.uid] = event.payload.card;
        roundHands[player.uid] = roundHands[player.uid].filter((card) => cardLabel(card) !== cardLabel(event.payload.card!));
        if (playerList.every((candidate) => setAsideCards[candidate.uid])) { awaitingRoundAction = null; roundActionSubmissions = {}; turnUid = roundTrick.leaderUid; }
        continue;
      }
      if (event.type === 'round/pass-submitted') {
        const activeRoundAction = awaitingRoundAction as GameProjection['awaitingRoundAction'];
        if (activeRoundAction !== 'musical-pass' || !player || !event.payload.card || roundActionSubmissions[player.uid] || !roundHands[player.uid].some((card) => cardLabel(card) === cardLabel(event.payload.card!))) continue;
        roundActionSubmissions[player.uid] = event.payload.card;
        if (playerList.every((candidate) => roundActionSubmissions[candidate.uid])) {
          const nextHands = Object.fromEntries(playerList.map((candidate) => [candidate.uid, roundHands![candidate.uid].filter((card) => cardLabel(card) !== cardLabel(roundActionSubmissions[candidate.uid]))]));
          playerList.forEach((candidate, index) => nextHands[playerList[(index - 1 + playerList.length) % playerList.length].uid].push(roundActionSubmissions[candidate.uid]));
          roundHands = Object.fromEntries(Object.entries(nextHands).map(([uid, hand]) => [uid, hand.sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank)]));
          roundActionSubmissions = {}; awaitingRoundAction = null; turnUid = roundTrick.leaderUid;
        }
        continue;
      }
      if (event.type === 'power/contributed') {
        if (pendingPower?.powerId !== 'sleeping-beauty' || !event.payload.card || pendingPower.cards.some((entry) => entry.uid === event.actorUid)) continue;
        if (!roundHands[event.actorUid]?.some((card) => cardLabel(card) === cardLabel(event.payload.card!))) continue;
        roundHands[event.actorUid] = roundHands[event.actorUid].filter((card) => cardLabel(card) !== cardLabel(event.payload.card!));
        pendingPower.cards.push({ uid: event.actorUid, card: event.payload.card });
        pendingPower.cards.sort((left, right) =>
          playerList.findIndex((player) => player.uid === left.uid) - playerList.findIndex((player) => player.uid === right.uid)
        );
        continue;
      }
      if (event.type === 'power/declined') {
        if (pendingMulanUid === event.actorUid) resolveTrick();
        if (pendingPower?.powerId === 'scheherazade' && pendingPower.actorUid === event.actorUid) { exhausted.add(event.actorUid); powersThisTrick.push('scheherazade'); pendingPower = null; }
        continue;
      }
      if (event.type === 'power/activated') {
        const powerId = event.payload.powerId;
        if (!player || player.princessId !== powerId || !powerId) continue;
        if (powerId === 'mulan' && pendingMulanUid === player.uid) {
          if (!event.payload.card || !roundTrick) continue;
          const play = roundTrick.plays.find((entry) => entry.uid === player.uid);
          if (!play || !mulanReplacements(roundHands[player.uid], play).some((card) => cardLabel(card) === cardLabel(event.payload.card!))) continue;
          roundHands[player.uid] = roundHands[player.uid].filter((card) => cardLabel(card) !== cardLabel(event.payload.card!));
          roundHands[player.uid].push(play.card);
          roundHands[player.uid].sort((left, right) => SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit) || left.rank - right.rank);
          play.card = event.payload.card;
          exhausted.add(player.uid);
          powersThisTrick.push(powerId);
          resolveTrick();
          continue;
        }
        const activePending = pendingPower as GameProjection['pendingPower'];
        if (activePending?.actorUid === player.uid && activePending.powerId === powerId) {
          if (powerId === 'ice-princess' && activePending.targetUid && event.payload.card && activePending.cards.some((entry) => cardLabel(entry.card) === cardLabel(event.payload.card!))) {
            forcedCards[activePending.targetUid] = event.payload.card;
            if (event.payload.card.suit === 'princes') broken = true;
            powerTargets[powerId] = activePending.targetUid;
            exhausted.add(player.uid); powersThisTrick.push(powerId); pendingPower = null;
          } else if (powerId === 'scheherazade' && activePending.targetUid && event.payload.card && roundHands[player.uid].some((card) => cardLabel(card) === cardLabel(event.payload.card!))) {
            const taken = activePending.cards[0].card;
            const exchanged = exchangeCards(roundHands[player.uid], roundHands[activePending.targetUid], taken, event.payload.card);
            roundHands[player.uid] = exchanged.actor; roundHands[activePending.targetUid] = exchanged.target;
            exhausted.add(player.uid); powersThisTrick.push(powerId); pendingPower = null;
          } else if (powerId === 'sleeping-beauty' && event.payload.cards?.length === playerList.length && activePending.cards.length === playerList.length) {
            const contributed = new Set(activePending.cards.map((entry) => cardLabel(entry.card)));
            if (event.payload.cards.every((card) => contributed.has(cardLabel(card))) && new Set(event.payload.cards.map(cardLabel)).size === playerList.length) {
              const recipients = [player.uid, ...playerList.filter((candidate) => candidate.uid !== player.uid).map((candidate) => candidate.uid)];
              roundHands = redistributeCards(roundHands!, recipients, event.payload.cards);
              exhausted.add(player.uid); powersThisTrick.push(powerId); pendingPower = null;
            }
          }
          continue;
        }
        if (pendingPower) continue;
        if (exhausted.has(player.uid)) continue;
        if (lateCardsReleased && (powerId === 'sleeping-beauty' || powerId === 'scheherazade')) continue;
        if (powerId === 'mulan') continue;
        if (powerId === 'alice') {
          const completed = latest as { winnerUid: string; plays: TrickPlay[] } | null;
          if (!completed || completed.winnerUid !== player.uid || completed.plays.some((play) => play.card.suit === 'pets' && play.card.rank === 8)) continue;
          const won = tricks[player.uid].pop(); if (!won) continue;
          if (won.some((play) => play.card.suit === 'princes')) broken = true;
          counts[player.uid] -= won.length;
          const returned = returnedTrickCards(won, playerList.length, `${deal.payload.seed}:alice:${trickCount}`);
          playerList.forEach((recipient, index) => roundHands![recipient.uid].push(returned[index])); playerList.forEach((recipient) => sortHand(recipient.uid));
          exhausted.add(player.uid); powersThisTrick.push(powerId); latest = null; continue;
        }
        if (powerId === 'snow-white') {
          if (turnUid !== player.uid || !event.payload.card || !snowWhiteCanZero(event.payload.card)) continue;
          if (!roundLegalCards(roundHands[player.uid], roundTrick, broken, roundId, peaActive).some((card) => cardLabel(card) === cardLabel(event.payload.card!))) continue;
          snowZero.set(player.uid, cardLabel(event.payload.card));
        } else if (powerId === 'thumbelina') {
          if (turnUid !== player.uid || roundTrick.plays.length === 0 || !event.payload.card || !thumbelinaCanPlay(event.payload.card)) continue;
          if (!roundHands[player.uid].some((card) => cardLabel(card) === cardLabel(event.payload.card!))) continue;
          thumbelinaPlays.set(player.uid, cardLabel(event.payload.card));
        } else {
          if (roundTrick.plays.length) continue;
          if (powerId === 'little-mermaid' && powerTargets['ice-princess'] === roundTrick.leaderUid) continue;
          if (powerId === 'rapunzel' && powersThisTrick.some((id) => id === 'little-mermaid' || id === 'ice-princess')) continue;
          if (powerId === 'little-mermaid' && powersThisTrick.some((id) => id === 'rapunzel')) continue;
          if (powerId === 'pocahontas' && powersThisTrick.some((id) => id === 'little-mermaid' || id === 'rapunzel')) continue;
          if (powerId === 'sleeping-beauty' && powersThisTrick.some((id) => id === 'little-mermaid' || id === 'ice-princess' || id === 'rapunzel')) continue;
          if (powerId === 'scheherazade' && event.payload.targetUid === roundTrick.leaderUid && powersThisTrick.some((id) => id === 'little-mermaid' || id === 'ice-princess' || id === 'rapunzel')) continue;
          if (powerId === 'cinderella') roundTrick.reversed = true;
        else if (powerId === 'little-mermaid' && event.payload.suit && SUITS.includes(event.payload.suit)) { roundTrick.requiredSuit = event.payload.suit; powerTargets[powerId] = roundTrick.leaderUid; }
        else if (powerId === 'ice-princess' && event.payload.targetUid && playerList.some((candidate) => candidate.uid === event.payload.targetUid)) { pendingPower = { powerId, actorUid: player.uid, targetUid: event.payload.targetUid, cards: randomCards(event.payload.targetUid, 2, powerId).map((card) => ({ uid: event.payload.targetUid!, card })) }; continue; }
        else if (powerId === 'scheherazade' && event.payload.targetUid && event.payload.targetUid !== player.uid && playerList.some((candidate) => candidate.uid === event.payload.targetUid)) { pendingPower = { powerId, actorUid: player.uid, targetUid: event.payload.targetUid, cards: randomCards(event.payload.targetUid, 1, powerId).map((card) => ({ uid: event.payload.targetUid!, card })) }; continue; }
        else if (powerId === 'sleeping-beauty') { pendingPower = { powerId, actorUid: player.uid, cards: [] }; continue; }
        else if (powerId === 'pocahontas') {
          if (!playerList.some((candidate) => candidate.uid === event.payload.targetUid)) continue;
          roundTrick.leaderUid = event.payload.targetUid!;
          turnUid = event.payload.targetUid!;
          } else if (powerId === 'rapunzel') {
            roundTrick.requiredSuit = 'princes';
            roundTrick.forcePrinceLead = true;
          } else if (powerId === 'pea-princess') peaActive = true;
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
      if (roundId === 'upside-down' && card.rank === 6) roundTrick.reversed = !roundTrick.reversed;
      roundTrick.plays.push({ uid: event.actorUid, card, ...(zero ? { effectiveRank: 0 } : {}) });
      snowZero.delete(event.actorUid);
      thumbelinaPlays.delete(event.actorUid);
      if (roundTrick.plays.length === playerList.length * cardsPerTrick(roundId)) {
        const mulan = playerList.find((candidate) => candidate.princessId === 'mulan' && !exhausted.has(candidate.uid));
        const mulanPlay = mulan ? roundTrick.plays.find((play) => play.uid === mulan.uid) : undefined;
        if (mulan && mulanPlay && mulanReplacements(roundHands[mulan.uid], mulanPlay).length) {
          pendingMulanUid = mulan.uid;
          turnUid = '';
        } else resolveTrick();
      } else turnUid = playerList[(playerList.findIndex((player) => player.uid === event.actorUid) + 1) % playerList.length].uid;
    }
    const finished = Boolean(roundHands && !pendingPower && Object.values(roundHands).every((hand) => hand.length === 0));
    const princeCountInDeck = Object.values(deal.payload.hands ?? {}).flat().filter((card) => card.suit === 'princes').length;
    const capturedCards = Object.fromEntries(playerList.map((player) => [player.uid, [...tricks[player.uid].flat().map((play) => play.card), ...retainedCards[player.uid]]]));
    const rebelUids = playerList.filter((player) => isRebelOfBall(capturedCards[player.uid], roundId, princeCountInDeck)).map((player) => player.uid);
    const scores = Object.fromEntries(playerList.map((player) => {
      const cards = capturedCards[player.uid];
      const highestPrior = Math.max(...playerList.map((candidate) => priorTotals[candidate.uid] ?? 0));
      const bathroomExempt = roundId === 'bathroom-break' && (priorTotals[player.uid] ?? 0) === highestPrior;
      return [player.uid, roundCardScore(cards, roundId, bathroomExempt, princeCountInDeck)];
    }));
    return { hands: roundHands, passSubmissions: submissions, passComplete: completePass, trick: roundTrick, currentTurnUid: finished ? null : turnUid || null, princesBroken: broken, capturedCounts: counts, capturedTricks: tricks, lastCompletedTrick: latest, completedTricks: trickCount, roundComplete: finished, roundScores: scores, lastWinnerUid, exhaustedPrincessUids: [...exhausted], powerIdsThisTrick: powersThisTrick, pendingMulanUid, pendingPower, forcedCards, awaitingRoundAction, roundActionSubmissions, roundCardSubmissions, revealedSuits, suitCommitments, retainedCards, haggleWinnerUid, blindTransferComplete, rebelUids };
  };
  let leaderUid = playerList[0]?.uid ?? '';
  let active: RoundProjection = { hands: null, passSubmissions: {}, passComplete: false, trick: null, currentTurnUid: null, princesBroken: false, capturedCounts: emptyCounts(), capturedTricks: emptyTricks(), lastCompletedTrick: null, completedTricks: 0, roundComplete: false, roundScores: Object.fromEntries(playerList.map((player) => [player.uid, { princes: 0, frog: 0, roundRule: 0, total: 0 }])), lastWinnerUid: null, exhaustedPrincessUids: [], powerIdsThisTrick: [], pendingMulanUid: null, pendingPower: null, forcedCards: {}, awaitingRoundAction: null, roundActionSubmissions: {}, roundCardSubmissions: {}, revealedSuits: {}, suitCommitments: {}, retainedCards: Object.fromEntries(playerList.map((player) => [player.uid, []])), haggleWinnerUid: null, blindTransferComplete: false, rebelUids: [] };
  const totalScores = emptyCounts();
  const zeroRounds = emptyCounts();
  const roundScoreHistory: Array<Record<string, RoundScore>> = [];
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
  let winnerUids: string[] = [];
  if (gameComplete) winnerUids = gameWinners(playerList.map((player) => player.uid), totalScores, zeroRounds);
  const { lastWinnerUid: _lastWinnerUid, ...activeProjection } = active;
  return { gameId, players: playerList, roundIds, seed, ...activeProjection, roundScoreHistory, totalScores, roundIndex, nextLeaderUid: leaderUid || null, princessOptions, princessCommitments, gameNumber, gameComplete, zeroRounds, winnerUids, artworkOption };
}

