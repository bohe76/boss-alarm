// src/app.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { renderFixedAlarms, renderAlarmStatusSummary, renderDashboard } from './ui-renderer.js';
import { log } from './logger.js';
import { LocalStorageManager, BossDataManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import * as DefaultBossList from './default-boss-list.js';
import { formatMonthDay } from './utils.js';
import { EventBus } from './event-bus.js';
import { getRoute, registerRoute } from './router.js';
import { initializeCoreServices } from './services.js';

// Screen Modules
import { getScreen as getAlarmLogScreen } from './screens/alarm-log.js';
import { getScreen as getBossManagementScreen } from './screens/boss-management.js';
import { getScreen as getBossSchedulerScreen } from './screens/boss-scheduler.js';
import { getScreen as getCalculatorScreen } from './screens/calculator.js';
import { getScreen as getCustomListScreen } from './screens/custom-list.js';
import { getScreen as getDashboardScreen } from './screens/dashboard.js';
import { getScreen as getHelpScreen } from './screens/help.js';
import { getScreen as getNotificationSettingsScreen } from './screens/notifications.js';
import { getScreen as getShareScreen } from './screens/share.js';
import { getScreen as getVersionInfoScreen } from './screens/version-info.js';

let dashboardRefreshInterval = null; // Declare the interval variable


function registerAllRoutes() {
    const screenModules = [
        getAlarmLogScreen(),
        getBossManagementScreen(),
        getBossSchedulerScreen(),
        getCalculatorScreen(),
        getCustomListScreen(),
        getDashboardScreen(),
        getHelpScreen(),
        getNotificationSettingsScreen(),
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
        DOM.bossManagementScreen,
        DOM.notificationSettingsScreen,
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

    if (DOM.mainContentArea) {
        requestAnimationFrame(() => {
            DOM.mainContentArea.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        });
    }

    const allNavLinks = [
        DOM.navDashboard, DOM.navBossManagement, DOM.navCalculator, DOM.navBossScheduler,
        DOM.navNotificationSettings, DOM.navAlarmLog, DOM.navVersionInfo, DOM.navShare, DOM.navHelp,
        DOM.bottomNavDashboard, DOM.bottomNavBossManagement, DOM.bottomNavCalculator, DOM.bottomNavShare
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
    if (params.has('data')) {
        DOM.bossListInput.value = decodeURIComponent(params.get('data'));
        log("URL에서 보스 목록을 성공적으로 불러왔습니다.");
    } else {
        const defaultBossList = DefaultBossList.bossPresets[0].list;
        let updatedBossList = defaultBossList;
        const hasDateEntries = /^(\d{2}\.\d{2})/m.test(defaultBossList);
        if (!hasDateEntries) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const todayFormatted = formatMonthDay(today);
            const tomorrowFormatted = formatMonthDay(tomorrow);
            const lines = defaultBossList.split('\n').filter(line => line.trim() !== '');
            let insertIndex = -1;
            let lastTimeInMinutes = -1;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const timeMatch = line.match(/^(\d{2}):(\d{2})/);
                if (timeMatch) {
                    const currentTimeInMinutes = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
                    if (lastTimeInMinutes !== -1 && currentTimeInMinutes < lastTimeInMinutes) {
                        insertIndex = i;
                        break;
                    }
                    lastTimeInMinutes = currentTimeInMinutes;
                }
            }
            if (insertIndex !== -1) lines.splice(insertIndex, 0, tomorrowFormatted);
            lines.unshift(todayFormatted);
            updatedBossList = lines.join('\n');
        }
        DOM.bossListInput.value = updatedBossList;
        log("기본 보스 목록을 불러왔습니다. (URL 데이터 없음)");
    }

    parseBossList(DOM.bossListInput);

    if (params.has('fixedData')) {
        if (LocalStorageManager.importFixedAlarms(decodeURIComponent(params.get('fixedData')))) {
            log("URL에서 고정 알림을 성공적으로 불러왔습니다.");
        } else {
            log("URL에서 고정 알림을 불러오는 데 실패했습니다. 기본값을 사용합니다.", false);
        }
    }
}

// Function to initialize all event handlers
function initEventHandlers(DOM, globalTooltip) {
    DOM.alarmToggleButton.addEventListener('click', () => {
        if (!getIsAlarmRunning()) {
            startAlarm(DOM);
            DOM.alarmToggleButton.classList.remove('alarm-off');
            DOM.alarmToggleButton.classList.add('alarm-on');
            log("알림이 시작되었습니다.", true);
        } else {
            stopAlarm(DOM);
            DOM.alarmToggleButton.classList.remove('alarm-on');
            DOM.alarmToggleButton.classList.add('alarm-off');
            log("알림이 중지되었습니다.", true);
        }
    });

    DOM.sidebarToggle.addEventListener('click', () => {
        const isExpanded = DOM.sidebar.classList.toggle('expanded');
        LocalStorageManager.setSidebarExpandedState(isExpanded);
        hideTooltip(globalTooltip);
    });

    const navLinks = [
        DOM.navDashboard, DOM.navBossManagement, DOM.navCalculator, DOM.navBossScheduler,
        DOM.navNotificationSettings, DOM.navAlarmLog, DOM.navVersionInfo, DOM.navShare, DOM.navHelp
    ];

    navLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const screenId = event.currentTarget.dataset.screen;
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
        DOM.bottomNavDashboard, DOM.bottomNavBossManagement, DOM.bottomNavCalculator, DOM.bottomNavShare
    ];

    bottomNavLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const screenId = event.currentTarget.dataset.screen;
                showScreen(DOM, screenId);
            });
        }
    });

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

    if (DOM.moreMenuCloseButton) DOM.moreMenuCloseButton.addEventListener('click', closeMoreMenu);
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.addEventListener('click', closeMoreMenu);
    
    DOM.sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (DOM.sidebar.classList.contains('more-menu-open')) closeMoreMenu();
        });
    });
}

export async function initApp() {
    const DOM = initDomElements();
    const globalTooltip = document.getElementById('global-tooltip');

    if (DOM.footerVersion) DOM.footerVersion.textContent = window.APP_VERSION;

    await initializeCoreServices(DOM);
    registerAllRoutes();
    loadInitialData(DOM);
    
    // Subscribe to BossDataManager changes to automatically refresh the dashboard
    BossDataManager.subscribe(() => renderDashboard(DOM));
    
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

    if (LocalStorageManager.getSidebarExpandedState()) {
        DOM.sidebar.classList.add('expanded');
    } else {
        DOM.sidebar.classList.remove('expanded');
    }

    showScreen(DOM, 'dashboard-screen');
    DOM.navDashboard.classList.add('active');

    EventBus.on('navigate', (screenId) => showScreen(DOM, screenId));
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
}
