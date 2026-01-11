// src/screens/boss-scheduler.js
import { renderBossInputs, renderBossSchedulerScreen, updateBossListTextarea, renderGameSelect } from '../ui-renderer.js';
import { parseBossList } from '../boss-parser.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager, LocalStorageManager } from '../data-managers.js';
import { padNumber } from '../utils.js';
import { trackEvent } from '../analytics.js';
import { getBossNamesForGame, isPresetList } from '../boss-scheduler-data.js';
import { openCustomListModalForMigration } from './custom-list.js';

let _remainingTimes = {}; // Encapsulated state for remaining times
let _memoInputs = {}; // Encapsulated state for memo inputs
let _isDirty = false; // 변경 사항 감지용 플래그

function handleShowScreen(DOM) {
    // 0. 현재 선택된 게임 ID 확인
    const currentListId = LocalStorageManager.get('lastSelectedGame') || 'default';

    // 1. 해당 List의 Draft 데이터 확보
    let draftSchedule = BossDataManager.getDraftSchedule(currentListId);
    console.log('[DEBUG] handleShowScreen - draftSchedule:', draftSchedule);

    // [SSOT 원칙 준수] Draft가 비어있다면, '가짜 데이터'를 만드는 게 아니라
    // 1. Main SSOT에 저장된 데이터가 있는지 확인하여 복원하거나
    // 2. 없다면 '빈 상태(Null)'로 정직하게 초기화해야 함.
    if ((!draftSchedule || draftSchedule.length === 0) && isPresetList(currentListId)) {
        console.log(`[DEBUG] Draft is empty for preset '${currentListId}'. Checking Main SSOT for hydration.`);

        const mainSchedule = BossDataManager.getBossSchedule(); // Main SSOT 로드
        const bossNames = getBossNamesForGame(currentListId); // 메타데이터 이름 목록

        // Main SSOT에서 현재 리스트에 속한 보스들만 필터링 (이름 매칭)
        // (주의: Main SSOT는 여러 게임의 보스가 섞여있을 수 있음)
        const existingSSOTData = mainSchedule.filter(item =>
            item.type === 'boss' && bossNames.includes(item.name)
        );

        if (existingSSOTData.length > 0) {
            console.log(`[DEBUG] Found existing data in SSOT (${existingSSOTData.length} items). Syncing to Draft.`);
            // SSOT -> Draft 복제 (Deep Copy)
            // 이때 SSOT에 없는 보스(새로 추가된 보스 등)는 아래에서 병합해주는 게 완벽하지만,
            // 일단 V2는 SSOT가 우선이므로 SSOT를 그대로 가져옴.
            draftSchedule = JSON.parse(JSON.stringify(existingSSOTData));

            // [보정] 만약 SSOT 데이터 개수가 메타데이터보다 적다면? (보스 추가된 경우)
            // 없는 보스는 빈 상태로 채워넣어야 함.
            if (draftSchedule.length < bossNames.length) {
                const existingNames = draftSchedule.map(b => b.name);
                const missingNames = bossNames.filter(n => !existingNames.includes(n));
                missingNames.forEach((n, idx) => {
                    const metaInterval = BossDataManager.getBossInterval(n, currentListId);
                    draftSchedule.push({
                        id: `boss-${Date.now()}-missing-${idx}`,
                        type: 'boss',
                        name: n,
                        scheduledDate: null,
                        memo: '',
                        interval: metaInterval || 0
                    });
                });
            }
        } else {
            console.log(`[DEBUG] No SSOT data found. Initializing Clean Draft (Time: Null).`);
            // 데이터가 아예 없으면 -> 빈 껍데기 생성 (입력창은 나와야 하므로)
            draftSchedule = bossNames.map((name, index) => {
                const metaInterval = BossDataManager.getBossInterval(name, currentListId);
                return {
                    id: `boss-${Date.now()}-${index}`,
                    type: 'boss',
                    name: name,
                    scheduledDate: null, // [중요] 비어있어야 함
                    memo: '',
                    interval: metaInterval || 0
                };
            });
        }

        // 초기화된 Draft를 즉시 저장 (UI에서 다시 읽을 수 있게)
        BossDataManager.setDraftSchedule(currentListId, draftSchedule);
    }
    // 2. Draft -> 내부 UI 상태(_remainingTimes, _memoInputs) 동기화
    // 'Nearest Future' 로직을 적용하여 항상 올바른 양수 시간을 표시합니다.
    console.log('[DEBUG] handleShowScreen - currentListId:', currentListId);
    console.log('[DEBUG] handleShowScreen - draftSchedule:', draftSchedule);
    syncDraftToUIState(draftSchedule, currentListId);
    console.log('[DEBUG] After Sync - _remainingTimes:', _remainingTimes);

    // 4. UI 렌더링 (드롭다운, 입력 필드, 텍스트 영역)
    renderGameSelect(DOM, currentListId); // 게임 목록 드롭다운 렌더링 추가
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs, draftSchedule);
    updateBossListTextarea(DOM, draftSchedule, isPresetList(currentListId));

    // 5. 탭 초기화 (기본: 간편 입력 모드)
    showSchedulerTab(DOM, 'input', true); // isInitial: true

    // 진입 시에는 더티 상태 초기화
    _isDirty = false;
}

