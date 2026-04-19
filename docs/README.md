# docs/ 문서 네비게이션

보스 알리미 프로젝트의 모든 문서를 카테고리별로 정리합니다.

---

## 이 문서를 언제 보나

| 상황 | 추천 문서 |
|------|-----------|
| 제품의 비전·타깃·KPI를 알고 싶을 때 | `prd/product_requirements.md` |
| 단·중·장기 로드맵을 확인할 때 | `roadmap.md` |
| 프로젝트 전체 구조를 파악하고 싶을 때 | `architecture/system_architecture.md` |
| DB 스키마(4-테이블)를 볼 때 | `architecture/db_schema.md` |
| 핵심 흐름(시퀀스)을 시각화로 볼 때 | `architecture/sequence_diagrams.md` |
| 비기능 요구사항(성능·보안·접근성)을 볼 때 | `architecture/nfr.md` |
| 개발 환경을 처음 셋업할 때 | `guides/development_workflow_guide.md` |
| 테스트 작성 가이드가 필요할 때 | `guides/testing_strategy.md` |
| XSS/innerHTML 정책을 확인할 때 | `guides/security_policy.md` |
| 배포·롤백 절차를 확인할 때 | `guides/deployment.md` |
| 도메인 용어가 헷갈릴 때 | `glossary.md` |
| 보스 데이터(JSON) 스키마를 볼 때 | `specs/boss_data_spec.md` |
| 특정 기능의 동작 방식을 알고 싶을 때 | `functional-specs/index.md` |
| 현재 이슈를 추적할 때 | `issues/` |
| 세션 간 컨텍스트를 인수인계받을 때 | `session-log/` |
| v3.0 설계 결정 배경을 알고 싶을 때 | `session-log/feature-v3.0-00001-2026-04-20.md` |
| 변경 이력 (사용자용)을 볼 때 | `../CHANGELOG.md` |
| 기여 방법을 알고 싶을 때 | `../CONTRIBUTING.md` |

---

## 🏠 프로젝트 루트 문서

| 문서 | 설명 |
|------|------|
| `../README.md` | 프로젝트 개요 (외부 노출 entry) |
| `../LICENSE` | ISC 라이선스 |
| `../CHANGELOG.md` | Keep a Changelog 표준 변경 이력 (사용자용) |
| `../CONTRIBUTING.md` | 기여 가이드 (셋업·브랜치·커밋·PR·테스트) |
| `../CLAUDE.md` / `../GEMINI.md` | AI 에이전트 작업 지침 |

---

## 🎯 Product

| 문서 | 설명 |
|------|------|
| `prd/product_requirements.md` | 비전 / 타깃 페르소나 / KPI / 수익 모델 / 범위 / 마일스톤 |
| `roadmap.md` | 현재(v3 안정화) / 단기 / 중기(길드·디스코드·텔레그램) / 장기(AI OCR) |

---

## 🏗️ Architecture

| 문서 | 설명 |
|------|------|
| `architecture/system_architecture.md` | 전체 시스템 아키텍처 및 레이어 구조 |
| `architecture/system_data_flow.md` | 데이터 흐름 다이어그램 |
| `architecture/system_module_dependencies.md` | 모듈 간 의존 관계 |
| `architecture/system_module_details.md` | 각 모듈 상세 명세 |
| `architecture/critical_code_policy.md` | 핵심 코드 변경 정책 및 가이드라인 |
| `architecture/db_schema.md` | LocalStorage 4-테이블 스키마 + Mermaid ERD |
| `architecture/nfr.md` | 비기능 요구사항 (성능·가용성·호환성·접근성·보안·국제화) |
| `architecture/sequence_diagrams.md` | 핵심 흐름 시퀀스 다이어그램 (초기 로드/알람/공유/PiP 등) |

---

## 📖 Guides

| 문서 | 설명 |
|------|------|
| `guides/development_workflow_guide.md` | 개발 환경 셋업 및 워크플로우 가이드 |
| `guides/testing_strategy.md` | 단위/통합/UI/E2E 분리 기준, 132 tests baseline, 명명 규칙 |
| `guides/security_policy.md` | innerHTML 사용처 위협 모델, DOMPurify 마이그레이션 권장 |
| `guides/deployment.md` | GitHub Pages 자동 배포 흐름, 사전/사후 검증, 롤백 절차 |
| `guides/design_system_guide.md` | 디자인 시스템 색상, 타이포그래피, 컴포넌트 |
| `guides/theme_guide.md` | 테마 적용 가이드 |
| `guides/design_migration_guide.md` | 디자인 마이그레이션 절차 |
| `guides/analytics_naming_convention.md` | 애널리틱스 이벤트 네이밍 컨벤션 |

---

## 📋 Functional Specs (FRD 격상 진행 중)

> 메뉴별 명세를 정식 FRD로 격상 작업 중. 메타/시나리오/요구사항 ID/AC/의존성/NFR/TODO 섹션 추가.

