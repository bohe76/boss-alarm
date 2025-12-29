// src/screens/timetable.js
import { updateTimetableUI } from '../ui-renderer.js';
import { LocalStorageManager } from '../data-managers.js';
import { getIsAlarmRunning } from '../alarm-scheduler.js';
import { trackEvent } from '../analytics.js';

let autoRefreshInterval = null;

function startAutoRefresh(DOM) {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);

    autoRefreshInterval = setInterval(() => {
        // Stop timer if screen is not active or export modal is open
        const isModalOpen = DOM.exportModal && DOM.exportModal.style.display === 'flex';
        if (!DOM.timetableScreen.classList.contains('active') || isModalOpen) {
            // If screen is inactive, clear interval. If modal is open, just skip this tick.
            if (!DOM.timetableScreen.classList.contains('active')) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
            return;
        }

        const filterNextBoss = LocalStorageManager.get('timetableNextBossFilter');
        const isAlarmRunning = getIsAlarmRunning();

        // Only refresh if Next Boss Filter is ON AND Alarm is Running
        if (filterNextBoss && isAlarmRunning) {
            updateTimetableUI(DOM);
        }
    }, 1000);
}

export function initTimetableScreen(DOM) {
    // Migration: Remove obsolete keys and migrate filter state
    localStorage.removeItem('bossManagementMode');

    let filterNextBoss = LocalStorageManager.get('timetableNextBossFilter');
    if (filterNextBoss === null) {
        const oldFilter = LocalStorageManager.get('bossManagementNextBossFilter');
        filterNextBoss = oldFilter !== null ? oldFilter : true; // Default to true
        LocalStorageManager.set('timetableNextBossFilter', filterNextBoss);
        localStorage.removeItem('bossManagementNextBossFilter');
    }

    updateTimetableUI(DOM);
    initExportModal(DOM); // 내보내기 모달 초기화 추가

    // Toggle Button Event Listener
    if (DOM.timetableNextBossFilterToggle) {
        // Set initial state
        DOM.timetableNextBossFilterToggle.classList.toggle('active', !!filterNextBoss);

        DOM.timetableNextBossFilterToggle.addEventListener('click', () => {
            const isActive = DOM.timetableNextBossFilterToggle.classList.toggle('active');
            LocalStorageManager.set('timetableNextBossFilter', isActive);
            updateTimetableUI(DOM);
            trackEvent('Click Button', { event_category: 'Interaction', event_label: `보스 시간표 필터: ${isActive ? 'ON' : 'OFF'}` });
        });
    }

    // 보기 모드 전환 버튼 이벤트 리스너 (카드/표)
    if (DOM.timetableDisplayModeToggle) {
        let displayMode = LocalStorageManager.get('timetableDisplayMode') || '표';

        // 초기 상태 설정: 버튼 텍스트는 현재 모드의 '반대' (전환할 대상)를 표시
        DOM.timetableDisplayModeToggle.textContent = displayMode === '표' ? '카드' : '표';
        // .active 클래스 토글 로직 제거 (색상 고정)

        DOM.timetableDisplayModeToggle.addEventListener('click', () => {
            // 현재 텍스트가 '표'라면 -> 목표는 '표' 모드, 아니면 '카드' 모드
            const newMode = DOM.timetableDisplayModeToggle.textContent;

            // 상태 업데이트 및 UI 갱신
            LocalStorageManager.set('timetableDisplayMode', newMode);
            updateTimetableUI(DOM);

            // 버튼 텍스트를 방금 바꾼 모드의 '반대'로 변경 (다음 전환 대상)
            DOM.timetableDisplayModeToggle.textContent = newMode === '표' ? '카드' : '표';

            trackEvent('Click Button', { event_category: 'Interaction', event_label: `보스 시간표 보기 모드 변경: ${newMode}` });
        });
    }
}

// 내보내기 설정 키 정의
const EXPORT_LS_KEYS = {
    DATE: 'export-date-range',
    CONTENT: 'export-content-type',
    FORMAT: 'export-format',
    STYLE: 'export-image-style'
};

/**
 * 실시간 프리뷰 업데이트 함수
 */
