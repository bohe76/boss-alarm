// src/screens/boss-scheduler.js
import { renderBossInputs, renderBossSchedulerScreen, updateBossListTextarea } from '../ui-renderer.js';
import { parseBossList } from '../boss-parser.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager } from '../data-managers.js';
import { padNumber } from '../utils.js';
import { trackEvent } from '../analytics.js';

let _remainingTimes = {}; // Encapsulated state for remaining times
let _memoInputs = {}; // Encapsulated state for memo inputs

function handleShowScreen(DOM) {
    // 1. Draft 데이터 확보 (없으면 Main에서 자동 복사됨)
    const draftSchedule = BossDataManager.getDraftSchedule();
    console.log('[Debug] handleShowScreen - draftSchedule:', draftSchedule);

    // 2. Draft -> 내부 UI 상태(_remainingTimes, _memoInputs) 동기화
    syncDraftToUIState(draftSchedule);
    console.log('[Debug] handleShowScreen - after syncDraftToUIState:', { _remainingTimes, _memoInputs });

    // 3. UI 렌더링 (드롭다운, 입력 필드, 텍스트 영역)
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs, draftSchedule);
    updateBossListTextarea(DOM, draftSchedule);

    // 4. 입력 필드의 계산된 시간(스팬) 업데이트
    updateCalculatedTimes(DOM);

    // 5. 탭 초기화 (기본: 입력 모드)
    showSchedulerTab(DOM, 'input');
}

/**
 * Draft 스케줄 데이터를 기반으로 입력 필드용 로컬 상태(_remainingTimes, _memoInputs)를 구축합니다.
 */
