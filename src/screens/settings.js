import { LocalStorageManager } from '../data-managers.js';
import { renderFixedAlarms, updateFixedAlarmVisuals, renderAlarmLeadTimes } from '../ui-renderer.js';
import { validateFixedAlarmTime, normalizeTimeFormat } from '../utils.js';
import { log } from '../logger.js';
import { syncScheduleToWorker, getIsAlarmRunning } from '../alarm-scheduler.js';
import { trackEvent } from '../analytics.js';
import {
    getAlarmLeadTimes,
    saveAlarmLeadTimes,
    isValidAlarmLeadMinutes,
    DEFAULT_ALARM_LEAD_TIMES,
    MAX_ALARM_LEAD_TIMES,
    MIN_ALARM_LEAD_MINUTES,
    MAX_ALARM_LEAD_MINUTES
} from '../alarm-lead-times.js';

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


// --- 탭 (고정 알림 / 알림 시간) ---

function initSettingsTabs(DOM) {
    if (!DOM.settingsTabs) return;
    DOM.settingsTabs.addEventListener('click', (event) => {
        const tabButton = event.target.closest('.tab-button');
        if (!tabButton) return;

        DOM.settingsTabs.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button === tabButton);
        });
        DOM.settingsScreen.querySelectorAll('.custom-list-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabButton.dataset.tab);
        });
        trackEvent('Click Button', { event_category: 'Navigation', event_label: `설정 탭: ${tabButton.textContent}` });
    });
}

// --- 알림 시간 ---

/**
 * 알림 시간 추가/수정 모달을 연다.
 * @param {object} DOM
 * @param {number|null} editingMinutes - 수정할 알림 시간(분). 추가면 null.
 */
function openLeadTimeModal(DOM, editingMinutes = null) {
    if (editingMinutes === null) {
        DOM.leadTimeModalTitle.textContent = '알림 시간 추가';
        DOM.leadTimeInput.value = '';
        delete DOM.leadTimeModal.dataset.editingMinutes;
    } else {
        DOM.leadTimeModalTitle.textContent = '알림 시간 수정';
        DOM.leadTimeInput.value = String(editingMinutes);
        DOM.leadTimeModal.dataset.editingMinutes = String(editingMinutes);
    }
    DOM.leadTimeModal.style.display = 'flex';
    DOM.leadTimeInput.focus();
    DOM.leadTimeInput.select();
}

function closeLeadTimeModal(DOM) {
    DOM.leadTimeModal.style.display = 'none';
}

// 알림 시간 목록을 저장하고, 화면과 알람 워커에 반영한다.
function applyLeadTimes(DOM, leadTimes, message) {
    saveAlarmLeadTimes(leadTimes);
    renderAlarmLeadTimes(DOM);
    log(message, true);
    if (getIsAlarmRunning()) {
        syncScheduleToWorker();
    }
}

function saveLeadTimeFromModal(DOM) {
    const rawValue = DOM.leadTimeInput.value.trim();
    const minutes = /^\d+$/.test(rawValue) ? Number(rawValue) : NaN;
    const hasEditing = DOM.leadTimeModal.dataset.editingMinutes !== undefined;
    const editingMinutes = hasEditing ? Number(DOM.leadTimeModal.dataset.editingMinutes) : null;
    const current = getAlarmLeadTimes();
    const others = current.filter(m => m !== editingMinutes);

    if (!isValidAlarmLeadMinutes(minutes)) {
        alert(`알림 시간은 ${MIN_ALARM_LEAD_MINUTES}~${MAX_ALARM_LEAD_MINUTES} 사이의 숫자(분)로 입력해주세요.`);
        return;
    }
    if (hasEditing && minutes === editingMinutes) {
        closeLeadTimeModal(DOM);
        return;
    }
    if (others.includes(minutes)) {
        alert(`${minutes}분 전 알림은 이미 있습니다.`);
        return;
    }
    // 모달을 연 뒤 다른 탭에서 목록이 바뀐 경우: 수정하던 값이 사라졌거나 그사이 최대 개수가 찼다.
    if ((hasEditing && !current.includes(editingMinutes)) || others.length >= MAX_ALARM_LEAD_TIMES) {
        closeLeadTimeModal(DOM);
        renderAlarmLeadTimes(DOM);
        alert('알림 시간 목록이 바뀌어 저장하지 못했습니다. 목록을 확인한 뒤 다시 시도해주세요.');
        return;
    }

    closeLeadTimeModal(DOM);
    if (hasEditing) {
        applyLeadTimes(DOM, [...others, minutes], `알림 시간을 ${editingMinutes}분 전에서 ${minutes}분 전으로 수정했습니다.`);
        trackEvent('Click Button', { event_category: 'Interaction', event_label: '알림 시간 수정', minutes });
    } else {
        applyLeadTimes(DOM, [...others, minutes], `${minutes}분 전 알림을 추가했습니다.`);
        trackEvent('Click Button', { event_category: 'Interaction', event_label: '알림 시간 추가', minutes });
    }
}

function initAlarmLeadTimes(DOM) {
    if (!DOM.alarmLeadTimeListDiv || !DOM.leadTimeModal) return;
    renderAlarmLeadTimes(DOM);

    DOM.addLeadTimeButton.addEventListener('click', () => {
        if (getAlarmLeadTimes().length >= MAX_ALARM_LEAD_TIMES) {
            alert(`알림 시간은 최대 ${MAX_ALARM_LEAD_TIMES}개까지 추가할 수 있습니다.`);
            return;
        }
        openLeadTimeModal(DOM);
    });

    DOM.resetLeadTimesButton.addEventListener('click', () => {
        const defaultLabel = DEFAULT_ALARM_LEAD_TIMES.map(m => `${m}분`).join(', ');
        if (!confirm(`알림 시간을 기본값(${defaultLabel} 전)으로 되돌리시겠습니까?`)) return;
        applyLeadTimes(DOM, DEFAULT_ALARM_LEAD_TIMES, `알림 시간을 기본값(${defaultLabel} 전)으로 되돌렸습니다.`);
        trackEvent('Click Button', { event_category: 'Interaction', event_label: '알림 시간 기본값' });
    });

    DOM.alarmLeadTimeListDiv.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.edit-lead-time-button')) {
            openLeadTimeModal(DOM, Number(target.dataset.minutes));
        }
        if (target.matches('.delete-lead-time-button')) {
            const minutes = Number(target.dataset.minutes);
            if (!confirm(`${minutes}분 전 알림을 삭제하시겠습니까?`)) return;
            applyLeadTimes(DOM, getAlarmLeadTimes().filter(m => m !== minutes), `${minutes}분 전 알림을 삭제했습니다.`);
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '알림 시간 삭제', minutes });
        }
    });

    DOM.saveLeadTimeButton.addEventListener('click', () => saveLeadTimeFromModal(DOM));
    DOM.leadTimeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') saveLeadTimeFromModal(DOM);
    });
    DOM.closeLeadTimeModal.addEventListener('click', () => closeLeadTimeModal(DOM));
    DOM.cancelLeadTimeModalButton.addEventListener('click', () => closeLeadTimeModal(DOM));
    DOM.leadTimeModal.addEventListener('click', (event) => {
        if (event.target === DOM.leadTimeModal) closeLeadTimeModal(DOM);
    });
}


// --- Main Screen Initialization ---

export function initSettingsScreen(DOM) {
    initSettingsTabs(DOM);
    initAlarmLeadTimes(DOM);

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

