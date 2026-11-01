# 7원더스 대결 · 기본판 + 판테온

비공식 팬 웹 구현입니다. 7 Wonders Duel 및 Pantheon의 게임 명칭·원작 권리는 Repos Production 및 원 권리자에게 있습니다. Antoine Bauza와 Bruno Cathala의 게임을 참고했습니다. 공식 디지털판이 아니며 상용 카드 일러스트·로고·규칙서 지면을 이 사이트에 복제하지 않습니다. 카드 색상·기호·신전 그래픽과 한국어 안내는 웹용으로 별도 구성했습니다.

## 구현 범위
- 컴퓨터 연습과 인증된 친구 1대1, 기본판/판테온 선택.
- 불가사의 1-2-1 선택, 3시대 20장 구조, 뒤집기와 비공개 정보.
- 자원 생산/은행 구매/선택 생산/할인/연쇄, 판매, 불가사의 7개 제한.
- 군사·과학 즉시 승리, 과학 쌍과 진보, 시민 점수 및 파란 건물 동점 판정.
- 판테온 신 15종, 신들의 문, 신화·봉헌, 대신전, 새 불가사의 2개와 진보 3개.
- 신들의 극장의 덱/남은 순서, 엔키·니사바·넵투누스·미네르바 등의 선택 효과.
- 같은 방 재대전, 채팅, 초대 링크 및 방 코드 복사.
- 아고라·프로모·공식 솔로 확장은 포함하지 않습니다. 컴퓨터는 이 웹 구현의 공개 정보 기반 휴리스틱 AI입니다.

## 오픈소스 코드 출처
Emil Indzhev의 MIT 라이선스 프로젝트에서 기본판 카드 수치 테이블과 시대별 겹침 배치를 가져와 JavaScript 데이터로 변환했습니다. 웹 진행 엔진, 판테온 처리, 한국어 화면, 서버, 컴퓨터 선택 로직은 이 사이트용으로 작성했습니다.
- 프로젝트: https://github.com/indjev99/7-Wonders-Duel-AI
- 데이터 원본: https://github.com/indjev99/7-Wonders-Duel-AI/blob/master/src/game/objects.cpp
- 배치 원본: https://github.com/indjev99/7-Wonders-Duel-AI/blob/master/src/game/pyramid_schemes.cpp
- 라이선스: LICENSE-UPSTREAM.txt (MIT, Copyright (c) 2023 Emil Indzhev)

공개된 BGA 구현도 조사했으나 플랫폼 라이선스가 달라 그 구현 코드를 이식하지 않았습니다. 코드의 라이선스는 원작 이미지의 사용 허가를 뜻하지 않습니다.

## 공식 규칙과 정오표
공식 문서의 내용을 그대로 옮기지 않고 플레이에 필요한 안내를 별도로 작성했습니다. 2016~2020년 판테온 아누비스·제우스 정오표와 대신전의 연쇄 처리도 반영했습니다.
- 기본판: https://www.rprod.com/en/games/7-wonders-duel
- 한국어 규칙: https://cdn.svc.asmodee.net/production-rprod/storage/downloads/games/7wonders-duel/kr/7du-kr01-rules-1701442944gokmV.pdf
- 판테온: https://www.rprod.com/en/games/7-wonders-duel/pantheon
- 판테온 규칙: https://cdn.svc.asmodee.net/production-rprod/storage/downloads/games/7wonders-duel-pantheon/en/7dpa-rules-en-1624535175WPszB.pdf
- FAQ/정오표: https://www.rprod.com/en/7-wonders-duel/faq

## 저장과 연결
연습은 localStorage, 친구 대전 입장 토큰은 현재 탭의 sessionStorage에 저장합니다. 비공개 카드, 상대의 신화 선택, 상자 속 진보, 이후 신화 덱 순서는 서버가 공개 시점 전까지 상대에게 보내지 않습니다. 멀티 방은 메모리 기반이므로 서버 재시작이나 마지막 게임 요청 이후 2시간 경과 시 사라질 수 있습니다.

## 짧은 검증
node --test play/seven-duel/game.test.cjs play/seven-duel/effects.test.cjs server/seven-duel/server.test.cjs

기본판/판테온 AI 24판, 비용·할인·연쇄·즉시 승리·신 효과·봉헌·점수·비공개 정보·SSE·인증·잘못된 요청 원상 유지·재대전·방 정리를 확인합니다. 실제 재미와 AI 강도는 플레이를 통해 더 다듬을 수 있습니다.