function syncDraftToUIState(draftSchedule) {
    console.log('[Debug] syncDraftToUIState - incoming draftSchedule:', draftSchedule);
    _remainingTimes = {};
    _memoInputs = {};
    const now = Date.now();

    draftSchedule.forEach(item => {
        if (item.type === 'boss' && item.time) {
            // 남은 시간 계산
            const targetDate = new Date(item.scheduledDate);
            const [h, m, s] = item.time.split(':').map(Number);
            targetDate.setHours(h, m, s || 0);

            const diffMs = targetDate.getTime() - now;

            const totalSeconds = Math.abs(Math.floor(diffMs / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            let timeStr;
            if (item.timeFormat === 'hms') {
                timeStr = `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`;
            } else {
                timeStr = `${padNumber(hours)}:${padNumber(minutes)}`;
            }

            // [ID 기반 관리] 이름이 겹쳐도 시간과 메모가 유실되지 않음
            _remainingTimes[item.id] = (diffMs < 0 ? '-' : '') + timeStr;
            _memoInputs[item.id] = item.memo || '';
        }
    });
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
/**
 * 입력 모드의 현재 값들을 바탕으로 Draft 스케줄을 완전히 재구성합니다.
 * 날짜 마커를 자동으로 계산하여 포함합니다.
 */
function syncInputToText(DOM) {
    const newBossItems = [];
    // 1. 입력 모드 DOM에서 유효한 보스 정보 수집 (계산된 시간이 있는 것만)
    DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
        const nameEl = item.querySelector('.boss-name');
        const timeEl = item.querySelector('.calculated-spawn-time');
        const memoEl = item.querySelector('.memo-input');

        if (nameEl && timeEl && timeEl.textContent !== '--:--:--') {
            const bossName = nameEl.textContent;
            const timeText = timeEl.textContent;
            const memoValue = memoEl ? memoEl.value.trim() : '';
            const inputEl = item.querySelector('.remaining-time-input');
            const calculatedDateStr = inputEl ? inputEl.dataset.calculatedDate : null;
            const timeFormat = inputEl ? (inputEl.dataset.timeFormat || 'hm') : 'hm';

            if (calculatedDateStr) {
                const scheduledDate = new Date(calculatedDateStr);
                const bossId = inputEl ? inputEl.dataset.id : `boss-${Date.now()}-${newBossItems.length}`;

                newBossItems.push({
                    id: bossId,
                    type: 'boss',
                    name: bossName,
                    time: timeText,
                    timeFormat: timeFormat,
                    memo: memoValue,
                    scheduledDate: scheduledDate
                });
            }
        }
    });

    // 2. 유효한 입력이 없으면 기존 Draft 유지 (SSOT 바탕 출력 원칙)
    if (newBossItems.length === 0) {
        const existingDraft = BossDataManager.getDraftSchedule();
        updateBossListTextarea(DOM, existingDraft);
        return;
    }

    // 3. 시간순 정렬
    newBossItems.sort((a, b) => a.scheduledDate - b.scheduledDate);

    // 4. 날짜 마커 추가 및 최종 스케줄 구성
    const updatedDraft = [];
    let lastDateStr = '';

    newBossItems.forEach(item => {
        const itemDate = item.scheduledDate;
        const itemDateStr = `${itemDate.getFullYear()}.${padNumber(itemDate.getMonth() + 1)}.${padNumber(itemDate.getDate())}`;

        if (itemDateStr !== lastDateStr) {
            updatedDraft.push({
                type: 'date',
                date: `${padNumber(itemDate.getMonth() + 1)}.${padNumber(itemDate.getDate())}`
            });
            lastDateStr = itemDateStr;
        }
        updatedDraft.push(item);
    });

    // 5. Draft 저장 및 텍스트 영역 갱신
    BossDataManager.setDraftSchedule(updatedDraft);
    updateBossListTextarea(DOM, updatedDraft);
}

/**
 * 텍스트 모드의 내용을 분석하여 Draft SSOT를 업데이트하고 UI를 동기화합니다.
 */
function syncTextToInput(DOM) {
    if (!DOM.schedulerBossListInput) return;

    const result = parseBossList(DOM.schedulerBossListInput);
    console.log('[Debug] syncTextToInput - parse result:', result);
    if (!result.success) return;

    // 1. 파싱 결과를 Draft에 저장 (SSOT 업데이트)
    const newDraft = result.mergedSchedule;
    BossDataManager.setDraftSchedule(newDraft);
    console.log('[Debug] syncTextToInput - newDraft set:', newDraft);

    // 2. Draft -> UI 상태 동기화
    syncDraftToUIState(newDraft);

    // 3. 입력 필드 재렌더링 (현재 편집 중인 Draft를 명시적으로 전달)
    if (DOM.gameSelect && DOM.gameSelect.value) {
        renderBossInputs(DOM, DOM.gameSelect.value, _remainingTimes, _memoInputs, newDraft);
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
        alert("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 설정 적용 버튼을 눌러 주세요.");
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

    // 네비게이션 연동
    EventBus.on('show-boss-scheduler-screen', () => handleShowScreen(DOM));

    // 1 & 2. 입력 모드 변경 감지 (Delegation)
    DOM.bossSchedulerScreen.addEventListener('input', (event) => {
        const target = event.target;

        // 텍스트 모드인 경우
        if (target === DOM.schedulerBossListInput) {
            syncTextToInput(DOM);
            return;
        }

        // 입력 모드인 경우 (남은 시간 입력 또는 메모 입력)
        if (target.classList.contains('remaining-time-input')) {
            const inputField = target;
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

            // UI 업데이트 후 Draft 동기화
            syncInputToText(DOM);
        } else if (target.classList.contains('memo-input')) {
            const bossName = target.dataset.bossName;
            _memoInputs[bossName] = target.value;

            // 메모 변경 후 Draft 동기화
            syncInputToText(DOM);
        }
    });

    EventBus.on('rerender-boss-scheduler', () => {
        renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);
        updateCalculatedTimes(DOM);
    });

    DOM.bossSchedulerScreen.addEventListener('change', (event) => {
        if (event.target === DOM.gameSelect) {
            const selectedGame = DOM.gameSelect.value;
            localStorage.setItem('lastSelectedGame', selectedGame); // 선택 정보 저장
            renderBossInputs(DOM, selectedGame, _remainingTimes, _memoInputs);
            updateCalculatedTimes(DOM);
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