async function syncTimetablePreview(DOM) {
    const { updateTimetableUI } = await import('../ui-renderer.js');
    const currentSettings = {
        dateRange: LocalStorageManager.get(EXPORT_LS_KEYS.DATE) || 'today',
        nextBossOnly: (LocalStorageManager.get(EXPORT_LS_KEYS.CONTENT) || 'all') === 'next',
        displayMode: (LocalStorageManager.get(EXPORT_LS_KEYS.STYLE) || 'card') === 'table' ? '표' : '카드'
    };
    return updateTimetableUI(DOM, currentSettings);
}

/**
 * 내보내기 모달 초기화 및 이벤트 리스너 등록
 */
function initExportModal(DOM) {
    if (!DOM.exportTimetableButton) return;

    // 설정 로드 및 초기 UI 반영
    const loadSettings = () => {
        const settings = {
            date: LocalStorageManager.get(EXPORT_LS_KEYS.DATE) || 'today',
            content: LocalStorageManager.get(EXPORT_LS_KEYS.CONTENT) || 'all',
            format: LocalStorageManager.get(EXPORT_LS_KEYS.FORMAT) || 'text',
            style: LocalStorageManager.get(EXPORT_LS_KEYS.STYLE) || 'card'
        };

        // UI 업데이트 함수 (범용)
        const updateActiveBtn = (container, value, dataAttr) => {
            if (!container) return;
            const btns = container.querySelectorAll('button');
            btns.forEach(btn => {
                const isActive = btn.dataset[dataAttr] === value;
                btn.classList.toggle('active', isActive);
            });
        };

        updateActiveBtn(DOM.exportDateOptions, settings.date, 'dateRange');
        updateActiveBtn(DOM.exportContentOptions, settings.content, 'contentType');
        updateActiveBtn(DOM.exportFormatOptions, settings.format, 'format');
        updateActiveBtn(DOM.exportImageStyleOptions, settings.style, 'style');

        // 형식에 따른 하위 옵션 표시 제어 (스르륵 등장)
        if (DOM.exportImageStyleSection) {
            DOM.exportImageStyleSection.classList.toggle('visible', settings.format === 'image');
        }

        return settings;
    };

    // 세그먼트 버튼 이벤트 리스너 등록 데코레이터
    const setupSegmentedButtons = (container, lsKey, dataAttr, onChange = null) => {
        if (!container) return;
        const btns = container.querySelectorAll('button');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset[dataAttr];
                LocalStorageManager.set(lsKey, value);
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 옵션 변경 시 실시간 프리뷰 반영
                syncTimetablePreview(DOM);

                if (onChange) onChange(value);
            });
        });
    };

    // 초기화 실행
    loadSettings();

    // 이벤트 리스너들
    setupSegmentedButtons(DOM.exportDateOptions, EXPORT_LS_KEYS.DATE, 'dateRange');
    setupSegmentedButtons(DOM.exportContentOptions, EXPORT_LS_KEYS.CONTENT, 'contentType');
    setupSegmentedButtons(DOM.exportFormatOptions, EXPORT_LS_KEYS.FORMAT, 'format', (val) => {
        if (DOM.exportImageStyleSection) {
            DOM.exportImageStyleSection.classList.toggle('visible', val === 'image');
        }
    });
    setupSegmentedButtons(DOM.exportImageStyleOptions, EXPORT_LS_KEYS.STYLE, 'style');

    // 원본 설정 백업 변수
    let originalSettings = null;

    const restoreOriginalSettings = async () => {
        if (!originalSettings) return;
        const { updateTimetableUI } = await import('../ui-renderer.js');

        // 1. 화면 복구 (활성 탭 복구)
        const screens = [
            DOM.dashboardScreen, DOM.timetableScreen, DOM.settingsScreen,
            DOM.alarmLogScreen, DOM.versionInfoScreen, DOM.shareScreen,
            DOM.helpScreen, DOM.calculatorScreen, DOM.bossSchedulerScreen
        ];
        screens.forEach(s => s?.classList.remove('active'));
        if (originalSettings.activeScreenId) {
            const screenEl = document.getElementById(originalSettings.activeScreenId);
            if (screenEl) screenEl.classList.add('active');
        }

        // 2. 데이터 필터 및 보기 모드 복구
        updateTimetableUI(DOM, {
            dateRange: originalSettings.dateRange,
            nextBossOnly: originalSettings.nextBossOnly,
            displayMode: originalSettings.displayMode
        });

        originalSettings = null;
        DOM.exportModal.style.display = 'none';
    };

    // 전역에서 접근 가능하도록 handleExportImage 등에 전달하기 위해 exportModal의 속성으로 임시 저장하거나 scope 유지
    DOM.exportModal._restore = restoreOriginalSettings;

    // 모달 제어
    DOM.exportTimetableButton.addEventListener('click', async () => {
        // 현재 활성 화면 찾기
        const activeScreen = document.querySelector('.screen.active');

        // 열 때 현재 화면 상태 백업
        originalSettings = {
            activeScreenId: activeScreen ? activeScreen.id : 'timetable-screen',
            dateRange: 'all',
            nextBossOnly: LocalStorageManager.get('timetableNextBossFilter'),
            displayMode: LocalStorageManager.get('timetableDisplayMode') || '표'
        };

        // 강제로 시간표 화면 활성화 (프리뷰 및 캡처를 위해)
        const screens = [
            DOM.dashboardScreen, DOM.timetableScreen, DOM.settingsScreen,
            DOM.alarmLogScreen, DOM.versionInfoScreen, DOM.shareScreen,
            DOM.helpScreen, DOM.calculatorScreen, DOM.bossSchedulerScreen
        ];
        screens.forEach(s => s?.classList.remove('active'));
        DOM.timetableScreen.classList.add('active');

        loadSettings();
        await syncTimetablePreview(DOM); // 초기 로드된 설정으로 배경 즉시 업데이트 (await 적용)
        DOM.exportModal.style.display = 'flex';
        trackEvent('Click Button', { event_category: 'Interaction', event_label: '내보내기 모달 열기' });
    });

    if (DOM.closeExportModal) {
        DOM.closeExportModal.addEventListener('click', restoreOriginalSettings);
    }

    DOM.exportModal.addEventListener('click', (e) => {
        if (e.target === DOM.exportModal) restoreOriginalSettings();
    });

    // 통합 실행 버튼
    DOM.exportExecuteBtn.addEventListener('click', async () => {
        const settings = {
            format: LocalStorageManager.get(EXPORT_LS_KEYS.FORMAT) || 'text',
            style: LocalStorageManager.get(EXPORT_LS_KEYS.STYLE) || 'card'
        };

        const originalText = DOM.exportExecuteBtn.textContent;

        // 버튼 잠금 및 상태 표시
        DOM.exportExecuteBtn.disabled = true;
        if (settings.format === 'image') {
            DOM.exportExecuteBtn.textContent = '이미지 생성중...';
        }

        try {
            if (settings.format === 'text') {
                await handleExportText(DOM);
            } else {
                await handleExportImage(DOM);
            }
        } catch (err) {
            console.error('내보내기 작업 중 오류:', err);
        } finally {
            // 작업 완료 후 (성공/오류 무관) 버튼 복구
            DOM.exportExecuteBtn.disabled = false;
            DOM.exportExecuteBtn.textContent = originalText;
        }
    });
}

