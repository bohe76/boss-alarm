---
id: issue-013
title: "FAQ 강조 표시 (**) HTML 렌더링 문제"
status: "해결됨"
priority: "Medium"
assignee: "Gemini"
labels:
  - bug
  - ui
  - markdown
  - content
created_date: "2025-12-04"
resolved_date: "2025-12-04"
---

# Issue-013: FAQ 강조 표시 (**) HTML 렌더링 문제

## 1. 개요 (Overview)
*   `data/faq_guide.json` 파일에 `**텍스트**` 형식으로 작성된 강조 표시가 웹 페이지 렌더링 시 HTML `<strong>` 태그로 변환되지 않고 문자열 그대로 (`**텍스트**`) 표시되어 가독성을 저해합니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
*   `data/faq_guide.json`에 저장된 FAQ 내용은 마크다운 스타일의 강조(`**`) 문법을 사용하고 있으나, 이를 화면에 표시하는 과정에서 마크다운 파싱이 이루어지지 않습니다.
*   이로 인해 사용자에게 전달되는 정보의 시각적 중요도가 제대로 반영되지 않으며, 원본 콘텐츠의 의도가 왜곡될 수 있습니다.

## 3. 제안된 해결 방안 (Proposed Solution)
*   `src/ui-renderer.js` 파일 내 `renderFaqScreen` 함수에서 FAQ 내용을 DOM에 삽입하기 전에, `**텍스트**` 패턴을 찾아 HTML `<strong>텍스트</strong>` 태그로 변환하는 간단한 정규식 기반의 텍스트 처리 로직을 추가합니다.
*   이는 외부 마크다운 파서 라이브러리 도입 없이 바닐라 JavaScript 환경에서 최소한의 변경으로 문제를 해결할 수 있는 효율적인 방법입니다.
