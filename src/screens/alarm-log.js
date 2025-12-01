import { getLogs } from '../logger.js';

/**
 * Renders the full alarm log into the log container.
 * @param {object} DOM - The DOM elements object.
 */
export function renderAlarmLog(DOM) {
    if (DOM.logContainer) { // Log entries are rendered directly into DOM.logContainer
        const logs = getLogs();
        let logContentHtml = '';

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

    // Add event listener for the "15개 보기" button
    if (DOM.viewMoreLogsButton) {
        DOM.viewMoreLogsButton.addEventListener('click', () => {
            // TODO: Implement logic to load/display more logs
            console.log("15개 보기 버튼 클릭됨!");
        });
    }
}

export function getScreen() {
    return {
        id: 'alarm-log-screen',
        onTransition: initAlarmLogScreen
    };
}

