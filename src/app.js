// src/event-handlers.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning, checkAlarms } from './alarm-scheduler.js';
import { renderFixedAlarms, renderAlarmStatusSummary } from './ui-renderer.js';

import { log, initLogger } from './logger.js';
import { LocalStorageManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import * as DefaultBossList from './default-boss-list.js'; // Import bossPresets

import { loadBossLists } from './boss-scheduler-data.js'; // Import boss-scheduler-data functions

import { formatMonthDay } from './utils.js'; // New - Import formatMonthDay



import { initBossManagementScreen } from './screens/boss-management.js';
import { initShareScreen } from './screens/share.js';
import { initCalculatorScreen, handleCalculatorScreenTransition } from './screens/calculator.js';
import { initBossSchedulerScreen } from './screens/boss-scheduler.js';
import { initNotificationSettingsScreen } from './screens/notifications.js';
import { initDashboardScreen } from './screens/dashboard.js';
import { initCustomListScreen } from './screens/custom-list.js';
import { initHelpScreen } from './screens/help.js';
import { initVersionInfoScreen } from './screens/version-info.js';
import { initAlarmLogScreen } from './screens/alarm-log.js';
import { EventBus } from './event-bus.js';



// Global tooltip functions
// const globalTooltip = document.getElementById('global-tooltip'); // Moved inside initApp

function showTooltip(content, targetElement, globalTooltip) {
    if (!globalTooltip) {
        return;
    }
    globalTooltip.innerHTML = content;
    const rect = targetElement.getBoundingClientRect();
    
    // Temporarily set display to block to get accurate offsetHeight
    const originalDisplay = globalTooltip.style.display;
    globalTooltip.style.display = 'block';
    const tooltipHeight = globalTooltip.offsetHeight;
    globalTooltip.style.display = originalDisplay; // Revert display after getting height

    // Desired: Tooltip's top edge aligns with the icon's vertical center
    globalTooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipHeight / 2)}px`;
    globalTooltip.style.left = `${rect.right + 5}px`; // 5px gap from the icon
    globalTooltip.style.opacity = '1';
    globalTooltip.style.visibility = 'visible';
    globalTooltip.style.display = 'block'; // Ensure it's visible
}

function hideTooltip(globalTooltip) {
    if (!globalTooltip) {
        return;
    }
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
        DOM.calculatorScreen, // Updated
        DOM.bossSchedulerScreen // New
    ];

    // Hide all screens
    screens.forEach(screen => {
        if (screen) { // Check if screen element exists
            screen.classList.remove('active');
        }
    });

    // Show the target screen
    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.add('active');
    }

    // Reset scroll position to top for the main content area
    // Defer the scroll reset to ensure the browser has rendered the new content
    if (DOM.mainContentArea) {
        requestAnimationFrame(() => {
            DOM.mainContentArea.scrollTop = 0;
            // Also reset scroll for body and documentElement to cover all cases
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        });
    }

    // --- (State Sync) Update active state for all navigation menus ---
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
    // --- End of State Sync ---


    // Special handling for dashboard screen
    if (screenId === 'dashboard-screen') {
        EventBus.emit('refresh-dashboard', DOM); // Render dashboard content via EventBus
    }

    // Special handling for share screen
    if (screenId === 'share-screen') {
        initShareScreen(DOM);
    }

    // Special handling for version info screen
    if (screenId === 'version-info-screen') {
        initVersionInfoScreen(DOM);
    }

    // Special handling for help screen
    if (screenId === 'help-screen') {
        initHelpScreen(DOM);
    }

    // Special handling for calculator screen
    if (screenId === 'calculator-screen') { // Updated
        handleCalculatorScreenTransition(DOM);
    }

    // Special handling for alarm log screen
    if (screenId === 'alarm-log-screen') {
        initAlarmLogScreen(DOM);
    }

    // Special handling for boss scheduler screen
    if (screenId === 'boss-scheduler-screen') {
        EventBus.emit('show-boss-scheduler-screen');
    }
}




// Function to initialize all event handlers
function initEventHandlers(DOM, globalTooltip) {
    // --- Global Event Handlers ---
    // Alarm Toggle Button
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
        // Store alarm state in LocalStorageManager if needed
    });

    initDashboardScreen(DOM);



    // --- Sidebar Navigation Event Handlers ---
    DOM.sidebarToggle.addEventListener('click', () => {
        const isExpanded = DOM.sidebar.classList.toggle('expanded');
        LocalStorageManager.setSidebarExpandedState(isExpanded);

        // Hide global tooltip when sidebar is expanded or collapsed
        hideTooltip(globalTooltip); // Pass globalTooltip
    });

    const navLinks = [
        DOM.navDashboard,
        DOM.navBossManagement,
        DOM.navCalculator, // Updated
        DOM.navBossScheduler, // New
        DOM.navNotificationSettings,
        DOM.navAlarmLog,
        DOM.navVersionInfo,
        DOM.navShare,
        DOM.navHelp
    ];

    navLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior
                const screenId = event.currentTarget.dataset.screen;
                showScreen(DOM, screenId);

                // --- Active class management is now handled by showScreen ---
            });

                

                                        // Tooltip functionality for collapsed sidebar

                

                                        const menuTextSpan = link.querySelector('.menu-text');

                

                                        if (menuTextSpan) {

                

                                                                                        link.addEventListener('mouseenter', () => {

                

                                                                                            if (!DOM.sidebar.classList.contains('expanded')) {

                

                                                                                                showTooltip(menuTextSpan.textContent, link, globalTooltip); // Pass globalTooltip

                

                                                                                            }

                

                                                                                        });

                

                            

                

                                                                                        link.addEventListener('mouseleave', () => {

                

                            

                

                                                                                            if (!DOM.sidebar.classList.contains('expanded')) {

                

                            

                

                                                                                                hideTooltip(globalTooltip); // Pass globalTooltip

                

                            

                

                                                                                            }

                

                            

                

                                                                                        });

                

                                        }

                        }

                    });

    // --- Bottom Navigation Event Handlers ---
    const bottomNavLinks = [
        DOM.bottomNavDashboard,
        DOM.bottomNavBossManagement,
        DOM.bottomNavCalculator,
        DOM.bottomNavShare
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

    // --- 'More' Menu (Mobile View) Event Handlers ---
    const closeMoreMenu = () => {
        DOM.sidebar.classList.remove('more-menu-open');
        DOM.sidebarBackdrop.classList.remove('active');
        DOM.moreMenuButton.setAttribute('aria-expanded', 'false');

        // Restore accessibility
        DOM.mainContentArea.inert = false;
        document.querySelector('header').inert = false;
        document.querySelector('footer').inert = false;
        document.removeEventListener('keydown', handleMenuKeydown);
        DOM.moreMenuButton.focus(); // Return focus to the button
    };

    const openMoreMenu = () => {
        DOM.sidebar.classList.add('more-menu-open');
        DOM.sidebarBackdrop.classList.add('active');
        DOM.moreMenuButton.setAttribute('aria-expanded', 'true');

        // Enhance accessibility
        DOM.mainContentArea.inert = true;
        document.querySelector('header').inert = true;
        document.querySelector('footer').inert = true;
        document.addEventListener('keydown', handleMenuKeydown);

        // Focus trap
        const focusableElements = DOM.sidebar.querySelectorAll('button, a[href]');
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        
        firstFocusableElement.focus();

        const handleFocusTrap = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstFocusableElement) {
                        e.preventDefault();
                        lastFocusableElement.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastFocusableElement) {
                        e.preventDefault();
                        firstFocusableElement.focus();
                    }
                }
            }
        };
        // Add focus trap listener
        DOM.sidebar.addEventListener('keydown', handleFocusTrap);
        // Add a one-time cleanup listener
        DOM.sidebar.addEventListener('transitionend', () => {
             DOM.sidebar.removeEventListener('keydown', handleFocusTrap);
        }, { once: true });
    };

    const handleMenuKeydown = (e) => {
        if (e.key === 'Escape') {
            closeMoreMenu();
        }
    };

    if (DOM.moreMenuButton) {
        DOM.moreMenuButton.addEventListener('click', () => {
            const isMenuOpen = DOM.sidebar.classList.contains('more-menu-open');
            if (isMenuOpen) {
                closeMoreMenu();
            } else {
                openMoreMenu();
            }
        });
    }

    if (DOM.moreMenuCloseButton) {
        DOM.moreMenuCloseButton.addEventListener('click', closeMoreMenu);
    }

    if (DOM.sidebarBackdrop) {
        DOM.sidebarBackdrop.addEventListener('click', closeMoreMenu);
    }
    
    // Also close menu if a link inside it is clicked
    DOM.sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (DOM.sidebar.classList.contains('more-menu-open')) {
                closeMoreMenu();
            }
        });
    });


    initBossSchedulerScreen(DOM);

    initCustomListScreen(DOM);

    initNotificationSettingsScreen(DOM);

        // Handle add new fixed alarm button click (logic moved to ui-renderer.js)

        initBossManagementScreen(DOM);

    
        initCalculatorScreen(DOM);
    } // This is the end of initEventHandlers

// Function to initialize the application

export async function initApp() { // Made initApp async
    const DOM = initDomElements(); // Initialize DOM elements here
    const globalTooltip = document.getElementById('global-tooltip'); // Initialize globalTooltip here

    // Set version in footer
    if (DOM.footerVersion) DOM.footerVersion.textContent = window.APP_VERSION;

    // Initialize logger with the log container
    initLogger(DOM.logContainer);

    // Load boss lists data
    await loadBossLists();

    // 현재 페이지의 URL 파라미터(물음표 뒤)를 가져옴
    const params = new URLSearchParams(window.location.search);
    
    // 'data'라는 이름의 파라미터가 있는지 확인
    if (params.has('data')) {
        const decodedData = decodeURIComponent(params.get('data'));
        DOM.bossListInput.value = decodedData;
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
            let insertIndex = -1; // Initialize to -1, meaning no wrap-around found yet

            let lastTimeInMinutes = -1; // Track time in minutes
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const timeMatch = line.match(/^(\d{2}):(\d{2})/);
                if (timeMatch) {
                    const currentHour = parseInt(timeMatch[1], 10);
                    const currentMinute = parseInt(timeMatch[2], 10);
                    const currentTimeInMinutes = currentHour * 60 + currentMinute;

                    if (lastTimeInMinutes !== -1 && currentTimeInMinutes < lastTimeInMinutes) { // Check for wrap-around based on full time
                        insertIndex = i; // Insert tomorrow's date before this line
                        break;
                    }
                    lastTimeInMinutes = currentTimeInMinutes;
                }
            }

            // Only add tomorrow's date if a wrap-around point was found
            if (insertIndex !== -1) {
                lines.splice(insertIndex, 0, tomorrowFormatted);
            }

            // Always prepend today's date
            lines.unshift(todayFormatted);

            updatedBossList = lines.join('\n');
        }

        DOM.bossListInput.value = updatedBossList;
        log("기본 보스 목록을 불러왔습니다. (URL 데이터 없음)");
    }

    // 페이지 로드 시 보스 목록을 파싱하고 지난 보스를 제거
    parseBossList(DOM.bossListInput);

    // 고정 알림 상태 로드 및 렌더링
    LocalStorageManager.init();

    // 'fixedData'라는 이름의 파라미터가 있는지 확인하고 고정 알림을 로드
    if (params.has('fixedData')) {
        const decodedFixedData = decodeURIComponent(params.get('fixedData'));
        if (LocalStorageManager.importFixedAlarms(decodedFixedData)) {
            log("URL에서 고정 알림을 성공적으로 불러왔습니다.");
        } else {
            log("URL에서 고정 알림을 불러오는 데 실패했습니다. 기본값을 사용합니다.", false);
        }
    }
    
    // fixedAlarmListDiv를 여기서 다시 가져와서 renderFixedAlarms에 전달
        renderFixedAlarms(DOM);
            
        // Set initial alarm button state
    const isAlarmRunningInitially = getIsAlarmRunning();
    if (isAlarmRunningInitially) {
        DOM.alarmToggleButton.classList.add('alarm-on');
        DOM.alarmToggleButton.classList.remove('alarm-off'); // Ensure off class is removed
        startAlarm(DOM); // Start alarm if it was previously running
    } else {
        DOM.alarmToggleButton.classList.add('alarm-off');
        DOM.alarmToggleButton.classList.remove('alarm-on'); // Ensure on class is removed
    }
    renderAlarmStatusSummary(DOM); // Update status immediately after setting initial state

    // Set initial sidebar state
    if (LocalStorageManager.getSidebarExpandedState()) {
        DOM.sidebar.classList.add('expanded');
    } else {
        DOM.sidebar.classList.remove('expanded');
    }

    // Show the initial screen (e.g., Dashboard)
    showScreen(DOM, 'dashboard-screen');
    // Set active class for initial navigation link
    DOM.navDashboard.classList.add('active');

    // Initialize all event handlers
    EventBus.on('navigate', (screenId) => showScreen(DOM, screenId));
    initEventHandlers(DOM, globalTooltip); // Pass globalTooltip to initEventHandlers
    
    // Initial render of the dashboard
    checkAlarms(); // Call checkAlarms once immediately
    EventBus.emit('refresh-dashboard', DOM);

    // --- Viewport Resize Observer ---
    const handleResize = () => {
        const isMobileView = window.innerWidth <= 768;
        if (isMobileView) {
            document.body.classList.add('is-mobile-view');
        } else {
            document.body.classList.remove('is-mobile-view');
        }
        // In mobile view, if the more menu is open, ensure the sidebar doesn't have the 'expanded' class
        if (isMobileView && DOM.sidebar.classList.contains('more-menu-open')) {
            DOM.sidebar.classList.remove('expanded');
        }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);

    // Initial check
    handleResize();
    
}
