import { calculateAppearanceTimeFromMinutes } from '../calculator.js';
import { CrazyCalculator } from '../crazy-calculator.js';
import { LocalStorageManager, BossDataManager } from '../data-managers.js';
import { DB } from '../db.js';
import {
    showToast,
    populateBossSelectionDropdown,
    updateBossListTextarea,
    updateTimetableUI,
    updateCrazyStopwatchDisplay,
    updateCrazyExpectedTimeDisplay,
    renderCrazyTempResults,
    renderCrazySavedList,
    renderCalculatorScreen
} from '../ui-renderer.js';
import { formatTime, padNumber } from '../utils.js';
import { log } from '../logger.js';
import { trackEvent } from '../analytics.js';

// Module-level variable to store the precisely calculated Date object
let lastCalculatedBossTime = null;

// Helper to check if Zen Calculator update button should be enabled
function checkZenCalculatorUpdateButtonState(DOM) {
    const isBossSelected = DOM.bossSelectionDropdown && DOM.bossSelectionDropdown.value !== '';
    const isTimeCalculated = DOM.bossAppearanceTimeDisplay && DOM.bossAppearanceTimeDisplay.textContent !== '--:--:--';
    if (DOM.updateBossTimeButton) {
        DOM.updateBossTimeButton.disabled = !(isBossSelected && isTimeCalculated);
    }
}