| 문서 | 설명 |
|------|------|
| `functional-specs/index.md` | 기능 명세 인덱스 및 전체 기능 개요 |
| `functional-specs/dashboard.md` | 대시보드 FRD |
| `functional-specs/timetable.md` | 보스 시간표 FRD |
| `functional-specs/boss-management.md` | 보스 관리 FRD (v3에서 boss-scheduler로 통합) |
| `functional-specs/boss-scheduler.md` | 보스 스케줄러 FRD |
| `functional-specs/calculator.md` | 젠/광 계산기 FRD |
| `functional-specs/settings.md` | 알림 설정 FRD |
| `functional-specs/share.md` | 공유 URL FRD (v3data) |
| `functional-specs/alarm-log.md` | 알림 로그 FRD |
| `functional-specs/help-faq.md` | 도움말 + FAQ FRD |
| `functional-specs/application-common-features.md` | 앱 공통 기능 FRD |
| `functional-specs/version-info.md` | 버전 정보 FRD |

---

## 📝 Specs

| 문서 | 설명 |
|------|------|
| `specs/boss_data_spec.md` | `boss-presets.json` 스키마 + 게임/보스 데이터 검증 규칙 |
| `specs/real-time-schedule-sharing-spec.md` | 실시간 시간표 공유 기능 상세 스펙 |
| `specs/screen_composition_plan.md` | 화면 구성 계획 |

---

## 🐛 Issues

### 진행 중 이슈

| 문서 | 설명 |
|------|------|
| `issues/issue-011-logging-refactoring.md` | 로깅 리팩토링 이슈 |
| `issues/issue-013-crazy-calculator-reset.md` | 광 계산기 리셋 이슈 |
| `issues/issue-017-establish-comprehensive-scenario-testing.md` | 종합 시나리오 테스트 구축 이슈 |
| `issues/issue-021-refactor-local-storage-management.md` | 로컬 스토리지 관리 리팩토링 이슈 |
| `issues/issue-027-css-refactoring-and-inline-style-removal.md` | CSS 리팩토링 및 인라인 스타일 제거 이슈 |
| `issues/issue-028-fragile-code-refactoring.md` | 취약 코드 리팩토링 이슈 |
| `issues/issue-029-sync-v2-fixes-to-v3.md` | v2 수정 사항 v3 동기화 이슈 |
| `issues/issue-031-zen-calculator-duplicate-boss-bug.md` | 젠 계산기 중복 보스 버그 이슈 |
| `issues/issue-032-preset-sync-to-db-not-invoked.md` | 프리셋 DB 동기화 미호출 이슈 |
| `issues/issue-033-text-mode-residual.md` | 텍스트 모드 잔재 이슈 |
| `issues/issue-034-version-bump-to-v3.md` | v3 버전 업 이슈 |
| `issues/issue-035-replace-initial-alert.md` | 초기 alert 대체 이슈 |
| `issues/issue-036-share-url-v3data-reimplementation.md` | 공유 URL v3data 재구현 이슈 |

### 해결된 이슈 (`issues/resolved/`)

| 문서 | 설명 |
|------|------|
| `issues/resolved/issue-001-responsive-redesign.md` | 반응형 리디자인 |
| `issues/resolved/issue-002-git-commit-encoding.md` | Git 커밋 인코딩 |
| `issues/resolved/issue-003-mobile-voice-notification.md` | 모바일 음성 알림 |
| `issues/resolved/issue-004-ios-share-button-svg-replacement.md` | iOS 공유 버튼 SVG 교체 |
| `issues/resolved/issue-005-initial-loading.md` | 초기 로딩 |
| `issues/resolved/issue-006-boss-scheduler-bug.md` | 보스 스케줄러 버그 |
| `issues/resolved/issue-007-next-boss-logic-bug.md` | 다음 보스 로직 버그 |
| `issues/resolved/issue-008-boss-scheduler-testing-problems.md` | 보스 스케줄러 테스트 문제 |
| `issues/resolved/issue-009-test-code-instability.md` | 테스트 코드 불안정 |
| `issues/resolved/issue-010-fixed-alarm-problem.md` | 고정 알림 문제 |
| `issues/resolved/issue-012-code-redundancy-and-modularity-refactoring.md` | 코드 중복/모듈화 리팩토링 |
| `issues/resolved/issue-013-faq-bold-parsing.md` | FAQ 볼드 파싱 |
| `issues/resolved/issue-014-pip-widget.md` | PiP 위젯 |
| `issues/resolved/issue-014-timezone-inconsistency.md` | 타임존 불일치 |
| `issues/resolved/issue-015-boss-management-view-edit-modes.md` | 보스 관리 보기/편집 모드 |
| `issues/resolved/issue-016-card-ui-problem.md` | 카드 UI 문제 |
| `issues/resolved/issue-018-seo-aeo-strategy-implementation.md` | SEO/AEO 전략 구현 |
| `issues/resolved/issue-019-scheduler-input-mode-not-working.md` | 스케줄러 입력 모드 미작동 |
| `issues/resolved/issue-020-create-workflow-files.md` | 워크플로우 파일 생성 |
| `issues/resolved/issue-022-fix-image-export-stability.md` | 이미지 내보내기 안정성 |
| `issues/resolved/issue-023-refine-navigation-and-sidebar-ux.md` | 내비게이션 및 사이드바 UX 개선 |
| `issues/resolved/issue-024-enhance-skeleton-ui.md` | 스켈레톤 UI 개선 |
| `issues/resolved/issue-025-intelligent-ssot-auto-update.md` | 지능형 SSOT 자동 업데이트 |
| `issues/resolved/issue-026-version-update-modal.md` | 버전 업데이트 모달 |
| `issues/resolved/issue-030-github-pages-deploy-timeout.md` | GitHub Pages 배포 타임아웃 |
| `issues/resolved/refactoring_checklist_issue_012.md` | 이슈 012 리팩토링 체크리스트 |
| `issues/resolved/pre-v3-handoff.md` | v3 이전 인수인계 문서 |

