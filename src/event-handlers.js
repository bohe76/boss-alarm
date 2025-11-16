// src/event-handlers.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning, checkAlarms } from './alarm-scheduler.js';
import { updateBossListTextarea, renderFixedAlarms, updateFixedAlarmVisuals, renderDashboard, renderVersionInfo, renderAlarmStatusSummary, renderCalculatorScreen, renderBossSchedulerScreen, renderBossInputs } from './ui-renderer.js';
import { getShortUrl, loadMarkdownContent } from './api-service.js';
import { log, initLogger } from './logger.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import { bossPresets } from './default-boss-list.js'; // Import bossPresets
import { calculateBossAppearanceTime } from './calculator.js'; // Import calculateBossAppearanceTime
import { loadBossLists, getGameNames, getBossNamesForGame } from './boss-scheduler-data.js'; // Import boss-scheduler-data functions

let _remainingTimes = {}; // Global variable to store remaining times for boss scheduler



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
        DOM.zenCalculatorScreen, // New
        DOM.bossSchedulerScreen // New
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
            const markdownContent = await loadMarkdownContent(`docs/feature_guide.txt?v=${window.APP_VERSION}`);
            DOM.featureGuideContent.innerHTML = `<pre class="doc-content-pre">${markdownContent}</pre>`;
        })();
    }

    // Special handling for zen calculator screen
    if (screenId === 'zen-calculator-screen') {
        renderCalculatorScreen(DOM);
    }

    // Special handling for boss scheduler screen
    if (screenId === 'boss-scheduler-screen') {
        renderBossSchedulerScreen(DOM, _remainingTimes);
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
            stopAlarm(DOM);
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
        DOM.navZenCalculator, // New
        DOM.navBossScheduler, // New
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
                    DOM.shareMessage.textContent = "공유 링크 생성 중입니다. 잠시만 기다려 주세요...";
                    const currentBossListData = DOM.bossListInput.value;
                    const encodedBossListData = encodeURIComponent(currentBossListData);

                    const fixedAlarmsData = LocalStorageManager.exportFixedAlarms();
                    const encodedFixedAlarmsData = encodeURIComponent(fixedAlarmsData);

                    const baseUrl = window.location.href.split('?')[0];
                    const longUrl = `${baseUrl}?data=${encodedBossListData}&fixedData=${encodedFixedAlarmsData}`;
                    const shortUrl = await getShortUrl(longUrl);

                    await navigator.clipboard.writeText(shortUrl || longUrl); // Copy short URL if available, else long URL
                    DOM.shareMessage.textContent = shortUrl ? "클립보드에 복사되었습니다." : `URL 단축 실패: ${longUrl} (원본 URL 복사됨)`;
                    log(shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : "URL 단축 실패. 원본 URL이 클립보드에 복사되었습니다.", true);
                }
            });
        }
    });

    // --- Zen Calculator Screen Event Handlers ---
    if (DOM.remainingTimeInput) {
        DOM.remainingTimeInput.addEventListener('input', () => {
            const remainingTime = DOM.remainingTimeInput.value;
            const bossAppearanceTime = calculateBossAppearanceTime(remainingTime);
            if (DOM.bossAppearanceTimeDisplay) {
                DOM.bossAppearanceTimeDisplay.textContent = bossAppearanceTime || '--:--:--';
            }
        });
    }

    // --- Boss Scheduler Screen Event Handlers ---
    if (DOM.bossSchedulerScreen) {
        // Game selection change
        DOM.bossSchedulerScreen.addEventListener('change', (event) => {
            if (event.target === DOM.gameSelect) {
                renderBossInputs(DOM, DOM.gameSelect.value);
            }
        });

        // Remaining time input change (event delegation)
        DOM.bossSchedulerScreen.addEventListener('input', (event) => {
            if (event.target.classList.contains('remaining-time-input')) {
                const inputField = event.target;
                const remainingTime = inputField.value;
                const calculatedTimeSpan = inputField.nextElementSibling; // Assuming span is next sibling

                const bossAppearanceTime = calculateBossAppearanceTime(remainingTime);
                if (calculatedTimeSpan) {
                    calculatedTimeSpan.textContent = bossAppearanceTime || '--:--:--';
                }
            }
        });

        // Clear all remaining times button
        DOM.bossSchedulerScreen.addEventListener('click', (event) => {
            if (event.target === DOM.clearAllRemainingTimesButton) {
                if (confirm("모든 남은 시간을 삭제하시겠습니까?")) { // Confirmation dialog
                    DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
                        input.value = '';
                        input.nextElementSibling.textContent = '--:--:--';
                    });
                    log("모든 남은 시간이 삭제되었습니다.", true);
                }
            }
        });

        // Move to Boss Settings button
        DOM.bossSchedulerScreen.addEventListener('click', (event) => {
            if (event.target === DOM.moveToBossSettingsButton) {
                const bossEntries = [];
                const currentYear = new Date().getFullYear();

                DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
                    const bossName = item.querySelector('.boss-name').textContent;
                    const remainingTimeInput = item.querySelector('.remaining-time-input');
                    const remainingTime = remainingTimeInput.value;

                    if (remainingTime) {
                        const calculatedTime = calculateBossAppearanceTime(remainingTime);
                        if (calculatedTime) {
                            // Calculate full Date object for sorting and date markers
                            const now = new Date();
                            const [hours, minutes, seconds] = remainingTime.split(':').map(Number);
                            now.setHours(now.getHours() + hours);
                            now.setMinutes(now.getMinutes() + minutes);
                            now.setSeconds(now.getSeconds() + (seconds || 0));

                            bossEntries.push({
                                name: bossName,
                                time: calculatedTime,
                                timestamp: now.getTime(), // Store timestamp for sorting
                                date: now // Store full date object
                            });
                        }
                    }
                });

                // Sort boss entries by timestamp
                bossEntries.sort((a, b) => a.timestamp - b.timestamp);

                let output = [];
                let lastDate = null;

                bossEntries.forEach(entry => {
                    const entryDate = entry.date;
                    const formattedDate = `${String(entryDate.getMonth() + 1).padStart(2, '0')}.${String(entryDate.getDate()).padStart(2, '0')}`;

                    if (!lastDate || entryDate.toDateString() !== lastDate.toDateString()) {
                        output.push(formattedDate);
                        lastDate = entryDate;
                    }
                    output.push(`${entry.time} ${entry.name}`);
                });

                DOM.bossListInput.value = output.join('\n');
                parseBossList(DOM.bossListInput); // Parse the new boss list
                renderDashboard(DOM); // Re-render dashboard to reflect changes
                
                // Store current remaining times before navigating away
                _remainingTimes = {}; // Clear previous state
                DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
                    const bossName = item.querySelector('.boss-name').textContent;
                    const remainingTimeInput = item.querySelector('.remaining-time-input');
                    _remainingTimes[bossName] = remainingTimeInput.value;
                });

                showScreen(DOM, 'boss-management-screen'); // Navigate to Boss Management screen
                log("보스 스케줄러에서 보스 설정으로 목록이 전송되었습니다.", true);
            }
        });
    }




    // --- Boss Management Screen Event Handlers ---
    // Update boss schedule when textarea input changes
    DOM.bossListInput.addEventListener('input', () => {
        parseBossList(DOM.bossListInput);
        renderDashboard(DOM); // Re-render dashboard to reflect changes
    });


    // --- Notification Settings Screen Event Handlers ---
    // The global fixed alarm toggle logic is removed as fixed alarms are now individually managed.

    // Helper for time validation
    const isValidTime = (time) => /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(time);

    // Event delegation for fixed alarm items (edit, delete, individual toggle)
    if (DOM.fixedAlarmListDiv) { // Defensive check
        DOM.fixedAlarmListDiv.addEventListener('click', (event) => {
            const target = event.target;

            // Handle individual toggle change
            if (target.matches('.switch input[type="checkbox"]')) {
                const alarmId = target.dataset.id;
                const fixedAlarms = LocalStorageManager.getFixedAlarms();
                const alarmToUpdate = fixedAlarms.find(alarm => alarm.id === alarmId);
                if (alarmToUpdate) {
                    alarmToUpdate.enabled = target.checked;
                    LocalStorageManager.updateFixedAlarm(alarmId, alarmToUpdate);
                    updateFixedAlarmVisuals(DOM);
                }
            }

            // Handle edit button click
            if (target.matches('.edit-fixed-alarm-button')) {
                const alarmId = target.dataset.id;
                const fixedAlarms = LocalStorageManager.getFixedAlarms();
                const alarmToEdit = fixedAlarms.find(alarm => alarm.id === alarmId);

                if (alarmToEdit) {
                    const newTime = prompt(`"${alarmToEdit.name}"의 새 시간을 입력하세요 (HH:MM):`, alarmToEdit.time);
                    if (newTime === null) return; // User cancelled
                    if (!isValidTime(newTime)) {
                        log("유효하지 않은 시간 형식입니다. HH:MM 형식으로 입력해주세요.", false);
                        return;
                    }

                    const newName = prompt(`"${alarmToEdit.name}"의 새 이름을 입력하세요:`, alarmToEdit.name);
                    if (newName === null) return; // User cancelled
                    if (!newName.trim()) {
                        log("이름은 비워둘 수 없습니다.", false);
                        return;
                    }

                    LocalStorageManager.updateFixedAlarm(alarmId, { time: newTime, name: newName.trim() });
                    renderFixedAlarms(DOM); // Re-render to show changes
                    log(`고정 알림 "${alarmToEdit.name}"이(가) "${newName.trim()} ${newTime}"으로 수정되었습니다.`, true);
                }
            }

            // Handle delete button click
            if (target.matches('.delete-fixed-alarm-button')) {
                const alarmId = target.dataset.id;
                const fixedAlarms = LocalStorageManager.getFixedAlarms();
                const alarmToDelete = fixedAlarms.find(alarm => alarm.id === alarmId);

                if (alarmToDelete && confirm(`고정 알림 "${alarmToDelete.name} ${alarmToDelete.time}"을(를) 삭제하시겠습니까?`)) {
                    LocalStorageManager.deleteFixedAlarm(alarmId);
                    renderFixedAlarms(DOM); // Re-render to show changes
                    log(`고정 알림 "${alarmToDelete.name}"이(가) 삭제되었습니다.`, true);
                }
            }
        });
    }

    // Handle add new fixed alarm button click (logic moved to ui-renderer.js)

    // --- Alarm Log Screen Event Handlers ---
    // 알림 로그 가시성 토글 이벤트
    if (DOM.logVisibilityToggle) { // Defensive check
        DOM.logVisibilityToggle.addEventListener('change', (event) => {
            LocalStorageManager.setLogVisibilityState(event.target.checked);
            if (LocalStorageManager.getLogVisibilityState()) {
                DOM.logContainer.classList.remove('hidden');
            } else {
                DOM.logContainer.classList.add('hidden');
            }
        });
    }


}

// Function to initialize the application

export async function initApp() { // Made initApp async
    const DOM = initDomElements(); // Initialize DOM elements here

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
    // 알림 로그 가시성 상태 로드 및 적용
    if (DOM.logVisibilityToggle) { // Defensive check
        DOM.logVisibilityToggle.checked = LocalStorageManager.getLogVisibilityState();
        if (LocalStorageManager.getLogVisibilityState()) {
            DOM.logContainer.classList.remove('hidden');
        } else {
            DOM.logContainer.classList.add('hidden');
        }
    }

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
    initEventHandlers(DOM);
    
    // Initial render of the dashboard
    checkAlarms(); // Call checkAlarms once immediately
    renderDashboard(DOM);
    
}