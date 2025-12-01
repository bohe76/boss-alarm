import { getLogs } from '../logger.js';

/**
 * Renders the full alarm log into the log container.
 * @param {object} DOM - The DOM elements object.
 */
export function renderAlarmLog(DOM) {
    if (DOM.logContainer) { // Use DOM.logContainer
        const logs = getLogs();
        let logContentHtml = '';

        // Add the card header with the title "이벤트 로그"
        logContentHtml += `
            <div class="card-header">
                <h3>이벤트 로그</h3>
            </div>
        `;

        if (logs.length > 0) {
            const logHtml = logs.slice().reverse().map(logObj =>
                `<li class="log-entry ${logObj.important ? 'important' : ''}">${logObj.html}</li>`
            ).join('');
            logContentHtml += `<ul>${logHtml}</ul>`;
        } else {
            logContentHtml += '<ul><li>로그가 없습니다.</li></ul>';
        }

        DOM.logContainer.innerHTML = logContentHtml;
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
