# AFTER HOURS — 316호의 비밀

3D 호텔 방탈출의 첫 맵 버전입니다. 기존 Render 서버에서 `/after-hours/`로 제공합니다.

- 자유 탐색: 로비, 복도, 라운지, 기록실, 전기실, 316호. 모든 객실이 열려 있습니다.
- 방탈출 초안: 퓨즈, 전원 복구, 어둠 속 액자, 금고, 비상구로 이어지는 짧은 퍼즐입니다.
- WASD 이동, 마우스 드래그 또는 방향키 시점, E 조사, F 손전등, M 지도, J 기록, 자유 탐색 중 L 조명, ESC 일시정지.
- PC용 1인 플레이입니다. 멀티와 정식 스토리 모드는 아직 포함하지 않습니다.
- Three.js 0.170.0을 함께 제공합니다. 라이선스는 `public/THREE-LICENSE.txt`에 있습니다.

실행: 저장소 루트에서 `node server/girl-lobby/server.cjs`.

검증: `node --test server/after-hours/server.test.cjs server/girl-lobby/server.test.cjs`.
