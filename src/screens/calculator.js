import { calculateBossAppearanceTime } from '../calculator.js';
import { LightCalculator } from '../light-calculator.js';
import { LocalStorageManager, BossDataManager } from '../data-managers.js';
import { getSortedBossListText, parseBossList } from '../boss-parser.js';
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
import { formatTime } from '../utils.js';
import { log } from '../logger.js';

// Helper to check if Zen Calculator update button should be enabled
function checkZenCalculatorUpdateButtonState(DOM) {
    const isBossSelected = DOM.bossSelectionDropdown && DOM.bossSelectionDropdown.value !== '';
    const isTimeCalculated = DOM.bossAppearanceTimeDisplay && DOM.bossAppearanceTimeDisplay.textContent !== '--:--:--';
    if (DOM.updateBossTimeButton) {
        DOM.updateBossTimeButton.disabled = !(isBossSelected && isTimeCalculated);
    }
}

export function initCalculatorScreen(DOM) {
    // --- Zen Calculator Screen Event Handlers ---
    if (DOM.remainingTimeInput) {
        DOM.remainingTimeInput.addEventListener('input', () => {
            const remainingTime = DOM.remainingTimeInput.value;
            const bossAppearanceTime = calculateBossAppearanceTime(remainingTime);
            if (DOM.bossAppearanceTimeDisplay) {
                DOM.bossAppearanceTimeDisplay.textContent = bossAppearanceTime || '--:--:--';
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
                return;
            }

            const [targetId, isoDate, bossName] = selectedBossValue.split('__');
            const targetDate = new Date(isoDate);

            const [newHour, newMinute, newSecond] = newBossTime.split(':').map(Number);
            const newScheduledDate = new Date(targetDate);
            newScheduledDate.setHours(newHour, newMinute, newSecond || 0, 0);

            const currentBossSchedule = BossDataManager.getBossSchedule();
            let bossFoundAndUpdated = false;

            const updatedSchedule = currentBossSchedule.map(boss => {
                if (boss.type === 'boss' && boss.id === targetId) {
                    bossFoundAndUpdated = true;
                    return {
                        ...boss,
                        time: newBossTime,
                        scheduledDate: newScheduledDate,
                    };
                }
                return boss;
            });

            if (bossFoundAndUpdated) {
                BossDataManager.setBossSchedule(updatedSchedule);

                updateBossListTextarea(DOM);
                let finalBossListText = DOM.bossListInput.value;
                finalBossListText = getSortedBossListText(finalBossListText);
                DOM.bossListInput.value = finalBossListText;

                parseBossList(DOM.bossListInput);
                showToast(DOM, `${bossName} 보스 시간이 ${newBossTime}으로 업데이트 되었습니다.`);

                DOM.remainingTimeInput.value = '';
                DOM.bossAppearanceTimeDisplay.textContent = '--:--:--';
                DOM.bossSelectionDropdown.value = '';
                checkZenCalculatorUpdateButtonState(DOM);
                populateBossSelectionDropdown(DOM);
            } else {
                showToast(DOM, "선택된 보스를 목록에서 찾거나 업데이트할 수 없습니다.");
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
        });
    }

    if (DOM.lightGwangButton) {
        DOM.lightGwangButton.addEventListener('click', () => {
            LightCalculator.triggerGwang((time, isOverTime) => {
                updateLightExpectedTimeDisplay(DOM, time, isOverTime);
            });
            DOM.lightGwangButton.disabled = true;
        });
    }

    if (DOM.lightCaptureButton) {
        DOM.lightCaptureButton.addEventListener('click', async () => {
            LightCalculator.stopStopwatch();
            const confirmSave = confirm("광 계산을 저장 하시겠습니까?");
            if (confirmSave) {
                const bossName = prompt("보스 이름을 입력하세요:");
                if (bossName) {
                    await LightCalculator.saveLightCalculation(bossName);
                    renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
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

    if (DOM.lightListButton) {
        DOM.lightListButton.addEventListener('click', () => {
            renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
        });
    }

    if (DOM.lightSavedList) {
        DOM.lightSavedList.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'clearLightRecordsButton') {
                if (confirm("광 계산 기록을 초기화 하시겠습니까?")) {
                    LocalStorageManager.clearLightCalculatorRecords();
                    renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
                    log("광 계산 기록이 초기화되었습니다.", true);
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
    }
}

export function getScreen() {
    return {
        id: 'calculator-screen',
        init: initCalculatorScreen,
        onTransition: handleCalculatorScreenTransition
    };
}
