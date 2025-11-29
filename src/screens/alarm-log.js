import { getLogs } from '../logger.js';

/**
 * Renders the full alarm log into the log container.
 * @param {object} DOM - The DOM elements object.
 */
export function renderAlarmLog(DOM) {
    if (DOM.logContainer) { // Use DOM.logContainer
        const logs = getLogs();
        if (logs.length > 0) {
            const logHtml = logs.map(logObj => 
                `<li class="log-entry ${logObj.important ? 'important' : ''}">${logObj.html}</li>`
            ).join('');
            DOM.logContainer.innerHTML = `<ul>${logHtml}</ul>`;
        } else {
            DOM.logContainer.innerHTML = '<ul><li>로그가 없습니다.</li></ul>';
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

export function getScreen() {
    return {
        id: 'alarm-log-screen',
        onTransition: initAlarmLogScreen
    };
}