/**
 * 시간표 데이터를 텍스트로 구성하여 클립보드에 복사
 */
async function handleExportText(DOM) {
    const { BossDataManager } = await import('../data-managers.js');
    const schedule = BossDataManager.getBossSchedule();
    const dateRange = LocalStorageManager.get('export-date-range') || 'today';
    const contentType = LocalStorageManager.get('export-content-type') || 'all';

    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];

    const getFormattedDateStrings = (date) => {
        const mm = date.getMonth() + 1;
        const dd = date.getDate();
        const yoil = days[date.getDay()];
        return `${mm}/${dd} (${yoil})`;
    };

    let datePart = '';
    let targetDates = [];

    if (dateRange === 'today') {
        datePart = getFormattedDateStrings(now);
        targetDates = [now.toDateString()];
    } else if (dateRange === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        datePart = getFormattedDateStrings(tomorrow);
        targetDates = [tomorrow.toDateString()];
    } else {
        datePart = '';
    }

    let text = '';

    // 필터링 및 데이터 정제
    const filtered = schedule.filter(boss => {
        if (!boss.scheduledDate || !boss.name) return false; // 유효하지 않은 데이터 제외
        const bossDate = new Date(boss.scheduledDate);
        if (isNaN(bossDate.getTime())) return false; // Invalid Date 체크

        if (dateRange !== 'all' && !targetDates.includes(bossDate.toDateString())) return false;
        if (contentType === 'next' && bossDate < now) return false;
        return true;
    });

    if (filtered.length === 0) {
        text = "표시할 보스가 없습니다.";
    } else {
        if (dateRange !== 'all') {
            text = `${datePart}\n`;
        }

        let lastDateLabel = '';
        filtered.forEach((boss, index) => {
            const bDate = new Date(boss.scheduledDate);
            const hh = String(bDate.getHours()).padStart(2, '0');
            const mm = String(bDate.getMinutes()).padStart(2, '0');
            const timeStr = `${hh}:${mm}`;
            const currentDateLabel = getFormattedDateStrings(bDate);

            // 전체 범위일 경우 날짜 구분선 추가 [MM/DD (요일)]
            if (dateRange === 'all') {
                if (currentDateLabel !== lastDateLabel) {
                    // 첫 번째가 아니면 앞에 빈 줄 추가
                    if (index > 0) text += '\n';
                    text += `[${currentDateLabel}]\n`;
                    lastDateLabel = currentDateLabel;
                }
            }

            text += `${timeStr} ${boss.name}${boss.memo ? ' - ' + boss.memo : ''}\n`;
        });
    }

    try {
        await navigator.clipboard.writeText(text.trim());
        alert("시간표가 클립보드에 복사되었습니다.");
        DOM.exportModal.style.display = 'none';
    } catch (err) {
        console.error('복사 실패:', err);
        alert("클립보드 복사 중 오류이 발생했습니다.");
    }
}

