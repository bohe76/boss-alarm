---
id: issue-018
title: "SEO 및 AEO 최적화 전략 구현"
status: "해결됨"
priority: "Medium"
assignee: "Antigravity"
labels:
  - seo
  - aeo
  - marketing
created_date: "2025-12-28"
resolved_date: "2025-12-30"
---

# Issue-018: SEO 및 AEO 최적화 전략 구현

## 1. 개요 (Overview)
* 기존 `docs/seo_aeo_strategy.md`에 정의된 전략을 바탕으로 서비스의 검색 엔진 가시성 및 AI 엔진(AEO) 대응력을 강화했습니다.

## 2. 요구사항 및 해결 내용 (Requirements & Solution)
* **키워드 전진 배치**: '보스 알리미'(메인), '보탐 매니저', '보스 알림', '보스 타이머' 순의 우선순위를 타이틀 및 메타태그에 반영했습니다.
* **메타 데이터 반영**: 
    - 타이틀: `보스 알리미 : 보탐 매니저, 보스 알림 & 보스 타이머`
    - 디스크립션: `가장 스마트한 보스 알리미! 보탐 매니저, 보스 알림 및 보스 타이머 기능을 통해 보스 젠 시간을 완벽하게 관리하세요. PIP 모드와 커스텀 목록 등 MMORPG 보탐에 최적화된 전문 기능을 제공합니다.`
* **구조화 데이터 적용**: JSON-LD 기반의 `FAQPage` 스키마를 `index.html`에 적용하여 검색 결과 풍부함을 개선했습니다.
* **시멘틱 HTML 강화**: 
    - 도움말, FAQ, 릴리즈 노트 렌더링 시 `<article>`, `<time>`, `<h3>` 등 의미론적 태그를 사용하여 AI 엔진의 정보 추출 효율을 높였습니다.
    - `index.html` 하단에 AI 스캔용 비노출 사이트 요약 섹션(`aeo-site-summary`)을 추가했습니다.
* **릴리즈 노트 시멘틱 문서화**: 버전 정보를 아코디언 형태의 계층 구조로 제공하며, 날짜 정보를 표준 자바스크립트 `time` 태그로 마크업했습니다.

## 3. 최종 결과 (Final Result)
* `index.html` 및 `src/ui-renderer.js` 수정을 통해 SEO/AEO 대응 완료.
* Lighthouse SEO 점수 개선 및 AI 답변 최적화 기초 마련.
