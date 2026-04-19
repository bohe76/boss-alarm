# 보안 정책

> 보스 알리미 v3.0 — 클라이언트 전용 정적 웹 앱 보안 정책

---

## 1. 위협 모델 개요

보스 알리미는 **서버 없이 GitHub Pages에 배포되는 정적 SPA**다. 외부 서버와의 통신은 다음 두 가지만 존재한다.

| 통신 대상 | 목적 | 데이터 방향 |
|---|---|---|
| TinyURL API | 공유 URL 단축 | 아웃바운드 (보스 스케줄 데이터 포함 URL 전송) |
| GitHub Pages CDN | 정적 파일 서빙 | 인바운드 |

모든 사용자 데이터는 **LocalStorage에만 저장**되며 외부 DB/서버로 전송되지 않는다.

### 1.1 공격 표면 요약

| 위협 | 수준 | 설명 |
|---|---|---|
| XSS (Cross-Site Scripting) | **중간** | 동적 HTML 생성 광범위 사용 — 아래 §2 참조 |
| CSRF | 낮음 | 서버 없음, 세션 없음 |
| 데이터 탈취 (서버) | 없음 | 외부 DB 없음 |
| SQL Injection | 없음 | DB 없음 |
| LocalStorage 탈취 | 낮음 | 동일 origin 내 스크립트만 접근 가능 |
| 공급망 공격 (npm) | 낮음 | devDependencies만 존재, 런타임 외부 라이브러리 없음 |

---

## 2. XSS 위험 분석 — 동적 HTML 렌더링 현황

### 2.1 현황

아래 표는 `src/` 내 동적 HTML 삽입(innerHTML 속성 사용) 사이트를 grep 결과로 정리한 것이다.

| 파일 | 라인 | 사용 내용 | 입력 원천 | 위험도 |
|---|---|---|---|---|
| `src/ui-renderer.js` | 39 | 보스 선택 드롭다운 옵션 생성 | 프리셋 JSON (신뢰) | 낮음 |
| `src/ui-renderer.js` | 57 | 음소거 버튼 아이콘 (SVG 상수) | 하드코딩 상수 | 없음 |
| `src/ui-renderer.js` | 92 | 다음 보스 표시 (`name`, `remainingTime`) | DB (사용자 입력 경유) | **중간** |
| `src/ui-renderer.js` | 158 | 예정 보스 목록 (`name`, `time`) | DB (사용자 입력 경유) | **중간** |
| `src/ui-renderer.js` | 186 | 최근 알람 로그 | DB (사용자 입력 경유) | **중간** |
| `src/ui-renderer.js` | 227, 229 | 도움말 콘텐츠 (`feature_guide.json`) | 정적 JSON (신뢰) | 낮음 |
| `src/ui-renderer.js` | 260, 262 | FAQ 콘텐츠 (`faq_guide.json`) | 정적 JSON (신뢰) | 낮음 |
| `src/ui-renderer.js` | 305, 332, 375 | 광 계산기 결과 목록 | 계산 결과 (수치) | 낮음 |
| `src/ui-renderer.js` | 454, 457, 471 | 고정 알림 목록 (`name`, `time`) | DB (사용자 입력 경유) | **중간** |
| `src/ui-renderer.js` | 539, 576, 578 | 버전 히스토리 (`version_history.json`) | 정적 JSON (신뢰) | 낮음 |
| `src/ui-renderer.js` | 647, 654, 657 | 게임 선택 목록, 커스텀 목록 | DB/프리셋 혼합 | **중간** |
| `src/ui-renderer.js` | 710, 722, 772 | 보스 입력 폼 생성 (보스 이름) | DB + 프리셋 | **중간** |
| `src/ui-renderer.js` | 1092 | 보스 목록 카드 | DB (사용자 입력 경유) | **중간** |
| `src/ui-renderer.js` | 1254 | 내보내기 캡처 컨테이너 | DB (사용자 입력 경유) | **중간** |
| `src/ui-renderer.js` | 1265 | 개발자 공지 메시지 (`update-notice.json`) | 정적 JSON + `\n→<br>` | 낮음 |
| `src/ui-renderer.js` | 1270 | 업데이트 요약 목록 (`update-notice.json`) | 정적 JSON (신뢰) | 낮음 |
| `src/pip-manager.js` | 35 | PiP 창 전체 body | `pip-content.html` 템플릿 | 낮음 |
| `src/pip-manager.js` | 157, 194, 200 | PiP 보스 목록 (`name`, `time`) | DB (사용자 입력 경유) | **중간** |
| `src/logger.js` | 35 | 알람 로그 엔트리 (`<strong>` 포함) | 내부 메시지 조합 | 낮음 |
| `src/screens/alarm-log.js` | 27 | 알람 로그 컨테이너 | DB (사용자 입력 경유) | **중간** |

