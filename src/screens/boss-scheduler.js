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

    // 4. 입력 필드의 계산된 시간(스팬) 업데이트는 초기 렌더링 시 UI-Renderer가 담당함
    // updateCalculatedTimes(DOM); 제거

    // 5. 탭 초기화 (기본: 간편 입력 모드)
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

    // 1. 보스 아이템만 추출
    const allBosses = draftSchedule.filter(item => item.type === 'boss' && item.scheduledDate);

    // 2. 이름별로 그룹화하여 가장 적절한(미래 우선) 보스 선택
    const groupedByName = {};
    allBosses.forEach(boss => {
        if (!groupedByName[boss.name]) {
            groupedByName[boss.name] = [];
        }
        groupedByName[boss.name].push(boss);
    });

    Object.keys(groupedByName).forEach(name => {
        const instances = groupedByName[name];

        // 미래 보스들 중 가장 빠른 것 찾기
        const futureInstances = instances
            .filter(b => new Date(b.scheduledDate).getTime() > now)
            .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

        // 과거 보스들 중 가장 늦은(최근) 것 찾기
        const pastInstances = instances
            .filter(b => new Date(b.scheduledDate).getTime() <= now)
            .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

        // 우선순위: 미래 보스 > 과거 보스
        const bestInstance = futureInstances.length > 0 ? futureInstances[0] : (pastInstances.length > 0 ? pastInstances[0] : null);

        if (bestInstance) {
            const targetDate = new Date(bestInstance.scheduledDate);
            const diffMs = targetDate.getTime() - now;
            const totalSeconds = Math.abs(Math.floor(diffMs / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            let timeStr;
            if (bestInstance.timeFormat === 'hms') {
                timeStr = `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`;
            } else {
                timeStr = `${padNumber(hours)}:${padNumber(minutes)}`;
            }

            _remainingTimes[name] = (diffMs < 0 ? '-' : '') + timeStr;
            _memoInputs[name] = bestInstance.memo || '';
        }
    });
}

function showSchedulerTab(DOM, tabId) {
    if (!DOM.tabSchedulerInput || !DOM.tabSchedulerText || !DOM.schedulerInputModeSection || !DOM.schedulerTextModeSection) return;

    // 1. 텍스트 모드에서 간편 모드로 전환 시 유효성 검사 수행
    if (tabId === 'input' && DOM.schedulerBossListInput) {
        // 전환 전 검증 (알럿 포함)
        if (!syncTextToInput(DOM, false)) {
            // 검증 실패 시 텍스트 모드 유지
            DOM.tabSchedulerInput.classList.remove('active');
            DOM.tabSchedulerText.classList.add('active');
            DOM.schedulerInputModeSection.style.display = 'none';
            DOM.schedulerTextModeSection.style.display = 'block';
            return;
        }
    }

    // Toggle active state for tab buttons
    DOM.tabSchedulerInput.classList.toggle('active', tabId === 'input');
    DOM.tabSchedulerText.classList.toggle('active', tabId === 'text');

    // Toggle visibility for tab content sections
    DOM.schedulerInputModeSection.style.display = tabId === 'input' ? 'block' : 'none';
    DOM.schedulerTextModeSection.style.display = tabId === 'text' ? 'block' : 'none';

    // 2. 탭 전환 후 데이터 동기화
    if (tabId === 'text' && DOM.bossInputsContainer && DOM.schedulerBossListInput) {
        // 간편 입력 모드에서 텍스트 모드로 갈 때: 입력 필드 값 -> Draft -> 텍스트
        syncInputToText(DOM);
    }

    trackEvent('Click Button', { event_category: 'Interaction', event_label: `스케줄러 탭 전환: ${tabId === 'input' ? '간편 입력 모드' : '텍스트 모드'}` });
}

/**
 * 간편 입력 모드의 정보를 Draft SSOT에 반영하고 텍스트 영역을 업데이트합니다.
 */
/**
 * 간편 입력 모드의 현재 값들을 바탕으로 Draft 스케줄을 완전히 재구성합니다.
 * 날짜 마커를 자동으로 계산하여 포함합니다.
 */
function syncInputToText(DOM) {
    const newBossItems = [];
    // 1. 간편 입력 모드 DOM에서 유효한 보스 정보 수집 (계산된 시간이 있는 것만)
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

    // 3. 24시간 자동 확장 및 정규화
    const updatedDraft = BossDataManager.expandSchedule(newBossItems);

    // 4. Draft 저장 및 텍스트 영역 갱신
    BossDataManager.setDraftSchedule(updatedDraft);
    updateBossListTextarea(DOM, updatedDraft);
}

/**
 * 텍스트 모드의 내용을 분석하여 Draft SSOT를 업데이트하고 UI를 동기화합니다.
 * @param {boolean} silent 유효성 검사 실패 시 알럿을 띄울지 여부
 */
function syncTextToInput(DOM, silent = true) {
    if (!DOM.schedulerBossListInput) return false;

    const result = parseBossList(DOM.schedulerBossListInput);
    if (!result.success) {
        if (!silent) alert("텍스트 형식 오류:\n" + result.errors.join('\n'));
        return false;
    }

    const newDraft = result.mergedSchedule;

    // [신규] 논리적 유효성 검사 (젠 주기 준수 여부)
    const validation = BossDataManager.validateBossSchedule(newDraft);
    if (!validation.isValid) {
        if (!silent) alert("보스 시간 설정 오류\n" + "------------------------\n" + validation.message);
        return false;
    }

    // 1. 파싱 및 검증 결과를 Draft에 저장 (SSOT 업데이트)
    BossDataManager.setDraftSchedule(newDraft);

    // 2. Draft -> UI 상태 동기화
    syncDraftToUIState(newDraft);

    // 3. 입력 필드 재렌더링 (현재 편집 중인 Draft를 명시적으로 전달)
    if (DOM.gameSelect && DOM.gameSelect.value) {
        renderBossInputs(DOM, DOM.gameSelect.value, _remainingTimes, _memoInputs, newDraft);
    }
    return true;
}

export function handleApplyBossSettings(DOM) {
    const isTextMode = DOM.tabSchedulerText && DOM.tabSchedulerText.classList.contains('active');

    // 현재 활성화된 탭의 데이터를 Draft에 최종 반영 (이 과정에서 유효성 검사 수행)
    if (isTextMode && DOM.schedulerBossListInput) {
        if (!syncTextToInput(DOM, false)) return;
    } else {
        syncInputToText(DOM);
    }

    // 최종 검증 (Draft 기반)
    const draftSchedule = BossDataManager.getDraftSchedule();
    const hasBosses = draftSchedule.some(item => item.type === 'boss');

    if (!hasBosses) {
        alert("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 시간 업데이트 버튼을 눌러 주세요.");
        return;
    }

    // Commit Draft to Main (내부적으로 _expandAndReconstruct 호출됨)
    BossDataManager.commitDraft();

    // UI 업데이트 (Main 기반으로 다시 로드 - 24시간 확장된 결과가 반영됨)
    updateBossListTextarea(DOM);

    // 입력 필드 초기화 및 화면 전환
    _remainingTimes = {};
    _memoInputs = {};
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);

    EventBus.emit('navigate', 'timetable-screen');
    log("보스 시간이 업데이트되었습니다.", true);
    trackEvent('Click Button', {
        event_category: 'Interaction',
        event_label: `보스 시간 업데이트(${isTextMode ? '텍스트 모드' : '간편 입력 모드'})`
    });
}


