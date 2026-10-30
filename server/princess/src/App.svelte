<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { replaceState } from '$app/navigation';
  import SpriteCard from '$lib/components/SpriteCard.svelte';
  import { cardSpriteProps, princessSpriteProps, roundSpriteProps, roundTargetAspect } from '$lib/asset-sprites';
  import { ensureAnonymousIdentity, firebaseDatabase, probeFirebase } from '$lib/firebase';
  import { api } from '$lib/firebase';
  import { gameAudio } from '$lib/game-audio';
  import {
    appendGameEvent,
    loadGame,
    normalizeGameId,
    subscribeToGame,
    type GameProjection
  } from '$lib/game-events';
  import { cardLabel, dealForPlayers, PRINCESSES, roundPowersForGame, ROUND_RULES, ROUND_RULE_TEXT, SUITS, type Card } from '$lib/setup';
  import { passInstruction } from '$lib/passing';
  import { mulanReplacements, PRINCESS_POWER_TEXT, snowWhiteCanZero, thumbelinaCanPlay } from '$lib/princess-powers';
  import { isMasqueradeHidden, roundLegalCards } from '$lib/round-rules';
  import { choiceCommitment, crystalClearChoiceScope, princessChoiceScope } from '$lib/choice-commitment';
  import { actionOwnership } from '$lib/action-ownership';

  let connection: 'checking' | 'synced' | 'error' = 'checking';
  let connectionLabel = '서버 연결 중…';
  let displayName = '';
  let inviteCode = '';
  let activeGameId = '';
  let game: GameProjection | null = null;
  let actionError = '';
  let unsubscribe = () => {};
  let currentUid = '';
  let selectedPrincess = '';
  let princessCommitPending = false;
  let dealPending = false;
  let selectedPassCards: Array<string | null> = [];
  let observedRoundIndex = -1;
  let observedGameNumber = -1;
  let observedSleepingBeautyPendingKey = '';
  let snowWhiteArmed = false;
  let thumbelinaArmed = false;
  let openPrincessPower = '';
  let selectedPowerCards: Card[] = [];
  let selectedRoundCards: string[] = [];
  let selectedHaggleOffer = '';
  let mixerOpen = false;
  let musicVolume = 70;
  let effectsVolume = 85;
  let musicMuted = false;
  let effectsMuted = false;
  let celebratedPrincessId = '';
  let celebrationKey = 0;
  let showPrincessBurst = false;
  let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
  const submittedPrincessReveals = new Set<string>();
  const submittedSuitReveals = new Set<string>();

  const build = 'Render';
  const audioMixStorageKey = 'rebel-princess:audio-mix';

  onMount(() => {
    try {
      const savedMix = JSON.parse(localStorage.getItem(audioMixStorageKey) ?? '{}');
      if (Number.isFinite(savedMix.musicVolume)) musicVolume = Math.max(0, Math.min(100, savedMix.musicVolume));
      if (Number.isFinite(savedMix.effectsVolume)) effectsVolume = Math.max(0, Math.min(100, savedMix.effectsVolume));
      if (typeof savedMix.musicMuted === 'boolean') musicMuted = savedMix.musicMuted;
      if (typeof savedMix.effectsMuted === 'boolean') effectsMuted = savedMix.effectsMuted;
    } catch {
      // Ignore malformed preferences and retain the balanced default mix.
    }
    applyAudioMix(false);
    const beginAudio = () => { if (!musicMuted) void gameAudio.startMusic(); };
    window.addEventListener('pointerdown', beginAudio, { once: true });
    window.addEventListener('keydown', beginAudio, { once: true });
    void (async () => {
      try {
        const e2eUid = new URL(location.href).searchParams.get('e2eUid') ?? undefined;
        const target = await probeFirebase(e2eUid);
        currentUid = (await ensureAnonymousIdentity(e2eUid)).uid;
        connection = 'synced';
        connectionLabel = target === 'emulator' ? '서버 연결됨' : '서버 연결됨';
        const gameId = normalizeGameId(new URL(location.href).searchParams.get('game') ?? '');
        if (gameId) { inviteCode = gameId; try { const saved = await loadGame(firebaseDatabase(),gameId); if (saved.players.some((p) => p.uid === currentUid)) watchGame(gameId); } catch {} }
      } catch {
        connection = 'error';
        connectionLabel = '연결 실패 · 새로고침해 주세요';
      }
    })();
    return () => {
      unsubscribe();
      window.removeEventListener('pointerdown', beginAudio);
      window.removeEventListener('keydown', beginAudio);
      if (celebrationTimer) clearTimeout(celebrationTimer);
      gameAudio.stopMusic();
    };
  });

  function watchGame(gameId: string) {
    unsubscribe();
    activeGameId = gameId;
    dealPending = false;
    observedRoundIndex = -1;
    observedGameNumber = -1;
    observedSleepingBeautyPendingKey = '';
    openPrincessPower = '';
    selectedPowerCards = [];
    const parameters = new URL(location.href).searchParams;
    parameters.set('game', gameId);
    parameters.delete('gameId');
    replaceState(`?${parameters.toString()}`, {});
    unsubscribe = subscribeToGame(firebaseDatabase(), gameId, (next) => {
      if (next.roundIndex !== observedRoundIndex || next.gameNumber !== observedGameNumber) {
        selectedPassCards = [];
        openPrincessPower = '';
        selectedPowerCards = [];
        princessCommitPending = false;
        observedRoundIndex = next.roundIndex;
        observedGameNumber = next.gameNumber;
      }
      const sleepingBeautyPendingKey = next.pendingPower?.powerId === 'sleeping-beauty'
        ? `${next.gameNumber}:${next.roundIndex}:${next.pendingPower.actorUid}`
        : '';
      if (sleepingBeautyPendingKey !== observedSleepingBeautyPendingKey) {
        openPrincessPower = '';
        selectedPowerCards = [];
        observedSleepingBeautyPendingKey = sleepingBeautyPendingKey;
      }
      const nextPrincessPower = next.powerIdsThisTrick.at(-1) ?? '';
      if (nextPrincessPower !== celebratedPrincessId) {
        celebratedPrincessId = nextPrincessPower;
        celebrationKey += 1;
        if (celebrationTimer) clearTimeout(celebrationTimer);
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        showPrincessBurst = Boolean(nextPrincessPower);
        if (nextPrincessPower) {
          void gameAudio.playPrincessChime();
          celebrationTimer = setTimeout(() => showPrincessBurst = false, reducedMotion ? 500 : 2400);
        }
      }
      game = next;
      if (next.hands) dealPending = false;
      connection = 'synced';
      connectionLabel = '실시간 연결됨';
      void revealCommittedPrincess(next);
      void revealCommittedCrystalSuit(next);
    }, () => {
      connection = 'error';
      connectionLabel = '재연결 중…';
    });
  }

  type StoredChoice = { choice: string; nonce: string };

  function sealedChoiceKey(kind: 'princess' | 'crystal-clear', projection: GameProjection, uid: string): string {
    const phase = kind === 'princess' ? projection.gameNumber : `${projection.gameNumber}:${projection.roundIndex}`;
    return `rebel-princess:sealed-choice:${kind}:${projection.gameId}:${phase}:${uid}`;
  }

  function readStoredChoice(key: string): StoredChoice | null {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? 'null');
      return value && typeof value.choice === 'string' && typeof value.nonce === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  async function revealCommittedPrincess(projection: GameProjection) {
    const player = projection.players.find((candidate) => candidate.uid === currentUid);
    const commitment = projection.princessCommitments[currentUid];
    if (!player || player.ready || !commitment || projection.players.length < 3 || !projection.players.every((candidate) => projection.princessCommitments[candidate.uid])) return;
    const key = sealedChoiceKey('princess', projection, currentUid);
    if (submittedPrincessReveals.has(key)) return;
    const stored = readStoredChoice(key);
    if (!stored || choiceCommitment(princessChoiceScope(projection.gameId, projection.gameNumber, currentUid), stored.choice, stored.nonce) !== commitment) {
      actionError = '이 브라우저에 공주 선택 정보가 없어요. 처음 선택한 창에서 이어 해 주세요.';
      return;
    }
    submittedPrincessReveals.add(key);
    try {
      await appendGameEvent(firebaseDatabase(), projection.gameId, currentUid, 'player/configured', {
        princessId: stored.choice, nonce: stored.nonce, ready: true
      });
    } catch {
      submittedPrincessReveals.delete(key);
    }
  }

  async function revealCommittedCrystalSuit(projection: GameProjection) {
    if (projection.awaitingRoundAction !== 'reveal-suit' || projection.revealedSuits[currentUid]) return;
    const commitment = projection.suitCommitments[currentUid];
    if (!commitment || !projection.players.every((player) => projection.suitCommitments[player.uid])) return;
    const key = sealedChoiceKey('crystal-clear', projection, currentUid);
    if (submittedSuitReveals.has(key)) return;
    const stored = readStoredChoice(key);
    if (!stored || choiceCommitment(crystalClearChoiceScope(projection.gameId, projection.gameNumber, projection.roundIndex, currentUid), stored.choice, stored.nonce) !== commitment) {
      actionError = '무늬 선택을 확정했던 창에서 이어 해 주세요.';
      return;
    }
    submittedSuitReveals.add(key);
    try {
      await appendGameEvent(firebaseDatabase(), projection.gameId, currentUid, 'round/suit-revealed', {
        suit: stored.choice as Card['suit'], nonce: stored.nonce
      });
    } catch {
      submittedSuitReveals.delete(key);
    }
  }

  function applyAudioMix(persist = true) {
    gameAudio.setMix({
      musicVolume: musicVolume / 100,
      effectsVolume: effectsVolume / 100,
      musicMuted,
      effectsMuted
    });
    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(audioMixStorageKey, JSON.stringify({ musicVolume, effectsVolume, musicMuted, effectsMuted }));
    }
  }

  function updateAudioMix() {
    applyAudioMix();
  }

  function toggleMusicMute() {
    musicMuted = !musicMuted;
    applyAudioMix();
    if (!musicMuted) void gameAudio.startMusic();
  }

  function toggleEffectsMute() {
    effectsMuted = !effectsMuted;
    applyAudioMix();
  }

  function toggleAllAudio() {
    const unmuteAll = musicMuted && effectsMuted;
    musicMuted = !unmuteAll;
    effectsMuted = !unmuteAll;
    applyAudioMix();
    if (unmuteAll) void gameAudio.startMusic();
  }

  let soloMode = false;
  async function addBot() { try { await api('/bots', {gameId:activeGameId}); } catch(e) { actionError = e instanceof Error ? e.message : String(e); } }
  async function soloGame() { soloMode = true; displayName = displayName.trim() || '나'; await createGame(); soloMode = false; }
  async function createGame() {
    await enterGame('game/created', normalizeGameId(new URL(location.href).searchParams.get('gameId') ?? '') ||
      crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase());
  }

  async function joinGame() {
    await enterGame('player/joined', normalizeGameId(inviteCode));
  }

  async function enterGame(type: 'game/created' | 'player/joined', gameId: string) {
    actionError = '';
    const name = displayName.trim();
    if (!name || !gameId) {
      actionError = '이름과 방 코드를 확인해 주세요.';
      return;
    }
    connection = 'checking';
    connectionLabel = type === 'game/created' ? '방 만드는 중…' : '입장 중…';
    try {
      const user = await ensureAnonymousIdentity(new URL(location.href).searchParams.get('e2eUid') ?? undefined);
      currentUid = user.uid;
      if (type === 'player/joined') {
        const existing = await loadGame(firebaseDatabase(), gameId);
        if (existing.players.length === 0) throw new Error('방을 찾지 못했어요.');
        if (existing.players.length >= 6 && !existing.players.some((player) => player.uid === user.uid)) throw new Error('6명이 모두 입장했어요.');
      }
      await appendGameEvent(firebaseDatabase(), gameId, user.uid, type, { displayName: name, solo: soloMode } as any);
      watchGame(gameId);
    } catch {
      connection = 'error';
      connectionLabel = '방에 입장하지 못했어요';
      actionError = '방 상태를 확인하고 다시 시도해 주세요.';
    }
  }

  async function becomeReady() {
    if (princessCommitPending || !selectedPrincess || !game || game.players.length < 3 || game.princessCommitments[currentUid] || !game.princessOptions[currentUid]?.includes(selectedPrincess)) return;
    princessCommitPending = true;
    connection = 'checking';
    connectionLabel = '공주 확정 중…';
    const nonce = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const key = sealedChoiceKey('princess', game, currentUid);
    localStorage.setItem(key, JSON.stringify({ choice: selectedPrincess, nonce } satisfies StoredChoice));
    try {
      await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'player/princess-committed', {
        commitment: choiceCommitment(princessChoiceScope(game.gameId, game.gameNumber, currentUid), selectedPrincess, nonce)
      });
    } catch {
      princessCommitPending = false;
      connection = 'error';
      connectionLabel = '공주를 확정하지 못했어요';
      actionError = '다시 공주를 선택해 확정해 주세요.';
    }
  }

  const previewCards = [
    { suit: 'fairies', rank: 7 },
    { suit: 'queens', rank: 7 },
    { suit: 'princes', rank: 7 },
    { suit: 'pets', rank: 7 }
  ] as Card[];

  async function dealCards() {
    if (dealPending || !game || game.players.length < 3 || game.players.length > 6 || !game.players.every((player) => player.ready)) return;
    actionError = '';
    dealPending = true;
    connection = 'checking';
    connectionLabel = '카드를 섞어 나누는 중…';
    const seed = new URL(location.href).searchParams.get('seed') ?? crypto.randomUUID();
    const requestedRounds = new URL(location.href).searchParams.get('e2eRounds')?.split(',') ?? [];
    const knownRoundIds = new Set<string>(ROUND_RULES.map(([id]) => id));
    const e2eRoundIds = 'false' === 'true' && requestedRounds.length === 5 && new Set(requestedRounds).size === 5 && requestedRounds.every((id) => knownRoundIds.has(id))
      ? requestedRounds
      : null;
    try {
      await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'game/dealt', {
        seed,
        roundIds: e2eRoundIds ?? roundPowersForGame(`${activeGameId}:${game.gameNumber}:${seed}`),
        hands: dealForPlayers(game.players.map((player) => player.uid), seed)
      });
    } catch {
      dealPending = false;
      connection = 'error';
      connectionLabel = '카드를 나누지 못했어요';
      actionError = '모두 준비했는지 확인하고 다시 눌러 주세요.';
    }
  }

  function suitName(suit:string) { return ({fairies:'요정',queens:'여왕',princes:'왕자',pets:'동물'} as any)[suit] ?? suit; }
  function princessName(id?: string) { return PRINCESSES.find(([key]) => key === id)?.[1] ?? '선택 중…'; }

  function roundParentStyle(id: string) {
    return `aspect-ratio: ${roundTargetAspect(id)};`;
  }
  function localPlayer() { return game?.players.find((player) => player.uid === currentUid); }
  function playerName(uid?: string | null) { return game?.players.find((player) => player.uid === uid)?.displayName ?? '현재 플레이어'; }
  function localCardBlockExplanation() {
    if (!game?.hands || game.currentTurnUid !== currentUid || game.awaitingRoundAction || game.pendingPower || game.pendingMulanUid) return '';
    const forced = game.forcedCards[currentUid];
    if (forced) return `얼음 공주가 ${cardLabel(forced)}을 지정했어요. 이번에는 그 카드를 내야 해요.`;
    const ledSuit = game.trick?.plays[0]?.card.suit;
    if (ledSuit && game.hands[currentUid].some((card) => card.suit === ledSuit)) return `${suitName(ledSuit)} 무늬를 따라 내야 해요. 금색으로 올라온 카드를 누르세요.`;
    return `금색으로 올라온 카드는 이번 규칙과 공주 능력에 맞게 낼 수 있어요.`;
  }
  function clockwiseOpponents() {
    if (!game) return [];
    const localIndex = game.players.findIndex((player) => player.uid === currentUid);
    return Array.from({ length: game.players.length - 1 }, (_, offset) => game!.players[(localIndex + offset + 1) % game!.players.length]);
  }
  function seatStyle(index: number, count: number) {
    const layouts: Record<number, Array<[number, number]>> = {
      2: [[28, 3], [72, 3]], 3: [[9, 34], [50, 3], [91, 34]],
      4: [[8, 35], [30, 3], [70, 3], [92, 35]], 5: [[8, 35], [27, 5], [50, 1], [73, 5], [92, 35]]
    };
    const [x, y] = layouts[count]?.[index] ?? [50, 3];
    return `--seat-x: ${x}%; --seat-y: ${y}%; --seat-snap-x: calc(round(nearest, ${x}cqw, 1px) - ${x}cqw)`;
  }
  function powerAvailable(id?: string) { return Boolean(id && game?.passComplete && !game.roundComplete && !game.exhaustedPrincessUids.includes(currentUid)); }
  function princessUsable(id?: string) {
    if (!id || !powerAvailable(id) || game?.awaitingRoundAction) return false;
    if (activeRoundId() === 'late-to-the-ball' && game?.completedTricks === 11 && (id === 'sleeping-beauty' || id === 'scheherazade')) return false;
    if (id === 'mulan') return game?.pendingMulanUid === currentUid;
    if (id === 'alice') return game?.lastCompletedTrick?.winnerUid === currentUid && !game.lastCompletedTrick.plays.some((play) => play.card.suit === 'pets' && play.card.rank === 8);
    if (id === 'snow-white') return game?.currentTurnUid === currentUid && game.hands?.[currentUid]?.some((card) => playable(card) && snowWhiteCanZero(card));
    if (id === 'thumbelina') return game?.currentTurnUid === currentUid && Boolean(game.trick?.plays.length) && game.hands?.[currentUid]?.some(thumbelinaCanPlay);
    return game?.trick?.plays.length === 0 && !game.pendingPower;
  }
  function roundName(id: string) { return ROUND_RULES.find(([key]) => key === id)?.[1] ?? id; }
  function roundRule(id: string) { return ROUND_RULE_TEXT[id] ?? '이번 라운드 규칙을 확인해 주세요.'; }
  function activeRoundId() { return game?.roundIds[game.roundIndex] ?? ''; }
  function mermaidSuits() {
    const hand = game?.hands?.[game?.trick?.leaderUid ?? ''] ?? [];
    return SUITS;
  }
  function nextLeaderName() { return game?.players.find((player) => player.uid === game?.nextLeaderUid)?.displayName ?? ''; }
  function winnerNames() { return game?.winnerUids.map((uid) => game?.players.find((player) => player.uid === uid)?.displayName).filter(Boolean).join(' and ') ?? ''; }
  function playOrigin(uid: string) {
    if (!game || uid === currentUid) return '--play-x: 0; --play-y: 34vh';
    const index = game.players.filter((player) => player.uid !== currentUid).findIndex((player) => player.uid === uid);
    return `--play-x: ${index % 2 === 0 ? '-24vw' : '24vw'}; --play-y: -32vh`;
  }
  function collectDestination(uid: string) {
    const origin = playOrigin(uid);
    return origin.replaceAll('--play-x', '--collect-x').replaceAll('--play-y', '--collect-y');
  }
  function lastCaptured(uid: string) {
    return game?.capturedTricks[uid]?.at(-1) ?? [];
  }

  function passRecipient(card?: Card): string {
    if (!game) return '';
    const instruction = passInstruction(activeRoundId());
    const index = game.players.findIndex((player) => player.uid === currentUid);
    const left = game.players[(index + 1) % game.players.length].displayName;
    const right = game.players[(index - 1 + game.players.length) % game.players.length].displayName;
    if (instruction.direction === 'left') return left;
    if (instruction.direction === 'right') return right;
    if (!card) return `${left} and ${right}`;
    const submittedIndex = game.passSubmissions[currentUid]?.findIndex((entry) => cardLabel(entry) === cardLabel(card)) ?? -1;
    return submittedIndex >= 0 && submittedIndex < Math.ceil(instruction.count / 2) ? left : right;
  }
  function waitingForPasses(game: GameProjection | null): string {
    const count = game?.players.filter((player) => !game?.passSubmissions[player.uid]).length ?? 0;
    return `${count}명이 교환할 카드를 고르고 있어요.`;
  }

  function togglePassCard(card: Card) {
    if (!game || game.passComplete || game.passSubmissions[currentUid]) return;
    const label = cardLabel(card);
    const required = passInstruction(activeRoundId()).count;
    const existing = selectedPassCards.indexOf(label);
    if (existing >= 0) {
      selectedPassCards = selectedPassCards.map((entry, index) => index === existing ? null : entry);
      return;
    }
    const openSlot = selectedPassCards.findIndex((entry) => entry === null);
    if (openSlot >= 0) selectedPassCards = selectedPassCards.map((entry, index) => index === openSlot ? label : entry);
    else if (selectedPassCards.length < required) selectedPassCards = [...selectedPassCards, label];
  }

  async function submitPass() {
    if (!game?.hands || game.passComplete || game.passSubmissions[currentUid]) return;
    const instruction = passInstruction(activeRoundId());
    const hand = game.hands[currentUid];
    const cards = selectedPassCards.flatMap((label) => {
      const card = hand.find((held) => cardLabel(held) === label);
      return card ? [card] : [];
    });
    if (cards.length !== instruction.count) return;
    connection = 'checking';
    connectionLabel = '카드 전달 중…';
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'pass/submitted', { cards });
  }

  async function reclaimPassCard(card: Card) {
    const committed = game?.passSubmissions[currentUid];
    if (!committed || game?.passComplete || !committed.some((entry) => cardLabel(entry) === cardLabel(card))) return;
    selectedPassCards = committed.map((entry) => cardLabel(entry) === cardLabel(card) ? null : cardLabel(entry));
    connection = 'checking';
    connectionLabel = '교환 선택 되돌리는 중…';
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'pass/retracted', {});
  }

  function handleHandCard(card: Card) {
    if (game?.awaitingRoundAction === 'haggle' && game.haggleWinnerUid === currentUid) selectedHaggleOffer = cardLabel(card);
    else if (game?.awaitingRoundAction === 'split-hand') toggleRoundCard(card);
    else if (game?.awaitingRoundAction && game.awaitingRoundAction !== 'reveal-suit') void submitRoundAction(card);
    else if (game?.passComplete) void playCard(card);
    else if (game?.passSubmissions[currentUid]) void reclaimPassCard(card);
    else togglePassCard(card);
  }

  function playable(card: Card): boolean {
    if (!game?.hands || !game.trick || game.pendingPower || game.awaitingRoundAction || game.currentTurnUid !== currentUid) return false;
    const forced = game.forcedCards[currentUid];
    if (thumbelinaArmed && localPlayer()?.princessId === 'thumbelina') return thumbelinaCanPlay(card);
    return forced ? cardLabel(forced) === cardLabel(card) : roundLegalCards(game.hands[currentUid], game.trick, game.princesBroken, activeRoundId(), game.powerIdsThisTrick.includes('pea-princess')).some((candidate) => cardLabel(candidate) === cardLabel(card));
  }

  async function submitRoundAction(card: Card) {
    if (!game?.awaitingRoundAction || game.roundActionSubmissions[currentUid]) return;
    const type = game.awaitingRoundAction === 'set-aside' ? 'round/card-set-aside' : game.awaitingRoundAction === 'wedding-gift' ? 'round/gift-submitted' : 'round/pass-submitted';
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, type, { card });
  }

  async function commitCrystalSuit(suit: Card['suit']) {
    if (game?.awaitingRoundAction !== 'reveal-suit' || game.suitCommitments[currentUid] || !game.hands?.[currentUid]?.some((card) => card.suit === suit)) return;
    const nonce = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const key = sealedChoiceKey('crystal-clear', game, currentUid);
    localStorage.setItem(key, JSON.stringify({ choice: suit, nonce } satisfies StoredChoice));
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'round/suit-committed', {
      commitment: choiceCommitment(crystalClearChoiceScope(game.gameId, game.gameNumber, game.roundIndex, currentUid), suit, nonce)
    });
  }

  function toggleRoundCard(card: Card) {
    if (game?.awaitingRoundAction !== 'split-hand' || game.roundCardSubmissions[currentUid]) return;
    const label = cardLabel(card);
    selectedRoundCards = selectedRoundCards.includes(label) ? selectedRoundCards.filter((entry) => entry !== label) : selectedRoundCards.length < Math.floor((game.hands?.[currentUid]?.length ?? 0) / 2) ? [...selectedRoundCards, label] : selectedRoundCards;
  }

  async function submitAfterPartyHalf() {
    if (game?.awaitingRoundAction !== 'split-hand' || game.roundCardSubmissions[currentUid]) return;
    const cards = (game.hands?.[currentUid] ?? []).filter((card) => selectedRoundCards.includes(cardLabel(card)));
    if (cards.length * 2 !== (game.hands?.[currentUid]?.length ?? 0)) return;
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'round/half-selected', { cards });
  }

  async function submitHaggle(taken: Card) {
    if (game?.awaitingRoundAction !== 'haggle' || game.haggleWinnerUid !== currentUid || !selectedHaggleOffer) return;
    const offered = game.hands?.[currentUid]?.find((card) => cardLabel(card) === selectedHaggleOffer); if (!offered) return;
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'round/haggle-swapped', { cards: [offered, taken] }); selectedHaggleOffer = '';
  }

  async function declineHaggle() {
    if (game?.awaitingRoundAction !== 'haggle' || game.haggleWinnerUid !== currentUid) return;
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'round/haggle-declined', {}); selectedHaggleOffer = '';
  }

  async function playCard(card: Card) {
    if (!game?.passComplete || !playable(card)) return;
    connection = 'checking';
    connectionLabel = `${cardLabel(card)} 내는 중…`;
    if (snowWhiteArmed && localPlayer()?.princessId === 'snow-white' && snowWhiteCanZero(card)) {
      await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'power/activated', { powerId: 'snow-white', card });
      snowWhiteArmed = false;
    }
    if (thumbelinaArmed && localPlayer()?.princessId === 'thumbelina' && thumbelinaCanPlay(card)) {
      await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'power/activated', { powerId: 'thumbelina', card });
      thumbelinaArmed = false;
    }
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'card/played', { card });
  }

  async function activatePower(powerId: string, targetUid?: string, card?: Card, suit?: Card['suit'], cards?: Card[]) {
    const resolvingMulan = powerId === 'mulan' && game?.pendingMulanUid === currentUid;
    const resolvingPendingPower = game?.pendingPower?.actorUid === currentUid && game.pendingPower.powerId === powerId;
    if ((!resolvingMulan && !resolvingPendingPower && !princessUsable(powerId)) || localPlayer()?.princessId !== powerId) return;
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'power/activated', { powerId, ...(targetUid ? { targetUid } : {}), ...(card ? { card } : {}), ...(suit ? { suit } : {}), ...(cards ? { cards } : {}) });
  }

  async function usePrincessCard() {
    const powerId = localPlayer()?.princessId;
    if (!powerId || !princessUsable(powerId)) return;
    if (powerId === 'snow-white') {
      if (game?.currentTurnUid === currentUid && game.hands?.[currentUid]?.some((card) => playable(card) && snowWhiteCanZero(card))) snowWhiteArmed = !snowWhiteArmed;
      return;
    }
    if (powerId === 'thumbelina') {
      if (game?.currentTurnUid === currentUid && game.trick?.plays.length && game.hands?.[currentUid]?.some(thumbelinaCanPlay)) thumbelinaArmed = !thumbelinaArmed;
      return;
    }
    if (powerId === 'cinderella' || powerId === 'pea-princess' || powerId === 'rapunzel') {
      if (game?.trick?.plays.length === 0) await activatePower(powerId);
      return;
    }
    if (powerId === 'alice') { await activatePower(powerId); return; }
    if (['little-mermaid', 'ice-princess', 'scheherazade', 'sleeping-beauty'].includes(powerId) && game?.trick?.plays.length === 0) {
      openPrincessPower = openPrincessPower === powerId ? '' : powerId;
      selectedPowerCards = [];
      return;
    }
    if (powerId === 'pocahontas' && game?.trick?.plays.length === 0) openPrincessPower = openPrincessPower === powerId ? '' : powerId;
    if (powerId === 'mulan' && game?.pendingMulanUid === currentUid) openPrincessPower = openPrincessPower === powerId ? '' : powerId;
  }

  async function contributeSleepingBeauty(card: Card) {
    if (game?.pendingPower?.powerId !== 'sleeping-beauty' || game.pendingPower.cards.some((entry) => entry.uid === currentUid)) return;
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'power/contributed', { powerId: 'sleeping-beauty', card });
  }

  async function beginSleepingBeauty() {
    if (game?.pendingPower || !princessUsable('sleeping-beauty')) return;
    openPrincessPower = '';
    selectedPowerCards = [];
    await activatePower('sleeping-beauty');
  }

  function sleepingBeautySelectionComplete() {
    if (game?.pendingPower?.powerId !== 'sleeping-beauty' || game.pendingPower.actorUid !== currentUid || game.pendingPower.cards.length !== game.players.length) return false;
    const contributed = new Set(game.pendingPower.cards.map((entry) => cardLabel(entry.card)));
    const selected = selectedPowerCards.map(cardLabel);
    return selected.length === game.players.length && new Set(selected).size === game.players.length && selected.every((label) => contributed.has(label));
  }

  function selectRedistribution(card: Card) {
    const contributed = new Set(game?.pendingPower?.powerId === 'sleeping-beauty' ? game.pendingPower.cards.map((entry) => cardLabel(entry.card)) : []);
    if (!contributed.has(cardLabel(card))) return;
    const current = selectedPowerCards.filter((entry) => contributed.has(cardLabel(entry)));
    if (current.some((entry) => cardLabel(entry) === cardLabel(card))) selectedPowerCards = current.filter((entry) => cardLabel(entry) !== cardLabel(card));
    else if (current.length < (game?.players.length ?? 0)) selectedPowerCards = [...current, card];
  }

  async function redistributeSleepingBeauty() {
    if (!sleepingBeautySelectionComplete()) return;
    await activatePower('sleeping-beauty', undefined, undefined, undefined, selectedPowerCards);
  }

  async function declineMulan() {
    if (game?.pendingMulanUid !== currentUid) return;
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'power/declined', { powerId: 'mulan' });
  }

  async function dealNextRound() {
    if (!game?.roundComplete || game.players[0]?.uid !== currentUid || !game.players.every((player) => player.ready) || game.roundIndex >= 4) return;
    const nextRound = game.roundIndex + 1;
    selectedPassCards = [];
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'game/dealt', {
      seed: `${game.seed ?? activeGameId}-round-${nextRound + 1}`,
      roundIds: game.roundIds,
      hands: dealForPlayers(game.players.map((player) => player.uid), `${game.seed ?? activeGameId}-round-${nextRound + 1}`)
    });
  }

  async function rematch() {
    if (!game?.gameComplete || game.players[0]?.uid !== currentUid) return;
    await appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'game/rematched', {});
    selectedPrincess = '';
    selectedPassCards = [];
  }

  function newGame() {
    location.assign(new URL('./', location.href).pathname);
  }
