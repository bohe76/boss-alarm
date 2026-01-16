// src/app.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { renderFixedAlarms, renderAlarmStatusSummary, renderDashboard, updateBossListTextarea, renderUpdateModal } from './ui-renderer.js';
import { log } from './logger.js';
import { LocalStorageManager, BossDataManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import { getInitialDefaultData, getUpdateNoticeData } from './boss-scheduler-data.js';
import { EventBus } from './event-bus.js';
import { getRoute, registerRoute } from './router.js';
import { initializeCoreServices } from './services.js';
import { initGlobalEventListeners } from './global-event-listeners.js';
import { togglePipWindow } from './pip-manager.js';
import { trackPageView, trackEvent } from './analytics.js'; // Added GA imports

// Screen Modules
import { getScreen as getAlarmLogScreen } from './screens/alarm-log.js';
import { getScreen as getTimetableScreen } from './screens/timetable.js';
import { getScreen as getBossSchedulerScreen } from './screens/boss-scheduler.js';
import { getScreen as getCalculatorScreen } from './screens/calculator.js';
import { getScreen as getCustomListScreen } from './screens/custom-list.js';
import { getScreen as getDashboardScreen } from './screens/dashboard.js';
import { getScreen as getHelpScreen } from './screens/help.js';
import { getScreen as getSettingsScreen } from './screens/settings.js';
import { getScreen as getShareScreen } from './screens/share.js';
import { getScreen as getVersionInfoScreen } from './screens/version-info.js';
/**
 * Processes raw boss items from default data and returns a normalized schedule array.
 */
function processBossItems(items) {
    if (!items || !Array.isArray(items)) return [];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let day = now.getDate();
    let lastTimeInMinutes = -1;

    return items.map((item, index) => {
        const [hours, minutes] = item.time.split(':').map(Number);
        const currentTimeInMinutes = hours * 60 + minutes;

        // [근본 로직 복구] 이전 보스보다 시간이 이를 경우 날짜를 다음 날로 넘김 (예: 23:29 -> 03:50)
        if (lastTimeInMinutes !== -1 && currentTimeInMinutes < lastTimeInMinutes) {
            day++;
        }
        lastTimeInMinutes = currentTimeInMinutes;

        const scheduledDate = new Date(year, month, day, hours, minutes, 0);

        return {
            id: `boss-${Date.now()}-${index}`,
            name: item.name,
            time: item.time, // "HH:mm"
            memo: item.memo || "",
            type: 'boss',
            scheduledDate: scheduledDate
        };
    });
}

let dashboardRefreshInterval = null; // Declare the interval variable


function registerAllRoutes() {
    const screenModules = [
        getAlarmLogScreen(),
        getTimetableScreen(),
        getBossSchedulerScreen(),
        getCalculatorScreen(),
        getCustomListScreen(),
        getDashboardScreen(),
        getHelpScreen(),
        getSettingsScreen(),
        getShareScreen(),
        getVersionInfoScreen(),
    ];

    screenModules.forEach(module => {
        if (module && module.id) {
            registerRoute(module.id, module);
        }
    });
}



// Function to show a specific screen and hide others
function showScreen(DOM, screenId) {
    const screens = [
        DOM.dashboardScreen,
        DOM.timetableScreen,
        DOM.settingsScreen,
        DOM.alarmLogScreen,
        DOM.versionInfoScreen,
        DOM.shareScreen,
        DOM.helpScreen,
        DOM.calculatorScreen,
        DOM.bossSchedulerScreen
    ];

    screens.forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    const activeScreenElement = document.getElementById(screenId);
    if (activeScreenElement) activeScreenElement.classList.add('active');

    // Track virtual page view
    const screenNames = {
        'dashboard-screen': '대시보드',
        'timetable-screen': '보스 시간표',
        'boss-scheduler-screen': '보스 스케줄러',
        'calculator-screen': '계산기',
        'alarm-log-screen': '알림 로그',
        'share-screen': '공유',
        'settings-screen': '설정',
        'help-screen': '도움말',
        'version-info-screen': '릴리즈 노트'
    };
    trackPageView(screenId, screenNames[screenId] || screenId);

    if (DOM.mainContentArea) {
        requestAnimationFrame(() => {
            DOM.mainContentArea.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        });
    }

    const allNavLinks = [
        DOM.navDashboard, DOM.navTimetable, DOM.navCalculator, DOM.navBossScheduler,
        DOM.navSettings, DOM.navAlarmLog, DOM.navVersionInfo, DOM.navShare, DOM.navHelp,
        DOM.bottomNavDashboard, DOM.bottomNavTimetable, DOM.bottomNavCalculator, DOM.bottomNavShare
    ];

    allNavLinks.forEach(link => {
        if (link) {
            link.classList.remove('active');
            if (link.dataset.screen === screenId) {
                link.classList.add('active');
            }
        }
    });

    const screen = getRoute(screenId);
    if (screen) {
        if (!screen.initialized && screen.init) {
            screen.init(DOM);
            screen.initialized = true;
        }
        if (screen.onTransition) {
            screen.onTransition(DOM);
        }
    }

    // Manage dashboard refresh interval
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }

    if (screenId === 'dashboard-screen') {
        renderDashboard(DOM); // Immediate render once when entering screen
    }
    // End manage dashboard refresh interval

    if (screenId === 'boss-scheduler-screen') EventBus.emit('show-boss-scheduler-screen');
}

