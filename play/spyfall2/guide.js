"use strict";
const locationSearch = document.querySelector("#locationSearch");
const locationCards = [...document.querySelectorAll(".location")];
const normalize = (value) => value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
locationSearch.addEventListener("input", () => {
  const query = normalize(locationSearch.value);
  let visible = 0;
  for (const card of locationCards) {
    card.hidden = !normalize(card.dataset.search).includes(query);
    if (!card.hidden) visible += 1;
  }
  document.querySelector("#locationCount").textContent = query
    ? `장소 20곳 중 ${visible}곳`
    : "장소 20곳";
  document.querySelector(".no-results").hidden = visible !== 0;
});
