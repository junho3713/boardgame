# Render 무료 연결 시험

이 코드는 차그녀 완성 게임이 아닌 방 입장·비공개 손패 분배 검증용입니다.

- 저장소 루트의 `render.yaml`은 Web Service의 `plan: free`를 지정합니다.
- DB, 영구 디스크, 유료 인스턴스, 별도 과금 서비스는 선언하지 않습니다.
- 계정 연결 후 서비스 생성 결과에서 무료 플랜을 확인해야 배포 완료입니다.
- 시작: `node server/girl-lobby/server.cjs` / 검증: `node --test server/girl-lobby/server.test.cjs`
- 방은 메모리에만 저장하며 2시간 후 만료됩니다. 재시작 시 모든 방이 사라집니다.
- 토큰은 각 탭의 sessionStorage에 저장하고 Authorization 헤더로 보냅니다. 응답에는 본인 카드만 들어갑니다.
- 서버 상태: `/healthz`.
- 실제 카드 능력·턴·승패 판정과 영구 재접속은 아직 구현하지 않았습니다.
