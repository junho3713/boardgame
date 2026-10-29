import { calculateSettlement } from "./scoring.mjs";

const filters = [...document.querySelectorAll("[data-filter]")];
const melds = [...document.querySelectorAll(".meld")];
for (const button of filters) {
  button.addEventListener("click", () => {
    let visible = 0;
    for (const item of filters) item.setAttribute("aria-pressed", String(item === button));
    for (const meld of melds) {
      meld.hidden = button.dataset.filter !== "all" && meld.dataset.count !== button.dataset.filter;
      if (!meld.hidden) visible += 1;
    }
    document.querySelector(".filter-count").textContent = `족보 ${visible}종`;
  });
}

const form = document.querySelector("#settlementForm");
const playerCount = document.querySelector("#playerCount");
const inputs = document.querySelector("#playerInputs");
const result = document.querySelector("#calculationResult");
const error = document.querySelector("#calculationError");
const names = ["A", "B", "C", "D", "E"];

function renderInputs() {
  const n = Number(playerCount.value);
  const handSize = n === 4 ? 13 : 12;
  const sample = [0, 1, 3, 7, 8];
  inputs.innerHTML = names.slice(0, n).map((name, i) => `<tr>
    <th scope="row">${name}</th>
    <td><input type="number" id="tiles${i}" aria-label="참가자 ${name}의 남은 전체 타일 수" min="0" max="${handSize}" step="1" value="${sample[i]}" inputmode="numeric" required></td>
    <td><input type="number" id="twos${i}" aria-label="참가자 ${name}의 숫자 2 타일 수" min="0" max="4" step="1" value="0" inputmode="numeric" required></td>
  </tr>`).join("");
  result.hidden = true;
  error.hidden = true;
}

playerCount.addEventListener("change", renderInputs);
form.addEventListener("input", () => {
  result.hidden = true;
  error.hidden = true;
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const n = Number(playerCount.value);
  const counts = names.slice(0, n).map((_, i) => Number(document.querySelector(`#tiles${i}`).value));
  const twos = names.slice(0, n).map((_, i) => Number(document.querySelector(`#twos${i}`).value));
  try {
    const settlement = calculateSettlement(counts, twos);
    result.innerHTML = `<h3>이번 판 정산 결과</h3><div class="table-wrap"><table class="result-table"><caption>숫자 2의 배수를 먼저 적용한 결과예요.</caption><thead><tr><th>참가자</th><th>계산된 개수</th><th>최종 득실</th></tr></thead><tbody>${names.slice(0, n).map((name, i) => `<tr><th scope="row">${name}</th><td>${counts[i]} × ${2 ** twos[i]} = <strong>${settlement.adjusted[i]}개</strong></td><td class="${settlement.net[i] >= 0 ? "gain" : "loss"}"><strong>${settlement.net[i] > 0 ? "+" : ""}${settlement.net[i]}점</strong></td></tr>`).join("")}</tbody></table></div>
    <details><summary>누가 누구에게 얼마씩 주는지 보기</summary><ul>${settlement.transfers.map((transfer) => `<li><strong>${names[transfer.from]} → ${names[transfer.to]}</strong> : ${transfer.amount}점</li>`).join("")}</ul></details><p class="note">전체 득실 합계는 0점이에요. 칩이 충분할 때의 결과이며, 누군가 칩이 바닥나면 위 정산 순서 규칙을 적용해요.</p>`;
    result.hidden = false;
    error.hidden = true;
  } catch (failure) {
    result.hidden = true;
    error.textContent = failure.message;
    error.hidden = false;
  }
});
renderInputs();
form.hidden = false;
