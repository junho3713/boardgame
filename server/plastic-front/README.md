# 플라스틱 프론트

기존 보드게임 서버에서 `/plastic-front/`로 제공하는 싱글 플레이 버전입니다.

- 원본: https://plastic-front.junhou.chatgpt.site/
- Sites 프로젝트: `appgprj_6ad96603dcf48191b447d463dee6abbe`
- 원본 소스 커밋: `c2852b2d244349366e345338eb4bd3c08b35167e` (공개 버전 184)
- `public/`는 원본 `dist/`의 변경 없는 복사본입니다.
- 빌드나 외부 패키지 설치 없이 기존 Node 서버가 정적 파일을 스트리밍합니다.

현재 협동 플레이와 서버 저장은 구현되어 있지 않습니다. 진행 상황은 기존과 동일하게 브라우저 localStorage에 저장됩니다. 도메인이 달라 원본 Sites의 저장 데이터는 이 주소에 자동으로 이동하지 않습니다.

실시간 협동 기능은 이 경로 아래에 API를 추가하는 별도 개발 작업입니다. 현재 배포는 기존 싱글 플레이를 Render로 옮기는 작업입니다.

검증: `node --test server/plastic-front/server.test.cjs server/girl-lobby/server.test.cjs`