</script>

<svelte:head>
  <title>프린세스의 반란 · 찐막보드게임</title>
</svelte:head>

<main class:gameplay={Boolean(game?.hands)} data-e2e-layout>
  <header class="masthead">
    <a class="wordmark" href="./" aria-label="Rebel Princess home">
      <strong>프린세스의 반란</strong>
    </a>
    <div class="header-tools">
      <a class="asset-review-link" href="https://junho3713.github.io/boardgame/play/princess/index.html" target="_blank" rel="noopener">규칙·공주 능력 보기</a>
      <div class="status" role="status" aria-live="polite" data-status={connection}>
        <span class="status-dot" aria-hidden="true"></span>
        {connectionLabel}
      </div>
    </div>
  </header>

  <section class="hero" class:dealt={Boolean(game?.hands)} aria-labelledby="hero-title">
    <div class="copy">
      
      <h1 id="hero-title">프린세스의 반란</h1>
      <p class="lede">
        3~6명이 다섯 라운드를 진행해 청혼 점수가 가장 낮은 공주가 이겨요.
        친구에게 방 코드를 알려주거나 컴퓨터를 추가해 플레이하세요.
      </p>
      {#if activeGameId && game?.hands}
        <section class="table" aria-label="게임 테이블">
          <div class="choice-status" class:my-choice={actionOwnership(game,currentUid).state === 'active'}><strong>{actionOwnership(game,currentUid).state === 'active' ? '내 차례 · ' + actionOwnership(game,currentUid).label : '다른 플레이어의 선택을 기다려요'}</strong><span>{game.awaitingRoundAction === 'reveal-suit' ? '무늬는 모두 확정하면 함께 공개해요' : (game as any).settings?.turnSeconds ? '선택마다 '+(game as any).settings.turnSeconds+'초 · 시간이 끝나면 자동 선택' : '시간 제한 없음'}</span></div>
          <div class="table-board" class:power-flash={showPrincessBurst} data-player-count={game.players.length}>
            <div class="opponents" aria-label="다른 플레이어">
              {#each clockwiseOpponents() as player, index}
                {@const ownership = actionOwnership(game, player.uid)}
                <section class="opponent-seat" class:action-active={ownership.state === 'active'} class:action-complete={ownership.state === 'complete'} style={seatStyle(index, game.players.length - 1)} data-clockwise-seat={index + 1} data-action-state={ownership.state} aria-label={`${player.displayName}'s hand`}>
                  <strong>{player.displayName} · {game.hands[player.uid]?.length ?? 0} {#if game.trick?.leaderUid === player.uid}<span class="lead-marker">선 플레이어</span>{/if}</strong>
                  {#if ownership.state !== 'idle'}<span class={`action-marker ${ownership.state}`} aria-label={`${player.displayName}: ${ownership.label}`}>{ownership.state === 'complete' ? '✓' : '●'} {ownership.label}</span>{/if}
                  <div class="seat-princess" class:exhausted={game.exhaustedPrincessUids.includes(player.uid)} class:power-active={celebratedPrincessId === player.princessId} aria-label={`${player.displayName}'s Princess: ${princessName(player.princessId)}`}>
                     <div class="princess-card">
                       <SpriteCard {...princessSpriteProps(player.princessId)} />
                     </div>
                     <strong>{princessName(player.princessId)}</strong>
                     <details class="power-reference"><summary>능력 보기</summary><p>{PRINCESS_POWER_TEXT[player.princessId ?? '']}</p></details>
                  </div>
                  <div class="card-backs" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                  {#if game.revealedSuits[player.uid]}
                    <div class="revealed-cards" role="group" aria-label={`${player.displayName}'s revealed ${game.revealedSuits[player.uid]} cards`}>
                      {#each game.hands[player.uid]?.filter((card) => card.suit === game?.revealedSuits[player.uid]) ?? [] as card}
                        <span class="review-card" aria-label={cardLabel(card)}>
                          <SpriteCard {...cardSpriteProps(card)} />
                          <strong>{card.rank}</strong>
                        </span>
                      {/each}
                    </div>
                  {/if}
                  {#if game.passComplete}<details class="trick-counter">
                    <summary aria-label={`${player.displayName} tricks`}>{game.capturedTricks[player.uid]?.length ?? 0}</summary>
                    {#if lastCaptured(player.uid).length}
                      <div class="trick-review" aria-label={`${player.displayName} last trick`}>
                        {#each lastCaptured(player.uid) as play}
                          <span class="review-card" aria-label={cardLabel(play.card)}>
                            <SpriteCard {...cardSpriteProps(play.card)} />
                            <strong>{play.card.rank}</strong>
                          </span>
                        {/each}
                      </div>
                    {/if}
                  </details>{/if}
                </section>
              {/each}
            </div>

            <article class="round-center" aria-label="Current Round card">
              <h2>{roundName(activeRoundId())}</h2>
              <div class="round-art" style={roundParentStyle(activeRoundId())}>
                <SpriteCard {...roundSpriteProps(activeRoundId())} />
              </div>
              <p class="round-rule">{roundRule(activeRoundId())}</p>
              <div class="pass-icon" aria-label={`Pass ${passInstruction(activeRoundId()).count} ${passInstruction(activeRoundId()).direction}`}>
                {#if passInstruction(activeRoundId()).direction === 'left' || passInstruction(activeRoundId()).direction === 'split'}<span aria-hidden="true">&#8635;</span>{/if}
                <strong>{passInstruction(activeRoundId()).direction === 'split' ? passInstruction(activeRoundId()).count / 2 : passInstruction(activeRoundId()).count}</strong>
                {#if passInstruction(activeRoundId()).direction === 'right' || passInstruction(activeRoundId()).direction === 'split'}<span aria-hidden="true">&#8634;</span>{/if}
              </div>
              <p class="round-count">{game.roundIndex + 1} / 5 라운드</p>
              {#if game.blindTransferComplete}<p class="active-power" role="status">남은 손패를 오른쪽으로 넘겼어요</p>{/if}
              {#if activeRoundId() === 'upside-down' && game.trick?.reversed}<p class="active-power" role="status">거꾸로 · 지금은 낮은 수가 이겨요</p>{/if}
              {#if game.powerIdsThisTrick.length}<p class="active-power" role="status">적용 중인 공주 능력: {game.powerIdsThisTrick.map(princessName).join(', ')}</p>{/if}
            </article>

            {#if celebratedPrincessId && showPrincessBurst}
              {#key celebrationKey}
                <aside class="princess-power-burst" role="status" aria-label={`${princessName(celebratedPrincessId)} power activated`}>
                  <span class="power-sparkles" aria-hidden="true">✦ · ✧ · ✦</span>
                  <div class="princess-card" aria-hidden="true">
                    <SpriteCard {...princessSpriteProps(celebratedPrincessId)} />
                  </div>
                  <span>공주 능력 사용</span>
                  <strong>{princessName(celebratedPrincessId)}</strong>
                  <p>{PRINCESS_POWER_TEXT[celebratedPrincessId]}</p>
                </aside>
              {/key}
            {/if}

            {#if game.passComplete}
              {@const collecting = !game.trick?.plays.length && Boolean(game.lastCompletedTrick)}
              {@const visiblePlays = collecting ? game.lastCompletedTrick?.plays ?? [] : game.trick?.plays ?? []}
              <section class="live-trick" class:collecting class:double-trick={activeRoundId() === 'prince-rings-twice'} aria-label={collecting ? 'Completed trick' : 'Current trick'}>
                {#each visiblePlays as play}
                  {@const masqueradeHidden = !collecting && play.uid !== currentUid && isMasqueradeHidden(activeRoundId(), game.trick!, play.uid, game.players.length)}
                  <article class="trick-play" style={collectDestination(game.lastCompletedTrick?.winnerUid ?? play.uid)} aria-label={`${game.players.find((player) => player.uid === play.uid)?.displayName} played ${masqueradeHidden ? 'a face-down card' : cardLabel(play.card)}`}>
                    <span>{game.players.find((player) => player.uid === play.uid)?.displayName}</span>
                    {#if masqueradeHidden}
                      <div class="trick-card face-down" style={playOrigin(play.uid)}></div>
                    {:else}
                      <div class="trick-card" style={playOrigin(play.uid)}>
                        <SpriteCard {...cardSpriteProps(play.card)} />
                        <strong>{play.card.rank}</strong><small>{suitName(play.card.suit)}</small>
                        {#if play.effectiveRank === 0}<em>숫자 0으로 사용</em>{/if}
                      </div>
                    {/if}
                  </article>
                {/each}
              </section>
              {#each game.players as player}
                <span class="sr-only" aria-label={`${player.displayName} captured cards`}>{game.capturedCounts[player.uid] ?? 0}</span>
              {/each}
            {/if}

            <section class="local-seat" class:action-active={actionOwnership(game, currentUid).state === 'active'} class:action-complete={actionOwnership(game, currentUid).state === 'complete'} data-action-state={actionOwnership(game, currentUid).state} aria-label="내 자리">
              <div class="local-heading" class:local-leader={game.trick?.leaderUid === currentUid}><strong>{game.players.find((player) => player.uid === currentUid)?.displayName} · 나 {#if game.trick?.leaderUid === currentUid}<span class="lead-marker">내가 먼저 내요</span>{/if}</strong><span>{game.hands[currentUid]?.length ?? 0}장</span></div>
              {#if actionOwnership(game, currentUid).state !== 'idle'}<span class={`action-marker local-action-marker ${actionOwnership(game, currentUid).state}`} aria-label={`You: ${actionOwnership(game, currentUid).label}`}>{actionOwnership(game, currentUid).state === 'complete' ? '✓' : '●'} {actionOwnership(game, currentUid).label}</span>{/if}
              {#if game.passComplete && localPlayer()?.princessId}
                <div class="seat-princess local-princess" class:exhausted={game.exhaustedPrincessUids.includes(currentUid)} class:armed={snowWhiteArmed || thumbelinaArmed} class:power-active={celebratedPrincessId === localPlayer()?.princessId}>
                  <button type="button" class="princess-card" aria-label={`${princessName(localPlayer()?.princessId)} 능력 사용`} aria-pressed={snowWhiteArmed || thumbelinaArmed || openPrincessPower === localPlayer()?.princessId} disabled={!princessUsable(localPlayer()?.princessId)} on:click={usePrincessCard}>
                    <SpriteCard {...princessSpriteProps(localPlayer()?.princessId)} />
                  </button>
                  <strong>{princessName(localPlayer()?.princessId)}</strong>
                  <span>{PRINCESS_POWER_TEXT[localPlayer()?.princessId ?? ''] ?? '능력 설명을 확인해 주세요.'}</span>
                </div>
              {/if}
              {#if game.pendingMulanUid === currentUid && game.trick}
                {@const mulanPlay = game.trick.plays.find((play) => play.uid === currentUid)}
                {#if mulanPlay && openPrincessPower === 'mulan'}<div class="power-controls" role="group" aria-label="Mulan power">
                  <strong>이 카드와 교환: {cardLabel(mulanPlay.card)}?</strong>
                  {#each mulanReplacements(game.hands[currentUid] ?? [], mulanPlay) as replacement}
                    <button type="button" on:click={() => activatePower('mulan', undefined, replacement)}>Swap for {cardLabel(replacement)}</button>
                  {/each}
                  <button class="secondary" type="button" on:click={declineMulan}>Keep played card</button>
                </div>{/if}
              {:else if powerAvailable(localPlayer()?.princessId) && game.trick?.plays.length === 0 && openPrincessPower === 'pocahontas'}
                <div class="power-controls" role="group" aria-label="Pocahontas power"><strong>먼저 낼 사람 선택</strong>{#each game.players as player}<button type="button" on:click={() => activatePower('pocahontas', player.uid)}>{player.displayName} 선 플레이어</button>{/each}</div>
              {:else if powerAvailable(localPlayer()?.princessId) && game.trick?.plays.length === 0 && openPrincessPower === 'little-mermaid'}
                <div class="power-controls" role="group" aria-label="Little Mermaid power"><strong>선두에게 요구할 무늬 선택</strong>{#each mermaidSuits() as suit}<button type="button" on:click={() => activatePower('little-mermaid', undefined, undefined, suit)}>{suitName(suit)}</button>{/each}</div>
              {:else if powerAvailable(localPlayer()?.princessId) && game.trick?.plays.length === 0 && openPrincessPower === 'ice-princess'}
                <div class="power-controls" role="group" aria-label="Ice Princess power"><strong>대상 플레이어 선택</strong>{#each game.players as player}<button type="button" on:click={() => activatePower('ice-princess', player.uid)}>{player.displayName}</button>{/each}</div>
              {:else if powerAvailable(localPlayer()?.princessId) && game.trick?.plays.length === 0 && openPrincessPower === 'scheherazade'}
                <div class="power-controls" role="group" aria-label="Scheherazade power"><strong>카드를 확인할 상대 선택</strong>{#each game.players.filter((player) => player.uid !== currentUid) as player}<button type="button" on:click={() => activatePower('scheherazade', player.uid)}>{player.displayName}</button>{/each}</div>
              {:else if princessUsable(localPlayer()?.princessId) && game.trick?.plays.length === 0 && openPrincessPower === 'sleeping-beauty'}
                <div class="power-controls" role="group" aria-label="Sleeping Beauty power"><strong>모두에게 카드 1장씩 받아요</strong><button type="button" on:click={beginSleepingBeauty}>카드 모으기</button></div>
              {/if}
              {#if game.pendingPower?.actorUid === currentUid && game.pendingPower.powerId === 'ice-princess'}
                <div class="power-controls power-choice" role="group" aria-label="Ice Princess cards"><strong>상대가 반드시 낼 카드 1장 선택</strong>{#each game.pendingPower.cards as entry}<button type="button" on:click={() => activatePower('ice-princess', undefined, entry.card)}>{cardLabel(entry.card)}</button>{/each}</div>
              {:else if game.pendingPower?.actorUid === currentUid && game.pendingPower.powerId === 'scheherazade'}
                <div class="power-controls power-choice" role="group" aria-label="Scheherazade swap"><strong>확인한 카드: {cardLabel(game.pendingPower.cards[0].card)}</strong>{#each game.hands[currentUid] ?? [] as card}<button type="button" on:click={() => activatePower('scheherazade', undefined, card)}>이 카드와 교환: {cardLabel(card)}</button>{/each}<button type="button" class="secondary" on:click={() => appendGameEvent(firebaseDatabase(), activeGameId, currentUid, 'power/declined', { powerId: 'scheherazade' })}>돌려주기</button></div>
              {:else if game.pendingPower?.actorUid === currentUid && game.pendingPower.powerId === 'sleeping-beauty' && game.pendingPower.cards.length === game.players.length}
                <div class="power-controls power-choice" role="group" aria-label="Sleeping Beauty redistribution"><strong>받을 사람 순서대로 선택: 나 → {game.players.filter((player) => player.uid !== currentUid).map((player) => player.displayName).join(', ')}</strong>{#each game.pendingPower.cards as entry}<button type="button" class:chosen={selectedPowerCards.some((card) => cardLabel(card) === cardLabel(entry.card))} on:click={() => selectRedistribution(entry.card)}>{selectedPowerCards.findIndex((card) => cardLabel(card) === cardLabel(entry.card)) + 1 || ''} {cardLabel(entry.card)}</button>{/each}<button type="button" disabled={!sleepingBeautySelectionComplete()} on:click={redistributeSleepingBeauty}>이 순서로 나눠주기</button></div>
              {:else if game.pendingPower?.powerId === 'sleeping-beauty' && !game.pendingPower.cards.some((entry) => entry.uid === currentUid)}
                <p class="power-prompt">잠자는 숲속의 공주에게 줄 카드 1장을 손패에서 누르세요.</p>
              {/if}
              {#if game.passComplete}<details class="trick-counter local-counter">
                <summary aria-label={`${game.players.find((player) => player.uid === currentUid)?.displayName} tricks`}>{game.capturedTricks[currentUid]?.length ?? 0}</summary>
                {#if lastCaptured(currentUid).length}
                  <div class="trick-review" aria-label={`${game.players.find((player) => player.uid === currentUid)?.displayName} last trick`}>
                    {#each lastCaptured(currentUid) as play}
                      <span class="review-card" aria-label={cardLabel(play.card)}>
                        <SpriteCard {...cardSpriteProps(play.card)} />
                        <strong>{play.card.rank}</strong>
                      </span>
                    {/each}
                  </div>
                {/if}
              </details>{/if}
              <div class="hand" role="region" aria-label="내 손패">
                {#each game.hands[currentUid] ?? [] as card}
                  {@const committed = !game.passComplete && game.passSubmissions[currentUid]?.some((entry) => cardLabel(entry) === cardLabel(card))}
                  {@const roundActionAvailable = Boolean(game.awaitingRoundAction && game.awaitingRoundAction !== 'reveal-suit' && game.awaitingRoundAction !== 'split-hand' && !game.roundActionSubmissions[currentUid])}
                  {@const splitAvailable = game.awaitingRoundAction === 'split-hand' && !game.roundCardSubmissions[currentUid]}
                  {@const haggleAvailable = game.awaitingRoundAction === 'haggle' && game.haggleWinnerUid === currentUid}
                  {@const turnBlocked = game.passComplete && game.currentTurnUid === currentUid && !game.awaitingRoundAction && !game.pendingPower && !game.pendingMulanUid && !playable(card)}
                  <button
                    type="button"
                    class={`playing-card${selectedPassCards.includes(cardLabel(card)) || selectedRoundCards.includes(cardLabel(card)) || selectedHaggleOffer === cardLabel(card) ? ' selected' : ''}${committed ? ' committed' : ''}${game.passComplete && playable(card) ? ' playable' : ''}${turnBlocked ? ' turn-blocked' : ''}${roundActionAvailable || splitAvailable || haggleAvailable || (game.pendingPower?.powerId === 'sleeping-beauty' && !game.pendingPower.cards.some((entry) => entry.uid === currentUid)) ? ' contributable' : ''}`}
                    disabled={game.passComplete ? (!playable(card) && !roundActionAvailable && !splitAvailable && !haggleAvailable && !(game.pendingPower?.powerId === 'sleeping-beauty' && !game.pendingPower.cards.some((entry) => entry.uid === currentUid))) : Boolean(game.passSubmissions[currentUid] && !committed)}
                    aria-label={cardLabel(card)}
                    aria-describedby={turnBlocked ? 'card-block-explanation' : undefined}
                    on:click={() => game?.pendingPower?.powerId === 'sleeping-beauty' ? contributeSleepingBeauty(card) : handleHandCard(card)}
                  >
                    <SpriteCard {...cardSpriteProps(card)} style="opacity: 0.72;" />
                    <strong>{card.rank}</strong><small>{suitName(card.suit)}</small>
                    {#if committed}<em>{passRecipient(card)}에게</em>{/if}
                  </button>
                {/each}
              </div>
              {#if localCardBlockExplanation()}<p id="card-block-explanation" class="card-block-explanation">{localCardBlockExplanation()}</p>{/if}
              <div class="pass-controls">
                {#if game.roundComplete}
                  <p class="pass-complete" role="alert">{game.roundIndex + 1}라운드 종료 · 점수 공개</p>
                {:else if game.passComplete}
                  {#if game.awaitingRoundAction === 'set-aside'}<p class="pass-waiting" role="alert">무도회에 늦었어요 · {game.roundActionSubmissions[currentUid] ? '마지막 트릭 카드 보관 완료' : '마지막에 낼 카드 1장을 골라요'}</p>
                  {:else if game.awaitingRoundAction === 'musical-pass'}<p class="pass-waiting" role="alert">의자 뺏기 · {game.roundActionSubmissions[currentUid] ? '다른 사람의 선택을 기다려요' : '오른쪽에 줄 카드 1장을 골라요'}</p>
                  {:else if game.awaitingRoundAction === 'wedding-gift'}<p class="pass-waiting" role="alert">결혼 선물 · {game.roundActionSubmissions[currentUid] ? '선물 선택 완료 · 다른 사람을 기다려요' : '선물 더미에 놓을 카드 1장을 골라요'}</p>
                  {:else if game.awaitingRoundAction === 'reveal-suit'}
                    <div class="power-controls" role="group" aria-label="Crystal Clear suit choice"><strong>{game.suitCommitments[currentUid] ? (game.players.every((player) => game?.suitCommitments[player.uid]) ? '모두 선택 완료 · 함께 공개해요' : '무늬 선택 확정 · 다른 사람을 기다려요') : '공개할 무늬 1개를 선택하세요'}</strong>{#if !game.suitCommitments[currentUid]}{#each SUITS.filter((suit) => game?.hands?.[currentUid]?.some((card) => card.suit === suit)) as suit}<button type="button" on:click={() => commitCrystalSuit(suit)}>{suitName(suit)}</button>{/each}{/if}</div>
                  {:else if game.awaitingRoundAction === 'split-hand'}
                    <div class="power-controls" role="group" aria-label="After Party first hand"><strong>{game.roundCardSubmissions[currentUid] ? '먼저 쓸 절반 선택 완료 · 다른 사람을 기다려요' : `먼저 쓸 카드 ${(game.hands[currentUid]?.length ?? 0) / 2}장을 골라요 (${selectedRoundCards.length}/${(game.hands[currentUid]?.length ?? 0) / 2})`}</strong>{#if !game.roundCardSubmissions[currentUid]}<button type="button" disabled={selectedRoundCards.length !== (game.hands[currentUid]?.length ?? 0) / 2} on:click={submitAfterPartyHalf}>선택한 절반 먼저 쓰기</button>{/if}</div>
                  {:else if game.awaitingRoundAction === 'haggle'}
                    {#if game.haggleWinnerUid === currentUid}<div class="power-controls" role="group" aria-label="Haggle with the Hag"><strong>{selectedHaggleOffer ? `${selectedHaggleOffer}과 바꿀 카드를 고르세요` : '교환할 내 손패 1장을 고르세요'}</strong>{#if selectedHaggleOffer}{#each game.lastCompletedTrick?.plays.filter((play) => play.uid !== currentUid) ?? [] as play}<button type="button" on:click={() => submitHaggle(play.card)}>가져오기: {cardLabel(play.card)}</button>{/each}{/if}<button type="button" class="secondary" on:click={declineHaggle}>교환하지 않기</button></div>{:else}<p class="pass-waiting" role="alert">{playerName(game.haggleWinnerUid)}의 교환 선택 중</p>{/if}
                  {:else if game.pendingMulanUid}<p class="pass-waiting" role="alert">{game.pendingMulanUid === currentUid ? '뮬란 카드를 눌러 방금 낸 카드를 바꾸거나 유지해요' : `${playerName(game.pendingMulanUid)}의 뮬란 선택 중`}</p>
                  {:else if game.pendingPower}<p class="pass-waiting" role="alert">{playerName(game.pendingPower.actorUid)}의 {princessName(game.pendingPower.powerId)} 능력 선택 중</p>
                  {:else}<p class="pass-complete" role="alert">초기 교환 완료 · {game.currentTurnUid === currentUid ? '내 차례예요 · 강조된 카드를 누르세요' : `${playerName(game.currentTurnUid)}의 차례예요`} · {game.completedTricks + 1}번째 트릭</p>{/if}
                {:else if game.passSubmissions[currentUid]}
                  <p class="pass-waiting" role="alert">{passRecipient()}에게 {game.passSubmissions[currentUid].length}장 전달 선택 완료 · {waitingForPasses(game)} 올라온 카드를 누르면 선택을 되돌릴 수 있어요.</p>
                {:else}
                  {@const instruction = passInstruction(activeRoundId())}
                  <button class="pass-submit" type="button" disabled={selectedPassCards.filter(Boolean).length !== instruction.count} on:click={submitPass}>{passRecipient()}에게 {instruction.count}장 전달하기</button>
                {/if}
              </div>
            </section>
            {#if game.roundComplete}
              <section class="round-results" aria-label={`Round ${game.roundIndex + 1} scoring`}>
                <h2>{game.gameComplete ? '다섯 라운드가 끝났어요' : '이번 라운드 점수'}</h2>
                {#if game.gameComplete}
                  <p class="victory" role="status">{game.winnerUids.length > 1 ? '공동 승리' : '승리'}: {winnerNames()}</p>
                {:else}
                  <p class="next-lead">다음 선 플레이어(누적 최저점): {nextLeaderName()}</p>
                {/if}
                <div class="score-card-wrap">
                  <table class="score-card" aria-label="Five-round score card">
                    <caption>점수표</caption>
                    <thead>
                      <tr>
                        <th scope="col">공주</th>
                        {#each Array.from({ length: 5 }) as _, scoreIndex}
                          <th scope="col"><span><i>Round </i>{scoreIndex + 1}</span><small>{game.roundIds[scoreIndex] ? roundName(game.roundIds[scoreIndex]) : '아직 뽑지 않음'}</small></th>
                        {/each}
                        <th scope="col">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each game.players as player}
                        <tr class:winner={game.winnerUids.includes(player.uid)}>
                          <th scope="row">{player.displayName}</th>
                          {#each Array.from({ length: 5 }) as _, scoreIndex}
                            {@const score = game.roundScoreHistory[scoreIndex]?.[player.uid]}
                            <td class="round-score" class:filled={Boolean(score)} class:pending={!score} aria-label={`${player.displayName}, round ${scoreIndex + 1}: ${score ? `${score.total} proposals` : '진행 전'}`}>{score?.total ?? '—'}</td>
                          {/each}
                          <td class="score-total">{game.totalScores[player.uid]}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                <ul>
                  {#each game.players as player}
                    <li class:winner={game.winnerUids.includes(player.uid)}><strong>{player.displayName}</strong><span>{game.roundScores[player.uid].princes} 왕자 + {game.roundScores[player.uid].frog} 개구리{#if game.roundScores[player.uid].roundRule} + {game.roundScores[player.uid].roundRule} 라운드 규칙{/if} = {game.roundScores[player.uid].total}</span>{#if game.rebelUids.includes(player.uid)}<em role="status">반란 성공 · −10점</em>{/if}{#if game.retainedCards[player.uid]?.length}<small aria-label={`${player.displayName} kept cards`}>남겨 가진 카드: {game.retainedCards[player.uid].map(cardLabel).join(', ')}</small>{/if}<b>{game.totalScores[player.uid]} 합계 · {game.zeroRounds[player.uid]}회 0점</b></li>
                  {/each}
                </ul>
                {#if game.gameComplete}
                  <p class="princess-kept">합계가 가장 낮으면 승리해요. 동점이면 0점으로 마친 라운드가 많은 사람이 이겨요.</p>
                  <div class="result-actions">
                    {#if game.players[0]?.uid === currentUid}<button class="results-ready" type="button" on:click={rematch}>다시 플레이</button>{/if}
                    <button class="secondary" type="button" on:click={newGame}>새 방</button>
                  </div>
                {:else}
                  <p class="princess-kept">공주는 유지하고, 다음 라운드에 능력을 다시 사용할 수 있어요.</p>
                  {#if game.players[0]?.uid === currentUid}
                    <button class="results-ready" type="button" on:click={dealNextRound}>{game.roundIndex + 2}라운드 시작</button>
                  {:else}
                    <p>방장의 {game.roundIndex + 2}라운드 시작을 기다려요</p>
                  {/if}
                {/if}
              </section>
            {/if}
          </div>
          <span class="sr-only" data-testid="stream-card-count">카드 합계 {Object.values(game.hands).flat().length}장</span>
        </section>
      {:else if activeGameId}
        <section class="room" aria-label="Game room">
          <p class="room-label">방 코드</p>
          <div class="room-code" data-testid="invite-code">{activeGameId}</div>
          <h2>플레이어 · {game?.players.length ?? 0}</h2>
          <ul aria-label="플레이어">
            {#each game?.players ?? [] as player (player.uid)}
              <li><span>{player.displayName}{#if game?.players.every((candidate) => candidate.ready)}{' · '}{princessName(player.princessId)}{:else}{' · 공주 비공개'}{/if}</span><span>{#if player.host}<small>방장</small>{/if} {player.ready || game?.princessCommitments[player.uid] ? '준비 완료' : '선택 중'}</span></li>
            {/each}
          </ul>
          {#if !game?.players.find((player) => player.uid === currentUid)?.ready && !game?.princessCommitments[currentUid]}
            <fieldset class="choice-grid" aria-label="공주 2명 중 1명 선택">
              <legend>받은 공주 2명 중 1명을 선택해 주세요</legend>
              {#each game?.princessOptions[currentUid] ?? [] as princessId}
                {@const princess = PRINCESSES.find(([id]) => id === princessId)}
                <button
                  type="button"
                  class="princess-choice"
                  class:chosen={selectedPrincess === princessId}
                  aria-label={princess?.[1] ?? princessId}
                  aria-pressed={selectedPrincess === princessId}
                  data-princess-name={princess?.[1] ?? princessId}
                  on:click={() => selectedPrincess = princessId}
                >
                  <strong class="princess-choice-name">{princess?.[1] ?? princessId}</strong>
                   <span class="princess-choice-art" aria-hidden="true">
                     <SpriteCard {...princessSpriteProps(princessId)} />
                   </span>
                  <span class="princess-choice-copy">
                    <small>{PRINCESS_POWER_TEXT[princessId] ?? '능력 설명을 확인해 주세요.'}</small>
                  </span>
                  <span class="princess-choice-mark" aria-hidden="true">✓</span>
                </button>
              {/each}
            </fieldset>
            <button type="button" disabled={princessCommitPending || !selectedPrincess || (game?.players.length ?? 0) < 3} on:click={becomeReady}>{princessCommitPending ? '확정 중…' : '이 공주로 확정'}</button>
          {:else if !game?.players.find((player) => player.uid === currentUid)?.ready}
            <p class="waiting" role="status">공주 선택을 확정했어요. 모두 확정하면 공개해요.</p>
          {/if}

          {#if game?.players[0]?.uid === currentUid}
            {#if !game.players.some((p) => game?.princessCommitments[p.uid])}
              <div class="host-settings"><button type="button" class="secondary" disabled={game.players.length >= 6} on:click={addBot}>컴퓨터 추가</button><label>선택 제한시간 <select value={(game as any).settings?.turnSeconds ?? 30} on:change={async (event) => { try { await api('/settings', {gameId:activeGameId,turnSeconds:Number(event.currentTarget.value)}); } catch(e) { actionError = String(e); } }}><option value="0">제한 없음</option>{#each [15,30,45,60,90,120,180] as seconds}<option value={seconds}>{seconds}초</option>{/each}</select></label></div><p class="waiting">모두 입장한 뒤 공주를 확정하세요. 첫 확정부터 입장이 마감돼요.</p>
            {/if}<p class="automatic-rounds">라운드 규칙 5장을 무작위로 뽑아요. 공주 능력은 라운드마다 1번 사용할 수 있어요.</p>
            {#if dealPending}
              <p class="waiting" role="status">카드를 섞어 나누는 중…</p>
            {:else}
              <button type="button" disabled={game.players.length < 3 || !game.players.every((player) => player.ready)} on:click={dealCards}>카드 나누고 시작</button>
            {/if}
          {/if}
          {#if actionError}<p class="form-error" role="alert">{actionError}</p>{/if}
          <p class="waiting">3~6인 · 방 코드를 공유해 함께 입장하세요.</p>
        </section>
      {:else}
        <form class="room-form" on:submit|preventDefault={createGame}>
          <label for="display-name">내 이름</label>
          <input id="display-name" bind:value={displayName} maxlength="30" autocomplete="nickname" placeholder="이름 입력" />
          <div class="actions">
            <button type="submit" disabled={connection !== 'synced'}>멀티 방 만들기</button><button type="button" class="secondary" disabled={connection !== 'synced'} on:click={soloGame}>컴퓨터와 플레이</button>
            <span>또는</span>
            <label class="sr-only" for="invite-code">방 코드</label>
            <input id="invite-code" bind:value={inviteCode} maxlength="8" placeholder="방 코드" />
            <button class="secondary" type="button" disabled={connection !== 'synced'} on:click={joinGame}>입장하기</button>
          </div>
          {#if actionError}<p class="form-error" role="alert">{actionError}</p>{/if}
        </form>
      {/if}
    </div>

    {#if !game?.hands}<figure class="atlas-card">
      <div class="alternate-preview-grid">
        {#each previewCards as card}
          <div class="alternate-preview-card">
            <SpriteCard {...cardSpriteProps(card)} />
          </div>
        {/each}
      </div>
      <figcaption style="grid-template-columns: 0.5775fr 0.6248fr 0.6245fr 0.5846fr;">
        <span>요정</span><span>여왕</span><span>왕자</span><span>동물</span>
      </figcaption>
    </figure>{/if}
  </section>



  <footer>
    <a href="https://github.com/anicolao/rebelprincess" target="_blank" rel="noopener">공개 소스·그림: anicolao/rebelprincess · GPL-3.0</a>
    <a href="https://github.com/junho3713/boardgame/tree/main/server/princess" target="_blank" rel="noopener">수정 소스·라이선스</a>
  </footer>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    color-scheme: dark;
    background: #140d1e;
    font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
  }

  :global(body) {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background:
      radial-gradient(circle at 77% 9%, rgba(149, 91, 184, 0.25), transparent 31rem),
      linear-gradient(145deg, #160e22 0%, #251638 48%, #101c24 100%);
  }

  :global(button),
  :global(a) {
    font: inherit;
  }

  main {
    width: min(1180px, calc(100% - 48px));
    min-height: 100vh;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
  }

  .masthead {
    min-height: 104px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 239, 199, 0.22);
  }

  .wordmark {
    color: #fff4d0;
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: 'Noto Serif KR', Georgia, serif;
    font-size: 26px;
    text-decoration: none;
    letter-spacing: 0.01em;
  }

  .wordmark strong {
    color: #ffc75f;
    font-size: 35px;
  }

  .status {
    color: #d8d1dc;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 14px;
  }

  .header-tools { position: relative; display: flex; align-items: center; gap: 16px; }
  .asset-review-link { padding: 7px 10px; border: 1px solid rgba(255, 226, 163, .28); border-radius: 999px; color: #d9cedd; font-size: 11px; text-decoration: none; }
  .asset-review-link:hover, .asset-review-link:focus-visible { border-color: #ffc75f; color: #ffc75f; }
  .audio-controls { position: relative; }
  .audio-toggle { min-height: 34px; padding: 0 11px; display: inline-flex; align-items: center; gap: 5px; border-color: rgba(184, 140, 223, .5); border-radius: 999px; color: #f3e9f5; background: rgba(50, 31, 62, .65); font-size: 12px; }
  .audio-icon { width: 13px; height: 13px; flex: 0 0 13px; fill: currentColor; }
  .audio-toggle[aria-expanded='true'] { border-color: #ffc75f; color: #ffc75f; }
  .audio-mixer { position: absolute; z-index: 30; top: calc(100% + 9px); right: 0; width: 310px; padding: 13px; border: 1px solid rgba(255, 226, 163, .45); border-radius: 9px; color: #f3e9f5; background: rgba(24, 14, 32, .97); box-shadow: 0 16px 36px rgba(0, 0, 0, .55); }
  .mixer-heading, .mixer-channel { display: grid; align-items: center; gap: 9px; }
  .mixer-heading { grid-template-columns: 1fr auto; margin-bottom: 12px; }
  .mixer-heading strong { color: #ffc75f; font-family: 'Noto Serif KR', Georgia, serif; font-size: 20px; }
  .audio-mixer button { min-height: 28px; padding: 0 9px; border-radius: 999px; color: #f3e9f5; background: rgba(80, 49, 94, .7); font-size: 10px; }
  .audio-mixer button[aria-pressed='true'] { border-color: #ffc75f; color: #ffc75f; background: rgba(50, 31, 62, .9); }
  .mixer-channel { grid-template-columns: 1fr 48px; margin-top: 9px; }
  .mixer-channel label { grid-column: 1 / -1; display: flex; justify-content: space-between; color: #d9cedd; font-size: 11px; }
  .mixer-channel output { color: #b88cdf; font-variant-numeric: tabular-nums; }
  .mixer-channel input[type='range'] { width: 100%; min-height: 18px; height: 18px; padding: 0; accent-color: #ffc75f; }

  .status-dot {
    width: 9px;
    height: 9px;
    border: 1px solid #ffe2a3;
    border-radius: 50%;
    background: #816f8d;
  }

  [data-status='synced'] .status-dot {
    background: #7de2a7;
    box-shadow: 0 0 0 4px rgba(125, 226, 167, 0.12);
  }

  [data-status='error'] .status-dot {
    background: #ff7b75;
  }

  .hero {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 0.88fr) minmax(460px, 1.12fr);
    align-items: center;
    gap: clamp(38px, 7vw, 92px);
    padding: 72px 0 64px;
  }
  .hero.dealt { grid-template-columns: 1fr; }

  .copy {
    position: relative;
    z-index: 1;
  }

  .eyebrow {
    margin: 0 0 18px;
    color: #ffc75f;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 600px;
    margin: 0;
    color: #fff5dc;
    font-family: 'Noto Serif KR', Georgia, serif;
    font-size: clamp(54px, 6.3vw, 88px);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 0.88;
  }

  .lede {
    max-width: 520px;
    margin: 28px 0 0;
    color: #cfc4d4;
    font-size: 18px;
    line-height: 1.55;
  }

  .actions {
    margin-top: 34px;
    display: flex;
    align-items: center;
    gap: 18px;
  }

  button {
    min-height: 48px;
    padding: 0 23px;
    border: 1px solid rgba(255, 226, 163, 0.38);
    border-radius: 3px;
    color: #271631;
    background: #ffc75f;
    font-weight: 700;
  }

  input {
    min-width: 0;
    min-height: 46px;
    padding: 0 13px;
    border: 1px solid rgba(255, 226, 163, 0.38);
    border-radius: 3px;
    color: #fff5dc;
    background: rgba(13, 8, 20, 0.7);
    font: inherit;
  }

  input:focus { outline: 2px solid #b88cdf; outline-offset: 2px; }
  .room-form { margin-top: 28px; }
  .room-form > label { display: block; margin-bottom: 7px; color: #e4d8e5; font-size: 13px; }
  .room-form > input { width: min(100%, 330px); }
  .actions { flex-wrap: wrap; }
  .actions input { width: 132px; text-transform: uppercase; }
  .actions > span { color: #9f93a5; }
  button.secondary { color: #fff4d0; background: transparent; }
  .form-error { color: #ffaaa5; font-size: 13px; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

  .room { max-width: 560px; margin-top: 28px; padding: clamp(20px, 3vw, 28px); border: 1px solid rgba(255, 226, 163, 0.32); background: rgba(13, 8, 20, 0.5); }
  .room-label { margin: 0; color: #b6a7ba; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
  .room-code { margin: 2px 0 16px; color: #ffc75f; font-family: 'Noto Serif KR', Georgia, serif; font-size: 38px; font-weight: 700; letter-spacing: .12em; }
  .room h2 { border-bottom: 1px solid rgba(255, 239, 199, 0.16); padding-bottom: 8px; }
  .room ul { margin: 0; padding: 0; list-style: none; }
  .room li { display: flex; justify-content: space-between; padding: 7px 0; color: #fff5dc; }
  .room small { color: #b88cdf; text-transform: uppercase; letter-spacing: .1em; }
  .waiting { margin: 12px 0 0; color: #9f93a5; font-size: 13px; }

  fieldset { min-width: 0; margin: 18px 0; padding: 0; border: 0; }
  legend { margin-bottom: 8px; color: #ffc75f; font-size: 13px; font-weight: 700; }
  .choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .choice-grid legend { grid-column: 1 / -1; }
  .choice-grid button { min-height: 34px; padding: 5px 7px; color: #d9cedd; background: rgba(50, 31, 62, .7); font-size: 11px; }
  .choice-grid button.chosen { border-color: #ffc75f; color: #211329; background: #ffc75f; }
  .choice-grid button:disabled { opacity: .35; }
  .choice-grid .princess-choice { position: relative; min-height: clamp(178px, 24vw, 220px); padding: 12px; display: grid; grid-template-columns: clamp(76px, 9vw, 96px) minmax(0, 1fr); grid-template-rows: auto 1fr; align-items: center; column-gap: 14px; row-gap: 10px; color: #f8edfa; text-align: left; }
  .princess-choice-name { grid-column: 1 / -1; width: 100%; padding: 0 18px; color: #ffc75f; font-family: 'Noto Serif KR', Georgia, serif; font-size: clamp(19px, 2.2vw, 24px); line-height: 1; text-align: center; overflow-wrap: anywhere; }
  .princess-choice-art { display: block; width: clamp(76px, 9vw, 96px); aspect-ratio: 3 / 5; border: 1px solid rgba(255, 226, 163, .65); border-radius: 7px; background-color: #150d1d; box-shadow: 0 10px 22px rgba(0, 0, 0, .48); }
  .princess-choice-copy { display: grid; gap: 5px; }
  .princess-choice-copy small { color: #d9cedd; font-size: clamp(11px, 1.35vw, 14px); font-weight: 400; line-height: 1.35; }
  .princess-choice-mark { position: absolute; top: 7px; right: 8px; display: none; font-size: 16px; }
  .choice-grid .princess-choice.chosen { color: #211329; background: rgba(255, 199, 95, .18); box-shadow: inset 0 0 0 1px #ffc75f; }
  .choice-grid .princess-choice.chosen .princess-choice-copy small { color: #f4e8f5; }
  .choice-grid .princess-choice.chosen .princess-choice-mark { display: block; color: #ffc75f; }
  .automatic-rounds { margin: 18px 0 10px; padding: 10px 12px; border-left: 3px solid #b88cdf; color: #d9cedd; background: rgba(50, 31, 62, .45); font-size: 12px; line-height: 1.35; }
  .review-card, .card-art, .trick-card, .princess-card, .princess-choice-art, .round-art {
    position: relative;
    overflow: hidden;
  }

  .table { width: 100%; height: 100%; }
  .table-board { --hand-card-width: clamp(54px, min(8cqw, 11cqh), 108px); --hand-card-overlap: clamp(22px, 4cqw, 36px); position: relative; width: 100%; height: 100%; overflow: hidden; container-type: size; border: 1px solid rgba(255, 226, 163, .2); border-radius: 18px; background: radial-gradient(ellipse at center, rgba(75, 44, 91, .72), rgba(19, 25, 35, .88) 70%); box-shadow: inset 0 0 90px rgba(0, 0, 0, .35); }
  .table-board.power-flash::after { content: ''; position: absolute; z-index: 19; inset: 0; pointer-events: none; background: radial-gradient(circle, rgba(255, 246, 194, .62), rgba(184, 140, 223, .28) 38%, transparent 72%); animation: princess-table-flash 1.25s ease-out both; }
  .round-center { position: absolute; top: 43%; left: 50%; width: clamp(210px, min(24cqw, 31cqh), 300px); margin: 0; transform: translate(-50%, -50%); text-align: center; }
  .round-art { width: clamp(106px, 58%, 160px); aspect-ratio: .855; margin: clamp(6px, 1cqh, 10px) auto; border: 1px solid rgba(255, 226, 163, .5); border-radius: 9px; box-shadow: 0 12px 28px rgba(0, 0, 0, .48); }
  .round-center p { margin: 0; color: #b88cdf; font-size: clamp(11px, 1.45cqh, 14px); font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .round-center h2 { margin: 0; font-size: clamp(20px, 3cqh, 30px); line-height: 1; }
  .round-center .round-rule { margin: 7px auto 0; max-width: 260px; color: #eee4f0; font-size: clamp(11px, 1.6cqh, 15px); font-weight: 400; line-height: 1.22; letter-spacing: 0; text-transform: none; }
  .pass-icon { display: flex; justify-content: center; align-items: center; gap: 3px; margin-top: 4px; color: #ffc75f; font-size: clamp(17px, 2.5vh, 24px); line-height: 1; }
  .pass-icon strong { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; font-size: .72em; }
  .round-center .round-count { margin-top: 4px; }
  .princess-power-burst { position: absolute; z-index: 25; top: 46%; left: 50%; display: grid; grid-template-columns: 76px minmax(0, 220px); grid-template-rows: auto auto auto 1fr; column-gap: 13px; width: min(86%, 340px); padding: 12px 16px 12px 12px; border: 2px solid #ffe2a3; border-radius: 13px; color: #fff5dc; background: linear-gradient(135deg, rgba(82, 47, 100, .98), rgba(20, 31, 43, .98)); box-shadow: 0 0 0 5px rgba(184, 140, 223, .22), 0 0 45px rgba(255, 226, 163, .45), 0 18px 50px rgba(0, 0, 0, .72); pointer-events: none; transform: translate(-50%, -50%); animation: princess-power-arrives .75s cubic-bezier(.2, .9, .25, 1.15) both; }
  .princess-power-burst .princess-card { grid-row: 1 / -1; width: 76px; aspect-ratio: 3 / 5; border: 1px solid rgba(255, 226, 163, .8); border-radius: 7px; background-color: #150d1d; background-position: var(--princess-x) var(--princess-y); background-size: var(--princess-size); box-shadow: 0 8px 20px rgba(0, 0, 0, .48); }
  .princess-power-burst > span:not(.power-sparkles) { align-self: end; color: #ffc75f; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .princess-power-burst > strong { color: #fff4d0; font-family: 'Noto Serif KR', Georgia, serif; font-size: 24px; line-height: 1; }
  .princess-power-burst > p { margin: 5px 0 0; color: #e7dbe9; font-size: 11px; line-height: 1.25; }
  .power-sparkles { position: absolute; top: -18px; right: 8px; color: #ffe2a3; font-size: 22px; letter-spacing: 6px; text-shadow: 0 0 12px #fff; animation: power-sparkles 1.4s ease-in-out infinite alternate; }
  .opponent-seat { position: absolute; z-index: 2; top: var(--seat-y); left: var(--seat-x); width: clamp(118px, min(14cqw, 19cqh), 170px); min-height: clamp(78px, 13cqh, 118px); color: #e9deeb; text-align: center; transform: translateX(-50%); }
  .opponent-seat::before { content: ''; position: absolute; z-index: -1; inset: -7px -9px -8px; border: 2px solid transparent; border-radius: 10px; pointer-events: none; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
  .opponent-seat.action-active::before { border-color: #ffc75f; background: rgba(255, 199, 95, .08); box-shadow: 0 0 0 3px rgba(255, 199, 95, .12), 0 0 20px rgba(255, 199, 95, .4); }
  .opponent-seat > strong { display: block; margin-bottom: 5px; font-size: clamp(12px, 1.7cqh, 15px); }
  .action-marker { display: block; width: max-content; max-width: 138px; margin: 0 auto 5px; padding: 3px 8px; border: 1px solid currentColor; border-radius: 999px; color: #ffc75f; background: rgba(33, 19, 41, .88); font-size: clamp(9px, 1.25cqh, 11px); font-weight: 700; line-height: 1.2; white-space: nowrap; }
  .opponent-seat.action-active > .action-marker { position: relative; left: var(--seat-snap-x); width: calc-size(max-content, round(nearest, size, 1px)); }
  .action-marker.complete { color: #7de2a7; }
  .seat-princess { position: absolute; top: clamp(25px, 4.3cqh, 40px); left: 2px; display: grid; justify-items: center; width: clamp(54px, 5.5cqw, 76px); color: #e9deeb; font-size: clamp(8px, 1.15cqh, 10px); line-height: 1.12; }
  .seat-princess .princess-card { width: clamp(44px, min(4.6cqw, 7cqh), 62px); aspect-ratio: 3 / 5; min-height: 0; padding: 0; border: 1px solid rgba(255, 226, 163, .65); border-radius: 5px; background-color: #150d1d; box-shadow: 0 7px 16px rgba(0, 0, 0, .45); transform-origin: bottom center; transition: filter .2s ease, transform .2s ease; }
  .seat-princess > strong { max-width: 82px; margin-top: 3px; color: #ffc75f; font-size: clamp(9px, 1.3cqh, 11px); }
  .seat-princess > span { display: block; width: clamp(68px, 7cqw, 96px); margin-top: 2px; color: #d9cedd; text-align: center; }
  .seat-princess.exhausted .princess-card { filter: grayscale(1) saturate(0); transform: rotate(-12deg); }
  .seat-princess.exhausted > strong, .seat-princess.exhausted > span { color: #776f7b; }
  .seat-princess.power-active .princess-card { filter: none; border-color: #fff4d0; box-shadow: 0 0 0 3px #b88cdf, 0 0 25px #ffe2a3; animation: active-princess-card .85s ease-in-out infinite alternate; }
  .seat-princess.power-active > strong { color: #fff4d0; text-shadow: 0 0 8px #ffc75f; }
  .local-princess { top: auto; bottom: 6px; left: 8px; z-index: 7; width: clamp(78px, 8cqw, 112px); }
  .local-princess .princess-card { width: clamp(58px, min(6cqw, 9cqh), 88px); cursor: pointer; }
  .local-princess > strong { font-size: clamp(10px, 1.4cqh, 12px); }
  .local-princess > span { width: clamp(82px, 8cqw, 112px); font-size: clamp(9px, 1.2cqh, 11px); }
  .local-princess.armed .princess-card { border-color: #7de2a7; box-shadow: 0 0 0 2px #7de2a7, 0 5px 12px rgba(0, 0, 0, .45); }
  .local-princess .princess-card:disabled { cursor: default; opacity: 1; }
  .lead-marker { display: inline-block; margin-left: 4px; padding: 1px 5px; border-radius: 999px; color: #211329; background: #ffc75f; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; font-size: 9px; text-transform: uppercase; }
  .card-backs { display: flex; justify-content: center; height: clamp(52px, 8cqh, 70px); margin-left: clamp(45px, 5cqw, 66px); }
  .card-backs i { width: clamp(34px, min(3.4cqw, 5.5cqh), 46px); height: clamp(50px, min(5.2cqw, 8cqh), 68px); margin-left: clamp(-28px, -2.2cqw, -19px); border: 1px solid #b88cdf; border-radius: 4px; background: repeating-linear-gradient(135deg, #251638 0 4px, #604077 4px 6px); box-shadow: 0 4px 9px rgba(0, 0, 0, .38); }
  .card-backs i:first-child { margin-left: 0; }
  .trick-counter { position: absolute; z-index: 8; top: 18px; right: -5px; }
  .trick-counter summary { display: grid; place-items: center; width: clamp(25px, 3.5cqh, 32px); height: clamp(25px, 3.5cqh, 32px); border: 1px solid #ffc75f; border-radius: 50%; color: #211329; background: #ffc75f; box-shadow: 0 3px 9px rgba(0, 0, 0, .45); cursor: pointer; font-size: clamp(11px, 1.6cqh, 14px); font-weight: 700; list-style: none; }
  .trick-counter summary::-webkit-details-marker { display: none; }
  .trick-review { position: absolute; z-index: 9; top: 27px; left: 50%; display: none; gap: 3px; padding: 5px; border: 1px solid rgba(255, 226, 163, .6); border-radius: 6px; background: rgba(20, 13, 30, .96); box-shadow: 0 8px 24px rgba(0, 0, 0, .6); transform: translateX(-50%); }
  .trick-counter[open] .trick-review, .trick-counter:hover .trick-review, .trick-counter:focus-within .trick-review { display: flex; }
  .review-card { position: relative; display: block; width: clamp(34px, min(4cqw, 6cqh), 46px); aspect-ratio: 3 / 5; flex: 0 0 auto; overflow: hidden; border: 1px solid rgba(255, 226, 163, .6); border-radius: 4px; background-color: #150d1d; }
  .review-card strong { position: absolute; top: 1px; left: 3px; color: #fff4d0; font-family: 'Noto Serif KR', Georgia, serif; font-size: 13px; text-shadow: 0 1px 2px #000; }
  .local-seat { position: absolute; z-index: 3; inset: auto 8px 8px; }
  .local-counter { top: 0; right: 8px; }
  .local-counter .trick-review { top: auto; right: 0; bottom: 27px; left: auto; transform: none; }
  .local-heading { display: flex; justify-content: center; gap: 14px; margin-bottom: 6px; color: #fff4d0; font-size: clamp(12px, 1.8cqh, 16px); }
  .local-heading span { color: #b88cdf; }
  .local-seat.action-active .local-heading { color: #ffc75f; text-shadow: 0 0 10px rgba(255, 199, 95, .6); }
  .local-action-marker { margin-top: -2px; margin-bottom: -2px; }
  .local-heading.local-leader { width: max-content; margin-right: auto; margin-left: auto; padding: 4px 9px; border: 1px solid #ffc75f; border-radius: 999px; color: #ffc75f; box-shadow: 0 0 14px rgba(255, 199, 95, .3); }
  .local-heading.local-leader .lead-marker { color: #211329; }
  .power-controls { display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 3px; color: #fff4d0; font-size: clamp(10px, 1.5cqh, 13px); }
  .power-controls button { min-height: clamp(30px, 4.2cqh, 38px); padding: 0 10px; font-size: clamp(10px, 1.4cqh, 12px); }
  .power-choice { position: fixed; z-index: 30; top: 56%; left: 50%; width: min(90vw, 720px); max-height: 26vh; flex-wrap: wrap; overflow-y: auto; padding: 8px; border: 1px solid rgba(255, 226, 163, .65); border-radius: 8px; background: rgba(20, 13, 30, .97); transform: translate(-50%, -50%); }
  .power-choice button.chosen { color: #211329; background: #ffc75f; }
  .power-prompt { margin: 0 0 3px; color: #ffc75f; font-size: clamp(10px, 1.5cqh, 13px); font-weight: 700; text-align: center; }
  .playing-card.contributable { border-color: #7de2a7; box-shadow: 0 0 0 2px #7de2a7, 0 0 18px rgba(125, 226, 167, .38); transform: translateY(-5px); }
  .hand { display: flex; justify-content: center; align-items: flex-end; min-height: clamp(96px, 18cqh, 180px); padding-top: 10px; }
  .playing-card { position: relative; width: var(--hand-card-width); height: auto; min-height: 0; aspect-ratio: 3 / 5; padding: 0; overflow: hidden; flex: 0 0 auto; border: 1px solid rgba(255, 226, 163, .5); border-radius: clamp(5px, .7cqh, 8px); background: #150d1d; transition: transform .15s ease, filter .15s ease, box-shadow .15s ease; }
  .playing-card + .playing-card { margin-left: calc(-1 * var(--hand-card-overlap)); }
  .playing-card:not(:disabled) { cursor: pointer; }
  .playing-card.selected, .playing-card.committed { border: 3px solid #ffc75f; transform: translateY(-9px); box-shadow: 0 7px 18px rgba(0, 0, 0, .45); }
  .playing-card.committed { border-color: #7de2a7; }
  .playing-card.playable { z-index: 1; border: 3px solid #ffc75f; box-shadow: 0 0 0 2px rgba(255, 199, 95, .38), 0 0 22px rgba(255, 199, 95, .55), 0 9px 18px rgba(0, 0, 0, .45); transform: translateY(-8px); }
  .playing-card.playable:focus-visible, .playing-card.contributable:focus-visible { outline: 3px solid #fff4d0; outline-offset: 3px; }
  .playing-card.turn-blocked { filter: saturate(.25) brightness(.52); }
  .playing-card:disabled { opacity: 1; color: inherit; }
  .playing-card strong { position: absolute; top: 5px; left: 8px; color: #fff4d0; font-family: 'Noto Serif KR', Georgia, serif; font-size: clamp(25px, 4cqh, 36px); text-shadow: 0 1px 3px #000; }
  .playing-card small { position: absolute; inset: auto 5px 5px; color: #fff4d0; font-size: clamp(9px, 1.4cqh, 12px); text-align: center; text-transform: capitalize; text-shadow: 0 1px 3px #000; }
  .playing-card em { position: absolute; z-index: 2; inset: auto 0 0; padding: 3px 1px 3px 4px; color: #102019; background: #7de2a7; font-size: 8px; font-style: normal; text-align: left; white-space: nowrap; }
  .card-block-explanation { width: max-content; max-width: calc(100% - 150px); margin: 2px auto 0; color: #e8dcae; font-size: clamp(9px, 1.3cqh, 11px); line-height: 1.2; text-align: center; }
  .card-art { position: absolute; inset: 0; opacity: .72; background-size: 400% 100%; background-position: calc(var(--suit-index) * 100% / 3) center; }
  .pass-controls { min-height: 37px; display: flex; justify-content: center; align-items: center; }
  .pass-submit { min-height: 32px; padding: 0 15px; font-size: 12px; }
  .pass-waiting, .pass-complete { margin: 0; color: #d9cedd; font-size: clamp(11px, 1.55cqh, 14px); text-align: center; }
  .pass-complete { color: #7de2a7; font-weight: 700; }
  .live-trick { position: absolute; z-index: 4; top: 59%; left: 50%; display: flex; justify-content: center; align-items: flex-end; gap: clamp(6px, 1cqw, 12px); width: min(92%, 560px); color: #fff4d0; font-size: clamp(10px, 1.4cqh, 13px); pointer-events: none; transform: translateX(-50%); }
  .trick-play { display: grid; justify-items: center; gap: 2px; }
  .trick-card { position: relative; width: clamp(48px, min(6.5cqw, 10cqh), 78px); aspect-ratio: 3 / 5; overflow: hidden; border: 1px solid rgba(255, 226, 163, .7); border-radius: 6px; background-color: #150d1d; box-shadow: 0 9px 20px rgba(0, 0, 0, .52); animation: play-to-table .35s ease-out both; }
  .trick-card.face-down { background: repeating-linear-gradient(135deg, #251638 0 7px, #604077 7px 10px); }
  .trick-card strong { position: absolute; top: 2px; left: 5px; color: #fff4d0; font-family: 'Noto Serif KR', Georgia, serif; font-size: 20px; text-shadow: 0 1px 3px #000; }
  .trick-card small { position: absolute; inset: auto 3px 3px; color: #fff4d0; font-size: 7px; text-align: center; text-transform: capitalize; text-shadow: 0 1px 3px #000; }
  .trick-card em { position: absolute; inset: auto 0 14px; color: #211329; background: #ffc75f; font-size: 8px; font-style: normal; font-weight: 700; text-align: center; }
  .live-trick.collecting .trick-play { animation: collect-trick 3s ease-in-out forwards; }
  .live-trick.double-trick.collecting .trick-play { animation: none; }
  @keyframes play-to-table { from { opacity: .3; transform: translate(var(--play-x), var(--play-y)) scale(1.15); } to { opacity: 1; transform: translate(0, 0) scale(1); } }
  @keyframes collect-trick {
    0%, 62% { opacity: 1; transform: translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(var(--collect-x), var(--collect-y)) scale(.65); }
  }
  @keyframes princess-table-flash { from { opacity: 1; } to { opacity: 0; } }
  @keyframes princess-power-arrives { from { opacity: 0; transform: translate(-50%, -50%) scale(.55) rotate(-5deg); } to { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0); } }
  @keyframes power-sparkles { from { opacity: .55; transform: translateY(2px) scale(.92); } to { opacity: 1; transform: translateY(-3px) scale(1.08); } }
  @keyframes active-princess-card { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-5px) rotate(2deg); } }
  .round-results { position: absolute; z-index: 20; inset: 8% 12%; display: flex; flex-direction: column; align-items: center; overflow: auto; padding: 14px; border: 1px solid rgba(255, 226, 163, .65); border-radius: 12px; color: #fff4d0; background: #140d1e; box-shadow: 0 18px 60px rgba(0, 0, 0, .7); }
  .round-results > * { flex-shrink: 0; }
  .round-results h2 { margin: 0 0 8px; }
  .score-card-wrap { width: min(100%, 720px); margin-bottom: 9px; overflow: hidden; border: 1px solid rgba(255, 226, 163, .28); border-radius: 8px; }
  .score-card { width: 100%; table-layout: fixed; border-collapse: collapse; color: #f8edf8; font-size: 11px; text-align: center; }
  .score-card caption { padding: 5px; color: #ffc75f; background: rgba(82, 47, 100, .5); font-family: 'Noto Serif KR', Georgia, serif; font-size: 19px; font-weight: 700; }
  .score-card th, .score-card td { padding: 6px 7px; border-top: 1px solid rgba(255, 226, 163, .14); border-right: 1px solid rgba(255, 226, 163, .1); }
  .score-card th:last-child, .score-card td:last-child { border-right: 0; }
  .score-card thead th { color: #d9cedd; background: rgba(20, 13, 30, .48); font-weight: 700; }
  .score-card thead span, .score-card thead small { display: block; }
  .score-card thead i { font-style: normal; }
  .score-card thead small { max-width: 82px; margin-top: 2px; overflow: hidden; color: #a99dac; font-size: 8px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
  .score-card tbody th { position: sticky; left: 0; color: #fff4d0; background: #21152d; text-align: left; }
  .score-card .round-score.filled { color: #211329; background: #ffc75f; font-size: 14px; font-weight: 700; }
  .score-card .round-score.pending { color: #756b7a; background: rgba(20, 13, 30, .35); }
  .score-card .score-total { color: #7de2a7; font-size: 14px; font-weight: 700; }
  .score-card tr.winner th, .score-card tr.winner .score-total { color: #ffc75f; }
  .round-results ul { width: min(100%, 520px); margin: 0; padding: 0; list-style: none; }
  .round-results li { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; padding: 5px 0; border-bottom: 1px solid rgba(255, 226, 163, .15); font-size: 12px; }
  .round-results li span { color: #d8c8dc; }
  .round-results li b { color: #ffc75f; }
  .round-results li.winner { margin: 2px -8px; padding: 7px 8px; border-radius: 8px; background: rgba(255, 199, 95, .14); }
  .victory { margin: 0 0 8px; color: #ffc75f; font-family: 'Noto Serif KR', Georgia, serif; font-size: clamp(22px, 4vw, 36px); font-weight: 700; }
  .result-actions { display: flex; gap: 8px; }
  .result-actions .secondary { min-height: 34px; margin-top: 5px; padding: 0 16px; font-size: 12px; }
  .results-ready { min-height: 34px; margin-top: 5px; padding: 0 16px; font-size: 12px; }

  main.gameplay { width: calc(100% - 24px); height: 100dvh; min-height: 0; overflow: hidden; }
  main.gameplay .masthead { min-height: 54px; height: 54px; }
  main.gameplay .wordmark { font-size: 18px; }
  main.gameplay .wordmark strong { font-size: 24px; }
  main.gameplay .hero.dealt { height: calc(100dvh - 54px); min-height: 0; padding: 8px 0 10px; }
  main.gameplay .copy { height: 100%; }
  main.gameplay .eyebrow, main.gameplay h1, main.gameplay .lede, main.gameplay .promise, main.gameplay footer { display: none; }
  :global(body:has(main.gameplay)) { height: 100dvh; overflow: hidden; }

  .actions span {
    max-width: 180px;
    color: #9f93a5;
    font-size: 13px;
    line-height: 1.35;
  }

  .atlas-card {
    position: relative;
    margin: 0;
    border: 1px solid rgba(255, 226, 163, 0.35);
    border-radius: 12px;
    overflow: hidden;
    background: #09070c;
    box-shadow: 0 36px 80px rgba(0, 0, 0, 0.45);
    transform: rotate(1.2deg);
  }

  .atlas-card::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 80px rgba(8, 4, 15, 0.45);
  }


  .alternate-preview-grid {
    display: grid;
    grid-template-columns: 0.5775fr 0.6248fr 0.6245fr 0.5846fr;
    width: 100%;
    aspect-ratio: 2.4114 / 1;
    background: #09070c;
  }

  .alternate-preview-card {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  figcaption {
    position: absolute;
    inset: auto 0 0;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 12px 10px 10px;
    color: #fff6da;
    background: linear-gradient(transparent, rgba(6, 5, 8, 0.9));
    font-family: 'Noto Serif KR', Georgia, serif;
    font-size: 17px;
    text-align: center;
  }

  .promise {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid rgba(255, 239, 199, 0.22);
    border-bottom: 1px solid rgba(255, 239, 199, 0.22);
  }

  .promise article {
    padding: 30px clamp(20px, 3vw, 40px) 32px;
  }

  .promise article + article {
    border-left: 1px solid rgba(255, 239, 199, 0.16);
  }

  .number {
    color: #b88cdf;
    font-size: 12px;
    font-weight: 700;
  }

  h2 {
    margin: 7px 0 6px;
    color: #f9edcf;
    font-family: 'Noto Serif KR', Georgia, serif;
    font-size: 24px;
  }

  .promise p {
    margin: 0;
    color: #a99dac;
    font-size: 14px;
    line-height: 1.45;
  }

  footer {
    min-height: 74px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #7f7485;
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  @media (max-width: 760px) {
    .live-trick.double-trick { width: 96%; gap: 2px; font-size: 8px; }
    .live-trick.double-trick .trick-card { width: 36px; }
    main {
      width: min(100% - 28px, 520px);
    }

    .masthead {
      min-height: 76px;
      align-items: flex-start;
      padding-top: 14px;
    }

    .wordmark {
      flex-direction: column;
      gap: 0;
      font-size: 16px;
      line-height: 0.85;
    }

    .wordmark strong {
      font-size: 27px;
    }

    .status {
      font-size: 12px;
    }
    .header-tools { align-items: flex-end; flex-direction: column-reverse; gap: 3px; }
    .audio-toggle { min-height: 27px; padding: 0 8px; font-size: 10px; }
    .audio-mixer { width: min(310px, calc(100vw - 28px)); }

    .hero {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 30px;
      padding: 36px 0 32px;
    }

    .eyebrow {
      max-width: 290px;
      margin-bottom: 14px;
      font-size: 11px;
      line-height: 1.4;
    }

    h1 {
      max-width: 350px;
      font-size: clamp(48px, 15vw, 64px);
    }

    .lede {
      margin-top: 19px;
      font-size: 15px;
      line-height: 1.48;
    }

    .actions {
      margin-top: 23px;
      gap: 12px;
    }

    .actions input { width: 118px; }
    .room { max-width: none; padding: 15px; }
    .choice-grid .princess-choice { min-height: 168px; grid-template-columns: 68px minmax(0, 1fr); padding: 9px; column-gap: 9px; }
    .princess-choice-art { width: 68px; }
    .princess-choice-copy small { font-size: 10px; }
    .hand { grid-template-columns: repeat(4, minmax(44px, 1fr)); }
    .playing-card { min-height: 92px; }
    main.gameplay .table-board { --hand-card-width: clamp(42px, 13cqw, 50px); --hand-card-overlap: clamp(19px, 5cqw, 21px); }
    main.gameplay .hand { min-height: clamp(92px, 17cqh, 138px); }
    main.gameplay .playing-card { height: auto; min-height: 0; }
    main.gameplay .local-princess { bottom: clamp(116px, 18cqh, 150px); left: 4px; width: 62px; }
    main.gameplay .local-princess .princess-card { width: 52px; }
    main.gameplay .local-princess > span { width: 64px; font-size: 8px; }
    main.gameplay .local-seat { bottom: 2px; }
    main.gameplay .round-center { top: 42%; }
    main.gameplay .round-results { inset: 8% 5%; }
    main.gameplay .opponent-seat { width: 118px; min-height: 82px; }
    main.gameplay .seat-princess { top: 28px; width: 52px; }
    main.gameplay .seat-princess .princess-card { width: 42px; }
    main.gameplay .seat-princess > span { width: 60px; font-size: 8px; }
    main.gameplay .card-backs { height: 54px; margin-left: 42px; }
    main.gameplay .card-backs i { width: 34px; height: 50px; margin-left: -21px; }
    main.gameplay .round-center .round-rule { max-width: 220px; }
    main.gameplay .card-block-explanation { max-width: calc(100% - 84px); }

    main.gameplay .table-board[data-player-count='4'] .opponent-seat { width: 100px; }
    main.gameplay .table-board[data-player-count='4'] .opponent-seat[data-clockwise-seat='1'] { --seat-x: 16% !important; --seat-y: 28% !important; }
    main.gameplay .table-board[data-player-count='4'] .opponent-seat[data-clockwise-seat='3'] { --seat-x: 84% !important; --seat-y: 28% !important; }
    main.gameplay .table-board[data-player-count='5'] .opponent-seat,
    main.gameplay .table-board[data-player-count='6'] .opponent-seat { width: 88px; }
    main.gameplay .table-board[data-player-count='5'] .opponent-seat[data-clockwise-seat='1'],
    main.gameplay .table-board[data-player-count='6'] .opponent-seat[data-clockwise-seat='1'] { --seat-x: 14% !important; --seat-y: 28% !important; }
    main.gameplay .table-board[data-player-count='5'] .opponent-seat[data-clockwise-seat='2'] { --seat-x: 37% !important; --seat-y: 3% !important; }
    main.gameplay .table-board[data-player-count='5'] .opponent-seat[data-clockwise-seat='3'] { --seat-x: 63% !important; --seat-y: 3% !important; }
    main.gameplay .table-board[data-player-count='5'] .opponent-seat[data-clockwise-seat='4'],
    main.gameplay .table-board[data-player-count='6'] .opponent-seat[data-clockwise-seat='5'] { --seat-x: 86% !important; --seat-y: 28% !important; }
    main.gameplay .table-board[data-player-count='6'] .opponent-seat[data-clockwise-seat='2'] { --seat-x: 25% !important; --seat-y: 3% !important; }
    main.gameplay .table-board[data-player-count='6'] .opponent-seat[data-clockwise-seat='3'] { --seat-x: 50% !important; --seat-y: 1% !important; }
    main.gameplay .table-board[data-player-count='6'] .opponent-seat[data-clockwise-seat='4'] { --seat-x: 75% !important; --seat-y: 3% !important; }
    main.gameplay .table-board[data-player-count='5'] .seat-princess,
    main.gameplay .table-board[data-player-count='6'] .seat-princess { width: 38px; left: 0; }
    main.gameplay .table-board[data-player-count='5'] .seat-princess .princess-card,
    main.gameplay .table-board[data-player-count='6'] .seat-princess .princess-card { width: 34px; }
    main.gameplay .table-board[data-player-count='5'] .seat-princess > span,
    main.gameplay .table-board[data-player-count='6'] .seat-princess > span { width: 44px; font-size: 6px; }
    main.gameplay .table-board[data-player-count='5'] .card-backs,
    main.gameplay .table-board[data-player-count='6'] .card-backs { margin-left: 30px; }
    .score-card th, .score-card td { padding: 5px 2px; }
    .score-card thead i, .score-card thead small { display: none; }
    .score-card tbody th { font-size: 9px; }

    button {
      min-height: 44px;
      padding: 0 16px;
      font-size: 14px;
    }

    .actions span {
      max-width: 155px;
      font-size: 11px;
    }

    .atlas-card {
      transform: none;
    }

    figcaption {
      padding-bottom: 7px;
      font-size: 12px;
    }

    .promise {
      display: block;
    }

    .promise article {
      display: grid;
      grid-template-columns: 28px 1fr;
      padding: 17px 4px;
    }

    .promise article + article {
      border-top: 1px solid rgba(255, 239, 199, 0.16);
      border-left: 0;
    }

    .number {
      grid-row: 1 / 3;
      padding-top: 5px;
    }

    h2 {
      margin: 0 0 2px;
      font-size: 20px;
    }

    .promise p {
      font-size: 12px;
    }

    footer {
      min-height: 58px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .table-board.power-flash::after,
    .princess-power-burst,
    .power-sparkles,
    .seat-princess.power-active .princess-card { animation: none; }
    .trick-card { animation: none; }
    .playing-card { transition: none; }
  }

  .host-settings,.choice-status {display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 0}
  .host-settings select {background:#241a30;color:#fff6dc;border:1px solid #aa906a;border-radius:6px;padding:8px}
  .choice-status {background:#30213e;padding:12px 16px;border:1px solid #8e739f;border-radius:8px;margin-bottom:12px;justify-content:space-between}
  .choice-status.my-choice {background:#f3d69a;color:#2e1a32}
  .choice-status span {font-size:12px}
  :global(a) {color:#e9d3a3;text-underline-offset:4px}
  :global(button:focus-visible),:global(a:focus-visible) {outline:3px solid #ffe8a6;outline-offset:3px}
  :global(::selection) {background:#e8cb8d;color:#20122d}
  @media(max-width:600px) {.choice-status{font-size:13px}.hero:not(.dealt){display:block}.atlas-card{max-height:220px;overflow:hidden}.host-settings{gap:8px}.choice-grid{gap:10px} }

  main.gameplay {height:auto;overflow:visible}
  main.gameplay .hero.dealt, main.gameplay .copy, main.gameplay .table {height:auto}
  main.gameplay .table-board {height:max(570px,calc(100svh - 160px));--hand-card-width:68px}
  :global(body:has(main.gameplay)){height:auto;overflow:auto}
  main.gameplay .hand {justify-content:safe center;gap:6px;max-width:calc(100% - 140px);margin-left:130px;overflow-x:auto;overflow-y:hidden;padding:12px 4px 4px;min-height:130px;scrollbar-width:thin;scrollbar-color:#c4a76a #21162b}
  main.gameplay .playing-card + .playing-card {margin-left:0}
  main.gameplay .round-center {top:35%;width:240px}
  main.gameplay .round-art {width:76px}
  main.gameplay .round-center .round-rule {font-size:13px;line-height:1.5}
  main.gameplay .live-trick {top:54%}
  main.gameplay .local-princess {bottom:38px;left:0;width:114px}
  main.gameplay .local-princess > span {width:110px;font-size:10px;line-height:1.4}
  .power-reference summary {cursor:pointer;font-size:11px;color:#f4dba6;padding:5px}
  .power-reference[open] {z-index:40}
  .power-reference p {position:absolute;z-index:40;width:210px;left:0;margin:0;padding:12px;background:#2b1b37;border:1px solid #c3a66d;border-radius:8px;font-size:13px;line-height:1.6;text-align:left;box-shadow:0 8px 20px #0009}
  @media(max-width:600px){main.gameplay .table-board{--hand-card-width:52px;height:max(600px,calc(100svh - 180px))}main.gameplay .hand{max-width:100%;margin-left:0;min-height:106px}main.gameplay .local-princess{bottom:260px;left:0;width:62px}main.gameplay .local-princess>span{display:none}main.gameplay .local-princess .princess-card{width:42px}main.gameplay .round-center{top:35%;width:178px}main.gameplay .round-art{width:58px}main.gameplay .round-center .round-rule{font-size:12px;line-height:1.45}main.gameplay .live-trick{top:54%}.power-reference p{width:170px;left:-20px}.choice-status{gap:5px;margin-bottom:7px}main.gameplay .wordmark strong{font-size:18px}.asset-review-link{font-size:11px}.choice-status span{font-size:11px}}
</style>
