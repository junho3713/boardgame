# 차그녀 무료 연습 서버

공개 주소: https://girl-free-lobby-test.onrender.com/

- 혼자 컴퓨터 2~5명과 기본 규칙 한 판을 진행할 수 있습니다.
- 친구 3~6명이 방 코드로 모이는 모드도 같은 진행 엔진을 사용합니다.
- 특기 13종, 조합, 의혹, 마지막 손패 보호, 우선순위 승패 판정을 처리합니다.
- 컴퓨터는 자기 손패와 공개·정당하게 획득한 비공개 정보의 투영값만 전달받습니다. 간단한 휴리스틱 연습 AI이며 최적 플레이를 보장하지 않습니다.
- 시작: `node server/girl-lobby/server.cjs`
- 검증: `node --test server/girl-lobby/game.test.cjs server/girl-lobby/server.test.cjs`
- 방은 메모리에만 저장하며 2시간 후 만료됩니다. 재시작 시 모든 방이 사라집니다.
- 토큰은 각 탭의 sessionStorage에 저장하고 Authorization 헤더로 보냅니다. 진행 중 응답에는 본인 손패와 허용된 정보만 포함됩니다.
- 서버 상태: `/healthz`.
- Render 서비스는 Free Web Service 1개입니다. DB, 디스크, 유료 인스턴스는 사용하지 않습니다.
- 저장소 render.yaml은 재생성용 참고 설정이며 현재 서비스는 Render MCP로 직접 생성했습니다. 자동 배포는 꺼져 있으므로 소스 변경 후 수동 배포가 필요합니다.