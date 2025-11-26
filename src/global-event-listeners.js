// src/global-event-listeners.js

import { EventBus } from './event-bus.js';
import { renderDashboard } from './ui-renderer.js';
import { renderAlarmLog } from './screens/alarm-log.js'; // Assuming renderAlarmLog will be exported

/**
 * Initializes global EventBus listeners that should always be active from application start.
 * @param {object} DOM - The DOM elements object.
 */
export function initGlobalEventListeners(DOM) {
    // Listener for refreshing the dashboard display
    EventBus.on('refresh-dashboard', () => {
        renderDashboard(DOM);
    });

    // Listener for updating the alarm log screen (if it's active)
    EventBus.on('log-updated', () => {
        // Only re-render if the alarm log screen is currently active
        if (DOM.alarmLogScreen && DOM.alarmLogScreen.classList.contains('active')) {
            renderAlarmLog(DOM);
        }
    });
}
