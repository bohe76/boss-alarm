// src/app.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { renderFixedAlarms, renderAlarmStatusSummary, renderDashboard, updateBossListTextarea, renderUpdateModal } from './ui-renderer.js';
import { log } from './logger.js';
import { LocalStorageManager, BossDataManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import { getInitialDefaultData, getGameNames, getBossNamesForGame, getUpdateNoticeData } from './boss-scheduler-data.js';
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
        renderDashboard(DOM); // Immediate render
        dashboardRefreshInterval = setInterval(() => {
            // 모달이 열려 있으면 렌더링 생략 (내보내기 프리뷰 보호)
            const isAnyModalOpen = Array.from(document.querySelectorAll('.modal'))
                .some(modal => window.getComputedStyle(modal).display === 'flex');
            if (isAnyModalOpen) return;

            renderDashboard(DOM);
        }, 1000);
    }
    // End manage dashboard refresh interval

    if (screenId === 'boss-scheduler-screen') EventBus.emit('show-boss-scheduler-screen');
}

/**
 * 보스 일정의 데이터 무결성을 검증합니다.
 * 스케줄에 포함된 모든 보스의 이름이 현재 시스템 정의(프리셋/커스텀)에 존재하는지 확인합니다.
 */
function validateScheduleIntegrity(schedule) {
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) return false;

    // 현재 시스템의 모든 유효한 보스 이름 수집
    const allValidBossNames = new Set();
    const games = getGameNames();
    games.forEach(game => {
        const names = getBossNamesForGame(game.id);
        names.forEach(name => allValidBossNames.add(name));
    });

    const bossItems = schedule.filter(item => item.type === 'boss');
    if (bossItems.length === 0) return true; // 보스가 없는 일정(날짜 헤더만 등)은 일단 통과

    // 단 하나라도 '유령 보스(정의가 사라진 보스)'가 있다면 오염된 것으로 간주
    return !bossItems.some(item => !allValidBossNames.has(item.name));
}

function loadInitialData(DOM) {
    const params = new URLSearchParams(window.location.search);
    let loadSuccess = false;

    // 1. URL 데이터 우선 로드
    if (params.has('data')) {
        DOM.schedulerBossListInput.value = decodeURIComponent(params.get('data'));
        const result = parseBossList(DOM.schedulerBossListInput);

        // URL 데이터가 존재하고 파싱에 성공했으며, 무결성 검사까지 통과한 경우만 승인
        if (result.success && validateScheduleIntegrity(result.mergedSchedule)) {
            BossDataManager.setBossSchedule(result.mergedSchedule);
            BossDataManager.clearDraft(); // URL 로딩 성공 시 기존 Draft 삭제
            loadSuccess = true;
            log("URL에서 보스 목록을 성공적으로 불러왔습니다.");
        } else {
            // URL 데이터 오염 시: 경고 후 무시(Proceed to Storage)
            alert("URL의 보스 설정 데이터가 유효하지 않거나 오염되었습니다. 기존 설정 또는 기본 데이터를 사용합니다.");
            log("URL 데이터 오염 또는 파싱 실패. 무시하고 진행합니다.", false);
        }
    }

    // 2. 기존 로컬 스토리지 데이터 검사 (URL 로드 실패 시에만 실행)
    if (!loadSuccess) {
        const existingSchedule = BossDataManager.getBossSchedule();

        if (existingSchedule && existingSchedule.length > 0) {
            if (validateScheduleIntegrity(existingSchedule)) {
                loadSuccess = true;
                log("로컬 스토리지에서 보스 일정을 로드했습니다.");
            } else {
                // 로컬 스토리지 데이터 오염 시: 강제 초기화하여 루프 방지
                log("로컬 스토리지 데이터 오염 감지. 안전을 위해 초기화 후 기본 샘플 데이터를 로드합니다.", false);
                BossDataManager.setBossSchedule([]); // 기존 오염 데이터 삭제
                loadSuccess = false;
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
    const versionKey = `hide_update_modal_${window.APP_VERSION || 'v2.16.2'}`;

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
        DOM.footerContactButton.href = `https://tally.so/r/vGMYND?appVersion=${window.APP_VERSION}`;
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

    loadInitialData(DOM);
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

    EventBus.on('navigate', (screenId) => showScreen(DOM, screenId));
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