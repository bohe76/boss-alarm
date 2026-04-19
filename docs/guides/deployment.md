# 배포 가이드

> 보스 알리미 v3.0 — GitHub Pages 정적 배포

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
| CI/CD | GitHub Pages 자동 배포 (`.github/workflows/` 미존재 — Pages 기본 설정) |

---

## 2. 배포 흐름

```
로컬 개발 → npm test 통과 → npm run lint 통과
→ git commit → git push origin main
→ GitHub Pages 자동 재배포 (수 분 소요)
→ 배포 후 검증
```

GitHub Actions 워크플로우 파일(`.github/workflows/`)은 현재 존재하지 않으며, GitHub Pages 설정에서 `main` 브랜치의 루트(`/`)를 소스로 지정하여 자동 배포된다.

---

## 3. 배포 전 사전 체크리스트

### 3.1 필수 통과 항목

```bash
# 1. 전체 테스트 실행 — 132 tests 전부 통과 필수
npm test

# 2. ESLint 검사 — 0 errors 필수
npm run lint
```

### 3.2 수동 확인 항목

- [ ] `data/version_history.json` 버전 정보 최신화 여부
- [ ] `src/data/update-notice.json` 공지 내용 갱신 여부 (대규모 업데이트 시)
- [ ] `src/data/boss-presets.json` 보스 데이터 변경 사항 반영 여부
- [ ] `index.html` `APP_VERSION` 상수가 최신 버전 번호와 일치하는지 확인

---

## 4. 배포 절차

```bash
# 로컬에서 최종 확인
npm test && npm run lint

# main 브랜치에 커밋 및 푸시
git add <변경파일>
git commit -m "chore(release): vX.Y.Z 릴리즈 설명"
git push origin main
```

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
| API 키 | TinyURL API — 키 불필요 (무료 엔드포인트) |

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
