# docs/

보스 알람 프로젝트의 문서 폴더.

## 어디서부터 읽나 (역할별)

| 누구 | 첫 진입 | 다음 |
|---|---|---|
| **처음 보는 사람** | `prd/product_requirements.md` | `roadmap.md` → `architecture/system_architecture.md` |
| **신규 기여자** | `../CONTRIBUTING.md` | `guides/development_workflow_guide.md` → `guides/testing_strategy.md` |
| **PM/기획자** | `prd/product_requirements.md` | `functional-specs/index.md` → `roadmap.md` |
| **개발자 (구현)** | `architecture/system_architecture.md` | `architecture/sequence_diagrams.md` → 해당 `functional-specs/{화면}.md` |
| **DB/데이터 작업자** | `architecture/db_schema.md` | `specs/boss_data_spec.md` |
| **디자이너** | `guides/design_system_guide.md` | `guides/theme_guide.md` |
| **운영/배포 담당** | `guides/deployment.md` | `architecture/nfr.md` |
| **보안 검토자** | `guides/security_policy.md` | `architecture/nfr.md` |
| **기존 작업 인수자** | `session-log/` 최신 | 해당 PR/이슈 |

## 빠르게 찾을 때

- 전체 문서 인덱스 + 코드↔문서 매핑 → **[knowledge_map.md](knowledge_map.md)**
- 도메인 용어가 헷갈릴 때 → [glossary.md](glossary.md)
- 변경하려는 코드가 어느 문서에 영향 주는지 → [knowledge_map.md §4 변경 영향도](knowledge_map.md#4-변경-영향도--x-바꿨다-무엇을-봐야-하나)

## 운영

- 코드/문서 변경 → wiki-config.yaml의 의존성에 따라 [`bohe-doc-sync`](../) 스킬이 연쇄 검사
- 세션 종료 시 → [`bohe-wiki-sync`](../)가 자동 발동 (`.omc/wiki/`로 인제스트)
- 기계 판독용 매핑 원본: `../.claude/wiki-config.yaml`
