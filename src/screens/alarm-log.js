import { getLogs } from '../logger.js';
import { LocalStorageManager } from '../data-managers.js'; // Import LocalStorageManager

/**
 * Renders the full alarm log into the log container.
 */
let isEventListenerRegistered = false; // Add a flag to track if the event listener has been registered
const LOG_DISPLAY_LIMIT = 15; // Define a constant for the log display limit

export function renderAlarmLog(DOM) {
    if (DOM.logContainer) {
        const logs = getLogs();
        let logContentHtml = '';

        // Determine which logs to display based on the button's active state
        const isLimitActive = DOM.viewMoreLogsButton && DOM.viewMoreLogsButton.classList.contains('active');
        const logsToDisplay = isLimitActive ? logs.slice(-LOG_DISPLAY_LIMIT) : logs;

        if (logs.length > 0) {
            const logHtml = logsToDisplay.slice().reverse().map(logObj =>
                `<li class="log-entry ${logObj.important ? 'important' : ''}">${logObj.html}</li>`
            ).join('');
            logContentHtml += `<ul>${logHtml}</ul>`;
        } else {
            logContentHtml += '<ul><li>로그가 없습니다.</li></ul>';
        }
        DOM.logContainer.innerHTML = logContentHtml;
        DOM.logContainer.scrollTop = DOM.logContainer.scrollHeight;
    }
}
/**
 * Initializes the alarm log screen, setting up event listeners and initial render.
 * @param {object} DOM - The DOM elements object.
 */
const ALARM_LOG_TOGGLE_STATE_KEY = 'alarmLogToggleButtonState';

export function initAlarmLogScreen(DOM) {
    // Initial render when the screen is navigated to

    // Add event listener for the "15개 보기" button
    if (DOM.viewMoreLogsButton && !isEventListenerRegistered) { // Only add listener if not already registered
        isEventListenerRegistered = true; // Set the flag to true

        // Load initial state for the first time or when the screen is initialized
        let isToggleActive = LocalStorageManager.get(ALARM_LOG_TOGGLE_STATE_KEY); 
        if (isToggleActive === null) { // If no state is saved, set to default active for localStorage and button
            isToggleActive = true; 
            LocalStorageManager.set(ALARM_LOG_TOGGLE_STATE_KEY, isToggleActive); 
        }

        // Apply the loaded/default state to the button's class
        DOM.viewMoreLogsButton.classList.toggle('active', isToggleActive);

        DOM.viewMoreLogsButton.addEventListener('click', () => {
            DOM.viewMoreLogsButton.classList.toggle('active');
            const newState = DOM.viewMoreLogsButton.classList.contains('active');
            LocalStorageManager.set(ALARM_LOG_TOGGLE_STATE_KEY, newState); // Save new state
            renderAlarmLog(DOM); // Re-render logs based on new toggle state
        });
    }

    // Load initial state for the first time or when the screen is initialized
    let isToggleActive = LocalStorageManager.get(ALARM_LOG_TOGGLE_STATE_KEY); 
    if (isToggleActive === null) { isToggleActive = true; } // Default to true if no state
    DOM.viewMoreLogsButton && DOM.viewMoreLogsButton.classList.toggle('active', isToggleActive);

    renderAlarmLog(DOM); // Initial render after button state is set
}

export function getScreen() {
    return {
        id: 'alarm-log-screen',
        onTransition: initAlarmLogScreen
    };
}

