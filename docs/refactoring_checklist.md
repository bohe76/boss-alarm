# 리팩토링 체크리스트

## 1단계: 라우터 추출
- [ ] `src/router.js` 생성 <!-- id: 10 -->
    - [ ] `event-handlers.js`에서 `showScreen` 함수 이동 <!-- id: 11 -->
    - [ ] 내비게이션 이벤트 리스너(사이드바, 하단 탭)를 `Router.init(DOM)`으로 이동 <!-- id: 12 -->
- [ ] `src/event-handlers.js`가 `Router`를 사용하도록 수정 <!-- id: 13 -->
- [ ] 내비게이션 작동 확인 (대시보드, 설정 등) <!-- id: 14 -->

## 2단계: 화면 로직 추출
### 공유 화면 (Share Screen)
- [ ] `src/screens/share-screen.js` 생성 <!-- id: 20 -->
    - [ ] "공유 링크" 생성 로직 이동 <!-- id: 21 -->
    - [ ] 클립보드 복사 로직 이동 <!-- id: 22 -->
- [ ] `event-handlers.js`가 `ShareScreen`을 위임하도록 수정 <!-- id: 23 -->
- [ ] 공유 링크 생성 확인 <!-- id: 24 -->

### 도움말 화면 (Help Screen)
- [ ] `src/screens/help-screen.js` 생성 <!-- id: 30 -->
    - [ ] `loadJsonContent` 호출 및 도움말 렌더링 로직 이동 <!-- id: 31 -->
- [ ] `event-handlers.js`가 `HelpScreen`을 위임하도록 수정 <!-- id: 32 -->
- [ ] 도움말 콘텐츠 로드 확인 <!-- id: 33 -->

### 계산기 화면 (Calculator Screen)
- [ ] `src/screens/calculator-screen.js` 생성 <!-- id: 40 -->
    - [ ] 젠 계산기 이벤트 리스너 이동 <!-- id: 41 -->
    - [ ] 빛 계산기 이벤트 리스너 이동 <!-- id: 42 -->
- [ ] `event-handlers.js`가 `CalculatorScreen`을 위임하도록 수정 <!-- id: 43 -->
- [ ] 계산기 기능 확인 <!-- id: 44 -->

### 보스 스케줄러 화면 (Boss Scheduler Screen)
- [ ] `src/screens/boss-scheduler-screen.js` 생성 <!-- id: 50 -->
    - [ ] "게임 선택" 로직 이동 <!-- id: 51 -->
    - [ ] "설정으로 이동" 로직 이동 <!-- id: 52 -->
- [ ] `event-handlers.js`가 `BossSchedulerScreen`을 위임하도록 수정 <!-- id: 53 -->
- [ ] 보스 스케줄러 기능 확인 <!-- id: 54 -->

## 3단계: 정리 (Cleanup)
- [ ] `event-handlers.js`에서 사용하지 않는 import 제거 <!-- id: 60 -->
- [ ] `npm run lint` 실행 및 이슈 수정 <!-- id: 61 -->
