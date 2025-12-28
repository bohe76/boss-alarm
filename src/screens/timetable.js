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
