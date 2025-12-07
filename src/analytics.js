/* global gtag */
// src/analytics.js

/**
 * Google Analytics 이벤트 추적을 위한 헬퍼 함수.
 * gtag가 로드되었는지 확인하고 이벤트를 전송합니다.
 *
 * @param {string} eventName 이벤트 이름 (예: 'Click Button', 'Toggle Switch')
 * @param {object} eventParams 이벤트 파라미터 객체
 * @param {string} eventParams.event_category 이벤트 카테고리 (예: 'Navigation', 'Interaction', 'Feature Usage')
 * @param {string} eventParams.event_label 이벤트 라벨 (클릭된 요소의 텍스트, 기능 이름 등)
 * @param {number} [eventParams.value] 이벤트 값 (선택 사항)
 */
export function trackEvent(eventName, eventParams) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, eventParams);
        // console.log(`GA Event Sent: ${eventName}`, eventParams); // 디버깅용
    } else {
        // console.warn('gtag is not defined. Google Analytics might not be loaded.', eventName, eventParams);
    }
}

/**
 * 가상 페이지 뷰를 Google Analytics에 전송하는 헬퍼 함수.
 * SPA에서 화면 전환 시 호출됩니다.
 *
 * @param {string} screenId 현재 화면의 ID (예: 'dashboard-screen')
 * @param {string} [pageTitle] 페이지 제목 (기본값: screenId)
 */
export function trackPageView(screenId, pageTitle = screenId) {
    if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
            page_title: pageTitle,
            page_path: `/${screenId}`,
        });
        // console.log(`GA Virtual Page View Sent: ${pageTitle} (${screenId})`); // 디버깅용
    } else {
        // console.warn('gtag is not defined. Google Analytics might not be loaded.', screenId, pageTitle);
    }
}