### 2.2 현재 정책

**보스 이름은 사용자 본인이 직접 입력하거나 프리셋에서 선택한다.** 자기 자신의 브라우저에만 영향을 미치는 "자기 XSS(Self-XSS)"이므로 현재는 별도 살균(sanitize) 없이 동적 HTML 삽입을 허용한다.

단, **공유 URL(`?v3data=`)로 수신된 데이터**는 잠재적으로 타인이 생성한 외부 입력이다. 이 데이터는 `share-encoder.js`의 `decodeV3Data()`로 파싱된 후 DB에 저장되고, 이후 동적으로 렌더링된다. 이 경로는 **실질적 XSS 위험이 존재**한다.

### 2.3 권장 마이그레이션 (TODO)

우선순위 순:

1. **공유 URL 수신 경로 (최우선)**: `decodeV3Data()` 직후 보스 이름에 DOMPurify.sanitize() 적용, 또는 해당 렌더링 사이트를 textContent 방식으로 전환
2. **사용자 직접 입력 경로 (선택)**: 보스 이름 입력 시 특수문자 필터링 또는 저장 전 살균
3. **전체 동적 HTML 삽입 → textContent 전환**: 동적 내용이 문자열 삽입만인 경우 element.textContent = value 방식으로 교체

---

## 3. LocalStorage 데이터 보안

| 항목 | 내용 |
|---|---|
| 저장 범위 | `https://bohe76.github.io` origin 한정 — 타 도메인 접근 불가 |
| 저장 데이터 | 보스 스케줄, 알람 설정, 커스텀 목록 — 개인정보 없음 |
| 암호화 | 미적용 (민감 데이터 없음) |
| 최대 용량 | 브라우저별 5~10 MB; `DB.save()`는 `QuotaExceededError` 포착 후 `false` 반환 |
| PWA/GitHub Pages | 동일 origin 정책으로 보호됨 |

---

## 4. 의존성 보안

현재 런타임 의존성 없음 (순수 바닐라 JS). 개발 의존성만 존재:

```
devDependencies:
  @eslint/js, eslint, globals, jsdom, vitest
```

### 정기 점검 절차

```bash
npm audit          # 취약점 조회
npm audit fix      # 자동 수정 (breaking change 제외)
```

- 점검 주기: 월 1회 또는 메이저 배포 전
- `npm audit` 결과에서 `high` / `critical` 수준 발생 시 즉시 수정

---

## 5. 외부 의존성 추가 시 검토 항목

### 5.1 광고 SDK 도입 시 (PRD 참조)

- 광고 SDK는 서드파티 스크립트를 로드하므로 CSP(Content Security Policy) 헤더 설정 필요
- GitHub Pages는 커스텀 HTTP 헤더를 지원하지 않음 → 커스텀 도메인 + CDN(Cloudflare 등) 경유 필요
- SDK가 LocalStorage에 쿠키/식별자를 저장할 수 있음 → 개인정보 처리방침 검토 필요

### 5.2 일반 npm 패키지 추가 시

- `npm audit` 즉시 실행
- 런타임 번들 포함 여부 확인 (현재 번들러 없음 — ESM 직접 로드)
- 라이선스 확인 (MIT/ISC 우선)

---

## 6. 인앱 브라우저 회피 (카카오톡)

`index.html` 인라인 스크립트가 카카오톡 인앱 브라우저를 감지하여 외부 브라우저로 리다이렉션한다. 이는 기능 제한 우회가 목적이나 보안 측면에서도 유효하다 — 인앱 브라우저는 일부 보안 업데이트가 지연될 수 있기 때문이다.

---

## 7. 사고 대응 절차

1. XSS 취약점 발견 시: 해당 렌더링 사이트 즉시 textContent 방식으로 전환 또는 DOMPurify 적용 후 배포
2. LocalStorage 데이터 오염(공유 URL 악용) 시: `localStorage.clear()` 수행 후 `DB.importAll()`의 FK 검증 확인
3. npm 의존성 취약점: `npm audit fix` → 테스트 통과 확인 → 즉시 배포
