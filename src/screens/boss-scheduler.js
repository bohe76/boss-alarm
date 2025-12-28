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
    // Draft 데이터 로드 (없으면 Main에서 자동 생성)
    const draftSchedule = BossDataManager.getDraftSchedule();

    // 1. 텍스트 영역에 Draft 데이터 반영
    updateBossListTextarea(DOM, draftSchedule);

    // 2. 입력 모드 초기화 (Draft 데이터 기반)
    syncTextToInput(DOM);
    // syncTextToInput 내부에서 getDraftSchedule을 호출하여 렌더링하므로 
    // 여기서는 별도 인자 없이 호출해도 되지만, 명시적인 흐름을 위해 내부 로직 확인 필요.
    // 현재 구조상 syncTextToInput은 DOM 텍스트를 파싱하므로, 앞서 updateBossListTextarea로 
    // 텍스트를 채워뒀다면 파싱 결과가 Draft와 동일할 것임.

    // 3. 탭 초기화
    showSchedulerTab(DOM, 'input');
}

function showSchedulerTab(DOM, tabId) {
    if (!DOM.tabSchedulerInput || !DOM.tabSchedulerText || !DOM.schedulerInputModeSection || !DOM.schedulerTextModeSection) return;

    // Toggle active state for tab buttons
    DOM.tabSchedulerInput.classList.toggle('active', tabId === 'input');
    DOM.tabSchedulerText.classList.toggle('active', tabId === 'text');

    // Toggle visibility for tab content sections
    DOM.schedulerInputModeSection.style.display = tabId === 'input' ? 'block' : 'none';
    DOM.schedulerTextModeSection.style.display = tabId === 'text' ? 'block' : 'none';

    // 탭 전환 시에는 UI만 변경하고 데이터 동기화 동작은 최소화 (이미 Draft로 일원화됨)
    // 단, 각 모드에서 "마지막으로 입력한 상태"를 확실히 반영하기 위해 동기화 호출
    if (tabId === 'text' && DOM.bossInputsContainer && DOM.schedulerBossListInput) {
        // 입력 모드에서 텍스트 모드로 갈 때: 입력 필드 값 -> Draft -> 텍스트
        syncInputToText(DOM);
    } else if (tabId === 'input' && DOM.schedulerBossListInput) {
        // 텍스트 모드에서 입력 모드로 갈 때: 텍스트 값 -> Draft -> 입력 필드
        syncTextToInput(DOM);
    }

    trackEvent('Click Button', { event_category: 'Interaction', event_label: `스케줄러 탭 전환: ${tabId === 'input' ? '입력 모드' : '텍스트 모드'}` });
}

/**
 * 입력 모드의 정보를 Draft SSOT에 반영하고 텍스트 영역을 업데이트합니다.
 */
function syncInputToText(DOM) {
    const draftSchedule = BossDataManager.getDraftSchedule();
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

    // 2. Draft 데이터 업데이트 (날짜 구조 유지)
    const updatedDraft = draftSchedule.map(item => {
        if (item.type === 'boss') {
            const updated = inputValuesMap.get(item.name);
            if (updated) {
                // 시간이나 메모가 변경되었으면 업데이트
                // parseBossList가 시간을 'HH:MM:SS' 또는 'HH:MM'으로 파싱하므로,
                // timeFormat을 유지하면서 시간을 업데이트해야 함.
                // 여기서는 단순히 문자열 비교로 변경 여부 판단.
                if (item.time !== updated.time || item.memo !== updated.memo) {
                    // 기존 item의 timeFormat을 유지
                    return { ...item, time: updated.time, memo: updated.memo };
                }
            }
        }
        return item;
    });

    // 3. LocalStorage 및 상태 업데이트
    BossDataManager.setDraftSchedule(updatedDraft);

    // 4. 텍스트 영역 업데이트 (변경된 Draft 기반)
    updateBossListTextarea(DOM, updatedDraft);
}

/**
 * 텍스트 모드의 내용을 분석하여 Draft SSOT에 반영하고 입력 필드를 업데이트합니다.
 * 날짜와 구조는 기존 Draft를 기준으로 하고, 시간과 메모만 업데이트합니다.
 */
