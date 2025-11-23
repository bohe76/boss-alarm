// src/event-handlers.js

import { parseBossList, getSortedBossListText } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning, checkAlarms } from './alarm-scheduler.js';
import { renderFixedAlarms, updateFixedAlarmVisuals, renderDashboard, renderVersionInfo, renderAlarmStatusSummary, renderCalculatorScreen, renderBossSchedulerScreen, renderBossInputs, updateMuteButtonVisuals, showToast, populateBossSelectionDropdown, showCustomListTab, renderCustomListManagementModalContent } from './ui-renderer.js'; // Added showToast, populateBossSelectionDropdown, showCustomListTab, renderCustomListManagementModalContent
import { getShortUrl, loadJsonContent } from './api-service.js';
import { log, initLogger } from './logger.js';
import { LocalStorageManager, BossDataManager } from './data-managers.js';
import { CustomListManager } from './custom-list-manager.js';
import { initDomElements } from './dom-elements.js';
import * as DefaultBossList from './default-boss-list.js'; // Import bossPresets
import { calculateBossAppearanceTime } from './calculator.js'; // Import calculateBossAppearanceTime
import { loadBossLists } from './boss-scheduler-data.js'; // Import boss-scheduler-data functions
import { LightCalculator, formatTime } from './light-calculator.js'; // New - Import formatTime
import { updateLightStopwatchDisplay, updateLightExpectedTimeDisplay, renderLightTempResults, renderLightSavedList, updateBossListTextarea } from './ui-renderer.js'; // New - Import updateBossListTextarea

let _remainingTimes = {}; // Global variable to store remaining times for boss scheduler

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