export function initBossSchedulerScreen(DOM) {
    if (!DOM.bossSchedulerScreen) return;

    // 네비게이션 연동
    EventBus.on('show-boss-scheduler-screen', () => handleShowScreen(DOM));

    // 1 & 2. 간편 입력 모드 변경 감지 (Delegation)
    DOM.bossSchedulerScreen.addEventListener('input', (event) => {
        const target = event.target;

        // 텍스트 모드인 경우
        if (target === DOM.schedulerBossListInput) {
            syncTextToInput(DOM);
            return;
        }

        // 간편 입력 모드인 경우 (남은 시간 입력 또는 메모 입력)
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
            // # 기호는 텍스트 모드 구분자이므로 입력 제한
            if (target.value.includes('#')) {
                log('비고에는 "#" 기호를 사용할 수 없습니다.', true);
                target.value = target.value.replace(/#/g, '');
            }

            const bossName = target.dataset.bossName;
            _memoInputs[bossName] = target.value;

            // 메모 변경 후 Draft 동기화
            syncInputToText(DOM);
        }
    });

    EventBus.on('rerender-boss-scheduler', () => {
        renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs);
        // updateCalculatedTimes(DOM); 호출 삭제
    });

    DOM.bossSchedulerScreen.addEventListener('change', (event) => {
        if (event.target === DOM.gameSelect) {
            const selectedGame = DOM.gameSelect.value;
            localStorage.setItem('lastSelectedGame', selectedGame); // 선택 정보 저장
            renderBossInputs(DOM, selectedGame, _remainingTimes, _memoInputs);
            // updateCalculatedTimes(DOM); 호출 삭제
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

// updateCalculatedTimes 함수 완전 삭제 (SSOT 오염의 원인)


export function getScreen() {
    return {
        id: 'boss-scheduler-screen',
        init: initBossSchedulerScreen
    };
}
