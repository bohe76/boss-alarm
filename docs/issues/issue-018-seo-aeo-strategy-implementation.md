---
id: issue-018
title: "SEO 및 AEO 최적화 전략 구현"
status: "미해결"
priority: "Medium"
assignee: ""
labels:
  - seo
  - aeo
  - marketing
created_date: "2025-12-28"
resolved_date: ""
---

# Issue-018: SEO 및 AEO 최적화 전략 구현

## 1. 개요 (Overview)
* 기존 `docs/seo_aeo_strategy.md`에 정의된 전략을 바탕으로 서비스의 검색 엔진 가시성 및 AI 엔진(AEO) 대응력을 강화합니다.

## 2. 요구사항 (Requirements)
* **키워드 전진 배치**: '보탐 매니저', '보스 알리미/알림', '보스 타이머' 순의 우선순위 준수.
* **메타 데이터 반영**: 
    - 타이틀: `보탐 매니저 : 보스 알리미(보스 알림) & 보스 타이머`
    - 디스크립션: `가장 스마트한 보탐 매니저! 보스 알리미(보스 알림) 및 보스 타이머 기능을 통해 보스 젠 시간을 완벽하게 관리하세요. PIP 모드와 커스텀 목록 등 MMORPG 보탐에 최적화된 전문 기능을 제공합니다.`
    - 키워드 리스트 반영.
* **구조화 데이터 적용**: JSON-LD 기반의 `FAQPage` 스키마 적용.
* **시멘틱 HTML 강화**: `index.html` 레이아웃을 의미론적 태그(`<section>`, `<nav>`, `<header>` 등)로 개편.
* **릴리즈 노트 시멘틱 문서화**: AI 엔진 학습을 위한 계층적 문서 구조 적용.

## 3. 제안된 해결 방안 (Proposed Solution)
* 별도 브랜치(`feature/seo-aeo-refinement`)에서 작업을 진행하여 `index.html` 및 관련 렌더링 로직 수정.
* `SEO 및 AEO 최적화 전략 가이드` 문서의 지침을 상세 구현 단계로 분할하여 실행.
