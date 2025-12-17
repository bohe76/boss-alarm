import { renderBossInputs, renderBossSchedulerScreen } from '../ui-renderer.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager } from '../data-managers.js';
import { updateBossListTextarea } from '../ui-renderer.js';
import { generateUniqueId, padNumber } from '../utils.js';
import { trackEvent } from '../analytics.js';

let _remainingTimes = {}; // Encapsulated state for remaining times
let _memoInputs = {}; // Encapsulated state for memo inputs

function handleShowScreen(DOM) {
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);
    updateCalculatedTimes(DOM);
}

export function handleApplyBossSettings(DOM) {
    // Check if there is at least one valid input
    const hasValidInput = Array.from(DOM.bossInputsContainer.querySelectorAll('.remaining-time-input'))
        .some(input => input.value.trim() !== '' && input.dataset.calculatedDate);

    if (!hasValidInput) {
        alert("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 설정 적용 버튼을 눌러 주세요.");
        trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 설정 적용 실패', reason: 'No valid input' });
        return;
    }

    const specialBossNames = [
        "파르바", "셀로비아", "흐니르", "페티", "바우티", "니드호그", "야른", "라이노르", "비요른", "헤르모드", "스칼라니르", "브륀힐드", "라타토스크", "수드리", "지감4층",
        "침공 파르바", "침공 셀로비아", "침공 흐니르", "침공 페티", "침공 바우티", "침공 니드호그", "침공 야른", "침공 라이노르", "침공 비요른", "침공 헤르모드", "침공 스칼라니르", "침공 브륀힐드", "침공 라타토스크", "침공 수드리"
    ];

    // 1. Get Current Data for ID Lookup
    const currentSchedule = BossDataManager.getBossSchedule();
    const existingBossesForMap = currentSchedule.filter(item => item.type === 'boss');
    const bossMap = new Map();
    existingBossesForMap.forEach(boss => bossMap.set(boss.id, boss));

    let currentBosses = [];

    // 2. Process User Inputs
    DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
        const bossName = item.querySelector('.boss-name').textContent;
        const remainingTimeInput = item.querySelector('.remaining-time-input');
        const memoInput = item.querySelector('.memo-input'); // Select memo input
        const remainingTime = remainingTimeInput.value;
        const bossId = remainingTimeInput.dataset.id;
        const calculatedDateIso = remainingTimeInput.dataset.calculatedDate;
        const memo = memoInput ? memoInput.value.trim() : ''; // Get memo value

        if (remainingTime && calculatedDateIso) {
            const appearanceTime = new Date(calculatedDateIso);
            const timeStr = `${padNumber(appearanceTime.getHours())}:${padNumber(appearanceTime.getMinutes())}:${padNumber(appearanceTime.getSeconds())}`;
            const timeFormat = remainingTimeInput.dataset.timeFormat || 'hms'; // Default to 'hms'

            const bossData = {
                time: timeStr,
                scheduledDate: appearanceTime,
                timeFormat: timeFormat, // Add the format
                memo: memo, // Add memo
                alerted_5min: false,
                alerted_1min: false,
                alerted_0min: false
            };

            if (bossId && bossMap.has(bossId)) {
                const existingBoss = bossMap.get(bossId);
                currentBosses.push({
                    ...existingBoss,
                    ...bossData
                });
            } else {
                currentBosses.push({
                    type: 'boss',
                    id: bossId || generateUniqueId(),
                    name: bossName,
                    ...bossData
                });
            }
        }
    });

    // 3. Add +12h Bosses
    const additionalBosses = [];
    currentBosses.forEach(boss => {
         if (specialBossNames.includes(boss.name)) {
             const newAppearanceTime = new Date(boss.scheduledDate);
             newAppearanceTime.setHours(newAppearanceTime.getHours() + 12);
             additionalBosses.push({
                type: 'boss', id: generateUniqueId(), name: boss.name,
                time: `${padNumber(newAppearanceTime.getHours())}:${padNumber(newAppearanceTime.getMinutes())}:${padNumber(newAppearanceTime.getSeconds())}`,
                scheduledDate: newAppearanceTime,
                timeFormat: boss.timeFormat, // Preserve original format
                // +12h 보스에는 메모를 복사하지 않는 것이 일반적일 수 있으나, 
                // 명시적인 요구사항이 없으므로 일단 비워둡니다. 필요시 boss.memo 로 복사 가능.
                memo: '', 
                alerted_5min: false, alerted_1min: false, alerted_0min: false
             });
        }
    });
    currentBosses = [...currentBosses, ...additionalBosses];

    // 4. Filtering
    const todayString = new Date().toDateString();
    currentBosses = currentBosses.filter(boss => {
        const isInvasionBoss = boss.name.includes("침공");
        return !isInvasionBoss || boss.scheduledDate.toDateString() === todayString;
    });

    // 5. Sort
    currentBosses.sort((a, b) => a.scheduledDate - b.scheduledDate);

    // 6. Reconstruction
    const newScheduleItems = [];
    let lastDateStr = "";
    currentBosses.forEach(boss => {
        const d = boss.scheduledDate;
        const currentDateStr = `${padNumber(d.getMonth() + 1)}.${padNumber(d.getDate())}`;
        if (currentDateStr !== lastDateStr) {
            newScheduleItems.push({
                type: 'date', value: currentDateStr,
                scheduledDate: new Date(d.getFullYear(), d.getMonth(), d.getDate())
            });
            lastDateStr = currentDateStr;
        }
        newScheduleItems.push(boss);
    });

    // 7. Save & Update UI
    BossDataManager.setBossSchedule(newScheduleItems);
    updateBossListTextarea(DOM);
    
    _remainingTimes = {};
    _memoInputs = {}; // Reset memo inputs
    DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
        const bossName = item.querySelector('.boss-name').textContent;
        _remainingTimes[bossName] = item.querySelector('.remaining-time-input').value;
        const memoVal = item.querySelector('.memo-input').value;
        if (memoVal) _memoInputs[bossName] = memoVal;
    });

    EventBus.emit('navigate', 'boss-management-screen');
    log("보스 스케줄러에서 보스 설정으로 목록이 전송되었습니다.", true);
    trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 설정 적용' });
}

