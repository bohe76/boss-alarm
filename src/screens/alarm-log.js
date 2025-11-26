import { getLogs } from '../logger.js';

/**
 * Renders the full alarm log into the log container.
 * @param {object} DOM - The DOM elements object.
 */
export function renderAlarmLog(DOM) {
    if (DOM.logContainer) { // Use DOM.logContainer
        const logs = getLogs();
        if (logs.length > 0) {
            // Join logs with a <br> for better readability if they are already HTML formatted
            DOM.logContainer.innerHTML = logs.map(logEntry => `<li>${logEntry}</li>`).join('');
        } else {
            DOM.logContainer.innerHTML = '<li>로그가 없습니다.</li>';
        }
        DOM.logContainer.scrollTop = DOM.logContainer.scrollHeight; // Scroll to bottom
    }
}

/**
 * Initializes the alarm log screen, setting up event listeners and initial render.
 * @param {object} DOM - The DOM elements object.
 */
export function initAlarmLogScreen(DOM) {
    // Initial render when the screen is navigated to
    renderAlarmLog(DOM);

}
