import type { GameProjection } from './game-events';

export type ActionOwnershipState = 'active' | 'complete' | 'idle';

export type ActionOwnership = {
  state: ActionOwnershipState;
  label: string;
};

type OwnershipProjection = Pick<GameProjection,
  | 'players'
  | 'roundComplete'
  | 'passComplete'
  | 'passSubmissions'
  | 'awaitingRoundAction'
  | 'roundActionSubmissions'
  | 'roundCardSubmissions'
  | 'suitCommitments'
  | 'pendingMulanUid'
  | 'pendingPower'
  | 'haggleWinnerUid'
  | 'currentTurnUid'
>;

const IDLE: ActionOwnership = { state: 'idle', label: '' };

function simultaneousChoice(submitted: boolean, activeLabel: string, completeLabel: string): ActionOwnership {
  return submitted
    ? { state: 'complete', label: completeLabel }
    : { state: 'active', label: activeLabel };
}

/** Derive public, per-seat action responsibility from the accepted projection. */
export function actionOwnership(game: OwnershipProjection, uid: string): ActionOwnership {
  if (game.roundComplete) return IDLE;

  if (!game.passComplete) {
    return simultaneousChoice(Boolean(game.passSubmissions[uid]), '교환할 카드 선택', '교환 선택 완료');
  }

  if (game.awaitingRoundAction) {
    if (game.awaitingRoundAction === 'haggle') {
      return game.haggleWinnerUid === uid ? { state: 'active', label: '교환 여부 선택' } : IDLE;
    }
    if (game.awaitingRoundAction === 'reveal-suit') {
      return simultaneousChoice(Boolean(game.suitCommitments[uid]), '공개 무늬 선택', '무늬 확정');
    }
    if (game.awaitingRoundAction === 'split-hand') {
      return simultaneousChoice(Boolean(game.roundCardSubmissions[uid]), '먼저 쓸 손패 선택', '손패 선택 완료');
    }

    const labels: Record<string, [string, string]> = {
      'set-aside': ['마지막 카드 선택', '보관 완료'],
      'musical-pass': ['카드 선택', '선택 완료'],
      'wedding-gift': ['선물 카드 선택', '선물 선택 완료']
    };
    const [activeLabel, completeLabel] = labels[game.awaitingRoundAction] ?? ['카드 선택', '준비 완료'];
    return simultaneousChoice(Boolean(game.roundActionSubmissions[uid]), activeLabel, completeLabel);
  }

  if (game.pendingMulanUid) {
    return game.pendingMulanUid === uid ? { state: 'active', label: '뮬란 교체 선택' } : IDLE;
  }

  if (game.pendingPower) {
    if (game.pendingPower.powerId === 'sleeping-beauty') {
      const allCardsCollected = game.pendingPower.cards.length === game.players.length;
      if (allCardsCollected && game.pendingPower.actorUid === uid) return { state: 'active', label: '카드 재분배' };
      return simultaneousChoice(game.pendingPower.cards.some((entry) => entry.uid === uid), '카드 선택', '카드 제출 완료');
    }
    return game.pendingPower.actorUid === uid ? { state: 'active', label: '능력 선택' } : IDLE;
  }

  return game.currentTurnUid === uid ? { state: 'active', label: '낼 카드 선택' } : IDLE;
}
