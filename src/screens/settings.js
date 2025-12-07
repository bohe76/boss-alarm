import { LocalStorageManager } from '../data-managers.js';
import { renderFixedAlarms, updateFixedAlarmVisuals } from '../ui-renderer.js';
import { validateFixedAlarmTime, normalizeTimeFormat } from '../utils.js';
import { log } from '../logger.js';
import { syncScheduleToWorker, getIsAlarmRunning } from '../alarm-scheduler.js';
import { trackEvent } from '../analytics.js';

// --- Modal Helper Functions ---

/**
 * Opens the modal for adding or editing a fixed alarm.
 * @param {object} DOM - The DOM elements.
 * @param {string|null} alarmId - The ID of the alarm to edit, or null to add a new one.
 */
function openFixedAlarmModal(DOM, alarmId = null) {
    if (!DOM.fixedAlarmModal) return;

    // Reset day buttons
    const dayButtons = DOM.fixedAlarmModalDays.querySelectorAll('.day-button');

    if (alarmId) {
        // --- EDIT MODE ---
        DOM.fixedAlarmModalTitle.textContent = '고정 알림 편집';
        const alarm = LocalStorageManager.getFixedAlarmById(alarmId);
        if (!alarm) {
            console.error(`Alarm with ID ${alarmId} not found.`);
            return;
        }
        DOM.fixedAlarmTimeInput.value = alarm.time;
        DOM.fixedAlarmNameInput.value = alarm.name;
        DOM.fixedAlarmModal.dataset.editingId = alarmId;

        dayButtons.forEach(button => {
            const dayIndex = parseInt(button.dataset.dayIndex, 10);
            if (alarm.days.includes(dayIndex)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        trackEvent('Open Modal', { event_category: 'Interaction', event_label: '고정 알림 추가/편집 모달', mode: 'edit', alarmId: alarmId });

    } else {
        // --- ADD MODE ---
        DOM.fixedAlarmModalTitle.textContent = '고정 알림 추가';
        DOM.fixedAlarmTimeInput.value = '';
        DOM.fixedAlarmNameInput.value = '';
        delete DOM.fixedAlarmModal.dataset.editingId;

        dayButtons.forEach(button => {
            button.classList.add('active'); // Default to all active
        });
        trackEvent('Open Modal', { event_category: 'Interaction', event_label: '고정 알림 추가/편집 모달', mode: 'add' });
    }

    DOM.fixedAlarmModal.style.display = 'flex';
}

/**
 * Closes the fixed alarm modal.
 * @param {object} DOM - The DOM elements.
 */
function closeFixedAlarmModal(DOM) {
    if (DOM.fixedAlarmModal) {
        DOM.fixedAlarmModal.style.display = 'none';
        trackEvent('Close Modal', { event_category: 'Interaction', event_label: '고정 알림 추가/편집 모달' });
    }
}


// --- Main Screen Initialization ---

export function initSettingsScreen(DOM) {
    // --- Main event listeners for the screen ---

    // Listener for the main "Add" button
    if (DOM.addFixedAlarmButton) {
        DOM.addFixedAlarmButton.addEventListener('click', () => {
            openFixedAlarmModal(DOM, null); // Open in "Add" mode
            // Tracking for open modal is handled in openFixedAlarmModal function
        });
    }

    // Event delegation for fixed alarm list items
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
                    trackEvent('Toggle Switch', { event_category: 'Feature Usage', event_label: '고정 알림 활성화/비활성화', alarmName: alarmToUpdate.name, enabled: target.checked });
                }
            }

            // Handle EDIT button click -> NOW OPENS MODAL
            if (target.matches('.edit-fixed-alarm-button')) {
                const alarmId = target.dataset.id;
                openFixedAlarmModal(DOM, alarmId); // Open in "Edit" mode
            }

            // Handle DELETE button click
            if (target.matches('.delete-fixed-alarm-button')) {
                const alarmId = target.dataset.id;
                const fixedAlarms = LocalStorageManager.getFixedAlarms();
                const alarmToDelete = fixedAlarms.find(alarm => alarm.id === alarmId);

                if (alarmToDelete && confirm(`고정 알림 "${alarmToDelete.name} ${alarmToDelete.time}"을(를) 삭제하시겠습니까?`)) {
                    LocalStorageManager.deleteFixedAlarm(alarmId);
                    renderFixedAlarms(DOM);
                    log(`고정 알림 "${alarmToDelete.name}"이(가) 삭제되었습니다.`, true);
                    shouldSync = true;
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '고정 알림 삭제', alarmName: alarmToDelete.name });
                } else if (alarmToDelete) {
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '고정 알림 삭제 취소', alarmName: alarmToDelete.name });
                }
            }

            if (shouldSync && getIsAlarmRunning()) {
                syncScheduleToWorker();
            }
        });
    }

    // --- Modal-specific event listeners ---

    // Day button interaction in modal
    if (DOM.fixedAlarmModalDays) {
        DOM.fixedAlarmModalDays.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('day-button')) {
                target.classList.toggle('active');
                const dayName = target.textContent;
                const actionType = target.classList.contains('active') ? 'activate' : 'deactivate';
                trackEvent('Click Button', { event_category: 'Interaction', event_label: `고정 알림 요일 선택: ${dayName}`, action: actionType });
            }
        });
    }

    // Close button in modal header
    if (DOM.closeFixedAlarmModal) {
        DOM.closeFixedAlarmModal.addEventListener('click', () => closeFixedAlarmModal(DOM));
    }

    // "Cancel" button in modal footer
    if (DOM.cancelFixedAlarmModalButton) {
        DOM.cancelFixedAlarmModalButton.addEventListener('click', () => closeFixedAlarmModal(DOM));
    }

    // Save button logic
    if (DOM.saveFixedAlarmButton) {
        DOM.saveFixedAlarmButton.addEventListener('click', () => {
            const id = DOM.fixedAlarmModal.dataset.editingId;
            const rawTime = DOM.fixedAlarmTimeInput.value.trim();
            const name = DOM.fixedAlarmNameInput.value.trim();
            const time = normalizeTimeFormat(rawTime);

            // --- Validation ---
            if (!time || !name) {
                alert("시간과 이름을 모두 입력해주세요.");
                log("시간과 이름을 모두 입력해주세요.", false);
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '고정 알림 저장 실패', mode: id ? 'edit' : 'add', reason: 'Missing time or name' });
                return;
            }
            if (!validateFixedAlarmTime(time)) {
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '고정 알림 저장 실패', mode: id ? 'edit' : 'add', reason: 'Invalid time format' });
                return; // validate function will show its own alert
            }
            const activeDayButtons = DOM.fixedAlarmModalDays.querySelectorAll('.day-button.active');
            if (activeDayButtons.length === 0) {
                alert("요일을 하루 이상 선택해주세요.");
                log("요일을 하루 이상 선택해주세요.", false);
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '고정 알림 저장 실패', mode: id ? 'edit' : 'add', reason: 'No day selected' });
                return;
            }
            const days = Array.from(activeDayButtons).map(btn => parseInt(btn.dataset.dayIndex, 10));

            const alarmPayload = {
                name,
                time,
                days,
                enabled: true // Alarms are always enabled or re-enabled on save/edit
            };

            if (id) {
                // --- Edit Mode ---
                LocalStorageManager.updateFixedAlarm(id, alarmPayload);
                log(`고정 알림 "${name}"이(가) 수정되었습니다.`, true);
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '고정 알림 편집', name: name });
            } else {
                // --- Add Mode ---
                alarmPayload.id = `fixed-${Date.now()}`;
                LocalStorageManager.addFixedAlarm(alarmPayload);
                log(`새 고정 알림 "${name} ${time}"이(가) 추가되었습니다.`, true);
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '고정 알림 추가', name: name });
            }
            
            closeFixedAlarmModal(DOM);
            renderFixedAlarms(DOM);
            if (getIsAlarmRunning()) {
                syncScheduleToWorker();
            }
        });
    }

    // Clicking on the modal backdrop also closes it
    if (DOM.fixedAlarmModal) {
        DOM.fixedAlarmModal.addEventListener('click', (event) => {
            if (event.target === DOM.fixedAlarmModal) {
                closeFixedAlarmModal(DOM);
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

