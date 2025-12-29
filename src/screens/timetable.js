// src/screens/timetable.js
import { updateTimetableUI } from '../ui-renderer.js';
import { LocalStorageManager } from '../data-managers.js';
import { getIsAlarmRunning } from '../alarm-scheduler.js';
import { trackEvent } from '../analytics.js';

let autoRefreshInterval = null;

function startAutoRefresh(DOM) {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);

    autoRefreshInterval = setInterval(() => {
        // Stop timer if screen is not active
        if (!DOM.timetableScreen.classList.contains('active')) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            return;
        }

        const filterNextBoss = LocalStorageManager.get('timetableNextBossFilter');
        const isAlarmRunning = getIsAlarmRunning();

        // Only refresh if Next Boss Filter is ON AND Alarm is Running
        if (filterNextBoss && isAlarmRunning) {
            updateTimetableUI(DOM);
        }
    }, 1000);
}

export function initTimetableScreen(DOM) {
    // Migration: Remove obsolete keys and migrate filter state
    localStorage.removeItem('bossManagementMode');

    let filterNextBoss = LocalStorageManager.get('timetableNextBossFilter');
    if (filterNextBoss === null) {
        const oldFilter = LocalStorageManager.get('bossManagementNextBossFilter');
        filterNextBoss = oldFilter !== null ? oldFilter : true; // Default to true
        LocalStorageManager.set('timetableNextBossFilter', filterNextBoss);
        localStorage.removeItem('bossManagementNextBossFilter');
    }

    updateTimetableUI(DOM);

    // Toggle Button Event Listener
    if (DOM.timetableNextBossFilterToggle) {
        // Set initial state
        DOM.timetableNextBossFilterToggle.classList.toggle('active', !!filterNextBoss);

        DOM.timetableNextBossFilterToggle.addEventListener('click', () => {
            const isActive = DOM.timetableNextBossFilterToggle.classList.toggle('active');
            LocalStorageManager.set('timetableNextBossFilter', isActive);
            updateTimetableUI(DOM);
            trackEvent('Click Button', { event_category: 'Interaction', event_label: `보스 시간표 필터: ${isActive ? 'ON' : 'OFF'}` });
        });
    }

    // 보기 모드 전환 버튼 이벤트 리스너 (카드/표)
    if (DOM.timetableDisplayModeToggle) {
        let displayMode = LocalStorageManager.get('timetableDisplayMode') || '표';

        // 초기 상태 설정: 버튼 텍스트는 현재 모드의 '반대' (전환할 대상)를 표시
        DOM.timetableDisplayModeToggle.textContent = displayMode === '표' ? '카드' : '표';
        // .active 클래스 토글 로직 제거 (색상 고정)

        DOM.timetableDisplayModeToggle.addEventListener('click', () => {
            // 현재 텍스트가 '표'라면 -> 목표는 '표' 모드, 아니면 '카드' 모드
            const newMode = DOM.timetableDisplayModeToggle.textContent;

            // 상태 업데이트 및 UI 갱신
            LocalStorageManager.set('timetableDisplayMode', newMode);
            updateTimetableUI(DOM);

            // 버튼 텍스트를 방금 바꾼 모드의 '반대'로 변경 (다음 전환 대상)
            DOM.timetableDisplayModeToggle.textContent = newMode === '표' ? '카드' : '표';

            trackEvent('Click Button', { event_category: 'Interaction', event_label: `보스 시간표 보기 모드 변경: ${newMode}` });
        });
    }
}

export function getScreen() {
    return {
        id: 'timetable-screen',
        init: initTimetableScreen,
        onTransition: (DOM) => {
            const filterNextBoss = LocalStorageManager.get('timetableNextBossFilter');
            updateTimetableUI(DOM);
            startAutoRefresh(DOM);
            trackEvent('Screen View', { event_category: 'Navigation', event_label: `보스 시간표 진입 (필터: ${filterNextBoss ? 'ON' : 'OFF'})` });
        }
    };
}
