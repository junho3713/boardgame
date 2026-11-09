# 자동충원 작업 인계 · 2026-11-09

## 최종 사용자 요구

자동충원은 **0:30부터 30초마다** 검사합니다. 처음 논의한 1분 주기와 ‘돈이 생길 때 즉시 구매’는 최종안에서 제외되었습니다. 자동충원은 기본 꺼짐이며 기존 매분 수동 지원은 그대로 사용할 수 있습니다.

출격 전 설정과 전투 중 설정에서 같은 편성을 편집합니다. ‘편성 저장’으로 현재 작전에 적용하고 같은 브라우저의 다음 출격 기본값에도 저장합니다. 일반 작전 수동 저장에도 현재 계획이 포함됩니다. 전투 중 변경·켜기/끄기는 다음 검사부터 적용하며 즉시 병력을 구매하지 않습니다.

## 구매와 편성 규칙

- `priority`: 지정 순서에서 부족하고 해금된 병과부터 채웁니다.
- `balanced`: `(target-current)/target` 내림차순, 동률이면 지정 순서. 수량 0인 병과는 제외합니다.
- 선택된 병과를 살 자원이 부족하면 다음 30초 검사까지 기다립니다. 싼 병과를 대신 사지 않습니다.
- 목표는 1성 환산. 일반 모드는 유닛 1개=1, 2성은 3, 3성은 9입니다. 목표 입력 0~9, 일반 모드 UI는 0~8입니다. 기존 병과/전체 한도와 원래 `buy()`의 비용·충돌·합성 처리를 사용합니다.
- 목표 감소는 기존 병력에 영향을 주지 않습니다. 미진화 병과 목표를 0으로 바꾸고 이미 진화한 병과 목표를 늘릴 수 있습니다. 진화 완료 여부는 구매 목표와 별개입니다.
- ‘진화 목표’ 체크는 필요한 능력을 보여 주는 계획입니다. 완료된 진화는 표시·유지하고, 기존 실제 진화 조합·카드 확률·능력 슬롯을 바꾸지 않습니다.
- 특수부대·서포토이·채집 트럭은 자동 구매하지 않습니다. 자원·XP·강화 기회를 생성하지 않으며 병력 비용만 사용합니다.
- 대장이 쓰러져 있으면 해당 구간 안에서 부활을 기다립니다. 지난 검사들을 누적 구매하지 않습니다. 시계는 시뮬레이션 시간이라 일시정지 중 멈춥니다.

## 코드 위치

- `public/reinforcement-plan.js`: 설치형 엔진 확장. `reinforcementPlan`, `setReinforcementPlan`, `reinforcementCounts`, `reinforcementCandidates`, `runAutomaticReinforcement`.
- `fieldSupplyState.reinforcementPlan`: `{enabled, mode, targets, priority, evolutionGoals}`. 기존 소유자별 보급 상태 안에 있으므로 협동·저장에서도 분리됩니다.
- `fieldSupplyState.autoSupportCycle`, `pendingAutoCycle`, `autoReinforcedCycle`: 30초 회차. `autoReinforcementResult`: 마지막 회차·구매 수·비용·대기 사유.
- 기존 `scheduleMinuteSupport`/`beginMinuteSupport`를 감싸 자동 모드일 때만 새 검사로 대체합니다. 자동을 끄면 원래 1분 수동 동작을 사용합니다.
- `public/reinforcement-plan-ui.js` / `.css`: 설정 폼·시작 바로가기·전장 상태. 브라우저 기본값 키는 `plastic-front-reinforcement-v1`.
- `coop-server.cjs`: 인증된 플레이어의 `reinforcementPlan` 명령. 대기실과 전체 일시정지 중 설정 변경도 허용하며 구매는 하지 않습니다. 방 생성/입장 요청에 개인 계획을 포함합니다.
- `public/coop-client.js`: 설정창과 협동 대기실 왕복, 서버 확인 후 저장 성공 표시.
- `public/autoplay.js`: 자동충원을 켜면 같은 목표를 쓰고 별도의 AI 수동 구매 큐를 비웁니다. 백그라운드 워커도 모듈을 로드합니다.
- `index.html`, `boss-test.html`, Node engine require, `autoplay-worker.js`: `field-supplies.js` 뒤에 `reinforcement-plan.js`를 설치합니다.

## 검증

`node --test server/plastic-front/*.test.cjs`로 게임 테스트 355개를 확인합니다. 우선순위 자원 대기·골고루 비율/동률·30초 경계·설정 변경의 다음 회차 적용·2/3성 합성·2성 전사 후 1성 복귀·병력 상한·저장·AI·협동 소유권 및 실제 HTTP 설정 명령을 포함합니다.

실제 브라우저에서 출격 전 저장/복원, 0:30 충원과 합성, 전투 중 목표 변경 후 진화 저격병 충원, 협동 대기실 설정 왕복, 390px 모바일 배치를 확인했습니다. 임시 `_qa-auto-*` 파일은 배포하지 않습니다.

GitHub main과 ChatGPT Sites는 별도 소스입니다. 회사 PC에서는 먼저 작업 중인 변경을 보존하고 `git pull --ff-only`로 최신 main을 받아 작업하세요. Render는 기존 서비스의 자동 배포가 꺼져 있어 push 이후 명시적 배포가 필요합니다. 전투 밸런스·적 수·보스 체력·경험치·토이 수치는 이번 변경에서 조정하지 않습니다.
