// src/event-handlers.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { updateBossListTextarea, renderFixedAlarms, updateFixedAlarmVisuals, renderDashboard, renderBossPresets, renderVersionInfo } from './ui-renderer.js';
import { getShortUrl } from './api-service.js';
import { log, initLogger } from './logger.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import { bossPresets } from './default-boss-list.js'; // Import bossPresets

// Helper function to load markdown content

async function loadMarkdownContent(DOM, filePath, targetElement) {

    try {

        const cacheBuster = Date.now(); // Or a version number if preferred
        const response = await fetch(`${filePath}?v=${cacheBuster}`);

        const markdown = await response.text(); // Get text from the first response

        targetElement.innerHTML = `<pre>${markdown}</pre>`; // Revert to displaying raw text

    } catch (error) {

        console.error(`Failed to load markdown from ${filePath}:`, error);

        targetElement.innerHTML = `<p>콘텐츠를 불러오는 데 실패했습니다.</p>`;

    }

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
        renderDashboard(); // Render dashboard content when dashboard screen is active
    }

    // Special handling for version info screen
    if (screenId === 'version-info-screen') {
        renderVersionInfo();
    }

    // Special handling for help screen tabs
    if (screenId === 'help-screen') {
        // Ensure feature guide is loaded and active by default when opening help screen
        switchHelpTab(DOM, 'featureGuide');
    }
}

// Function to switch between help tabs (now internal to help screen logic)
function switchHelpTab(DOM, tabName) {
    // Deactivate all tab buttons and content
    DOM.featureGuideTabButton.classList.remove('active');
    DOM.versionHistoryTabButton.classList.remove('active');
    DOM.featureGuideContent.classList.remove('active');
    DOM.versionHistoryContent.classList.remove('active');

    // Activate the selected tab button and content
    if (tabName === 'featureGuide') {
        DOM.featureGuideTabButton.classList.add('active');
        DOM.featureGuideContent.classList.add('active');
        loadMarkdownContent(DOM, 'docs/feature_guide.txt', DOM.featureGuideContent);
    } else if (tabName === 'versionHistory') {
        DOM.versionHistoryTabButton.classList.add('active');
        DOM.versionHistoryContent.classList.add('active');
        loadMarkdownContent(DOM, 'docs/version_history.txt', DOM.versionHistoryContent);
    }
}


// Function to initialize all event handlers
function initEventHandlers(DOM) {
    // --- Global Event Handlers ---
    // Alarm Toggle Button
    DOM.alarmToggleButton.addEventListener('click', () => {
        if (!getIsAlarmRunning()) {
            startAlarm();
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

    // Help Button (now switches to help screen)
    DOM.helpButton.addEventListener('click', () => showScreen(DOM, 'help-screen'));

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
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior
                const screenId = event.currentTarget.dataset.screen;
                showScreen(DOM, screenId);

                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                // Add active class to the clicked link
                event.currentTarget.classList.add('active');
            });
        }
    });

    // --- Boss Management Screen Event Handlers ---
    // Preset Boss List Apply Button
    DOM.applyPresetButton.addEventListener('click', () => {
        const selectedIndex = DOM.presetBossListSelect.value;
        if (selectedIndex !== null && bossPresets[selectedIndex]) {
            DOM.bossListInput.value = bossPresets[selectedIndex].list;
            parseBossList(DOM.bossListInput); // Re-parse the boss list after applying preset
            log(`프리셋 '${bossPresets[selectedIndex].name}'이(가) 적용되었습니다.`, true);
        }
    });

    // '공유 링크 생성' 버튼 이벤트
    DOM.shareButton.addEventListener('click', async () => {
        DOM.shareButton.disabled = true;
        DOM.shareButton.textContent = "단축 URL 생성 중...";
        DOM.shareLinkInput.value = "잠시만 기다려주세요...";

        const currentData = DOM.bossListInput.value;
        const encodedData = encodeURIComponent(currentData);
        const baseUrl = window.location.href.split('?')[0];
        const longUrl = `${baseUrl}?data=${encodedData}`;

        const shortUrl = await getShortUrl(longUrl);

        if (shortUrl) {
            DOM.shareLinkInput.value = shortUrl;
            log("단축 URL이 생성되었습니다. '복사' 버튼을 눌러주세요.", true);
        } else {
            DOM.shareLinkInput.value = longUrl;
            log("URL 단축 실패. 대신 원본 URL을 생성합니다.", true);
        }

        DOM.shareButton.disabled = false;
        DOM.shareButton.textContent = "공유 링크 생성 (Short URL)";
    });

    // '복사' 버튼 이벤트
    DOM.copyButton.addEventListener('click', () => {
        const urlToCopy = DOM.shareLinkInput.value;
        
        if (urlToCopy && urlToCopy !== "목록 수정 후 버튼을 누르세요" && urlToCopy !== "잠시만 기다려주세요...") {
            navigator.clipboard.writeText(urlToCopy).then(() => {
                log("링크가 클립보드에 복사되었습니다.", true);
                const originalText = DOM.copyButton.textContent;
                DOM.copyButton.textContent = '복사됨!';
                setTimeout(() => {
                    DOM.copyButton.textContent = originalText;
                }, 1500);
            }).catch(err => {
                log("복사에 실패했습니다. 수동으로 복사해주세요.", true);
                console.error('클립보드 복사 실패:', err);
            });
        } else {
            log("복사할 링크가 없습니다. 먼저 링크를 생성해주세요.", false);
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

    // --- Help Screen Event Handlers ---
    DOM.featureGuideTabButton.addEventListener('click', () => switchHelpTab(DOM, 'featureGuide'));
    DOM.versionHistoryTabButton.addEventListener('click', () => switchHelpTab(DOM, 'versionHistory'));
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

    

            DOM.bossListInput.value = bossPresets[0].list; // Use the first preset as default

    

            log("기본 보스 목록을 불러왔습니다. (URL 데이터 없음)");

    

        }



    // 페이지 로드 시 보스 목록을 파싱하고 지난 보스를 제거

    parseBossList(DOM.bossListInput);



    // 고정 알림 상태 로드 및 렌더링

    LocalStorageManager.init();

    DOM.globalFixedAlarmToggle.checked = LocalStorageManager.getFixedAlarmStates().global;

    

    // fixedAlarmListDiv를 여기서 다시 가져와서 renderFixedAlarms에 전달

    const fixedAlarmListDivElement = DOM.fixedAlarmListDiv;

    renderFixedAlarms(fixedAlarmListDivElement);

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



    



                



    



                        // Render boss presets dropdown



    



                        renderBossPresets();



    



                



    



                        // Initial render of the dashboard



    



                        renderDashboard();



    



                



    



                        // Update dashboard every second for countdowns



    



                        setInterval(renderDashboard, 1000);



    



                    }
