# 낚시 미끼 3D 스프라이트 (2026-11-10)

- 제작: 내장 image_gen 도구로 생성 후 투명 배경 정리 편집. CLI 사용 없음.
- 게임 파일: public/assets/support-toys/fishing-bait-v20261110.png (256×256 RGBA). 알파를 유지하여 게임용 크기로 축소 저장.
- 적용: 설치된 미끼와 투척 중 미끼에 동일한 스프라이트 사용. 파일 로딩 실패 시 기존 그림으로 표시.
- 보스 타격 2회에 파괴, 첫 타격 후 반 체력·균열. 이동 경로 유인 규칙 유지.

## 최종 생성 프롬프트

Use case: stylized-concept. Asset type: production sprite for a miniature 3D tabletop toy-soldier game. Create ONE isolated toy fishing lure assembly, genuinely transparent RGBA background. A charming plump golden-yellow fish-shaped hard plastic fishing lure, nose pointing LEFT and thick orange-red fan tail RIGHT, seen in three-quarter side view from 25 degrees above. The entire fish is horizontally oriented, compact round belly, sculpted raised gill cover, tiny smiling mouth, one glossy black bead eye with white catchlight, thick translucent-orange dorsal and pectoral fins and sculpted tail fin ridges, subtle mold seam, warm cream belly. Clearly rounded volumetric body with rich amber shadow underneath, golden highlights on top-left, a broad soft white plastic specular reflection, delicate toy surface microtexture. A small realistic brushed silver metal attachment ring at its mouth, linked by a short curved cream fishing line to ONE little oval fishing bobber above-left of the fish. Bobber is cream with coral-red equatorial band and a short stem, has convincing rounded volume and glossy reflections. No barbed hook. This is one coherent fishing lure object, not a scene. Cute polished collectible plastic toy, beautifully rendered like a high-quality 3D toy product render, crisp readable silhouette when scaled to 50 pixels. Entire assembly fills about 80 percent of square canvas, comfortably centered with even transparent margin. No water, no floor, no cast ground shadow, no glow, no background color, no lettering, no diagram, no panels, no additional characters, no border. Preserve transparent alpha.

## 투명 배경 정리 편집 프롬프트

Clean production sprite alpha edit. Preserve exactly the golden 3D fish lure, orange fins, silver mouth ring, curved cream line and cream/coral bobber, their shapes, material, colors and composition. Remove ALL detached colored noise, tiny red/yellow/white floating speckles and stray patches from the empty space, especially between the curved line and bobber and fish above the fish mouth. All empty space must be fully transparent with absolutely no detached dots, no fringing and no smudges. Keep only the coherent lure assembly. Keep the lovely sculpted 3D plastic quality, same size and framing. No new objects, no text, no backdrop, no shadows.

