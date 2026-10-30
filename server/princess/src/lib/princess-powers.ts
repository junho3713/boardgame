import { cardLabel, type Card } from './setup';
import { legalCards, type TrickPlay, type TrickState } from './trick-taking';

export const PRINCESS_POWER_TEXT: Record<string, string> = {
  'little-mermaid': "트릭 시작 전 무늬 1개를 정해요. 선 플레이어는 그 무늬가 있으면 반드시 내요.",
  'sleeping-beauty': "트릭 시작 전 모두에게 카드 1장씩 받아 원하는 순서로 다시 나눠줘요.",
  alice: "개구리 없는 트릭을 이긴 직후 그 카드들을 섞어 모두의 손패로 1장씩 돌려줘요.",
  scheherazade: "트릭 시작 전 다른 사람의 카드 1장을 무작위로 봐요. 내 카드와 바꾸거나 그대로 돌려줘요.",
  'ice-princess': "트릭 시작 전 한 사람의 카드 2장을 무작위로 봐요. 그중 1장을 그 사람이 이번 트릭에 내게 해요.",
  'snow-white': "내 차례에 7 이하 카드 1장을 숫자 0으로 낼 수 있어요.",
  cinderella: "트릭 시작 전 사용해요. 이번 트릭은 선두 무늬에서 가장 작은 수가 이겨요.",
  pocahontas: "트릭 시작 전 이번에 먼저 낼 사람을 정해요.",
  mulan: "모두 낸 뒤 내 카드를 손패의 같은 무늬 카드로 교체할 수 있어요. 개구리는 교체할 수 없어요.",
  'pea-princess': "트릭 시작 전 사용해요. 모두 가능한 경우 5보다 큰 수를 내야 해요.",
  rapunzel: "트릭 시작 전 사용해요. 선 플레이어에게 왕자가 있으면 왕자로 시작하게 해요.",
  thumbelina: "선두가 아닌 내 차례에 무늬를 무시하고 낼 수 있어요. 왕자와 개구리는 낼 수 없어요."
};

export function legalCardsWithPeaPower(hand: Card[], trick: TrickState, princesBroken: boolean, active: boolean): Card[] {
  const legal = legalCards(hand, trick, princesBroken);
  if (!active) return legal;
  const high = legal.filter((card) => card.rank > 5);
  return high.length ? high : legal;
}

export function snowWhiteCanZero(card: Card): boolean {
  return card.rank <= 7;
}

export function mulanReplacements(hand: Card[], play: TrickPlay): Card[] {
  if (play.card.suit === 'pets' && play.card.rank === 8) return [];
  return hand.filter((card) => card.suit === play.card.suit && cardLabel(card) !== cardLabel(play.card));
}

export function thumbelinaCanPlay(card: Card): boolean {
  return card.suit !== 'princes' && !(card.suit === 'pets' && card.rank === 8);
}
