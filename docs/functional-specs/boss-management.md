# 보스 관리 (FRD)

## 메타
- **요구사항 ID**: FRD-BMG-001
- **버전**: v3.0.0
- **우선순위**: P0
- **상태**: 구현 완료 (v3에서 화면 제거 후 기능 통합)
- **관련 코드**: `src/screens/boss-scheduler.js`, `src/screens/custom-list.js` (대체 구현체)
- **관련 PRD**: [PRD §보스 관리](../prd/product_requirements.md#보스-관리)

---

## 1. 개요

v3.0.0에서 기존의 '보스 관리' 화면(텍스트 영역 직접 입력 방식)은 완전히 제거되었습니다. 보스 스케줄 관리 기능은 **'보스 스케줄러'** 화면과 **'개인 보스 목록(커스텀 보스 관리)' 모달**로 통합되었습니다.

- **프리셋 보스 스케줄 입력:** '보스 스케줄러' 화면의 폼 기반 입력 방식을 사용합니다. 텍스트 영역 직접 입력(`boss-parser.js`)은 v3.0.0에서 완전히 제거되었으며 `boss-parser.js` 파일도 삭제되었습니다.
- **커스텀 보스 목록 관리:** '보스 스케줄러' 화면의 '커스텀 보스 관리' 버튼을 통해 '개인 보스 목록' 모달을 열어 목록을 추가·수정·삭제합니다.

---

## 2. 사용자 시나리오

- **시나리오 1**: 사용자가 보스 스케줄을 입력하고 싶다 → '보스 스케줄러' 화면에서 폼 기반 입력 방식으로 처리한다.
- **시나리오 2**: 사용자가 커스텀 보스 목록을 관리하고 싶다 → '보스 스케줄러'의 '커스텀 보스 관리' 버튼을 통해 모달에서 처리한다.
- **시나리오 3**: v2 사용자가 텍스트 직접 입력 방식을 시도한다 → 해당 기능은 v3에서 제거되었으며 폼 기반 방식으로 안내된다.

---

## 3. 기능 요구사항 (FR)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| FR-BMG-001 | '보스 관리' 화면(텍스트 영역 직접 입력)은 v3.0.0에서 완전 제거한다 | P0 | ✅ |
| FR-BMG-002 | 보스 스케줄 입력은 '보스 스케줄러' 화면의 폼 기반 방식만 지원한다 | P0 | ✅ |
| FR-BMG-003 | 커스텀 보스 목록 관리는 '커스텀 보스 관리' 모달을 통해 제공한다 | P0 | ✅ |
| FR-BMG-004 | boss-parser.js(텍스트 파싱 로직)를 삭제하고 관련 import를 모두 제거한다 | P0 | ✅ |
| FR-BMG-005 | 스케줄 데이터는 DB(4-테이블 로컬 스토리지)에 DB.upsertSchedule()로 저장한다 | P0 | ✅ |

---

## 4. 수용 기준 (Acceptance Criteria)

- **AC-001**: Given v3.0.0 빌드 / When 앱을 열었을 때 / Then 사이드바에 별도 '보스 관리' 메뉴 항목이 존재하지 않는다.
- **AC-002**: Given 소스 코드 / When boss-parser.js 파일 존재 여부 확인 / Then 파일이 존재하지 않는다.
- **AC-003**: Given app.js / When parseBossList import 존재 여부 확인 / Then import가 존재하지 않는다.
- **AC-004**: Given '보스 스케줄러' 화면 / When 화면 진입 / Then 텍스트 모드 탭이 UI에 표시되지 않는다.

---

## 5. 의존성

- **대체 화면**: `src/screens/boss-scheduler.js` (폼 기반 입력), `src/screens/custom-list.js` (커스텀 목록 모달)
- **제거된 파일**: `src/boss-parser.js` (삭제), `boss-management-screen` HTML (제거)
- **제거된 함수**: `syncInputToText()`, `syncTextToInput()`, `initPresets` no-op, `window.isBossListDirty` 플래그

---

## 6. 비기능 요구사항

- **마이그레이션**: v2에서 v3로 업그레이드 시 기존 텍스트 기반 입력 데이터는 폼 기반 방식으로 대체된다.
- **하위 호환성**: v2의 텍스트 직접 입력 기능은 지원하지 않는다.

---

## 7. 미해결 이슈 / TODO

- [`issue-033`](../issues/issue-033-text-mode-residual.md): ✅ 해결 완료 (텍스트 모드 잔재 HTML/JS/파일 완전 제거)
- 텍스트 모드 잔여 CSS(`.tab-button`, `.scheduler-tab-content`) 정리 필요 (issue-027 연계)
- [`issue-029`](../issues/issue-029-sync-v2-fixes-to-v3.md): v2 버그 수정 사항의 v3 동기화 검토

---

## 8. 동작 명세

### 8.1. 기능 접근
- **보스 스케줄 입력:** 사용자는 좌측 사이드바 또는 모바일 '더보기' 메뉴에서 '보스 스케줄러' 메뉴 항목을 클릭합니다. 상세 동작은 [보스 스케줄러](boss-scheduler.md) 문서를 참조하십시오.
- **커스텀 보스 목록 관리:** '보스 스케줄러' 화면의 '커스텀 보스 관리' 버튼(`manageCustomListsButton`)을 클릭하여 모달을 엽니다. 상세 동작은 [보스 스케줄러 - 커스텀 보스 목록 관리](boss-scheduler.md#86-커스텀-보스-목록-관리-custom-boss-list-management) 섹션을 참조하십시오.

### 8.2. v3.0.0 변경 내역
- `boss-management-screen`(텍스트 영역 직접 입력 화면) 제거
- `boss-parser.js` 파일 삭제 (텍스트 파싱 로직 전체 제거)
- `syncInputToText()`, `syncTextToInput()` 함수 제거 (모드 전환 로직 전체 제거)
- `window.isBossListDirty` 플래그 제거
- `initPresets` no-op 빈 함수 제거
- 보스 데이터 입력은 **폼 기반 단일 방식**으로 통일
- 스케줄 데이터는 `DB`(로컬 스토리지 4-테이블)에 `DB.upsertSchedule()` 또는 `BossDataManager`를 통해 저장
