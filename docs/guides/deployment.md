# 배포 가이드

> 보스 알리미 v3.0.5 — GitHub Pages 정적 배포

---

## 1. 배포 환경

| 항목 | 내용 |
|---|---|
| 배포 플랫폼 | GitHub Pages |
| 배포 URL | `https://bohe76.github.io/boss-alarm/` |
| 소스 저장소 | `https://github.com/bohe76/boss-alarm` |
| 배포 브랜치 | `main` |
| 빌드 시스템 | 없음 (정적 파일 직접 서빙) |
| 번들러 | 없음 (ES Modules 직접 사용) |
| PR 검증 | `.github/workflows/share-validation.yml` — 단위 테스트, lint, Chromium E2E 및 da.gd 실연동 검증 |
| 운영 배포 | GitHub Pages 기본 설정 — `main` 브랜치 루트(`/`) |

---

## 2. 배포 흐름

```
로컬 main 작업 → npm test 통과 → npm run lint 통과 → E2E 통과
→ 릴리즈 정보 갱신·확인 → release 커밋 + 태그
→ main 푸시
→ GitHub Pages 자동 재배포 (수 분 소요)
→ 배포 후 검증
```

릴리즈는 로컬 `main`에서 직접 커밋·푸시하는 방식이 기본이다. 이 경로는 PR 검증을 거치지 않으므로 3.1의 항목을 로컬에서 모두 통과시킨 뒤 푸시한다. PR 경유(v3.0.5)는 예외적 처리였으며, 그 경우 `main` 대상 PR에서 `Share validation`이 실행된다. GitHub Pages는 `main` 브랜치 루트(`/`)를 소스로 자동 배포한다. PR 검증 성공만으로 운영 배포가 이루어지는 것은 아니다.

---

## 3. 배포 전 사전 체크리스트

### 3.1 필수 통과 항목

```bash
# 1. 전체 단위 테스트 실행 — 현재 227개, 최종 실행 결과 기준 전부 통과 필수
npm test

# 2. ESLint 검사 — 0 errors 필수
npm run lint

# 3. 브라우저 준비 및 전체 E2E — 기본·릴리즈 안내 6개 + 커스텀 목록 공유 5개 + 실연동 1개
npx playwright install --with-deps chromium
LIVE_SHARE_E2E=1 npm run e2e -- --workers=1
```

실연동 검증은 합성 데이터로 실제 da.gd 단축 링크를 생성한다. PR 코드는 테스트 브라우저에서 production origin으로 제공하며 운영 사이트에 배포하지 않는다. 실제 API 요청, CORS, 클립보드, 최근 생성 안내 페이지, 새 브라우저 컨텍스트의 일정·메모 복원을 검증한다. `LIVE_SHARE_E2E`를 지정하지 않으면 이 1개 시험은 건너뛰므로 전체 실연동 통과로 기록하지 않는다.

로컬 환경에서 브라우저 실행이 제한되면 GitHub Actions의 해당 PR 최종 커밋 검증 결과를 확인한다. 현재 E2E는 데스크톱 Chromium이며, Notification API 미지원 시험도 Chromium의 기능 모의 시험이다. 실제 iOS Safari·카카오톡 실기기 검증을 대체하지 않는다.

### 3.2 수동 확인 항목

- [ ] `package.json` / `package-lock.json` 루트 버전 일치 여부
- [ ] `CHANGELOG.md` 변경 사항 및 릴리즈 날짜 기록
- [ ] `data/version_history.json` 최신 버전 항목을 선두에 추가
- [ ] `src/data/update-notice.json` 공지 내용을 기존 안내 어조로 갱신
- [ ] `src/data/boss-presets.json` 보스 데이터 변경 사항 반영 여부
- [ ] `index.html` `APP_VERSION` 및 CSS 캐시 버전이 최신 버전 번호와 일치하는지 확인
- [ ] 버전 갱신 후 단위 테스트·lint·실연동 E2E 재실행 및 업데이트 모달 확인

---

## 4. 배포 절차

```bash
# 로컬 main에서 최종 확인 (3.1 전체)
npm test && npm run lint
LIVE_SHARE_E2E=1 npm run e2e -- --workers=1

# release 커밋 + 태그
git add <변경파일>
git commit -m "chore(release): vX.Y.Z — 릴리즈 설명"
git tag vX.Y.Z

# 푸시 (lightweight 태그는 따로 푸시)
git push origin main
git push origin vX.Y.Z
```

푸시 후 GitHub Release를 발행한다. release 커밋이나 태그 생성만으로 발행 완료로 기록하지 않는다. PR 경유로 낼 때는 PR의 최종 검증 결과를 확인하고 승인 후 `main`에 병합한 뒤 병합 커밋에 태그를 붙인다.