/**
 * 보스 일정의 데이터 무결성을 검증합니다.
 * 프리셋의 경우 보스 이름이 공식 정의와 1:1로 일치하는지 확인하며, 
 * 커스텀 리스트의 경우 해당 리스트가 존재하는지 확인합니다.
 */
async function validateScheduleIntegrity(listId, schedule) {
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) return false;

    // 프리셋 이름 매칭 검사
    const isNamesMatching = await BossDataManager.isPresetNamesMatching(listId, schedule);
    if (!isNamesMatching) return false;

    // 만약 커스텀 리스트라면 해당 리스트가 존재하는지 확인
    const { isPresetList } = await import('./boss-scheduler-data.js');
    if (!isPresetList(listId)) {
        const { CustomListManager } = await import('./custom-list-manager.js');
        const customLists = CustomListManager.getCustomLists();
        if (!customLists.some(l => l.name === listId)) return false;
    }

    return true;
}

async function performReverseMigration() {
    const { CustomListManager } = await import('./custom-list-manager.js');
    const MIGRATION_SLOT_NAME = '커스텀 보스_001';

    // 1. 슬롯 존재 여부 확인
    const customLists = CustomListManager.getCustomLists();
    const targetList = customLists.find(l => l.name === MIGRATION_SLOT_NAME);
    if (!targetList) return false;

    // 2. 해당 슬롯의 데이터 로드
    const schedule = BossDataManager.getDraftSchedule(MIGRATION_SLOT_NAME);
    if (!schedule || !schedule.some(item => item.type === 'boss')) {
        // 데이터가 없으면 그냥 삭제만 하고 종료 (Clean-up)
        CustomListManager.deleteCustomList(MIGRATION_SLOT_NAME);
        log(`[지능형 자가 치유] 내용이 없는 '${MIGRATION_SLOT_NAME}' 슬롯을 정리했습니다.`, true);
        return false;
    }

    // 3. 정합성 검사를 통해 원래의 프리셋 찾기
    const { getBossMetadata } = await import('./boss-scheduler-data.js');
    const bossMetadata = getBossMetadata();
    const presetIds = Object.keys(bossMetadata);

    let targetPresetId = null;
    for (const presetId of presetIds) {
        if (await validateScheduleIntegrity(presetId, schedule)) {
            targetPresetId = presetId;
            break;
        }
    }

    // 4. 매칭되는 프리셋이 있으면 회귀 실행
    if (targetPresetId) {
        // 프리셋으로 상태 전환
        LocalStorageManager.set('lastSelectedGame', targetPresetId);

        // 데이터 이관 (Draft 및 SSOT)
        BossDataManager.setDraftSchedule(targetPresetId, schedule);
        BossDataManager.setBossSchedule(schedule);

        // 임시 슬롯 삭제
        CustomListManager.deleteCustomList(MIGRATION_SLOT_NAME);

        log(`[지능형 자가 치유] '${MIGRATION_SLOT_NAME}'의 데이터를 '${targetPresetId}' 프리셋으로 복구하고 슬롯을 정리했습니다.`, true);
        return true;
    }

    return false;
}