export function initBossSchedulerScreen(DOM) {
    EventBus.on('show-boss-scheduler-screen', () => handleShowScreen(DOM));
    EventBus.on('rerender-boss-scheduler', () => {
        renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);
        updateCalculatedTimes(DOM);
    });

    if (DOM.bossSchedulerScreen) {
        DOM.bossSchedulerScreen.addEventListener('change', (event) => {
            if (event.target === DOM.gameSelect) {
                renderBossInputs(DOM, DOM.gameSelect.value, _remainingTimes, _memoInputs);
                updateCalculatedTimes(DOM);
                trackEvent('Change Select', { event_category: 'Interaction', event_label: '보스 목록 선택', value: DOM.gameSelect.value });
            }
        });

        DOM.bossSchedulerScreen.addEventListener('input', (event) => {
            if (event.target.classList.contains('remaining-time-input')) {
                // ... (Existing remaining time logic)
                const inputField = event.target;
                const bossName = inputField.dataset.bossName;
                _remainingTimes[bossName] = inputField.value; // Update state

                const remainingTime = inputField.value.trim();
                const calculatedTimeSpan = inputField.parentElement.querySelector('.calculated-spawn-time'); // Changed selection logic slightly
                const calculatedDate = calculateBossAppearanceTime(remainingTime);

                const isNumeric = /^\d+$/.test(remainingTime);
                const isHms = (isNumeric && remainingTime.length === 6) || (!isNumeric && remainingTime.split(':').length === 3);
                
                if (remainingTime) {
                    inputField.dataset.timeFormat = isHms ? 'hms' : 'hm';
                } else {
                    delete inputField.dataset.timeFormat;
                }

                if (calculatedDate && calculatedTimeSpan) {
                    let timeString;
                    if (inputField.dataset.timeFormat === 'hm') {
                        timeString = `${padNumber(calculatedDate.getHours())}:${padNumber(calculatedDate.getMinutes())}`;
                    } else { // 'hms'
                        timeString = `${padNumber(calculatedDate.getHours())}:${padNumber(calculatedDate.getMinutes())}:${padNumber(calculatedDate.getSeconds())}`;
                    }
                    calculatedTimeSpan.textContent = timeString;
                    inputField.dataset.calculatedDate = calculatedDate.toISOString();
                } else {
                    if (calculatedTimeSpan) calculatedTimeSpan.textContent = '--:--:--';
                    delete inputField.dataset.calculatedDate;
                    delete inputField.dataset.timeFormat;
                }
            } else if (event.target.classList.contains('memo-input')) {
                // Handle memo input changes
                const inputField = event.target;
                const bossName = inputField.dataset.bossName;
                _memoInputs[bossName] = inputField.value;
            }
        });

        DOM.bossSchedulerScreen.addEventListener('focusout', (event) => {
            if (event.target.classList.contains('remaining-time-input')) {
                const inputField = event.target;
                const remainingTime = inputField.value.trim();
                if (remainingTime === '') return;
                const bossAppearanceTime = calculateBossAppearanceTime(remainingTime);
                if (!bossAppearanceTime) {
                    const bossName = inputField.parentElement.querySelector('.boss-name').textContent;
                    const allInputs = Array.from(DOM.bossInputsContainer.querySelectorAll('.remaining-time-input'));
                    const index = allInputs.indexOf(inputField) + 1;
                    alert(`[${index}번째 줄] ${bossName}의 시간이 잘못 입력되었습니다.\n(입력값: ${remainingTime})`);
                    setTimeout(() => { inputField.focus(); }, 0);
                }
            }
        });

        // 남은 시간 입력 필드에서 Enter 키를 눌렀을 때 다음 필드로 포커스 이동
        DOM.bossSchedulerScreen.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                 if (event.target.classList.contains('remaining-time-input')) {
                    event.preventDefault(); 
                    // Move focus to the memo input of the same row if available, or next row's time input?
                    // Better UX for mobile might be: Time Input -> Memo Input -> Next Row Time Input
                    const currentInput = event.target;
                    const memoInput = currentInput.parentElement.querySelector('.memo-input');
                    if (memoInput) {
                        memoInput.focus();
                    }
                } else if (event.target.classList.contains('memo-input')) {
                    event.preventDefault();
                    // Move to next row's time input
                    const currentInput = event.target;
                    const allMemoInputs = Array.from(DOM.bossInputsContainer.querySelectorAll('.memo-input'));
                    const currentIndex = allMemoInputs.indexOf(currentInput);
                    const allTimeInputs = Array.from(DOM.bossInputsContainer.querySelectorAll('.remaining-time-input'));
                    
                    if (currentIndex > -1 && currentIndex < allTimeInputs.length - 1) {
                         allTimeInputs[currentIndex + 1].focus();
                    }
                }
            }
        });

        DOM.bossSchedulerScreen.addEventListener('click', (event) => {
            if (event.target === DOM.clearAllRemainingTimesButton) {
                if (confirm("모든 남은 시간과 메모를 삭제하시겠습니까?")) {
                    DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
                        input.value = '';
                        delete input.dataset.calculatedDate;
                         // Find sibling calculated time span
                         const span = input.parentElement.querySelector('.calculated-spawn-time');
                         if(span) span.textContent = '--:--:--';
                    });
                    // Clear memos as well
                    DOM.bossInputsContainer.querySelectorAll('.memo-input').forEach(input => {
                        input.value = '';
                    });
                    
                    _remainingTimes = {};
                    _memoInputs = {};

                    log("모든 남은 시간과 메모가 삭제되었습니다.", true);
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '남은 시간 초기화' });
                } else {
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '남은 시간 초기화 취소' });
                }
            }
        });

        DOM.bossSchedulerScreen.addEventListener('click', (event) => {
            if (event.target === DOM.moveToBossSettingsButton) {
                handleApplyBossSettings(DOM);
            }
        });
    }
}

function updateCalculatedTimes(DOM) {
    if (!DOM.bossInputsContainer) return;
    DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
        if (input.value) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}
export function getScreen() {
    return {
        id: 'boss-scheduler-screen',
        init: initBossSchedulerScreen
    };
}
