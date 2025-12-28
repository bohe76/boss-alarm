// src/screens/boss-scheduler.js
import { renderBossInputs, renderBossSchedulerScreen } from '../ui-renderer.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager } from '../data-managers.js';
import { updateBossListTextarea } from '../ui-renderer.js';
import { parseBossList } from '../boss-parser.js';
import { generateUniqueId, padNumber } from '../utils.js';
import { trackEvent } from '../analytics.js';

let _remainingTimes = {}; // Encapsulated state for remaining times
let _memoInputs = {}; // Encapsulated state for memo inputs

function handleShowScreen(DOM) {
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);
    updateCalculatedTimes(DOM);
    showSchedulerTab(DOM, 'input'); // Reset to input tab on show
}

function showSchedulerTab(DOM, tabId) {
    if (!DOM.tabSchedulerInput || !DOM.tabSchedulerText || !DOM.schedulerInputModeSection || !DOM.schedulerTextModeSection) return;

    // Toggle active state for tab buttons
    DOM.tabSchedulerInput.classList.toggle('active', tabId === 'input');
    DOM.tabSchedulerText.classList.toggle('active', tabId === 'text');

    // Toggle visibility for tab content sections
    DOM.schedulerInputModeSection.style.display = tabId === 'input' ? 'block' : 'none';
    DOM.schedulerTextModeSection.style.display = tabId === 'text' ? 'block' : 'none';

    if (tabId === 'text' && DOM.bossInputsContainer && DOM.schedulerBossListInput) {
        syncInputToText(DOM);
    }

    trackEvent('Click Button', { event_category: 'Interaction', event_label: `스케줄러 탭 전환: ${tabId === 'input' ? '입력 모드' : '텍스트 모드'}` });
}

function syncInputToText(DOM) {
    const currentSchedule = BossDataManager.getBossSchedule();
    const inputValuesMap = new Map();

    // 1. 입력 모드 DOM에서 최신 값 수집
    DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
        const bossName = item.querySelector('.boss-name').textContent;
        const timeSpan = item.querySelector('.calculated-spawn-time');
        const memoInput = item.querySelector('.memo-input');
        const timeText = timeSpan.textContent;

        if (timeText && timeText !== '--:--:--') {
            inputValuesMap.set(bossName, {
                time: timeText,
                memo: memoInput ? memoInput.value.trim() : ''
            });
        }
    });

    const listLines = [];
    const processedBossNames = new Set();

    // 2. 기존 스케줄 구조를 순회하며 텍스트 생성 (날짜 헤더 유지)
    currentSchedule.forEach(item => {
        if (item.type === 'date') {
            listLines.push(item.value);
        } else if (item.type === 'boss') {
            const updated = inputValuesMap.get(item.name);
            if (updated) {
                const line = updated.memo ? `${updated.time} ${item.name} (${updated.memo})` : `${updated.time} ${item.name}`;
                listLines.push(line);
                processedBossNames.add(item.name);
            }
        }
    });

    // 3. 기존 스케줄에 없었지만 입력 모드에서 새로 추가된 보스들 처리
    inputValuesMap.forEach((val, name) => {
        if (!processedBossNames.has(name)) {
            const line = val.memo ? `${val.time} ${name} (${val.memo})` : `${val.time} ${name}`;
            listLines.push(line);
        }
    });

    DOM.schedulerBossListInput.value = listLines.join('\n');
}

export function handleApplyBossSettings(DOM) {
    const isTextMode = DOM.tabSchedulerText && DOM.tabSchedulerText.classList.contains('active');

    if (isTextMode && DOM.schedulerBossListInput) {
        // Text Mode handling
        const result = parseBossList(DOM.schedulerBossListInput);
        if (!result.success) {
            alert("보스 시간표 값에 오류가 있어 적용할 수 없습니다.\n\n" + result.errors.join('\n'));
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 설정 적용 실패 (텍스트 모드)' });
            return;
        }
        BossDataManager.setBossSchedule(result.mergedSchedule);
    } else {
        // Input Mode handling
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

        // 7. Save
        BossDataManager.setBossSchedule(newScheduleItems);
    }

    // 8. Update UI & Post-processing
    updateBossListTextarea(DOM);

    _remainingTimes = {};
    _memoInputs = {}; // Reset memo inputs
    DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
        const bossNameSpan = item.querySelector('.boss-name');
        const timeInput = item.querySelector('.remaining-time-input');
        const memoInput = item.querySelector('.memo-input');

        if (bossNameSpan && timeInput) {
            const bossName = bossNameSpan.textContent;
            if (timeInput.value) _remainingTimes[bossName] = timeInput.value;
            if (memoInput && memoInput.value) _memoInputs[bossName] = memoInput.value;
        }
    });

    EventBus.emit('navigate', 'timetable-screen');
    log("보스 스케줄러에서 보스 시간표로 목록이 적용되었습니다.", true);
    trackEvent('Click Button', {
        event_category: 'Interaction',
        event_label: `보스 설정 적용 (${isTextMode ? '텍스트 모드' : '입력 모드'})`
    });
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
                const inputField = event.target;
                const bossName = inputField.dataset.bossName;
                _remainingTimes[bossName] = inputField.value; // Update state

                const remainingTime = inputField.value.trim();
                const calculatedTimeSpan = inputField.parentElement.querySelector('.calculated-spawn-time');
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

        DOM.bossSchedulerScreen.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                if (event.target.classList.contains('remaining-time-input')) {
                    event.preventDefault();
                    const currentInput = event.target;
                    const memoInput = currentInput.parentElement.querySelector('.memo-input');
                    if (memoInput) {
                        memoInput.focus();
                    }
                } else if (event.target.classList.contains('memo-input')) {
                    event.preventDefault();
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
                        const span = input.parentElement.querySelector('.calculated-spawn-time');
                        if (span) span.textContent = '--:--:--';
                    });
                    DOM.bossInputsContainer.querySelectorAll('.memo-input').forEach(input => {
                        input.value = '';
                    });

                    _remainingTimes = {};
                    _memoInputs = {};

                    log("모든 남은 시간과 메모가 삭제되었습니다.", true);
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '남은 시간 초기화' });
                }
            } else if (event.target === DOM.moveToBossSettingsButton) {
                handleApplyBossSettings(DOM);
            } else if (event.target === DOM.tabSchedulerInput) {
                showSchedulerTab(DOM, 'input');
            } else if (event.target === DOM.tabSchedulerText) {
                showSchedulerTab(DOM, 'text');
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
