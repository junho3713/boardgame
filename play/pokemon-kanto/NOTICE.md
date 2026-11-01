# 관동 카드 리그 · 예측 배틀 (육성 + 예측 배틀 실험판 02)

비공식 팬 제작 웹게임입니다. Pokémon 및 캐릭터의 권리는 Nintendo / Creatures Inc. / GAME FREAK inc. 등 원 권리자에게 있습니다. 공식 게임이나 공식 규칙이 아닙니다.

## 이번 버전
- 파이리·꼬부기·이상해씨로 시작해 공유 육성 카드 12장 중 각자 4장을 드래프트합니다.
- 한 단계씩 진화하거나 추격·간파·체력 특훈을 선택합니다. 특훈은 진화해도 유지됩니다.
- 1차 진화는 교체 예측 보너스, 최종 진화는 방어 예측 보너스도 강화합니다.
- 양쪽이 비밀리에 행동을 확정한 뒤 동시에 공개·피해 적용.
- 공개 에너지, 방어 관통, 교체 추격, 연속 방어 약화, 강공격의 다음 턴 빈틈.
- 연습 AI와 친구 1대1, 방 채팅, 초대 링크·방 코드 복사, 같은 방에서 재대전.
- 능력치·기술 효과·타입 보정은 이 실험판의 자체 수치입니다. 재미와 균형은 검증 중입니다.
- 사용자 제안에 따라 자동 전투를 제거하고, 전투 전 짧은 육성 단계를 추가했습니다. 공유 카드가 아래쪽 선택에 따라 열리는 구조는 7 Wonders Duel에서 착안했으며 카드·효과·전투 수치는 이 실험판용입니다. 다른 보드게임의 카드·규칙서·로고 이미지는 사용하지 않습니다.

## 포켓몬 이미지
PokeAPI sprites 저장소의 official-artwork를 원격 표시합니다. 원본 아트의 권리는 해당 권리자에게 있습니다.
- https://github.com/PokeAPI/sprites
- https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png
- https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png
- https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png

## 저장과 연결
연습 데이터는 이 브라우저의 localStorage에, 친구 대전 입장 토큰은 탭의 sessionStorage에 저장합니다. 이전 버전의 저장 데이터는 덮어쓰지 않습니다. 서버의 방은 메모리에 있어 재시작 시 사라집니다. 마지막 게임 요청 이후 2시간이 지난 방은 만료될 수 있습니다.

## 짧은 검증
실행: node --test play/pokemon-kanto/game.test.cjs server/kanto/server.test.cjs
공유 육성 차례·중복 특훈 제한·진화/특훈 유지·배틀 준비·비공개 선택·동시 피해·관통/추격·연속 방어·에너지·강제 교체·30턴 제한·AI 정보 제한 및 HTTP 동시 제출/인증/SSE/재대전/방 정리를 확인합니다.

