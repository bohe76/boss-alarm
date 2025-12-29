// src/app.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { renderFixedAlarms, renderAlarmStatusSummary, renderDashboard, updateBossListTextarea } from './ui-renderer.js';
import { log } from './logger.js';
import { LocalStorageManager, BossDataManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import { getInitialDefaultData } from './boss-scheduler-data.js';
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


// Global tooltip functions
function showTooltip(content, targetElement, globalTooltip) {
    if (!globalTooltip) return;
    globalTooltip.innerHTML = content;
    const rect = targetElement.getBoundingClientRect();
    const originalDisplay = globalTooltip.style.display;
    globalTooltip.style.display = 'block';
    const tooltipHeight = globalTooltip.offsetHeight;
    globalTooltip.style.display = originalDisplay;
    globalTooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipHeight / 2)}px`;
    globalTooltip.style.left = `${rect.right + 5}px`;
    globalTooltip.style.opacity = '1';
    globalTooltip.style.visibility = 'visible';
    globalTooltip.style.display = 'block';
}

function hideTooltip(globalTooltip) {
    if (!globalTooltip) return;
    globalTooltip.style.display = 'none';
    globalTooltip.style.opacity = '0';
    globalTooltip.style.visibility = 'hidden';
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
        dashboardRefreshInterval = setInterval(() => renderDashboard(DOM), 1000);
    }
    // End manage dashboard refresh interval

    if (screenId === 'boss-scheduler-screen') EventBus.emit('show-boss-scheduler-screen');
}

function loadInitialData(DOM) {
    const params = new URLSearchParams(window.location.search);
    const existingSchedule = BossDataManager.getBossSchedule();
    let loadSuccess = false;

    // 1. URL 데이터 우선 로드
    if (params.has('data')) {
        DOM.schedulerBossListInput.value = decodeURIComponent(params.get('data'));
        const result = parseBossList(DOM.schedulerBossListInput);
        if (result.success) {
            BossDataManager.setBossSchedule(result.mergedSchedule);
            BossDataManager.clearDraft(); // URL 로딩 시 기존 Draft 삭제 (혼선 방지)
            loadSuccess = true;
            log("URL에서 보스 목록을 성공적으로 불러왔습니다.");
        } else {
            alert("URL의 보스 설정 값이 올바르지 않습니다. 오류:\n" + result.errors.join('\n') + "\n\n현재 설정된 데이터를 유지합니다.");
            log("URL 데이터 파싱 실패.", false);
            loadSuccess = (existingSchedule && existingSchedule.length > 0);
        }
    } else if (existingSchedule && existingSchedule.length > 0) {
        // 2. 기존 사용자 데이터가 이미 있으면 그대로 유지 (이미 BossDataManager 내부에 로드됨)
        loadSuccess = true;
        console.log('[Debug] loadInitialData - Existing local schedule found, skipping default data');
    }

    // 3. 로드된 데이터가 전혀 없는 경우에만 기본 샘플 데이터 로드
    if (!loadSuccess) {
        const initialData = getInitialDefaultData();
        if (initialData && initialData.items) {
            const schedule = processBossItems(initialData.items);
            BossDataManager.setBossSchedule(schedule);
            log("기본 보스 목록을 불러왔습니다.");
        } else {
            console.error("Critical: Default boss data loading failed!");
            alert("기본 보스 목록 로드에 실패했습니다. 페이지를 새로고침해 주세요.");
        }
    }

    updateBossListTextarea(DOM); // Ensure UI reflects the parsed and normalized data
}

// Function to initialize all event handlers
function initEventHandlers(DOM, globalTooltip) {
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
            togglePipWindow();
            trackEvent('Click Button', { event_category: 'Feature Usage', event_label: 'PiP 토글' });
        });
    }

    DOM.sidebarToggle.addEventListener('click', () => {
        const isExpanded = DOM.sidebar.classList.toggle('expanded');
        LocalStorageManager.setSidebarExpandedState(isExpanded);
        hideTooltip(globalTooltip);
    });

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

            const menuTextSpan = link.querySelector('.menu-text');
            if (menuTextSpan) {
                link.addEventListener('mouseenter', () => {
                    if (!DOM.sidebar.classList.contains('expanded')) {
                        showTooltip(menuTextSpan.textContent, link, globalTooltip);
                    }
                });
                link.addEventListener('mouseleave', () => {
                    if (!DOM.sidebar.classList.contains('expanded')) {
                        hideTooltip(globalTooltip);
                    }
                });
            }
        }
    });

    const bottomNavLinks = [
        DOM.bottomNavDashboard, DOM.bottomNavTimetable, DOM.bottomNavCalculator, DOM.bottomNavShare
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
            trackEvent('Click Button', { event_category: 'Navigation', event_label: '시간표 수정하기 버튼 클릭' });
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
    const globalTooltip = document.getElementById('global-tooltip');

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

    if (LocalStorageManager.getSidebarExpandedState()) {
        DOM.sidebar.classList.add('expanded');
    } else {
        DOM.sidebar.classList.remove('expanded');
    }

    showScreen(DOM, 'dashboard-screen');
    DOM.navDashboard.classList.add('active');

    EventBus.on('navigate', (screenId) => showScreen(DOM, screenId));
    initGlobalEventListeners(DOM);
    initEventHandlers(DOM, globalTooltip);

    const handleResize = () => {
        const isMobileView = window.innerWidth <= 768;
        document.body.classList.toggle('is-mobile-view', isMobileView);
        if (isMobileView && DOM.sidebar.classList.contains('more-menu-open')) {
            DOM.sidebar.classList.remove('expanded');
        }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);
    handleResize();
    document.body.classList.remove('loading'); // Deactivate skeleton UI and show real content
    document.getElementById('dashboard-real-content').classList.remove('hidden');
}