export function initCalculatorScreen(DOM) {
    // Ensure crazySavedList is hidden by default
    if (DOM.crazySavedList) {
        DOM.crazySavedList.style.display = 'none';
    }

    // --- Zen Calculator Screen Event Handlers ---
    if (DOM.remainingTimeInput) {
        DOM.remainingTimeInput.addEventListener('input', () => {
            const remainingTime = DOM.remainingTimeInput.value;
            const bossAppearanceTime = calculateAppearanceTimeFromMinutes(remainingTime);

            // Store the calculated Date object directly
            lastCalculatedBossTime = bossAppearanceTime;

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

            if (!selectedBossValue || !lastCalculatedBossTime) {
                showToast(DOM, "보스 선택 또는 시간 계산이 유효하지 않습니다.");
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 시간 업데이트 실패', reason: 'Invalid Selection or Time' });
                return;
            }

            const [targetIdStr, , bossName] = selectedBossValue.split('__');
            const targetId = parseInt(targetIdStr, 10);
            const targetSchedule = Number.isNaN(targetId) ? null : DB.getSchedule(targetId);

            if (!targetSchedule) {
                showToast(DOM, "선택된 보스를 목록에서 찾거나 업데이트할 수 없습니다.");
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 시간 업데이트 실패', reason: 'Boss Not Found' });
                return;
            }

            const bossId = targetSchedule.bossId;
            const activeGame = DB.getSetting('lastSelectedGame');
            const memo = targetSchedule.memo || '';

            // Single Anchor Principle (FR-CAL-004): 동일 보스의 모든 인스턴스 제거 후 새 앵커 1개 주입.
            // 이후 _expandAndReconstruct가 이 단일 앵커를 기준으로 48h 윈도우를 깨끗이 재구성.
            DB.deleteSchedulesByBossId(bossId);
            DB.addSchedule({
                bossId,
                scheduledDate: lastCalculatedBossTime.toISOString(),
                memo,
                alerted_5min: false,
                alerted_1min: false,
                alerted_0min: false
            });

            if (activeGame) {
                BossDataManager.expandSchedule(activeGame);

                // Draft 동기화: Single Anchor Principle을 Draft에도 동일 적용.
                // 보스 스케쥴러는 Draft를 우선 로드하므로 DB만 갱신하면 화면 갱신이 누락된다.
                const draft = BossDataManager.getDraftSchedule(activeGame) || [];
                const filteredDraft = draft.filter(item => item.type !== 'boss' || item.name !== bossName);
                filteredDraft.push({
                    id: `boss-${bossName}-${lastCalculatedBossTime.getTime()}`,
                    type: 'boss',
                    name: bossName,
                    scheduledDate: lastCalculatedBossTime,
                    memo,
                    interval: BossDataManager.getBossInterval(bossName, activeGame) || 0,
                    timeFormat: 'hms'
                });
                BossDataManager.setDraftSchedule(activeGame, filteredDraft);
            }

            updateBossListTextarea(DOM);
            updateTimetableUI(DOM);

            const newTimeText = `${padNumber(lastCalculatedBossTime.getHours())}:${padNumber(lastCalculatedBossTime.getMinutes())}:${padNumber(lastCalculatedBossTime.getSeconds())}`;
            showToast(DOM, `${bossName} 보스 시간이 ${newTimeText}으로 업데이트 되었습니다.`);
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 시간 업데이트 (젠 계산기)', bossName: bossName, newTime: newTimeText });

            // Reset inputs
            DOM.remainingTimeInput.value = '';
            DOM.bossAppearanceTimeDisplay.textContent = '--:--:--';
            DOM.bossSelectionDropdown.value = '';
            lastCalculatedBossTime = null;
            checkZenCalculatorUpdateButtonState(DOM);
            populateBossSelectionDropdown(DOM);
        });
    }

    // --- Crazy Calculator Screen Event Handlers ---
    if (DOM.crazyStartButton) {
        DOM.crazyStartButton.addEventListener('click', () => {
            CrazyCalculator.startStopwatch((time) => {
                updateCrazyStopwatchDisplay(DOM, time);
            });
            DOM.crazyStartButton.disabled = true;
            DOM.crazyGwangButton.disabled = false;
            DOM.crazyCaptureButton.disabled = false;
            DOM.crazyListButton.disabled = true;
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '스톱워치 시작' });
        });
    }

    if (DOM.crazyGwangButton) {
        DOM.crazyGwangButton.addEventListener('click', () => {
            CrazyCalculator.triggerGwang((time, isOverTime) => {
                updateCrazyExpectedTimeDisplay(DOM, time, isOverTime);
            });
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '광 시간 기록' });
        });
    }

    if (DOM.crazyCaptureButton) {
        DOM.crazyCaptureButton.addEventListener('click', async () => {
            CrazyCalculator.stopStopwatch();
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '잡힘 시간 기록' });
            const confirmSave = confirm("광 계산을 저장 하시겠습니까?");
            if (confirmSave) {
                const bossName = prompt("보스 이름을 입력하세요:");
                if (bossName) {
                    await CrazyCalculator.saveCrazyCalculation(bossName);
                    renderCrazySavedList(DOM, CrazyCalculator.getCrazyCalculatorRecords());
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '기록 저장' });
                }
            }
            renderCrazyTempResults(DOM,
                formatTime(CrazyCalculator.getGwangTime()),
                formatTime(CrazyCalculator.getAfterGwangTime()),
                formatTime(CrazyCalculator.getTotalTime())
            );
            CrazyCalculator.resetCalculator();
            DOM.crazyStartButton.disabled = false;
            DOM.crazyGwangButton.disabled = true;
            DOM.crazyCaptureButton.disabled = true;
            DOM.crazyListButton.disabled = false;
            updateCrazyStopwatchDisplay(DOM, '00:00');
            updateCrazyExpectedTimeDisplay(DOM, '--:--', false);
        });
    }

    if (DOM.crazyListButton && DOM.crazySavedList && DOM.crazyTempResults) {
        DOM.crazyListButton.addEventListener('click', () => {
            const isListCurrentlyHidden = DOM.crazySavedList.style.display === 'none';

            if (isListCurrentlyHidden) {
                renderCrazySavedList(DOM, CrazyCalculator.getCrazyCalculatorRecords()); // Render content when showing
                DOM.crazySavedList.style.display = 'block'; // Show the list
                DOM.crazyTempResults.classList.remove('compact-top'); // List is visible, keep original margin
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '광 계산기 목록 보기' });
            } else {
                DOM.crazySavedList.style.display = 'none'; // Hide the list
                DOM.crazyTempResults.classList.add('compact-top'); // List is hidden, set margin-top to 0
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '광 계산기 목록 숨기기' });
            }
        });
    }

    if (DOM.crazySavedList) {
        DOM.crazySavedList.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'clearCrazyRecordsButton') {
                if (confirm("광 계산 기록을 초기화 하시겠습니까?")) {
                    LocalStorageManager.clearCrazyCalculatorRecords();
                    renderCrazySavedList(DOM, CrazyCalculator.getCrazyCalculatorRecords());
                    log("광 계산 기록이 초기화되었습니다.", true);
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '기록 초기화 (광 계산기)' });
                }
            }
        });
    }
}

export function handleCalculatorScreenTransition(DOM) {
    CrazyCalculator.resetCalculator(); // Reset the internal state
    renderCalculatorScreen(DOM);
    // Enable crazyStartButton when the calculator screen is displayed
    if (DOM.crazyStartButton) {
        DOM.crazyStartButton.disabled = false;
        DOM.crazyGwangButton.disabled = true;
        DOM.crazyCaptureButton.disabled = true;
        DOM.crazyListButton.disabled = false;
        updateCrazyStopwatchDisplay(DOM, '00:00'); // Ensure display is 00:00
        updateCrazyExpectedTimeDisplay(DOM, '--:--', false); // Ensure expected time is reset
        renderCrazyTempResults(DOM, '', '', ''); // Clear temporary results
        // Ensure initial state of compact-top and savedList visibility
        if (DOM.crazySavedList && DOM.crazyTempResults) {
            DOM.crazySavedList.style.display = 'none'; // Initially hide the list
            DOM.crazyTempResults.classList.add('compact-top'); // Set compact margin initially
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
