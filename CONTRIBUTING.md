# 기여 가이드

보스 알리미(Boss Alarm) 프로젝트에 기여해 주셔서 감사합니다. 이 문서는 개발 환경 셋업부터 PR 제출까지 기여 절차를 안내합니다.

보스 알리미는 오딘, 리니지 등 MMORPG 유저를 위한 자동 보스 알림 및 보탐 매니저 웹 앱입니다.

---

## 개발 환경 셋업

```bash
# 1. 저장소 클론
git clone https://github.com/bohe76/boss-alarm.git
cd boss-alarm

# 2. 의존성 설치
npm install

# 3. 테스트 실행으로 환경 확인
npm test
```

로컬에서 앱을 실행하려면 `index.html`을 Live Server 등 로컬 HTTP 서버로 여세요. (파일 프로토콜 직접 실행 시 ES Module 로딩 제한이 있습니다.)

---

## 디렉토리 구조

```
boss-alarm/
├── index.html          # 앱 진입점
├── src/                # 소스 코드 (ES Module)
│   ├── core/           # 핵심 비즈니스 로직 (DB 엔진, 스케줄러)
│   ├── components/     # UI 컴포넌트
│   ├── workers/        # Web Worker (백그라운드 알림)
│   └── utils/          # 공통 유틸리티
├── data/               # 정적 데이터 (보스 프리셋, 버전 이력)
├── docs/               # 프로젝트 문서 (docs/README.md 참조)
├── tests/              # Vitest 테스트 코드
└── package.json
```

전체 아키텍처는 `docs/architecture/system_architecture.md`를 참조하세요.

---

## 브랜치 전략

- `main` 브랜치는 보호되어 있으며 직접 푸시는 금지됩니다.
- 기능 개발은 `feature/<기능명>` 브랜치를 생성하거나 Git 워크트리를 활용합니다.

```bash
# 예시: 새 기능 브랜치 생성
git checkout -b feature/zen-calculator-improvement

# 워크트리 사용 예시
git worktree add ../boss-alarm-feature feature/my-feature
```

---

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따르되, 제목과 본문은 **한국어**로 작성합니다.

```
<타입>(<스코프>): <제목 (한국어)>

<본문 (한국어, 선택)>

Co-Authored-By: Claude <noreply@anthropic.com>
```

**타입 목록**

| 타입 | 사용 시점 |
|------|-----------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `chore` | 빌드, 설정, 의존성 변경 |
| `docs` | 문서 수정 |
| `style` | UI/CSS 변경 (로직 없음) |
| `perf` | 성능 개선 |
| `test` | 테스트 추가/수정 |

**커밋 예시**

```
feat(scheduler): 48시간 보스 자동 스케줄 갱신 기능 추가

자정이 지나면 오늘+내일 스케줄을 자동 재구축하여 누락 없이 표시됩니다.

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## PR 워크플로우

```bash
# 1. 원격 브랜치에 푸시
git push -u origin feature/my-feature

# 2. PR 생성 (gh CLI 사용)
gh pr create --title "feat(scope): 기능 설명" --body "$(cat <<'EOF'
## 변경 내용
- 변경 사항 요약

## 테스트
- [ ] npm test 통과 확인
- [ ] 주요 시나리오 수동 검증

## 관련 이슈
Closes #NNN
EOF
)"
```

머지는 `--merge` (merge commit) 방식을 사용합니다. Squash 및 Rebase는 별도 협의 없이 사용하지 않습니다.

---

## 테스트

```bash
# 전체 테스트 실행
npm test

# 감시 모드
npx vitest
```

테스트 파일은 `tests/` 디렉토리에 위치합니다. 기능 추가 시 관련 테스트를 함께 작성해 주세요. 현재 베이스라인은 132개 테스트입니다.

---

## 코드 스타일

```bash
# 린트 검사
npm run lint
```

ESLint 설정은 프로젝트 루트 `eslint.config.js`를 따릅니다. PR 제출 전 린트 오류가 없는지 확인해 주세요.

---

## 이슈 보고

버그나 개선 제안은 다음 두 가지 방법으로 보고합니다.

1. **GitHub Issues**: [github.com/bohe76/boss-alarm/issues](https://github.com/bohe76/boss-alarm/issues)
2. **문서 기반 이슈**: `docs/issues/issue-NNN-<이슈명>.md` 파일을 생성하여 PR로 제출

이슈 문서 파일명 예시: `docs/issues/issue-037-pip-resize-bug.md`

이슈 보고 시 다음 내용을 포함해 주세요.
- 재현 단계
- 기대 동작
- 실제 동작
- 브라우저 및 OS 환경

---

## 행동 강령

모든 기여자는 서로 존중하며 건설적인 피드백을 주고받는 분위기를 유지해 주세요.

---

자세한 개발 워크플로우는 [`docs/guides/development_workflow_guide.md`](docs/guides/development_workflow_guide.md)를 참조하세요.