/**
 * Draft 스케줄 데이터를 기반으로 입력 필드용 로컬 상태(_remainingTimes, _memoInputs)를 구축합니다.
 * 이때 Anchor Boss Logic을 적용하여 '현재 시점과 가장 가까운 미래 젠 시간'을 계산합니다.
 */
function syncDraftToUIState(draftSchedule, listId) {
    _remainingTimes = {};
    _memoInputs = {};
    const now = Date.now();

    // 1. 보스 아이템만 추출
    const allBosses = draftSchedule.filter(item => item.type === 'boss' && item.scheduledDate);

    // 2. 이름별로 그룹화
    const groupedByName = {};
    allBosses.forEach(boss => {
        if (!groupedByName[boss.name]) {
            groupedByName[boss.name] = [];
        }
        groupedByName[boss.name].push(boss);
    });

    Object.keys(groupedByName).forEach(name => {
        const instances = groupedByName[name];
        if (instances.length === 0) return;

        // 3. Anchor Boss Logic 적용
        // 가장 최신의(미래에 가까운) 인스턴스를 앵커로 잡습니다.
        // 정렬: 날짜 내림차순 (먼 미래 -> 과거)
        instances.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
        const anchorInstance = instances[0];

        let targetDate = new Date(anchorInstance.scheduledDate);

        // 젠 주기 가져오기 (SSOT에 이미 interval이 주입되어 있다고 가정)
        // [SSOT 철학 준수] 메타데이터 참조 없이 Draft 데이터만 사용
        const intervalMinutes = anchorInstance.interval || 0;
        const intervalMs = intervalMinutes * 60 * 1000;

        // [핵심] Interval이 있다면 현재 시점에서 가장 가까운 미래(Nearest Future)로 보정
        // 과거라면 미래로 당기고, 너무 먼 미래라면 현재 근처로 당김 (Bidirectional)
        if (intervalMs > 0) {
            targetDate = calculateNearestFutureTime(targetDate, intervalMs, now);
            // [UI 동기화 보강] 계산된 미래 시간을 원본 객체(Draft)에도 반영해야 
            // renderBossInputs에서 '미래 데이터'로 인식하고 젠 예정 시각을 표시해줌.
            anchorInstance.scheduledDate = targetDate.toISOString();
        }

        const diffMs = targetDate.getTime() - now;

        // 혹시라도 계산 결과가 음수라면(젠 주기가 없거나 One-time), 그대로 표시하거나 0 처리
        // 하지만 위 로직으로 대부분 해결됨.

        let timeStr = '';

        if (diffMs < 0 && intervalMs <= 0) {
            // [수정] 1회성 보스(Interval 0)이면서 이미 시간이 지났다면, 
            // 00:00 대신 아예 빈 값으로 두어 젠 시간을 표시하지 않음 (User Request)
            timeStr = '';
        } else {
            const totalSeconds = Math.max(0, Math.floor(diffMs / 1000)); // 음수 방어
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (anchorInstance.timeFormat === 'hms') {
                timeStr = padNumber(hours) + ':' + padNumber(minutes) + ':' + padNumber(seconds);
            } else {
                timeStr = padNumber(hours) + ':' + padNumber(minutes);
            }
        }

        _remainingTimes[name] = timeStr;
        _memoInputs[name] = anchorInstance.memo || '';
    });
}

function calculateNearestFutureTime(anchorDate, intervalMs, now) {
    const anchorTime = anchorDate.getTime();
    const diff = now - anchorTime;
    // diff가 양수(과거 앵커)면 n은 양수 -> 미래로 이동
    // diff가 음수(미래 앵커)면 n은 음수 -> 과거로 이동(현재에 가깝게)
    // ceil을 사용하여 '현재보다 같거나 큰' 최소 시간을 찾음
    const n = Math.ceil(diff / intervalMs);
    return new Date(anchorTime + n * intervalMs);
}

