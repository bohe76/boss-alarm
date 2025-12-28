// src/screens/boss-scheduler.js
import { renderBossInputs, renderBossSchedulerScreen, updateBossListTextarea } from '../ui-renderer.js';
import { parseBossList, reconstructSchedule } from '../boss-parser.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager } from '../data-managers.js';
import { generateUniqueId, padNumber } from '../utils.js';
import { trackEvent } from '../analytics.js';
import { getBossNamesForGame } from '../boss-scheduler-data.js';

let _remainingTimes = {}; // Encapsulated state for remaining times
let _memoInputs = {}; // Encapsulated state for memo inputs

function handleShowScreen(DOM) {
    // 진입 시점에 현재 BossDataManager의 데이터를 텍스트 영역에 먼저 반영
    updateBossListTextarea(DOM);
    // 텍스트 모드 데이터를 기반으로 입력 모드 초기화
    syncTextToInput(DOM);

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
    } else if (tabId === 'input' && DOM.schedulerBossListInput) {
        syncTextToInput(DOM);
    }

    trackEvent('Click Button', { event_category: 'Interaction', event_label: `스케줄러 탭 전환: ${tabId === 'input' ? '입력 모드' : '텍스트 모드'}` });
}

/**
 * 입력 모드의 정보를 텍스트 모드로 동기화합니다.
 */
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

/**
 * SSOT(BossDataManager)의 데이터를 기반으로 입력 모드를 동기화합니다.
 */
function syncTextToInput(DOM) {
    const currentSchedule = BossDataManager.getBossSchedule();
    const now = Date.now();
    const newRemainingTimes = {};
    const newMemoInputs = {};

    // 현재 게임 프리셋에 있는 보스 이름 목록
    const currentPresetBossNames = new Set(getBossNamesForGame(DOM.gameSelect.value));

    // SSOT에서 직접 데이터를 가져와서 남은 시간 계산
    currentSchedule.forEach(item => {
        if (item.type === 'boss') {
            // 현재 프리셋에 있는 보스만 동기화
            if (!currentPresetBossNames.has(item.name)) return;

            const diffMs = item.scheduledDate.getTime() - now;
            if (diffMs > 0) {
                const totalSeconds = Math.floor(diffMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                let timeStr;
                if (item.timeFormat === 'hms') {
                    timeStr = `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`;
                } else {
                    timeStr = `${padNumber(hours)}:${padNumber(minutes)}`;
                }
                newRemainingTimes[item.name] = timeStr;
            }
            if (item.memo) {
                newMemoInputs[item.name] = item.memo;
            }
        }
    });

    _remainingTimes = newRemainingTimes;
    _memoInputs = newMemoInputs;

    // 입력 필드 재렌더링
    if (DOM.gameSelect) {
        renderBossInputs(DOM, DOM.gameSelect.value, _remainingTimes, _memoInputs);
        updateCalculatedTimes(DOM);
    }
}

export function handleApplyBossSettings(DOM) {
    const isTextMode = DOM.tabSchedulerText && DOM.tabSchedulerText.classList.contains('active');

    if (isTextMode && DOM.schedulerBossListInput) {
        const result = parseBossList(DOM.schedulerBossListInput);
        if (!result.success) {
            alert("보스 시간표 값에 오류가 있어 적용할 수 없습니다.\n\n" + result.errors.join('\n'));
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 설정 적용 실패 (텍스트 모드)' });
            return;
        }
        BossDataManager.setBossSchedule(result.mergedSchedule);
    } else {
        // Input Mode handling
        const hasValidInput = Array.from(DOM.bossInputsContainer.querySelectorAll('.remaining-time-input'))
            .some(input => input.value.trim() !== '' && input.dataset.calculatedDate);

        if (!hasValidInput) {
            alert("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 설정 적용 버튼을 눌러 주세요.");
            return;
        }

        const currentSchedule = BossDataManager.getBossSchedule();
        const existingBossesForMap = currentSchedule.filter(item => item.type === 'boss');
        const bossMap = new Map();
        existingBossesForMap.forEach(boss => bossMap.set(boss.id, boss));

        let currentBosses = [];

        DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
            const bossName = item.querySelector('.boss-name').textContent;
            const remainingTimeInput = item.querySelector('.remaining-time-input');
            const memoInput = item.querySelector('.memo-input');
            const remainingTime = remainingTimeInput.value;
            const bossId = remainingTimeInput.dataset.id;
            const calculatedDateIso = remainingTimeInput.dataset.calculatedDate;
            const memo = memoInput ? memoInput.value.trim() : '';

            if (remainingTime && calculatedDateIso) {
                const appearanceTime = new Date(calculatedDateIso);
                const timeStr = `${padNumber(appearanceTime.getHours())}:${padNumber(appearanceTime.getMinutes())}:${padNumber(appearanceTime.getSeconds())}`;
                const timeFormat = remainingTimeInput.dataset.timeFormat || 'hms';

                const bossData = {
                    time: timeStr,
                    scheduledDate: appearanceTime,
                    timeFormat: timeFormat,
                    memo: memo,
                    alerted_5min: false,
                    alerted_1min: false,
                    alerted_0min: false
                };

                if (bossId && bossMap.has(bossId)) {
                    currentBosses.push({ ...bossMap.get(bossId), ...bossData });
                } else {
                    currentBosses.push({ type: 'boss', id: generateUniqueId(), name: bossName, ...bossData });
                }
            }
        });

        // Filtering & Sorting
        const todayString = new Date().toDateString();
        currentBosses = currentBosses.filter(boss => {
            const isInvasionBoss = boss.name.includes("침공");
            return !isInvasionBoss || boss.scheduledDate.toDateString() === todayString;
        });
        currentBosses.sort((a, b) => a.scheduledDate - b.scheduledDate);

        // Reconstruction & Save
        BossDataManager.setBossSchedule(reconstructSchedule(currentBosses));
    }

    updateBossListTextarea(DOM);
    EventBus.emit('navigate', 'timetable-screen');
    log("보스 설정이 적용되었습니다.", true);
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
            }
        });

        DOM.bossSchedulerScreen.addEventListener('input', (event) => {
            if (event.target.classList.contains('remaining-time-input')) {
                const inputField = event.target;
                const bossName = inputField.dataset.bossName;
                _remainingTimes[bossName] = inputField.value;

                const remainingTime = inputField.value.trim();
                const calculatedTimeSpan = inputField.parentElement.querySelector('.calculated-spawn-time');
                const calculatedDate = calculateBossAppearanceTime(remainingTime);

                if (remainingTime) {
                    const isNumeric = /^\d+$/.test(remainingTime);
                    const isHms = (isNumeric && remainingTime.length === 6) || (!isNumeric && remainingTime.split(':').length === 3);
                    inputField.dataset.timeFormat = isHms ? 'hms' : 'hm';
                }

                if (calculatedDate && calculatedTimeSpan) {
                    const timeFormat = inputField.dataset.timeFormat;
                    let timeString = `${padNumber(calculatedDate.getHours())}:${padNumber(calculatedDate.getMinutes())}`;
                    if (timeFormat === 'hms') timeString += `:${padNumber(calculatedDate.getSeconds())}`;

                    calculatedTimeSpan.textContent = timeString;
                    inputField.dataset.calculatedDate = calculatedDate.toISOString();
                } else {
                    if (calculatedTimeSpan) calculatedTimeSpan.textContent = '--:--:--';
                    delete inputField.dataset.calculatedDate;
                }
            } else if (event.target.classList.contains('memo-input')) {
                _memoInputs[event.target.dataset.bossName] = event.target.value;
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
