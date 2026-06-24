# Playwright E2E 기준선

기준일: 2026-06-24

## 목적

리팩토링 전 핵심 사용자 흐름을 브라우저에서 고정한다. 각 리팩토링 단계는 기존 unit/integration 테스트와 함께 이 Playwright 기준선을 통과해야 한다.

## 실행

```powershell
npx playwright install chromium
npm run e2e
```

- 설정: `playwright.config.js`
- 정적 서버: `scripts/serve-static.mjs`
- 테스트: `e2e/baseline.spec.js`
- 스크린샷: `screenshots/e2e/` (`.gitignore`에 등록)

## 자동화 시나리오

| 시나리오 | 검증 내용 | 스크린샷 |
|---|---|---|
| 대시보드/도움말 | clean browser state에서 앱 로드, 알림 정책 dialog 처리, 도움말 JSON 렌더링 | `dashboard.png`, `help.png` |
| 스케줄러 → 시간표 → 내보내기 → 공유 | 보스 남은 시간 입력, 메모 반영, 시간표 이동, export modal 열기/닫기, TinyURL stub과 clipboard 복사 | `scheduler-input.png`, `timetable-after-scheduler.png`, `export-modal.png`, `share.png` |
| 고정 알림 | 설정에서 고정 알림 추가, 목록 렌더링, 시간표 병합 표시 | `fixed-alarm-settings.png`, `timetable-fixed-alarm.png` |

## 네트워크와 브라우저 경계

E2E는 앱 로직을 검증하기 위해 외부 네트워크를 고정한다.

- Google Analytics: 빈 응답으로 stub.
- `html2canvas`: 캔버스 생성 stub. 실제 이미지 다운로드 품질은 별도 수동 smoke 대상.
- TinyURL API: `https://tinyurl.test/boss-alarm-e2e`로 stub.

## 최근 실행 결과

2026-06-24 실행:

```text
npm run e2e
3 passed (13.7s)
```

함께 확인한 회귀:

```text
npm run lint
passed

npm test
16 files / 162 tests passed
```

## 수동 Smoke 대상

다음 기능은 브라우저 권한, OS, 실제 외부 API에 의존하므로 자동 기준선과 분리한다.

- Notification 권한 허용 후 실제 배너 알림
- Speech API 음성 출력
- Document PiP 실제 팝업 동작
- 실제 TinyURL 호출과 실제 image export 파일 품질
- 모바일 viewport와 인앱브라우저 리다이렉트
