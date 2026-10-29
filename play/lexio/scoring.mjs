export function calculateSettlement(counts, twos) {
  const n = counts.length;
  if (n < 3 || n > 5 || twos.length !== n) {
    throw new Error("참가 인원은 3~5명이어야 해요.");
  }
  const handSize = n === 4 ? 13 : 12;
  if (counts.some((v) => !Number.isInteger(v) || v < 0 || v > handSize)) {
    throw new Error(`남은 타일 수는 0~${handSize} 사이의 정수로 입력해 주세요.`);
  }
  if (twos.some((v, i) => !Number.isInteger(v) || v < 0 || v > 4 || v > counts[i])) {
    throw new Error("숫자 2의 개수는 0~4개이며, 남은 전체 타일 수보다 많을 수 없어요.");
  }
  if (twos.reduce((sum, v) => sum + v, 0) > 4) {
    throw new Error("게임 전체의 숫자 2 타일은 네 개뿐이에요.");
  }
  if (counts.filter((v) => v === 0).length !== 1) {
    throw new Error("타일을 다 턴 한 명만 0개여야 해요.");
  }
  const adjusted = counts.map((v, i) => v * 2 ** twos[i]);
  const net = adjusted.map((v) => adjusted.reduce((sum, other) => sum + other - v, 0));
  const transfers = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const difference = adjusted[i] - adjusted[j];
      if (difference !== 0) {
        transfers.push({
          from: difference > 0 ? i : j,
          to: difference > 0 ? j : i,
          amount: Math.abs(difference),
        });
      }
    }
  }
  transfers.sort((a, b) => adjusted[a.to] - adjusted[b.to] || a.to - b.to || adjusted[a.from] - adjusted[b.from]);
  return { adjusted, net, transfers };
}