async function performSilentMigration(DOM, schedule) {
    const { CustomListManager } = await import('./custom-list-manager.js');
    const MIGRATION_SLOT_NAME = '커스텀 보스_001';

    // 1. 보스 이름 목록 추출 (커스텀 리스트 레이아웃용)
    const bossNamesText = BossDataManager.extractBossNamesText(schedule);

    // 2. 커스텀 리스트 슬롯 확보 (Upsert)
    const existingList = CustomListManager.getCustomLists().find(l => l.name === MIGRATION_SLOT_NAME);
    if (existingList) {
        CustomListManager.updateCustomList(MIGRATION_SLOT_NAME, bossNamesText);
    } else {
        CustomListManager.addCustomList(MIGRATION_SLOT_NAME, bossNamesText);
    }

    // 3. 상태 전환 및 영구 저장
    LocalStorageManager.set('lastSelectedGame', MIGRATION_SLOT_NAME);

    // 4. Draft 및 SSOT 동시 업데이트 (무인 자동화 핵심)
    BossDataManager.setDraftSchedule(MIGRATION_SLOT_NAME, schedule);
    BossDataManager.setBossSchedule(schedule);

    log(`[지능형 자가 치유] 데이터를 '${MIGRATION_SLOT_NAME}' 슬롯으로 안전하게 보존/이관했습니다.`, true);
    return true;
}

async function loadInitialData(DOM) {
    const params = new URLSearchParams(window.location.search);
    let loadSuccess = false;

    // 0. [방어 로직] 마지막 선택 게임 정보가 없으면 기본값 설정 (Clean Install 대응)
    let storedListId = LocalStorageManager.get('lastSelectedGame');
    if (!storedListId) {
        const initialData = getInitialDefaultData();
        // 1순위: 초기 데이터의 contextId (odin-main)
        // 2순위: default
        const defaultId = initialData?.contextId || 'default';

        LocalStorageManager.set('lastSelectedGame', defaultId);
        storedListId = defaultId;
        log(`초기 설정: 보스 목록이 선택되지 않아 '${defaultId}'로 자동 설정했습니다.`);
    }

    // 1. URL 데이터 우선 로드
    if (params.has('data')) {
        const currentListId = params.get('game') || storedListId;
        DOM.schedulerBossListInput.value = decodeURIComponent(params.get('data'));
        const result = parseBossList(DOM.schedulerBossListInput);

        if (result.success) {
            const integrity = await validateScheduleIntegrity(currentListId, result.mergedSchedule);
            if (integrity) {
                BossDataManager.setBossSchedule(result.mergedSchedule);
                BossDataManager.clearDraft(currentListId);
                loadSuccess = true;
                log("URL에서 보스 목록을 성공적으로 불러왔습니다.");
            } else {
                // 이름 불일치 시: 자동 마이그레이션 실행
                log("URL 데이터 이름 불일치 감지. 자동으로 커스텀 리스트로 이관합니다.");
                loadSuccess = await performSilentMigration(DOM, result.mergedSchedule);
            }
        }
    }

    // 2. 기존 로컬 스토리지 데이터 검사 (URL 로드 실패 시에만 실행)
    if (!loadSuccess) {
        const currentListId = storedListId;
        const existingSchedule = BossDataManager.getBossSchedule();

        if (existingSchedule && existingSchedule.length > 0) {
            const integrity = await validateScheduleIntegrity(currentListId, existingSchedule);
            if (integrity) {
                loadSuccess = true;
                log("로컬 스토리지에서 보스 일정을 로드했습니다.");
            } else {
                // 로컬 데이터 오염 시: 자동 마이그레이션 실행
                log("로컬 스토리지 데이터 정합성 불일치 감지. 자가 치유 기능을 동작합니다.");
                loadSuccess = await performSilentMigration(DOM, existingSchedule);
            }
        }
    }

    // 3. 최종 결계: 데이터 로드 실패 시(최초 방문 포함) 샘플 데이터 로드
    if (!loadSuccess) {
        const initialData = getInitialDefaultData();
        if (initialData && initialData.items) {
            const schedule = processBossItems(initialData.items);
            BossDataManager.setBossSchedule(schedule);
            log("기본 샘플 보스 목록을 로드했습니다. (데이터 복구)");
        } else {
            console.error("Critical: Default boss data loading failed!");
            alert("기본 보스 목록 로드에 실패했습니다. 페이지를 새로고침해 주세요.");
        }
    }

    await performReverseMigration(); // [Step 3] 부당하게 이관된 데이터 회귀 체크 (v2.17.2)
    updateBossListTextarea(DOM); // UI 동기화
}