---

## 📓 Session Log

| 문서 | 설명 |
|------|------|
| `session-log/feature-v3.0-00001-2026-04-20.md` | v3.0 기능 개발 세션 로그 |
| `session-log/main-00001-2026-04-20.md` | 메인 브랜치 세션 로그 |
| `session-log/main.draft.md` | 세션 로그 초안 |

### 아카이브 (`session-log/archive/`)

| 문서 | 설명 |
|------|------|
| `session-log/archive/pre-v3-handoff.md` | v3 이전 세션 인수인계 아카이브 |

---

## 📚 Notes

| 문서 | 설명 |
|------|------|
| `notes/ideas_and_notes.md` | 아이디어 및 메모 모음 |

---

## 🗄️ Archive

아카이브된 과거 계획, 체크리스트, 보고서 문서들입니다.

| 문서 | 설명 |
|------|------|
| `archive/001-ui_gui_improvements_log.md` | UI/GUI 개선 로그 1차 |
| `archive/002-ui_gui_improvements_log.md` | UI/GUI 개선 로그 2차 |
| `archive/architectural_refactoring_checklist.md` | 아키텍처 리팩토링 체크리스트 |
| `archive/architectural_refactoring_plan.md` | 아키텍처 리팩토링 계획 |
| `archive/architectural-refactoring-checklist-boss-data-management.md` | 보스 데이터 관리 리팩토링 체크리스트 |
| `archive/architecture_gaps_report.md` | 아키텍처 갭 분석 보고서 |
| `archive/boss-data-management-reorganization.md` | 보스 데이터 관리 재구성 |
| `archive/checklist-mobile-navigation.md` | 모바일 내비게이션 체크리스트 |
| `archive/design_system_guide.md` | 디자인 시스템 가이드 (아카이브) |
| `archive/documentation_shortcomings_report.md` | 문서화 부족 사항 보고서 |
| `archive/feature_boss_scheduler.md` | 보스 스케줄러 기능 계획 |
| `archive/feature_boss_scheduler_checklist.md` | 보스 스케줄러 체크리스트 |
| `archive/feature_boss_timer_calculator.md` | 보스 타이머 계산기 기능 계획 |
| `archive/feature_boss_timer_calculator_checklist.md` | 보스 타이머 계산기 체크리스트 |
| `archive/feature_custom_boss_list_upload.md` | 커스텀 보스 목록 업로드 기능 |
| `archive/feature-mobile-bottom-navigation.md` | 모바일 하단 내비게이션 기능 |
| `archive/fixed_alarm_checklist.md` | 고정 알림 체크리스트 |
| `archive/proposed_features.md` | 제안된 기능 목록 |
| `archive/push_notification_checklist.md` | 푸시 알림 체크리스트 |
| `archive/push_notification_spec.md` | 푸시 알림 스펙 |
| `archive/refactoring_checklist.md` | 리팩토링 체크리스트 |
| `archive/refactoring_checklist_v4.md` | 리팩토링 체크리스트 v4 |
| `archive/refactoring_plan_v2.md` | 리팩토링 계획 v2 |
| `archive/refactoring_report.md` | 리팩토링 보고서 |
| `archive/screen_composition_checklist.md` | 화면 구성 체크리스트 |
| `archive/screen_composition_renewal.md` | 화면 구성 갱신 계획 |
| `archive/web_worker_checklist.md` | 웹 워커 체크리스트 |
| `archive/web_worker_plan.md` | 웹 워커 계획 |

---

## 📂 Glossary

| 문서 | 설명 |
|------|------|
| `glossary.md` | 게임/알람/데이터/공유/개발 5개 도메인 25+ 용어 정의 + cross-link |

---

> 신규 PRD/FRD/아키텍처/가이드 문서는 v3.0.0 안정화 직후(2026-04-20) 일괄 정비됨.
