import { calculateAppearanceTimeFromMinutes } from '../calculator.js';
import { LightCalculator } from '../light-calculator.js';
import { LocalStorageManager, BossDataManager } from '../data-managers.js';
import { 
    showToast, 
    populateBossSelectionDropdown, 
    updateBossListTextarea, 
    updateLightStopwatchDisplay, 
    updateLightExpectedTimeDisplay, 
    renderLightTempResults, 
    renderLightSavedList, 
    renderCalculatorScreen 
} from '../ui-renderer.js';
import { formatTime, padNumber } from '../utils.js';
import { log } from '../logger.js';
import { trackEvent } from '../analytics.js';

// Helper to check if Zen Calculator update button should be enabled
function checkZenCalculatorUpdateButtonState(DOM) {
    const isBossSelected = DOM.bossSelectionDropdown && DOM.bossSelectionDropdown.value !== '';
    const isTimeCalculated = DOM.bossAppearanceTimeDisplay && DOM.bossAppearanceTimeDisplay.textContent !== '--:--:--';
    if (DOM.updateBossTimeButton) {
        DOM.updateBossTimeButton.disabled = !(isBossSelected && isTimeCalculated);
    }
}

export function initCalculatorScreen(DOM) {
    // Ensure lightSavedList is hidden by default
    if (DOM.lightSavedList) {
        DOM.lightSavedList.style.display = 'none';
    }
    
    // --- Zen Calculator Screen Event Handlers ---
    if (DOM.remainingTimeInput) {
        DOM.remainingTimeInput.addEventListener('input', () => {
            const remainingTime = DOM.remainingTimeInput.value;
            const bossAppearanceTime = calculateAppearanceTimeFromMinutes(remainingTime);
            if (DOM.bossAppearanceTimeDisplay) {
                if (bossAppearanceTime) {
                    const hours = padNumber(bossAppearanceTime.getHours());
                    const minutes = padNumber(bossAppearanceTime.getMinutes());
                    const seconds = padNumber(bossAppearanceTime.getSeconds());
                    DOM.bossAppearanceTimeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
                } else {
                    DOM.bossAppearanceTimeDisplay.textContent = '--:--:--';
                }
            }
            checkZenCalculatorUpdateButtonState(DOM); // Check button state
        });
    }

    if (DOM.bossSelectionDropdown) {
        DOM.bossSelectionDropdown.addEventListener('change', () => {
            checkZenCalculatorUpdateButtonState(DOM); // Check button state
        });
    }

    if (DOM.updateBossTimeButton) {
        DOM.updateBossTimeButton.addEventListener('click', () => {
            const selectedBossValue = DOM.bossSelectionDropdown.value;
            const newBossTime = DOM.bossAppearanceTimeDisplay.textContent; // HH:MM:SS format

            if (!selectedBossValue || newBossTime === '--:--:--') {
                showToast(DOM, "보스 선택 또는 시간 계산이 유효하지 않습니다.");
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 시간 업데이트 실패', reason: 'Invalid Selection or Time' });
                return;
            }

            const [targetId, isoDate, bossName] = selectedBossValue.split('__');
            const targetDate = new Date(isoDate);

            const [newHour, newMinute, newSecond] = newBossTime.split(':').map(Number);
            const newScheduledDate = new Date(targetDate);
            newScheduledDate.setHours(newHour, newMinute, newSecond || 0); // Fix: seconds handling

            // 1. Get existing schedule and find the boss to update
            const currentSchedule = BossDataManager.getBossSchedule();
            let bossFoundAndUpdated = false;
            
            // Filter out date markers, we will reconstruct them.
            let allBosses = currentSchedule.filter(item => item.type === 'boss');

            // Update the specific boss
            allBosses = allBosses.map(boss => {
                if (boss.id === targetId) {
                    bossFoundAndUpdated = true;
                    // If new time is in the past relative to *now* (not relative to its original time), 
                    // we might need logic. But here we just apply the calculated time.
                    // The calculator calculates time based on 'now', so it's usually future or near future.
                    // However, we need to be careful about the DATE.
                    // `newScheduledDate` uses `targetDate` (original date) but sets new HH:MM:SS.
                    // If original was 11.28 23:00 and we change to 01:00, it becomes 11.28 01:00 (past).
                    // Ideally, the calculator should return a full Date object or we should infer date.
                    // But `calculateBossAppearanceTime` returns a string based on `now`.
                    // So `newBossTime` is relative to TODAY/NOW.
                    // Therefore, we should construct `newScheduledDate` based on `now`, not `targetDate`.
                    
                    const now = new Date();
                    let updatedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), newHour, newMinute, newSecond || 0);
                    
                    // If the calculated time is earlier than now (e.g. rolled over to next day in calc logic, but here we only have string),
                    // Wait, `calculateBossAppearanceTime` uses `now` and adds remaining time. It handles rollover in hours > 24?
                    // No, `calculateBossAppearanceTime` returns HH:MM:SS string.
                    // If remaining time is 25 hours, it returns time next day.
                    // We need to trust that if the user says "remaining time", the resulting time is future.
                    if (updatedDate.getTime() < now.getTime()) {
                         updatedDate.setDate(updatedDate.getDate() + 1);
                    }
                    
                    return {
                        ...boss,
                        time: newBossTime,
                        scheduledDate: updatedDate,
                        alerted_5min: false, alerted_1min: false, alerted_0min: false
                    };
                }
                return boss;
            });

            if (bossFoundAndUpdated) {
                // 2. Sort
                allBosses.sort((a, b) => a.scheduledDate - b.scheduledDate);

                // 3. Reconstruct with Date Markers
                const newSchedule = [];
                let lastDateStr = "";

                allBosses.forEach(boss => {
                    const d = boss.scheduledDate;
                    const month = d.getMonth() + 1;
                    const day = d.getDate();
                    const currentDateStr = `${padNumber(month)}.${padNumber(day)}`;

                    if (currentDateStr !== lastDateStr) {
                        const markerDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        newSchedule.push({
                            type: 'date',
                            value: currentDateStr,
                            scheduledDate: markerDate
                        });
                        lastDateStr = currentDateStr;
                    }
                    newSchedule.push(boss);
                });

                // 4. Save and Update UI
                BossDataManager.setBossSchedule(newSchedule);
                updateBossListTextarea(DOM); // This will use the new formatted output logic
                
                showToast(DOM, `${bossName} 보스 시간이 ${newBossTime}으로 업데이트 되었습니다.`);
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 시간 업데이트', bossName: bossName, newTime: newBossTime });

                DOM.remainingTimeInput.value = '';
                DOM.bossAppearanceTimeDisplay.textContent = '--:--:--';
                DOM.bossSelectionDropdown.value = '';
                checkZenCalculatorUpdateButtonState(DOM);
                populateBossSelectionDropdown(DOM);
            } else {
                showToast(DOM, "선택된 보스를 목록에서 찾거나 업데이트할 수 없습니다.");
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 시간 업데이트 실패', reason: 'Boss Not Found' });
            }
        });
    }

    // --- Light Calculator Screen Event Handlers ---
    if (DOM.lightStartButton) {
        DOM.lightStartButton.addEventListener('click', () => {
            LightCalculator.startStopwatch((time) => {
                updateLightStopwatchDisplay(DOM, time);
            });
            DOM.lightStartButton.disabled = true;
            DOM.lightGwangButton.disabled = false;
            DOM.lightCaptureButton.disabled = false;
            DOM.lightListButton.disabled = true;
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '스톱워치 시작' });
        });
    }

    if (DOM.lightGwangButton) {
        DOM.lightGwangButton.addEventListener('click', () => {
            LightCalculator.triggerGwang((time, isOverTime) => {
                updateLightExpectedTimeDisplay(DOM, time, isOverTime);
            });
            DOM.lightGwangButton.disabled = true;
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '광 시간 기록' });
        });
    }

    if (DOM.lightCaptureButton) {
        DOM.lightCaptureButton.addEventListener('click', async () => {
            LightCalculator.stopStopwatch();
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '잡힘 시간 기록' });
            const confirmSave = confirm("광 계산을 저장 하시겠습니까?");
            if (confirmSave) {
                const bossName = prompt("보스 이름을 입력하세요:");
                if (bossName) {
                    await LightCalculator.saveLightCalculation(bossName);
                    renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '기록 저장' });
                }
            }
            renderLightTempResults(DOM,
                formatTime(LightCalculator.getGwangTime()),
                formatTime(LightCalculator.getAfterGwangTime()),
                formatTime(LightCalculator.getTotalTime())
            );
            LightCalculator.resetCalculator();
            DOM.lightStartButton.disabled = false;
            DOM.lightGwangButton.disabled = true;
            DOM.lightCaptureButton.disabled = true;
            DOM.lightListButton.disabled = false;
            updateLightStopwatchDisplay(DOM, '00:00');
            updateLightExpectedTimeDisplay(DOM, '--:--', false);
        });
    }

    if (DOM.lightListButton && DOM.lightSavedList && DOM.lightTempResults) {
        DOM.lightListButton.addEventListener('click', () => {
            const isListCurrentlyHidden = DOM.lightSavedList.style.display === 'none';

            if (isListCurrentlyHidden) {
                renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords()); // Render content when showing
                DOM.lightSavedList.style.display = 'block'; // Show the list
                DOM.lightTempResults.classList.remove('compact-top'); // List is visible, keep original margin
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '광 계산기 목록 보기' });
            } else {
                DOM.lightSavedList.style.display = 'none'; // Hide the list
                DOM.lightTempResults.classList.add('compact-top'); // List is hidden, set margin-top to 0
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '광 계산기 목록 숨기기' });
            }
        });
    }

    if (DOM.lightSavedList) {
        DOM.lightSavedList.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'clearLightRecordsButton') {
                if (confirm("광 계산 기록을 초기화 하시겠습니까?")) {
                    LocalStorageManager.clearLightCalculatorRecords();
                    renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
                    log("광 계산 기록이 초기화되었습니다.", true);
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '기록 초기화 (광 계산기)' });
                }
            }
        });
    }
}

export function handleCalculatorScreenTransition(DOM) {
    LightCalculator.resetCalculator(); // Reset the internal state
    renderCalculatorScreen(DOM);
    // Enable lightStartButton when the calculator screen is displayed
    if (DOM.lightStartButton) {
        DOM.lightStartButton.disabled = false;
        DOM.lightGwangButton.disabled = true;
        DOM.lightCaptureButton.disabled = true;
        DOM.lightListButton.disabled = false;
        updateLightStopwatchDisplay(DOM, '00:00'); // Ensure display is 00:00
        updateLightExpectedTimeDisplay(DOM, '--:--', false); // Ensure expected time is reset
        renderLightTempResults(DOM, '', '', ''); // Clear temporary results
        // Ensure initial state of compact-top and savedList visibility
        if (DOM.lightSavedList && DOM.lightTempResults) {
            DOM.lightSavedList.style.display = 'none'; // Initially hide the list
            DOM.lightTempResults.classList.add('compact-top'); // Set compact margin initially
        }
    }
}

export function getScreen() {
    return {
        id: 'calculator-screen',
        init: initCalculatorScreen,
        onTransition: handleCalculatorScreenTransition
    };
}
