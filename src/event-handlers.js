// src/event-handlers.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { updateBossListTextarea, renderFixedAlarms, updateFixedAlarmVisuals, renderDashboard, renderVersionInfo } from './ui-renderer.js';
import { getShortUrl, loadMarkdownContent } from './api-service.js';
import { log, initLogger } from './logger.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import { bossPresets } from './default-boss-list.js'; // Import bossPresets



// Function to show a specific screen and hide others
function showScreen(DOM, screenId) {
    const screens = [
        DOM.dashboardScreen,
        DOM.bossManagementScreen,
        DOM.notificationSettingsScreen,
        DOM.alarmLogScreen,
        DOM.versionInfoScreen,
        DOM.shareScreen,
        DOM.helpScreen
    ];

    screens.forEach(screen => {
        if (screen) { // Check if screen element exists
            screen.classList.remove('active');
        }
    });

    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.add('active');
    }

    // Special handling for dashboard screen
    if (screenId === 'dashboard-screen') {
        renderDashboard(DOM); // Render dashboard content when dashboard screen is active
    }

    // Special handling for version info screen
    if (screenId === 'version-info-screen') {
        renderVersionInfo(DOM);
    }

    // Special handling for help screen
    if (screenId === 'help-screen') {
        // Directly load feature guide content when opening help screen
        (async () => {
            const markdownContent = await loadMarkdownContent('docs/feature_guide.txt');
            DOM.featureGuideContent.innerHTML = `<pre>${markdownContent}</pre>`;
        })();
    }
}




// Function to initialize all event handlers
function initEventHandlers(DOM) {
    // --- Global Event Handlers ---
    // Alarm Toggle Button
    DOM.alarmToggleButton.addEventListener('click', () => {
        if (!getIsAlarmRunning()) {
            startAlarm(DOM);
            DOM.alarmToggleButton.classList.remove('alarm-off');
            DOM.alarmToggleButton.classList.add('alarm-on');
            log("알림이 시작되었습니다.", true);
        } else {
            stopAlarm();
            DOM.alarmToggleButton.classList.remove('alarm-on');
            DOM.alarmToggleButton.classList.add('alarm-off');
            log("알림이 중지되었습니다.", true);
        }
        // Store alarm state in LocalStorageManager if needed
    });



    // --- Sidebar Navigation Event Handlers ---
    DOM.sidebarToggle.addEventListener('click', () => {
        const isExpanded = DOM.sidebar.classList.toggle('expanded');
        LocalStorageManager.setSidebarExpandedState(isExpanded);
    });

    const navLinks = [
        DOM.navDashboard,
        DOM.navBossManagement,
        DOM.navNotificationSettings,
        DOM.navAlarmLog,
        DOM.navVersionInfo,
        DOM.navShare,
        DOM.navHelp
    ];

    navLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', async (event) => { // Added async here
                event.preventDefault(); // Prevent default link behavior
                const screenId = event.currentTarget.dataset.screen;
                showScreen(DOM, screenId);

                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                // Add active class to the clicked link
                event.currentTarget.classList.add('active');

                if (screenId === 'share-screen') {
                    DOM.shareMessage.textContent = "링크가 생성 중 입니다. 잠시만 기다려 주세요..";
                    const currentData = DOM.bossListInput.value;
                    const encodedData = encodeURIComponent(currentData);
                    const baseUrl = window.location.href.split('?')[0];
                    const longUrl = `${baseUrl}?data=${encodedData}`;

                    const shortUrl = await getShortUrl(longUrl);

                    if (shortUrl) {
                        navigator.clipboard.writeText(shortUrl).then(() => {
                            DOM.shareMessage.textContent = "클립 보드에 복사 되었습니다.";
                            log("단축 URL이 클립보드에 복사되었습니다.", true);
                        }).catch(err => {
                            DOM.shareMessage.textContent = `클립 보드 복사 실패: ${shortUrl}`;
                            log(`클립보드 복사 실패: ${err}`, false);
                            console.error('클립보드 복사 실패:', err);
                        });
                    } else {
                        DOM.shareMessage.textContent = `URL 단축 실패: ${longUrl}`;
                        log("URL 단축 실패. 대신 원본 URL을 표시합니다.", false);
                    }
                }
            });
        }
    });




    // --- Notification Settings Screen Event Handlers ---
    // 고정 알림 전체 ON/OFF 토글 버튼 이벤트
    DOM.globalFixedAlarmToggle.addEventListener('change', (event) => {
        const currentStates = LocalStorageManager.getFixedAlarmStates();
        currentStates.global = event.target.checked;
        LocalStorageManager.setFixedAlarmStates(currentStates);
        updateFixedAlarmVisuals();
    });

    // --- Alarm Log Screen Event Handlers ---
    // 알림 로그 가시성 토글 이벤트
    DOM.logVisibilityToggle.addEventListener('change', (event) => {
        LocalStorageManager.setLogVisibilityState(event.target.checked);
        if (LocalStorageManager.getLogVisibilityState()) {
            DOM.logContainer.classList.remove('hidden');
        } else {
            DOM.logContainer.classList.add('hidden');
        }
    });


}

// Function to initialize the application

export function initApp() {
    const DOM = initDomElements(); // Initialize DOM elements here

    // Initialize logger with the log container
    initLogger(DOM.logContainer);

    // 현재 페이지의 URL 파라미터(물음표 뒤)를 가져옴
    const params = new URLSearchParams(window.location.search);
    
    // 'data'라는 이름의 파라미터가 있는지 확인
    if (params.has('data')) {
        const decodedData = decodeURIComponent(params.get('data'));
        DOM.bossListInput.value = decodedData;
        log("URL에서 보스 목록을 성공적으로 불러왔습니다.");
    } else {
        const defaultBossList = bossPresets[0].list;
        let updatedBossList = defaultBossList;

        const hasDateEntries = /^(\d{2}\.\d{2})/m.test(defaultBossList);

        if (!hasDateEntries) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const formatMonthDay = (date) => {
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                return `${month}.${day}`;
            };

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
    DOM.globalFixedAlarmToggle.checked = LocalStorageManager.getFixedAlarmStates().global;
    
    // fixedAlarmListDiv를 여기서 다시 가져와서 renderFixedAlarms에 전달
    renderFixedAlarms(DOM);
    // 알림 로그 가시성 상태 로드 및 적용
    DOM.logVisibilityToggle.checked = LocalStorageManager.getLogVisibilityState();
    if (LocalStorageManager.getLogVisibilityState()) {
        DOM.logContainer.classList.remove('hidden');
    } else {
        DOM.logContainer.classList.add('hidden');
    }

    // Set initial alarm button state
    if (getIsAlarmRunning()) {
        DOM.alarmToggleButton.classList.add('alarm-on');
        startAlarm(DOM); // Start alarm if it was previously running
    } else {
        DOM.alarmToggleButton.classList.add('alarm-off');
    }

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
    initEventHandlers(DOM);
    
    // Initial render of the dashboard
    renderDashboard(DOM);
    
}