GitHub Pages는 push 수신 후 자동으로 사이트를 재빌드한다. 완료까지 통상 1~3분 소요.

---

## 5. 배포 후 검증 절차

배포 완료 후 아래 항목을 브라우저에서 직접 확인한다.

| 단계 | 확인 항목 | 방법 |
|---|---|---|
| 1 | 정적 사이트 로드 | `https://bohe76.github.io/boss-alarm/` 접속, 콘솔 에러 없음 |
| 2 | 게임 선택 | 드롭다운에서 "오딘" 선택 → 보스 목록 표시 |
| 3 | 보스 스케줄 입력 | 보스 시각 입력 → 저장 → 시간표 화면 확인 |
| 4 | 알람 활성화 | 알람 ON → 5분/1분/0분 알림 로직 확인 |
| 5 | PiP 실행 | 대시보드 → PiP 버튼 → 미니 창 표시 |
| 6 | 공유 URL | 공유 탭 → URL 생성 → 다른 탭에서 접속하여 보스 목록 로드 |
| 7 | 모바일 | Chrome DevTools 모바일 에뮬레이션 또는 실기기 확인 |
| 8 | 카카오톡 인앱 | 카카오톡 링크 전송 후 앱 내 열기 → 외부 브라우저 리다이렉션 확인 |

---

## 6. 롤백 절차

GitHub Pages는 `main` 브랜치를 기반으로 자동 배포하므로, 이전 커밋으로 되돌리면 즉시 롤백된다.

```bash
# 방법 1: 직전 커밋 되돌리기 (새 커밋 생성)
git revert HEAD
git push origin main

# 방법 2: 특정 커밋으로 되돌리기
git revert <commit-hash>
git push origin main
```

> `git reset --hard`는 히스토리를 파괴하므로 사용 금지. 항상 `git revert`를 사용한다.

롤백 후 GitHub Pages가 이전 버전으로 재배포되는 데 1~3분 소요.

---

## 7. 캐시 정책

### 7.1 `.nojekyll` 파일

루트에 `.nojekyll` 파일이 없을 경우 GitHub Pages의 Jekyll 처리가 `_`로 시작하는 파일·폴더를 무시할 수 있다. 프로젝트에 해당 파일이 없다면 `touch .nojekyll`로 생성 후 커밋한다.

### 7.2 브라우저 캐시 무효화

정적 파일(`index.html`, `src/*.js`)은 GitHub Pages CDN에 의해 캐싱된다. 변경 사항이 즉시 반영되지 않을 경우:

- 브라우저 강제 새로고침: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
- ES Module 파일(`.js`)은 쿼리스트링 버전 파라미터(`?v=X.Y.Z`) 추가로 캐시 무효화 가능

---

## 8. 환경 변수

현재 환경 변수 없음. 모든 설정은 클라이언트 LocalStorage 전용이다.

| 항목 | 현황 |
|---|---|
| 서버 환경 변수 | 없음 |
| `.env` 파일 | 없음 |
| API 키 | da.gd 익명 POST API — 키 불필요 |

da.gd 실연동에는 `https://da.gd/s` 및 생성된 단축 주소에 대한 HTTPS 접속이 필요하다. 도메인 제한 환경에서는 `da.gd` 허용 여부를 확인한다. 새 링크에는 최근 생성 안내 페이지가 나타날 수 있으며, 서비스 오류·시간 초과 시 원본 URL로 폴백한다. 공유 URL에는 일정과 메모가 포함되며 단축 요청 시 da.gd에 전달된다. Base64는 암호화가 아니다.

---

## 9. 커스텀 도메인 설정 (선택)

GitHub Pages에서 커스텀 도메인을 사용하려면:

1. `CNAME` 파일을 저장소 루트에 생성 (예: `www.boss-alarm.com`)
2. 도메인 DNS 설정: CNAME 레코드를 `bohe76.github.io`로 지정
3. GitHub 저장소 설정 → Pages → Custom domain 입력
4. HTTPS 활성화 체크 (Let's Encrypt 자동 발급, 수 분 소요)

> 커스텀 도메인 설정 시 `index.html` 내 origin 관련 로직(인앱 브라우저 리다이렉션 등) 도메인 값 업데이트 필요.

---

## 10. 배포 히스토리 확인

```bash
# 최근 배포 커밋 확인
git log --oneline --decorate -10
```

GitHub 저장소 Actions 탭 또는 Pages 설정 탭에서 배포 상태를 확인할 수 있다.
