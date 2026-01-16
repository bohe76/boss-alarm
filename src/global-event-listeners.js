// src/global-event-listeners.js

import { EventBus } from './event-bus.js';
import { BossDataManager } from './data-managers.js';
import { renderDashboard } from './ui-renderer.js';
import { renderAlarmLog } from './screens/alarm-log.js'; // Assuming renderAlarmLog will be exported

/**
 * Initializes global EventBus listeners that should always be active from application start.
 * @param {object} DOM - The DOM elements object.
 */
export function initGlobalEventListeners(DOM) {
    // Subscribe to BossDataManager changes to automatically refresh the dashboard
    BossDataManager.subscribe(() => {
        // 1. 대시보드 화면이 아닐 경우 렌더링 스킵
        if (!DOM.dashboardScreen || !DOM.dashboardScreen.classList.contains('active')) return;

        // 2. 모달이 열려 있으면 렌더링 생략 (내보내기 프리뷰 등 UI 보호)
        const isAnyModalOpen = Array.from(document.querySelectorAll('.modal'))
            .some(modal => window.getComputedStyle(modal).display === 'flex');
        if (isAnyModalOpen) return;

        renderDashboard(DOM);
    }, 'ui');

    // Listener for updating the alarm log screen (if it's active)
    EventBus.on('log-updated', () => {
        // Only re-render if the alarm log screen is currently active
        if (DOM.alarmLogScreen && DOM.alarmLogScreen.classList.contains('active')) {
            renderAlarmLog(DOM);
        }
    });
}