// Helper to check if Zen Calculator update button should be enabled
function checkZenCalculatorUpdateButtonState(DOM) {
    const isBossSelected = DOM.bossSelectionDropdown && DOM.bossSelectionDropdown.value !== '';
    const isTimeCalculated = DOM.bossAppearanceTimeDisplay && DOM.bossAppearanceTimeDisplay.textContent !== '--:--:--';
    if (DOM.updateBossTimeButton) {
        DOM.updateBossTimeButton.disabled = !(isBossSelected && isTimeCalculated);
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
        renderDashboard(DOM); // Render dashboard content when dashboard screen is active
    }

    // Special handling for share screen
    if (screenId === 'share-screen') {
        (async () => {
            DOM.shareMessage.textContent = "공유 링크 생성 중입니다. 잠시만 기다려 주세요...";
            const currentBossListData = DOM.bossListInput.value;
            const encodedBossListData = encodeURIComponent(currentBossListData);
            const fixedAlarmsData = LocalStorageManager.exportFixedAlarms();
            const encodedFixedAlarmsData = encodeURIComponent(fixedAlarmsData);
            const baseUrl = window.location.href.split('?')[0];
            const longUrl = `${baseUrl}?data=${encodedBossListData}&fixedData=${encodedFixedAlarmsData}`;
            const shortUrl = await getShortUrl(longUrl);
            await navigator.clipboard.writeText(shortUrl || longUrl);
            DOM.shareMessage.textContent = shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : `URL 단축 실패: ${longUrl} (원본 URL 복사됨)`;
            log(shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : "URL 단축 실패. 원본 URL이 클립보드에 복사되었습니다.", true);
        })();
    }


    // Special handling for version info screen
    if (screenId === 'version-info-screen') {
        renderVersionInfo(DOM);
    }

    // Special handling for help screen
    if (screenId === 'help-screen') {
        // Directly load feature guide content when opening help screen
        (async () => {
            const helpData = await loadJsonContent(`docs/feature_guide.json?v=${window.APP_VERSION}`);
            if (helpData && DOM.featureGuideContent) {
                let html = '';
                helpData.forEach((section, index) => {
                    const isOpen = index === 0 ? 'open' : ''; // Add 'open' attribute to the first item
                    html += `
                        <details class="help-section" ${isOpen}>
                            <summary class="help-summary">${section.title}</summary>
                            <div class="help-content">
                                ${section.content.map(p => `<p>${p}</p>`).join('')}
                                ${section.sub_sections ? section.sub_sections.map(sub => `
                                    <details class="help-sub-section">
                                        <summary class="help-sub-summary">${sub.title}</summary>
                                        <div class="help-sub-content">
                                            ${sub.content.map(p => `<p>${p}</p>`).join('')}
                                        </div>
                                    </details>
                                `).join('') : ''}
                            </div>
                        </details>
                    `;
                });
                DOM.featureGuideContent.innerHTML = html;
            } else if (DOM.featureGuideContent) {
                DOM.featureGuideContent.innerHTML = `<p>도움말 콘텐츠를 불러오는 데 실패했습니다.</p>`;
            }
        })();
    }

    // Special handling for calculator screen
    if (screenId === 'calculator-screen') { // Updated
        LightCalculator.resetCalculator(); // Reset the internal state
        renderCalculatorScreen(DOM);
        // Enable lightStartButton when the calculator screen is displayed
        if (DOM.lightStartButton) {
            DOM.lightStartButton.disabled = false;
            DOM.lightGwangButton.disabled = true;
            DOM.lightCaptureButton.disabled = true;
            DOM.lightListButton.disabled = false;
            updateLightStopwatchDisplay(DOM, '00:00'); // Ensure display is 00:00
            updateLightExpectedTimeDisplay(DOM, '--:--', false); // Ensure expected time is reset
            renderLightTempResults(DOM, '', '', ''); // Clear temporary results
        }
    }

    // Special handling for boss scheduler screen
    if (screenId === 'boss-scheduler-screen') {
        renderBossSchedulerScreen(DOM, _remainingTimes);
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

    // Mute Toggle Button
    DOM.muteToggleButton.addEventListener('click', () => {
        const currentMuteState = LocalStorageManager.getMuteState();
        LocalStorageManager.setMuteState(!currentMuteState);
        updateMuteButtonVisuals(DOM);
        log(`음소거가 ${!currentMuteState ? '설정' : '해제'}되었습니다.`, true);
    });



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


    // --- Zen Calculator Screen Event Handlers ---
    if (DOM.remainingTimeInput) {
        DOM.remainingTimeInput.addEventListener('input', () => {
            const remainingTime = DOM.remainingTimeInput.value;
            const bossAppearanceTime = calculateBossAppearanceTime(remainingTime);
            if (DOM.bossAppearanceTimeDisplay) {
                DOM.bossAppearanceTimeDisplay.textContent = bossAppearanceTime || '--:--:--';
            }
            checkZenCalculatorUpdateButtonState(DOM); // Check button state
        });
    }

    if (DOM.bossSelectionDropdown) {
        DOM.bossSelectionDropdown.addEventListener('change', () => {
            checkZenCalculatorUpdateButtonState(DOM); // Check button state
        });
    }

    if (DOM.updateBossTimeButton) {
        DOM.updateBossTimeButton.addEventListener('click', () => {
            const selectedBossValue = DOM.bossSelectionDropdown.value;
            const newBossTime = DOM.bossAppearanceTimeDisplay.textContent; // HH:MM:SS format

            if (!selectedBossValue || newBossTime === '--:--:--') {
                showToast(DOM, "보스 선택 또는 시간 계산이 유효하지 않습니다.");
                return;
            }

            // selectedBossValue format: `${item.scheduledDate.toISOString()}__${name}`
            // selectedBossValue format: `${item.id}__${item.scheduledDate.toISOString()}__${name}`
            const [targetId, isoDate, bossName] = selectedBossValue.split('__');
            const targetDate = new Date(isoDate); // This targetDate holds the original scheduled date/time of the selected boss

            const [newHour, newMinute, newSecond] = newBossTime.split(':').map(Number);
            const newScheduledDate = new Date(targetDate); // Start with the original date from targetDate
            newScheduledDate.setHours(newHour, newMinute, newSecond || 0, 0); // Apply new time, reset milliseconds

            // Get the current boss schedule from BossDataManager
            const currentBossSchedule = BossDataManager.getBossSchedule();
            let bossFoundAndUpdated = false;

            // Find the boss by its unique ID and update its properties
            const updatedSchedule = currentBossSchedule.map(boss => {
                if (boss.type === 'boss' && boss.id === targetId) {
                    bossFoundAndUpdated = true;
                    return {
                        ...boss,
                        time: newBossTime, // Store new time as HH:MM:SS string
                        scheduledDate: newScheduledDate, // Update scheduledDate object
                    };
                }
                return boss;
            });

            if (bossFoundAndUpdated) {
                // Update BossDataManager with the modified schedule
                BossDataManager.setBossSchedule(updatedSchedule);

                // Regenerate the boss list text from the updated BossDataManager schedule
                // and then apply sorting and re-parse
                updateBossListTextarea(DOM); // This populates DOM.bossListInput.value from the updated BossDataManager
                let finalBossListText = DOM.bossListInput.value;
                finalBossListText = getSortedBossListText(finalBossListText); // Sort the generated text
                DOM.bossListInput.value = finalBossListText; // Update textarea with sorted text

                parseBossList(DOM.bossListInput); // Re-parse to update internal schedule (ensures consistency and re-sorts if needed)
                renderDashboard(DOM); // Re-render dashboard if needed (e.g., next boss update)
                showToast(DOM, `${bossName} 보스 시간이 ${newBossTime}으로 업데이트 되었습니다.`);

                // Reset Zen Calculator UI
                DOM.remainingTimeInput.value = '';
                DOM.bossAppearanceTimeDisplay.textContent = '--:--:--';
                DOM.bossSelectionDropdown.value = ''; // Reset dropdown
                checkZenCalculatorUpdateButtonState(DOM); // Disable button
                populateBossSelectionDropdown(DOM); // Re-populate dropdown (in case boss times shift visibility)
            } else {
                showToast(DOM, "선택된 보스를 목록에서 찾거나 업데이트할 수 없습니다.");
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
                const specialBossNames = [
                    "오딘", "오딘(본섭, 침공)",
                    "파르바", "셀로비아", "흐니르", "페티", "바우티", "니드호그", "야른", "라이노르", "비요른", "헤르모드", "스칼라니르", "브륀힐드", "라타토스크", "수드리", "지감4층",
                    "침공 파르바", "침공 셀로비아", "침공 흐니르", "침공 페티", "침공 바우티", "침공 니드호그", "침공 야른", "침공 라이노르", "침공 비요른", "침공 헤르모드", "침공 스칼라니르", "침공 브륀힐드", "침공 라타토스크", "침공 수드리"
                ];

                const bossObjectList = [];
                const now = new Date();

                // 1. Data Collection & Objectification
                DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
                    const bossName = item.querySelector('.boss-name').textContent;
                    const remainingTimeInput = item.querySelector('.remaining-time-input');
                    const remainingTime = remainingTimeInput.value;

                    if (remainingTime) {
                        const appearanceTime = new Date(now);
                        const timeParts = remainingTime.split(':').map(Number);
                        const hours = timeParts[0] || 0;
                        const minutes = timeParts[1] || 0;
                        const seconds = timeParts[2] || 0;

                        appearanceTime.setHours(appearanceTime.getHours() + hours);
                        appearanceTime.setMinutes(appearanceTime.getMinutes() + minutes);
                        appearanceTime.setSeconds(appearanceTime.getSeconds() + seconds);

                        bossObjectList.push({
                            name: bossName,
                            appearanceTime: appearanceTime
                        });
                    }
                });

                // 2. Add +12h Bosses
                const additionalBosses = [];
                bossObjectList.forEach(boss => {
                    if (specialBossNames.includes(boss.name)) {
                        const newAppearanceTime = new Date(boss.appearanceTime);
                        newAppearanceTime.setHours(newAppearanceTime.getHours() + 12);
                        additionalBosses.push({
                            name: boss.name,
                            appearanceTime: newAppearanceTime
                        });
                    }
                });

                const combinedList = [...bossObjectList, ...additionalBosses];

                // 3. Filtering Step for '침공' bosses
                const todayString = new Date().toDateString();
                const fullBossList = combinedList.filter(boss => {
                    const isInvasionBoss = boss.name.includes("침공");
                    if (!isInvasionBoss) {
                        return true; // Keep non-invasion bosses
                    }
                    // For invasion bosses, keep only if the appearance date is today
                    return boss.appearanceTime.toDateString() === todayString;
                });

                // 4. Accurate Time Sorting
                fullBossList.sort((a, b) => a.appearanceTime - b.appearanceTime);

                // 5. Reconstruct Text Format
                let finalText = "";
                let lastDateStr = "";

                fullBossList.forEach(boss => {
                    const d = boss.appearanceTime;
                    const currentDateStr = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                    if (currentDateStr !== lastDateStr) {
                        if (finalText !== "") {
                            finalText += "\n";
                        }
                        finalText += currentDateStr;
                        lastDateStr = currentDateStr;
                    }
                    finalText += `\n${timeStr} ${boss.name}`;
                });

                // 6. Apply to Textarea
                DOM.bossListInput.value = finalText.trim();
                
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

    // --- Custom Boss List Event Handlers ---

    // Open Modal
    if (DOM.manageCustomListsButton) {
        DOM.manageCustomListsButton.addEventListener('click', () => {
            showCustomListTab(DOM, 'add'); // Show '목록 추가' tab by default
            DOM.customBossListModal.style.display = 'flex';
            DOM.customListNameInput.focus();
        });
    }

    // Close Modal
    const closeModal = () => {
        if (DOM.customBossListModal) {
            DOM.customBossListModal.style.display = 'none';
        }
    };
    if (DOM.closeCustomListModal) {
        DOM.closeCustomListModal.addEventListener('click', closeModal);
    }
    if (DOM.customBossListModal) {
        DOM.customBossListModal.addEventListener('click', (event) => {
            if (event.target === DOM.customBossListModal) {
                closeModal();
            }
        });
    }

    // Tab switching
    if (DOM.tabAddCustomList) {
        DOM.tabAddCustomList.addEventListener('click', () => showCustomListTab(DOM, 'add'));
    }
    if (DOM.tabManageCustomLists) {
        DOM.tabManageCustomLists.addEventListener('click', () => showCustomListTab(DOM, 'manage'));
    }

    // Save/Update Button in Modal
    if (DOM.saveCustomListButton) {
        DOM.saveCustomListButton.addEventListener('click', async () => { // Make it async for confirm dialog
            const listName = DOM.customListNameInput.value.trim();
            const listContent = DOM.customListContentTextarea.value.trim();
            const editTarget = DOM.saveCustomListButton.dataset.editTarget;

            let result;
            if (editTarget) { // Updating an existing list or renaming
                if (editTarget !== listName) { // Renaming case
                    const renameValidation = CustomListManager.renameCustomList(editTarget, listName);
                                if (!renameValidation.success) {
                                    alert(`${renameValidation.message}`);
                                    return;
                                }
                                // If rename was successful, proceed to update content with the new name
                                result = CustomListManager.updateCustomList(listName, listContent);
                            } else { // Just updating content, name is the same
                                result = CustomListManager.updateCustomList(listName, listContent);
                            }
                        } else { // Adding a new list
                            // Check for name duplication before adding
                            const existingLists = CustomListManager.getCustomLists();
                            const isNamePredefinedOrCustom = existingLists.some(list => list.name === listName) || CustomListManager.isPredefinedGameName(listName);
                    
                            if (isNamePredefinedOrCustom) {
                                                    const confirmOverwrite = confirm(`'${listName}'은(는) 이미 존재하는 목록 또는 게임 이름입니다. 덮어쓰시겠습니까?`);
                                                    if (!confirmOverwrite) {
                                                        showToast(DOM, '목록 추가를 취소했습니다.');
                                                        return;
                                                    }                                // If confirmed to overwrite, treat as an update
                                result = CustomListManager.updateCustomList(listName, listContent);
                                if (!result.success && result.message === '수정할 목록을 찾을 수 없습니다.') {
                                    // This might happen if trying to "overwrite" a predefined game name with updateCustomList.
                                    // Re-attempt as add if it's not a custom list that can be updated.
                                    result = CustomListManager.addCustomList(listName, listContent);
                                }
                            } else {
                                result = CustomListManager.addCustomList(listName, listContent);
                            }
                        }
                        
                        if (result.success) {
                            showToast(DOM, result.message);
                            // Call renderCustomListManagementModalContent to update the "목록 관리" tab's display
                            renderCustomListManagementModalContent(DOM); 
                            renderBossSchedulerScreen(DOM, _remainingTimes); // To update dropdown

                            if (editTarget) { // 수정 작업이었을 경우
                                showCustomListTab(DOM, 'manage'); // '목록 관리' 탭으로 전환
                                // 입력 필드 및 버튼 상태 초기화
                                DOM.customListNameInput.value = '';
                                DOM.customListContentTextarea.value = '';
                                DOM.saveCustomListButton.textContent = '추가'; // '추가' 모드 기본 텍스트
                                delete DOM.saveCustomListButton.dataset.editTarget;
                            } else { // 추가 작업이었을 경우
                                closeModal(); // 모달 닫기
                            }
                        } else {
                            alert(`${result.message}`);
                        }        });
    }

    // Event Delegation for Management List (Edit, Rename, Delete)
    if (DOM.customListManagementContainer) {
        DOM.customListManagementContainer.addEventListener('click', async (event) => { // Make it async for prompt/confirm dialogs
            const button = event.target.closest('button');
            if (!button) return;

            const item = button.closest('.custom-list-manage-item');
            if (!item) return;
            
            const listName = item.dataset.listName;

            if (button.classList.contains('delete-custom-list-button')) {
                if (confirm(`'${listName}' 목록을 정말 삭제하시겠습니까?`)) {
                    const result = CustomListManager.deleteCustomList(listName);
                    showToast(DOM, result.message);
                    if (result.success) {
                        renderCustomListManagementModalContent(DOM); // Re-render management list
                        renderBossSchedulerScreen(DOM, _remainingTimes); // To update dropdown
                    }
                }
            } else if (button.classList.contains('edit-custom-list-button')) {
                // Switch to the "목록 추가" tab for editing
                showCustomListTab(DOM, 'add');

                const content = CustomListManager.getCustomListContent(listName);
                DOM.customListNameInput.value = listName;
                DOM.customListContentTextarea.value = content || '';
                DOM.saveCustomListButton.textContent = '수정';
                DOM.saveCustomListButton.dataset.editTarget = listName;
                DOM.customListNameInput.focus(); // Focus on the name input for editing
            }
        });
    }

        // --- Light Calculator Screen Event Handlers ---
    if (DOM.lightStartButton) {
        DOM.lightStartButton.addEventListener('click', () => {
            LightCalculator.startStopwatch((time) => {
                updateLightStopwatchDisplay(DOM, time);
            });
            DOM.lightStartButton.disabled = true;
            DOM.lightGwangButton.disabled = false;
            DOM.lightCaptureButton.disabled = false;
            DOM.lightListButton.disabled = true; // Disable list button while calculation is active
        });
    }

    if (DOM.lightGwangButton) {
        DOM.lightGwangButton.addEventListener('click', () => {
            LightCalculator.triggerGwang((time, isOverTime) => {
                updateLightExpectedTimeDisplay(DOM, time, isOverTime);
            });
            DOM.lightGwangButton.disabled = true;
        });
    }

    if (DOM.lightCaptureButton) {
        DOM.lightCaptureButton.addEventListener('click', async () => {
            LightCalculator.stopStopwatch();
            const confirmSave = confirm("광 계산을 저장 하시겠습니까?");
            if (confirmSave) {
                const bossName = prompt("보스 이름을 입력하세요:");
                if (bossName) {
                    await LightCalculator.saveLightCalculation(bossName);
                    renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
                }
            }
            // Display temporary results
            renderLightTempResults(DOM,
                formatTime(LightCalculator.getGwangTime()),
                formatTime(LightCalculator.getAfterGwangTime()),
                formatTime(LightCalculator.getTotalTime())
            );
            LightCalculator.resetCalculator(); // Reset calculator state
            DOM.lightStartButton.disabled = false;
            DOM.lightGwangButton.disabled = true;
            DOM.lightCaptureButton.disabled = true;
            DOM.lightListButton.disabled = false; // Enable list button after calculation
            updateLightStopwatchDisplay(DOM, '00:00');
            updateLightExpectedTimeDisplay(DOM, '--:--', false); // Reset expected/over time display
        });
    }

    if (DOM.lightListButton) {
        DOM.lightListButton.addEventListener('click', () => {
            renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
        });
    }

    if (DOM.lightSavedList) { // Attach listener to the parent container
        DOM.lightSavedList.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'clearLightRecordsButton') {
                if (confirm("광 계산 기록을 초기화 하시겠습니까?")) {
                    LocalStorageManager.clearLightCalculatorRecords();
                    renderLightSavedList(DOM, LightCalculator.getLightCalculatorRecords());
                    log("광 계산 기록이 초기화되었습니다.", true);
                }
            }
        });
    }


    // --- Boss Management Screen Event Handlers ---
    // Sort Boss List Button
    if (DOM.sortBossListButton) {
        DOM.sortBossListButton.addEventListener('click', () => {
            const currentText = DOM.bossListInput.value;
            const sortedText = getSortedBossListText(currentText);
            DOM.bossListInput.value = sortedText;
            
            // After sorting and updating the textarea, re-parse it to update the application state
            parseBossList(DOM.bossListInput);
            
            log("보스 목록을 시간순으로 정렬했습니다.", true);
        });
    }

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




}

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
    initEventHandlers(DOM, globalTooltip); // Pass globalTooltip to initEventHandlers
    
    // Initial render of the dashboard
    checkAlarms(); // Call checkAlarms once immediately
    renderDashboard(DOM);

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