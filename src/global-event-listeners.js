// src/global-event-listeners.js

import { EventBus } from './event-bus.js';
import { BossDataManager } from './data-managers.js';
import { renderDashboard, updateTimetableUI } from './ui-renderer.js';
import { renderAlarmLog } from './screens/alarm-log.js'; // Assuming renderAlarmLog will be exported

/**
 * Initializes global EventBus listeners that should always be active from application start.
 * @param {object} DOM - The DOM elements object.
 */
export function initGlobalEventListeners(DOM) {
    // Subscribe to BossDataManager changes to automatically refresh the dashboard
    BossDataManager.subscribe(() => {
        renderDashboard(DOM);
        // [New] Also refresh timetable UI if it's active
        if (DOM.timetableScreen && DOM.timetableScreen.classList.contains('active')) {
            updateTimetableUI(DOM);
        }
    });

    // Listener for updating the alarm log screen (if it's active)
    EventBus.on('log-updated', () => {
        // Only re-render if the alarm log screen is currently active
        if (DOM.alarmLogScreen && DOM.alarmLogScreen.classList.contains('active')) {
            renderAlarmLog(DOM);
        }
    });
}