function showSchedulerTab(DOM, tabId, isInitial = false) {
    if (!DOM.tabSchedulerInput || !DOM.tabSchedulerText || !DOM.schedulerInputModeSection || !DOM.schedulerTextModeSection) return;

    // 1. 더티 체크 (탭 전환 시)
    if (!isInitial && _isDirty) {
        if (!confirm('수정된 내용이 있습니다. 저장하지 않고 모드를 변경하시겠습니까?')) {
            return;
        }
        // 확인을 눌렀다면 더티 상태 초기화 (강제 전환)
        _isDirty = false;
    }

    // 2. 텍스트 모드에서 간편 모드로 전환 시 유효성 검사 수행
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

    const modeLabel = tabId === 'input' ? '간편 입력 모드' : '텍스트 모드';
    trackEvent('Click Button', { event_category: 'Interaction', event_label: '스케줄러 탭 전환: ' + modeLabel });
}

/**
 * 간편 입력 모드의 값을 특정 List ID의 Draft에 저장하거나, 현재 선택된 모드에 맞게 처리함.
 * listId 파라미터가 있으면 해당 ID로 저장, 없으면 현재 선택된 게임 ID 사용.
 */
function syncInputToText(DOM, isSilent = false, targetListId = null) {
    const listId = targetListId || LocalStorageManager.get('lastSelectedGame') || 'default';

    // 텍스트 모드에서 -> 간편 모드 전환 시 (또는 텍스트 모드 데이터 파싱)
    const isTextMode = DOM.tabSchedulerText && DOM.tabSchedulerText.classList.contains('active');

    // 만약 호출자가 명시적으로 텍스트 모드 파싱을 원하지 않고(단순 저장용 등), 간편 모드 상태라면 간편 모드를 저장
    // 하지만 탭 전환 로직에서는 현재 활성 탭 기준으로 동작해야 함.

    // [탭 스위칭 시나리오]
    // A탭(간편모드) -> B탭 클릭 -> syncInputToText(DOM, true, 'A') 호출 -> A의 간편 입력값 저장 -> OK
    // A탭(텍스트모드) -> B탭 클릭 -> syncInputToText(DOM, true, 'A') 호출 -> A의 텍스트값 저장 -> OK

    if (isTextMode && !targetListId) { // targetListId가 없으면 현재 화면의 텍스트 모드
        const parseResult = parseBossList(DOM.schedulerBossListInput);

        if (!parseResult.success) {
            if (!isSilent) alert('입력 오류:\n' + parseResult.errors.join('\n'));
            return false;
        }

        // 파싱된 결과를 Draft에 저장
        BossDataManager.setDraftSchedule(listId, parseResult.mergedSchedule);

        // 간편 모드 갱신 (선택적: 현재 화면이면 갱신해야 하지만, 떠나는 탭이면 굳이? 하지만 일관성 위해)
        if (!targetListId) {
            // 현재 화면을 위한 호출이었다면 UI 상태도 갱신
            syncDraftToUIState(parseResult.mergedSchedule);
        }
        return true;
    } else { // 간편 입력 모드 또는 targetListId가 있는 경우 (다른 탭의 데이터 저장)
        // 간편 입력 모드 -> Draft (기존 로직)
        const newBossItems = [];
        // 1. 간편 입력 모드 DOM에서 유효한 보스 정보 수집
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
                    const bossId = inputEl ? inputEl.dataset.id : 'boss-' + Date.now() + '-' + newBossItems.length;

                    const hhEl = item.querySelector('.interval-hh');
                    const mmEl = item.querySelector('.interval-mm');
                    let interval = 0;
                    if (hhEl && mmEl) {
                        const hh = parseInt(hhEl.value, 10) || 0;
                        const mm = parseInt(mmEl.value, 10) || 0;
                        interval = (hh * 60) + mm;
                    }

                    newBossItems.push({
                        id: bossId,
                        type: 'boss',
                        name: bossName,
                        time: timeText,
                        timeFormat: timeFormat,
                        memo: memoValue,
                        interval: interval,
                        scheduledDate: scheduledDate
                    });
                }
            }
        });

        // 2. Draft 저장 (빈 배열이라도 저장해야 함 - 삭제된 경우)
        BossDataManager.setDraftSchedule(listId, newBossItems);

        // 3. 텍스트 영역 업데이트 (현재 화면인 경우)
        if (!targetListId) {
            updateBossListTextarea(DOM, newBossItems, isPresetList(listId));
        }
        return true;
    }
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
    const currentListId = LocalStorageManager.get('lastSelectedGame') || 'default';

    // [보헤님 지시: 프리셋 보호 및 이관 로직]
    if (isPresetList(currentListId)) {
        const officialBossNames = getBossNamesForGame(currentListId);
        const inputBossNames = newDraft.map(b => b.name);

        // 입력된 이름 중 프리셋에 없는 것이 하나라도 있는지 확인
        const hasNameChange = inputBossNames.some(name => !officialBossNames.includes(name));

        if (hasNameChange) {
            if (!silent) {
                const confirmMsg = `보스 이름이 프리셋과 다릅니다.\n이대로 저장하면 시스템 자동 업데이트를 받을 수 없으므로,\n'커스텀 보스 목록'으로 이동하여 저장해야 합니다.\n\n커스텀 보스 관리 화면으로 이동하시겠습니까?`;
                if (confirm(confirmMsg)) {
                    // 커스텀 모달 오픈 (데이터 주입)
                    openCustomListModalForMigration(DOM, currentListId, DOM.schedulerBossListInput.value);
                    return false; // 현재 화면 저장은 중단
                } else {
                    return false; // 취소 시 아무것도 하지 않음 (사용자가 수정하도록 유도)
                }
            } else {
                // 백그라운드 싱크 중에는 이름 변경 시 드래프트 반영을 차단 (SSOT 보호)
                return false;
            }
        }
    }

    // [신규] 논리적 유효성 검사 (젠 주기 준수 여부)
    const validation = BossDataManager.validateBossSchedule(newDraft);
    if (!validation.isValid) {
        if (!silent) {
            const forceApply = confirm("보스 시간 설정 경고\n" + "------------------------\n" + validation.message + "\n\n이대로 강제 저장하시겠습니까?");
            if (!forceApply) return false;
        } else {
            return false;
        }
    }

    // 1. 파싱 및 검증 결과를 Draft에 저장 (SSOT 업데이트)
    BossDataManager.setDraftSchedule(currentListId, newDraft);

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
    const currentListId = LocalStorageManager.get('lastSelectedGame') || 'default';

    // 현재 활성화된 탭의 데이터를 Draft에 최종 반영 (이 과정에서 유효성 검사 수행)
    if (isTextMode && DOM.schedulerBossListInput) {
        if (!syncTextToInput(DOM, false)) return; // syncTextToInput 내부에서 currentListId 사용
    } else {
        syncInputToText(DOM, false, currentListId);

        // [신규] 간편 입력 모드 최종 유효성 검사 (Bohe 님 지시)
        const draftScheduleForValidation = BossDataManager.getDraftSchedule(currentListId);
        const validation = BossDataManager.validateBossSchedule(draftScheduleForValidation);
        if (!validation.isValid) {
            const forceApply = confirm("보스 시간 설정 경고\n" + "------------------------\n" + validation.message + "\n\n이대로 강제 저장하시겠습니까?");
            if (!forceApply) return; // 사용자가 취소하면 중단
        }
    }

    // 최종 검증 (Draft 기반)
    const draftSchedule = BossDataManager.getDraftSchedule(currentListId);
    const hasBosses = draftSchedule.some(item => item.type === 'boss');

    if (!hasBosses) {
        alert("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 시간 업데이트 버튼을 눌러 주세요.");
        return;
    }

    // Commit Draft to Main (List ID 전달)
    BossDataManager.commitDraft(currentListId);

    // 저장 성공 시 더티 상태 초기화
    _isDirty = false;

    // UI 업데이트 (Main 기반으로 다시 로드 - 24시간 확장된 결과가 반영됨)
    updateBossListTextarea(DOM, draftSchedule); // 여기서는 Main SSOT를 보여주는 게 맞음? 
    // -> 아니오, 업데이트 후에도 여전히 '현재 탭'의 Draft(이자 Main)를 보여주면 됨.
    // BossDataManager.commitDraft 내부에서 setBossSchedule을 하므로 SSOT는 갱신됨.
    // UI는 어차피 navigate로 timetable 화면으로 넘어감.

    // 입력 필드 초기화 및 화면 전환
    _remainingTimes = {};
    _memoInputs = {};
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs); // 초기화된 상태로 렌더링

    EventBus.emit('navigate', 'timetable-screen');
    log("보스 시간이 업데이트되었습니다.", true);
    const updateLabel = '보스 시간 업데이트(' + (isTextMode ? '텍스트 모드' : '간편 입력 모드') + ')';
    trackEvent('Click Button', {
        event_category: 'Interaction',
        event_label: updateLabel
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
            _isDirty = true; // 변경 감지
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
                let timeString = padNumber(calculatedDate.getHours()) + ':' + padNumber(calculatedDate.getMinutes());
                if (timeFormat === 'hms') timeString += ':' + padNumber(calculatedDate.getSeconds());

                calculatedTimeSpan.textContent = timeString;
                inputField.dataset.calculatedDate = calculatedDate.toISOString();
            } else {
                if (calculatedTimeSpan) calculatedTimeSpan.textContent = '--:--:--';
                delete inputField.dataset.calculatedDate;
            }

            // UI 업데이트 후 Draft 동기화
            syncInputToText(DOM);
            _isDirty = true; // 변경 감지
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
            _isDirty = true; // 변경 감지
        } else if (target.classList.contains('interval-hh') || target.classList.contains('interval-mm')) {
            // 젠 시간(interval) 입력 로직 (Bohe 님 방식)
            const bossName = target.dataset.bossName;
            const container = target.closest('.boss-input-item');
            const hhInput = container.querySelector('.interval-hh');
            const mmInput = container.querySelector('.interval-mm');

            // 값 추출 및 보정
            let hh = parseInt(hhInput.value, 10) || 0;
            let mm = parseInt(mmInput.value, 10) || 0;

            // mm이 60을 넘으면 hh로 올림 (지능형 보조)
            if (mm >= 60) {
                hh += Math.floor(mm / 60);
                mm = mm % 60;
                hhInput.value = hh;
                mmInput.value = padNumber(mm);
            }

            // 동일한 보스 이름을 가진 모든 입력 필드 동기화 (Bohe 님 원칙)
            // 동일한 보스 이름을 가진 모든 입력 필드 동기화 (Bohe 님 원칙)
            DOM.bossInputsContainer.querySelectorAll('.interval-hh[data-boss-name="' + bossName + '"]').forEach(el => {
                if (el !== hhInput) el.value = hh;
            });
            DOM.bossInputsContainer.querySelectorAll('.interval-mm[data-boss-name="' + bossName + '"]').forEach(el => {
                if (el !== mmInput) el.value = padNumber(mm);
            });

            // 내부 Draft 동기화 및 텍스트 영역 반영
            syncInputToText(DOM);
            _isDirty = true; // 변경 감지
        }
    });

    // 젠 주기 입력 필드 포커스 아웃 시 보정 (유효성 검사는 버튼 클릭 시로 이동)
    DOM.bossSchedulerScreen.addEventListener('focusout', (event) => {
        const target = event.target;
        if (target.classList.contains('interval-mm')) {
            const val = parseInt(target.value, 10) || 0;
            target.value = padNumber(val);
        }
    });

    EventBus.on('rerender-boss-scheduler', () => {
        handleShowScreen(DOM);
    });

    DOM.bossSchedulerScreen.addEventListener('change', (event) => {
        if (event.target === DOM.gameSelect) {
            // 더티 체크 (게임/목록 변경 시)
            if (_isDirty) {
                if (!confirm('수정된 내용이 있습니다. 저장하지 않고 다른 목록을 선택하시겠습니까?')) {
                    // 이전 값으로 복구
                    DOM.gameSelect.value = LocalStorageManager.get('lastSelectedGame') || 'default';
                    return;
                }
            }

            const selectedGame = DOM.gameSelect.value;
            LocalStorageManager.set('lastSelectedGame', selectedGame); // 선택 정보 저장
            handleShowScreen(DOM); // 데이터 로드부터 렌더링까지 전체 재실행
        }
    });

    // Enter 키로 다음 보람 입력창 점프 (v2.17 복구)
    DOM.bossSchedulerScreen.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.classList.contains('remaining-time-input')) {
            event.preventDefault();

            const currentItem = event.target.closest('.boss-input-item');
            const allItems = Array.from(DOM.bossInputsContainer.querySelectorAll('.boss-input-item'));
            const currentIndex = allItems.indexOf(currentItem);

            if (currentIndex < allItems.length - 1) {
                // 다음 보스의 남은 시간 입력창으로 포커스 이동
                const nextInput = allItems[currentIndex + 1].querySelector('.remaining-time-input');
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select(); // 기존 값 선택 (바로 수정 가능하도록)
                }
            } else {
                // 마지막 보스인 경우 업데이트 버튼으로 포커스 이동하여 입력을 마무리
                if (DOM.moveToBossSettingsButton) {
                    DOM.moveToBossSettingsButton.focus();
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

                // Draft 업데이트 (빈 값으로)
                syncInputToText(DOM);

                _remainingTimes = {}; // Clear local state
                _memoInputs = {}; // Clear local state
                _isDirty = true; // 변경 감지

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


export function isSchedulerDirty() {
    return _isDirty;
}

export function getScreen() {
    return {
        id: 'boss-scheduler-screen',
        init: initBossSchedulerScreen
    };
}
