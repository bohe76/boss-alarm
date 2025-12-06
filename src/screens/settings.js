import { LocalStorageManager } from '../data-managers.js';
import { renderFixedAlarms, updateFixedAlarmVisuals } from '../ui-renderer.js';
import { log } from '../logger.js';
import { syncScheduleToWorker, getIsAlarmRunning } from '../alarm-scheduler.js';

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

    } else {
        // --- ADD MODE ---
        DOM.fixedAlarmModalTitle.textContent = '고정 알림 추가';
        DOM.fixedAlarmTimeInput.value = '';
        DOM.fixedAlarmNameInput.value = '';
        delete DOM.fixedAlarmModal.dataset.editingId;

        dayButtons.forEach(button => {
            button.classList.add('active'); // Default to all active
        });
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
    }
}


// --- Main Screen Initialization ---

export function initSettingsScreen(DOM) {
    // --- Main event listeners for the screen ---

    // Listener for the main "Add" button
    if (DOM.addFixedAlarmButton) {
        DOM.addFixedAlarmButton.addEventListener('click', () => {
            openFixedAlarmModal(DOM, null); // Open in "Add" mode
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

    // Save button logic (to be implemented)
    if (DOM.saveFixedAlarmButton) {
        DOM.saveFixedAlarmButton.addEventListener('click', () => {
            // TODO: Implement save logic here
            alert('저장 로직 구현 필요');
            closeFixedAlarmModal(DOM);
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