// Function to initialize all event handlers
function initEventHandlers(DOM) {
    DOM.alarmToggleButton.addEventListener('click', () => {
        if (!getIsAlarmRunning()) {
            startAlarm(DOM);
            DOM.alarmToggleButton.classList.remove('alarm-off');
            DOM.alarmToggleButton.classList.add('alarm-on');
            log("알림이 시작되었습니다.", true);
            trackEvent('Toggle Switch', { event_category: 'Feature Usage', event_label: '알림 시작/중지', value: 1 });
        } else {
            stopAlarm(DOM);
            DOM.alarmToggleButton.classList.remove('alarm-on');
            DOM.alarmToggleButton.classList.add('alarm-off');
            log("알림이 중지되었습니다.", true);
            trackEvent('Toggle Switch', { event_category: 'Feature Usage', event_label: '알림 시작/중지', value: 0 });
        }
    });

    if (DOM.pipToggleButton) {
        DOM.pipToggleButton.addEventListener('click', () => {
            togglePipWindow(DOM);
            trackEvent('Click Button', { event_category: 'Feature Usage', event_label: 'PiP 토글' });
        });
    }

    // --- 11. VERSION UPDATE MODAL (v2.6) ---
    const versionKey = `hide_update_modal_v${window.APP_VERSION || '2.17.0'}`;

    const closeUpdateModal = () => {
        DOM.versionUpdateModal.style.display = 'none';
    };

    DOM.closeVersionModal.addEventListener('click', closeUpdateModal);

    DOM.versionUpdateModal.addEventListener('click', (e) => {
        if (e.target === DOM.versionUpdateModal) closeUpdateModal();
    });

    DOM.viewReleaseNotesBtn.addEventListener('click', () => {
        LocalStorageManager.set(versionKey, true);
        EventBus.emit('navigate', 'version-info-screen');
        closeUpdateModal();
    });

    DOM.hideVersionModalBtn.addEventListener('click', () => {
        LocalStorageManager.set(versionKey, true);
        closeUpdateModal();
    });

    // 앱 시작 시 노출 여부 판단
    if (!LocalStorageManager.get(versionKey)) {
        const noticeData = getUpdateNoticeData();
        renderUpdateModal(DOM, noticeData);
    }


    const navLinks = [
        DOM.navDashboard, DOM.navTimetable, DOM.navCalculator, DOM.navBossScheduler,
        DOM.navSettings, DOM.navAlarmLog, DOM.navVersionInfo, DOM.navShare, DOM.navHelp
    ];

    navLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const screenId = event.currentTarget.dataset.screen;
                const menuLabel = event.currentTarget.querySelector('.menu-text').textContent;
                trackEvent('Click Menu Tab', { event_category: 'Navigation', event_label: menuLabel });
                showScreen(DOM, screenId);
            });

        }
    });

    const bottomNavLinks = [
        DOM.bottomNavDashboard, DOM.bottomNavTimetable, DOM.bottomNavBossScheduler,
        DOM.bottomNavCalculator, DOM.bottomNavShare
    ];

    bottomNavLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const screenId = event.currentTarget.dataset.screen;
                const menuLabel = event.currentTarget.ariaLabel + ' (모바일)'; // Use ariaLabel for menu name
                trackEvent('Click Bottom Nav', { event_category: 'Navigation', event_label: menuLabel });
                showScreen(DOM, screenId);
            });
        }
    });

    if (DOM.editTimetableButton) {
        DOM.editTimetableButton.addEventListener('click', () => {
            EventBus.emit('navigate', 'boss-scheduler-screen');
            trackEvent('Click Button', { event_category: 'Navigation', event_label: '시간표 수정 버튼 클릭' });
        });
    }

    const closeMoreMenu = () => {
        DOM.sidebar.classList.remove('more-menu-open');
        DOM.sidebarBackdrop.classList.remove('active');
        DOM.moreMenuButton.setAttribute('aria-expanded', 'false');
        DOM.mainContentArea.inert = false;
        document.querySelector('header').inert = false;
        document.querySelector('footer').inert = false;
        document.removeEventListener('keydown', handleMenuKeydown);
        DOM.moreMenuButton.focus();
    };

    const openMoreMenu = () => {
        DOM.sidebar.classList.add('more-menu-open');
        DOM.sidebarBackdrop.classList.add('active');
        DOM.moreMenuButton.setAttribute('aria-expanded', 'true');
        DOM.mainContentArea.inert = true;
        document.querySelector('header').inert = true;
        document.querySelector('footer').inert = true;
        document.addEventListener('keydown', handleMenuKeydown);

        const focusableElements = DOM.sidebar.querySelectorAll('button, a[href]');
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        firstFocusableElement.focus();

        const handleFocusTrap = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        e.preventDefault();
                        lastFocusableElement.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        e.preventDefault();
                        firstFocusableElement.focus();
                    }
                }
            }
        };
        DOM.sidebar.addEventListener('keydown', handleFocusTrap);
        DOM.sidebar.addEventListener('transitionend', () => {
            DOM.sidebar.removeEventListener('keydown', handleFocusTrap);
        }, { once: true });
        trackEvent('Click Button', { event_category: 'Navigation', event_label: '더보기 (모바일) 열기' });
    };

    const handleMenuKeydown = (e) => {
        if (e.key === 'Escape') closeMoreMenu();
    };

    if (DOM.moreMenuButton) {
        DOM.moreMenuButton.addEventListener('click', () => {
            if (DOM.sidebar.classList.contains('more-menu-open')) closeMoreMenu();
            else openMoreMenu();
        });
    }

    if (DOM.moreMenuCloseButton) DOM.moreMenuCloseButton.addEventListener('click', () => {
        closeMoreMenu();
        trackEvent('Click Button', { event_category: 'Navigation', event_label: '더보기 (모바일) 닫기' });
    });
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.addEventListener('click', closeMoreMenu);

    DOM.sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (DOM.sidebar.classList.contains('more-menu-open')) closeMoreMenu();
        });
    });
}