/**
 * html2canvas를 사용하여 시간표 영역 캡처 및 다운로드
 */
async function handleExportImage(DOM) {
    // [중요] 내보내기 직전에 프리뷰 동기화를 명시적으로 실행하고 완료를 기다림
    await syncTimetablePreview(DOM); // 명시적으로 await 추가 및 DOM 전달

    const { updateTimetableUI } = await import('../ui-renderer.js');
    const style = LocalStorageManager.get('export-image-style') || 'card';
    const dateRange = LocalStorageManager.get('export-date-range') || 'today';
    const contentType = LocalStorageManager.get('export-content-type') || 'all';

    await updateTimetableUI(DOM, {
        dateRange: dateRange,
        nextBossOnly: contentType === 'next',
        displayMode: style === 'table' ? '표' : '카드'
    });

    // 2. 캡처 대상 ID 결정
    const targetId = style === 'table' ? 'boss-list-table' : 'bossListCardsContainer';
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
        alert(`${style === 'table' ? '표' : '카드'} 형태의 영역을 찾을 수 없습니다. (ID: ${targetId})\n화면이 정상적으로 렌더링되었는지 확인해주세요.`);
        return;
    }

    try {
        // 이미 syncTimetablePreview에 의해 화면이 구성되어 있으므로 바로 캡처 진행

        // 브라우저 렌더링 완료를 위해 다음 프레임까지 대기 (전문가적인 렌더링 보장 방식)
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });

        // 3. 캡처 시각 기준 파일명 생성 (YYYYMMDD-HHMMSS)
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-` +
            `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

        const canvas = await window.html2canvas(targetElement, {
            backgroundColor: '#ffffff',
            scale: 2, // 고해상도
            useCORS: true,
            logging: false
        });

        const link = document.createElement('a');
        link.download = `boss-alarm-timetable-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // [중요] 다운로드 완료 알림 후 확인을 누르면 그때 원래 상태로 복원
        alert("이미지가 저장되었습니다.");

        if (DOM.exportModal._restore) {
            await DOM.exportModal._restore();
        } else {
            DOM.exportModal.style.display = 'none';
        }

    } catch (error) {
        console.error('이미지 저장 실패:', error);
        alert("이미지 저장 중 오류가 발생했습니다.");
    }
}

export function getScreen() {
    return {
        id: 'timetable-screen',
        init: initTimetableScreen,
        onTransition: (DOM) => {
            const filterNextBoss = LocalStorageManager.get('timetableNextBossFilter');
            updateTimetableUI(DOM);
            startAutoRefresh(DOM);
            trackEvent('Screen View', { event_category: 'Navigation', event_label: `보스 시간표 진입 (필터: ${filterNextBoss ? 'ON' : 'OFF'})` });
        }
    };
}
