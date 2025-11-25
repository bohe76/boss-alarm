import { getLogs } from '../logger.js';

export function initAlarmLogScreen(DOM) {
    if (DOM.alarmLogScreen && DOM.alarmLogList) {
        const logs = getLogs();
        if (logs.length > 0) {
            DOM.alarmLogList.innerHTML = logs.map(logEntry => `<li>${logEntry}</li>`).join('');
        } else {
            DOM.alarmLogList.innerHTML = '<li>로그가 없습니다.</li>';
        }
    }
}
