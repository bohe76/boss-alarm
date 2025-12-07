// src/app.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { renderFixedAlarms, renderAlarmStatusSummary, renderDashboard, updateBossListTextarea } from './ui-renderer.js';
import { log } from './logger.js';
import { LocalStorageManager, BossDataManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import * as DefaultBossList from './default-boss-list.js';
import { formatMonthDay } from './utils.js';
import { EventBus } from './event-bus.js';
import { getRoute, registerRoute } from './router.js';
import { initializeCoreServices } from './services.js';
import { initGlobalEventListeners } from './global-event-listeners.js';
import { togglePipWindow } from './pip-manager.js';

// Screen Modules
import { getScreen as getAlarmLogScreen } from './screens/alarm-log.js';
import { getScreen as getBossManagementScreen } from './screens/boss-management.js';
import { getScreen as getBossSchedulerScreen } from './screens/boss-scheduler.js';
import { getScreen as getCalculatorScreen } from './screens/calculator.js';
import { getScreen as getCustomListScreen } from './screens/custom-list.js';
import { getScreen as getDashboardScreen } from './screens/dashboard.js';
import { getScreen as getHelpScreen } from './screens/help.js';
import { getScreen as getSettingsScreen } from './screens/settings.js';
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
    // Unsaved changes check for Boss Management Screen
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'boss-management-screen' && window.isBossListDirty) {
        if (!confirm("값이 저장되지 않았습니다. 그래도 화면을 이동하시겠습니까?\n(확인 시 수정 사항은 반영되지 않습니다.)")) {
            return; // Cancel navigation
        }
        window.isBossListDirty = false; // Reset flag on confirm
        // Optional: Revert textarea to last saved state? 
        // For now, we just allow navigation. If user comes back, they might see dirty text or reset text depending on implementation.
        // To be safe, let's force a reset of the textarea from DATA when leaving or entering?
        // Actually, 'boss-management-screen' doesn't have 'onTransition' to reset. 
        // But since we didn't save, DATA is pristine. 
        // If we want to clear the dirty text, we should do it here.
        updateBossListTextarea(DOM); // Revert UI to match saved DATA
    }

    const screens = [
        DOM.dashboardScreen,
        DOM.bossManagementScreen,
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

    if (DOM.mainContentArea) {
        requestAnimationFrame(() => {
            DOM.mainContentArea.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        });
    }

    const allNavLinks = [
        DOM.navDashboard, DOM.navBossManagement, DOM.navCalculator, DOM.navBossScheduler,
        DOM.navSettings, DOM.navAlarmLog, DOM.navVersionInfo, DOM.navShare, DOM.navHelp,
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
    let loadSuccess = false;

    if (params.has('data')) {
        DOM.bossListInput.value = decodeURIComponent(params.get('data'));
        const result = parseBossList(DOM.bossListInput);
        if (result.success) {
            BossDataManager.setBossSchedule(result.mergedSchedule);
            loadSuccess = true;
            log("URL에서 보스 목록을 성공적으로 불러왔습니다.");
        } else {
            alert("URL의 보스 설정 값이 올바르지 않습니다. 오류:\n" + result.errors.join('\n') + "\n\n기본값으로 초기화합니다.");
            log("URL 데이터 파싱 실패. 기본값으로 복구합니다.", false);
        }
    } 
    
    if (!loadSuccess) {
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
        
        const result = parseBossList(DOM.bossListInput);
        if (result.success) {
            BossDataManager.setBossSchedule(result.mergedSchedule);
            log("기본 보스 목록을 불러왔습니다.");
        } else {
            console.error("Critical: Default boss list parsing failed!", result.errors);
            alert("기본 보스 목록 로드에 실패했습니다. 시스템 관리자에게 문의하세요.");
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
        } else {
            stopAlarm(DOM);
            DOM.alarmToggleButton.classList.remove('alarm-on');
            DOM.alarmToggleButton.classList.add('alarm-off');
            log("알림이 중지되었습니다.", true);
        }
    });

    if (DOM.pipToggleButton) {
        DOM.pipToggleButton.addEventListener('click', () => {
            togglePipWindow();
        });
    }

    DOM.sidebarToggle.addEventListener('click', () => {
        const isExpanded = DOM.sidebar.classList.toggle('expanded');
        LocalStorageManager.setSidebarExpandedState(isExpanded);
        hideTooltip(globalTooltip);
    });

    const navLinks = [
        DOM.navDashboard, DOM.navBossManagement, DOM.navCalculator, DOM.navBossScheduler,
        DOM.navSettings, DOM.navAlarmLog, DOM.navVersionInfo, DOM.navShare, DOM.navHelp
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
    window.isBossListDirty = false; // Initialize dirty flag
    document.body.classList.add('loading'); // Activate skeleton UI
    const DOM = initDomElements();
    const globalTooltip = document.getElementById('global-tooltip');

    if (DOM.footerVersion) DOM.footerVersion.textContent = window.APP_VERSION;
    
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