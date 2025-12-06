import { LocalStorageManager } from '../data-managers.js';
import { renderFixedAlarms, updateFixedAlarmVisuals } from '../ui-renderer.js';
import { validateFixedAlarmTime, normalizeTimeFormat } from '../utils.js';
import { log } from '../logger.js';
import { syncScheduleToWorker, getIsAlarmRunning } from '../alarm-scheduler.js';

export function initSettingsScreen(DOM) {
    // Event delegation for fixed alarm items (edit, delete, individual toggle)
    if (DOM.fixedAlarmListDiv) {
        DOM.fixedAlarmListDiv.addEventListener('click', (event) => {
            const target = event.target;
            let shouldSync = false;

            // Handle individual toggle change
            if (target.matches('.switch input[type="checkbox"]')) {
                const alarmId = target.dataset.id;
                const fixedAlarms = LocalStorageManager.getFixedAlarms();
                const alarmToUpdate = fixedAlarms.find(alarm => alarm.id === alarmId);
                if (alarmToUpdate) {
                    alarmToUpdate.enabled = target.checked;
                    LocalStorageManager.updateFixedAlarm(alarmId, alarmToUpdate);
                    updateFixedAlarmVisuals(DOM);
                    shouldSync = true;
                }
            }

            // Handle edit button click
            if (target.matches('.edit-fixed-alarm-button')) {
                const alarmId = target.dataset.id;
                const fixedAlarms = LocalStorageManager.getFixedAlarms();
                const alarmToEdit = fixedAlarms.find(alarm => alarm.id === alarmId);

                if (alarmToEdit) {
                    const newTime = prompt(`"${alarmToEdit.name}"의 새 시간을 입력하세요 (HH:MM):`, alarmToEdit.time);
                    if (newTime === null) return; // User cancelled
                    if (!validateFixedAlarmTime(newTime)) {
                        return;
                    }
                    const normalizedTime = normalizeTimeFormat(newTime);

                    const newName = prompt(`"${alarmToEdit.name}"의 새 이름을 입력하세요:`, alarmToEdit.name);
                    if (newName === null) return; // User cancelled
                    if (!newName.trim()) {
                        log("이름은 비워둘 수 없습니다.", false);
                        return;
                    }

                    LocalStorageManager.updateFixedAlarm(alarmId, { time: normalizedTime, name: newName.trim() });
                    renderFixedAlarms(DOM); // Re-render to show changes
                    log(`고정 알림 "${alarmToEdit.name}"이(가) "${newName.trim()} ${normalizedTime}"으로 수정되었습니다.`, true);
                    shouldSync = true;
                }
            }

            // Handle delete button click
            if (target.matches('.delete-fixed-alarm-button')) {
                const alarmId = target.dataset.id;
                const fixedAlarms = LocalStorageManager.getFixedAlarms();
                const alarmToDelete = fixedAlarms.find(alarm => alarm.id === alarmId);

                if (alarmToDelete && confirm(`고정 알림 "${alarmToDelete.name} ${alarmToDelete.time}"을(를) 삭제하시겠습니까?`)) {
                    LocalStorageManager.deleteFixedAlarm(alarmId);
                    renderFixedAlarms(DOM); // Re-render to show changes
                    log(`고정 알림 "${alarmToDelete.name}"이(가) 삭제되었습니다.`, true);
                    shouldSync = true;
                }
            }

            if (shouldSync && getIsAlarmRunning()) {
                syncScheduleToWorker();
            }
        });
    }
}

export function getScreen() {
    return {
        id: 'settings-screen',
        init: initSettingsScreen
    };
}
