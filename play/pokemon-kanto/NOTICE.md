# 관동 카드 리그 · 예측 배틀 (전투 실험판 01)

비공식 팬 제작 웹게임입니다. Pokémon 및 캐릭터의 권리는 Nintendo / Creatures Inc. / GAME FREAK inc. 등 원 권리자에게 있습니다. 공식 게임이나 공식 규칙이 아닙니다.

## 이번 버전
- 리자몽·거북왕·이상해꽃으로 구성한 동일한 3대3 팀.
- 양쪽이 비밀리에 행동을 확정한 뒤 동시에 공개·피해 적용.
- 공개 에너지, 방어 관통, 교체 추격, 연속 방어 약화, 강공격의 다음 턴 빈틈.
- 연습 AI와 친구 1대1, 방 채팅, 초대 링크·방 코드 복사, 같은 방에서 재대전.
- 능력치·기술 효과·타입 보정은 이 실험판의 자체 수치입니다. 재미와 균형은 검증 중입니다.
- 사용자 제안에 따라 자동 전투를 제거했습니다. 7 Wonders Duel에서 착안한 공유 드래프트와 포켓몬 진화는 이후 확장 아이디어이며, 이번 전투 실험판에는 포함하지 않습니다. 다른 보드게임의 카드·규칙서·로고 이미지는 사용하지 않습니다.

## 포켓몬 이미지
PokeAPI sprites 저장소의 official-artwork를 원격 표시합니다. 원본 아트의 권리는 해당 권리자에게 있습니다.
- https://github.com/PokeAPI/sprites
- https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png
- https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png
- https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png

## 저장과 연결
연습 데이터는 이 브라우저의 localStorage에, 친구 대전 입장 토큰은 탭의 sessionStorage에 저장합니다. 예전 육성 버전의 저장 데이터는 덮어쓰지 않습니다. 서버의 방은 메모리에 있어 재시작 시 사라집니다. 마지막 게임 요청 이후 2시간이 지난 방은 만료될 수 있습니다.

## 짧은 검증
실행: node --test play/pokemon-kanto/game.test.cjs server/kanto/server.test.cjs
비공개 선택·동시 피해·관통/추격·연속 방어·에너지·강제 교체·30턴 제한·AI 정보 제한 및 HTTP 동시 제출/인증/SSE/재대전/방 정리를 확인합니다.