export async function initApp() {
    window.isBossListDirty = false; // Initialize dirty flag
    document.body.classList.add('loading'); // Activate skeleton UI
    const DOM = initDomElements();

    if (DOM.footerVersion) DOM.footerVersion.textContent = window.APP_VERSION;
    if (DOM.footerContactButton && window.APP_VERSION) {
        DOM.footerContactButton.href = `https://tally.so/r/vGMYND?appVersion=v${window.APP_VERSION}`;
        DOM.footerContactButton.addEventListener('click', () => {
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '푸터 문의하기' });
        });
    }

    // Check for Document PiP API support
    if ('documentPictureInPicture' in window) {
        if (DOM.pipToggleButton) {
            DOM.pipToggleButton.style.display = 'block';
        }
    }

    await initializeCoreServices(DOM);
    registerAllRoutes();

    // Initialize Custom List Modal functionality explicitly as it's not a route
    const customListScreen = getCustomListScreen();
    if (customListScreen && customListScreen.init) {
        customListScreen.init(DOM);
    }

    await loadInitialData(DOM);
    BossDataManager.checkAndUpdateSchedule(); // [Step 2] Fresh Start Update Check


    renderFixedAlarms(DOM);

    const isAlarmRunningInitially = getIsAlarmRunning();
    if (isAlarmRunningInitially) {
        DOM.alarmToggleButton.classList.add('alarm-on');
        DOM.alarmToggleButton.classList.remove('alarm-off');
        startAlarm(DOM);
    } else {
        DOM.alarmToggleButton.classList.add('alarm-off');
        DOM.alarmToggleButton.classList.remove('alarm-on');
    }
    renderAlarmStatusSummary(DOM);

    // First-time user notification for alarm policy
    if (!LocalStorageManager.get('hasVisitedAlarmPolicy')) {
        alert("알림 기능은 브라우저 정책에 따라 최초 접속 시 자동으로 비활성화됩니다.\n알림을 사용하시려면 상단의 전원 버튼을 눌러 활성화해주세요.");
        LocalStorageManager.set('hasVisitedAlarmPolicy', 'true');
    }


    showScreen(DOM, 'dashboard-screen');
    DOM.navDashboard.classList.add('active');

    EventBus.on('navigate', (screenId) => {
        // [신규] 내비게이션 가드: 스케줄러 수정 중 이탈 방지
        const { isSchedulerDirty } = getBossSchedulerScreen();
        const currentActiveScreen = document.querySelector('.screen.active');

        // 현재 스케줄러 화면이고, 내용이 수정되었으며, 다른 화면으로 가려 할 때
        if (currentActiveScreen && currentActiveScreen.id === 'boss-scheduler-screen' && screenId !== 'boss-scheduler-screen') {
            if (isSchedulerDirty && isSchedulerDirty()) {
                if (!confirm('스케줄러에 수정된 내용이 있습니다. 저장하지 않고 나가시겠습니까?')) {
                    // 내비게이션 중단 (UI 메뉴 활성화 상태 복구는 하단 navLinks 렌더링 시 자동 처리됨)
                    return;
                }
            }
        }
        showScreen(DOM, screenId);
    });
    initGlobalEventListeners(DOM);
    initEventHandlers(DOM);

    const handleResize = () => {
        const isMobileView = window.innerWidth <= 768;
        document.body.classList.toggle('is-mobile-view', isMobileView);
        if (isMobileView && DOM.sidebar.classList.contains('more-menu-open')) {
            // Mobile more-menu logic remains
        }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);
    handleResize();
    document.body.classList.remove('loading'); // Deactivate skeleton UI and show real content
    document.getElementById('dashboard-real-content').classList.remove('hidden');
}