function syncTextToInput(DOM) {
    // 1. 텍스트 영역 파싱 (사용자 입력값 추출)
    const result = parseBossList(DOM.schedulerBossListInput);

    // 파싱된 데이터로 맵 생성 (이름 -> {시간, 메모, format})
    const textValuesMap = new Map();
    if (result.success) {
        result.mergedSchedule.forEach(item => {
            if (item.type === 'boss') {
                textValuesMap.set(item.name, {
                    time: item.time,
                    timeFormat: item.timeFormat,
                    memo: item.memo
                });
            }
        });
    }

    // 2. Draft 데이터 가져오기
    const draftSchedule = BossDataManager.getDraftSchedule();
    const now = Date.now();

    // 3. Draft 데이터 업데이트
    const updatedDraft = draftSchedule.map(item => {
        if (item.type === 'boss') {
            const userDraft = textValuesMap.get(item.name);
            if (userDraft) {
                // 구조 분해 할당으로 불필요한 속성 오염 방지
                return {
                    ...item,
                    time: userDraft.time,
                    timeFormat: userDraft.timeFormat,
                    memo: userDraft.memo
                };
            }
        }
        return item;
    });

    // 4. Draft 저장
    BossDataManager.setDraftSchedule(updatedDraft);

    // 5. 입력 필드 렌더링을 위한 데이터 준비 (남은 시간 계산)
    const newRemainingTimes = {};
    const newMemoInputs = {};
    const currentPresetBossNames = new Set(getBossNamesForGame(DOM.gameSelect.value));

    updatedDraft.forEach(item => {
        if (item.type === 'boss') {
            if (!currentPresetBossNames.has(item.name)) return;

            // 남은 시간 계산 (Draft에 저장된 날짜 + Draft에 저장된 시간)
            const targetDate = new Date(item.scheduledDate);
            const [h, m, s] = item.time.split(':').map(Number);
            targetDate.setHours(h, m, s || 0);

            const diffMs = targetDate.getTime() - now;

            if (diffMs > 0) {
                const totalSeconds = Math.floor(diffMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                let remainingStr;
                if (item.timeFormat === 'hms') {
                    remainingStr = `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`;
                } else {
                    remainingStr = `${padNumber(hours)}:${padNumber(minutes)}`;
                }
                newRemainingTimes[item.name] = remainingStr;
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

    // 현재 활성화된 탭의 데이터를 Draft에 최종 반영
    if (isTextMode && DOM.schedulerBossListInput) {
        syncTextToInput(DOM);
    } else {
        syncInputToText(DOM);
    }

    // Validation (Draft 기반)
    const draftSchedule = BossDataManager.getDraftSchedule();
    // 간단한 유효성 검사: 보스 데이터가 있는지
    const hasBosses = draftSchedule.some(item => item.type === 'boss');

    if (!hasBosses) {
        alert("보스 설정에 내용이 없습니다.");
        return;
    }

    // Commit Draft to Main
    BossDataManager.commitDraft();

    // UI 업데이트 (Main 기반으로 다시 로드)
    updateBossListTextarea(DOM); // Main SSOT 반영

    // 입력 필드 초기화 (저장되었으므로 남은 시간 등은 재계산되어 표시됨)
    _remainingTimes = {};
    _memoInputs = {};
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);

    EventBus.emit('navigate', 'timetable-screen');
    log("보스 설정이 적용되었습니다.", true);
    trackEvent('Click Button', {
        event_category: 'Interaction',
        event_label: `보스 설정 적용(${isTextMode ? '텍스트 모드' : '입력 모드'})`
    });
}


export function initBossSchedulerScreen(DOM) {
    if (!DOM.bossSchedulerScreen) return;

    // 이벤트 바인딩
    // 1. 입력 모드 변경 감지 -> 실시간 Draft 업데이트 및 텍스트 동기화
    // (성능을 위해 debounce 적용 고려 가능하나, 현재 규모에선 직접 호출)
    if (DOM.bossInputsContainer) { // Ensure container exists before adding listener
        DOM.bossInputsContainer.addEventListener('input', (event) => {
            if (event.target.classList.contains('remaining-time-input') ||
                event.target.classList.contains('memo-input')) {
                syncInputToText(DOM);
            }
        });
    }

    // 2. 텍스트 모드 변경 감지 -> 실시간 Draft 업데이트
    if (DOM.schedulerBossListInput) {
        DOM.schedulerBossListInput.addEventListener('input', () => {
            syncTextToInput(DOM);
        });
    }

    EventBus.on('rerender-boss-scheduler', () => {
        renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);
        updateCalculatedTimes(DOM);
    });

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

                // Draft 업데이트 (빈 값으로)
                syncInputToText(DOM);

                _remainingTimes = {}; // Clear local state
                _memoInputs = {}; // Clear local state

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

    // 화면 표시 핸들러
    DOM.bossSchedulerScreen.addEventListener('show-screen', () => handleShowScreen(DOM));
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
