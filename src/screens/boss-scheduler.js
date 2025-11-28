import { renderBossInputs, renderBossSchedulerScreen } from '../ui-renderer.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { parseBossList } from '../boss-parser.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager } from '../data-managers.js';
import { updateBossListTextarea } from '../ui-renderer.js';

let _remainingTimes = {}; // Encapsulated state

function handleShowScreen(DOM) {
    renderBossSchedulerScreen(DOM, _remainingTimes);
}

export function initBossSchedulerScreen(DOM) {
    // Listen for the show screen event for this screen
    EventBus.on('show-boss-scheduler-screen', () => handleShowScreen(DOM));
    EventBus.on('rerender-boss-scheduler', () => renderBossSchedulerScreen(DOM, _remainingTimes));

    // Event handlers
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
                const calculatedTimeSpan = inputField.nextElementSibling;

                const bossAppearanceTime = calculateBossAppearanceTime(remainingTime);
                if (calculatedTimeSpan) {
                    calculatedTimeSpan.textContent = bossAppearanceTime || '--:--:--';
                }
            }
        });

        // Clear all remaining times button
        DOM.bossSchedulerScreen.addEventListener('click', (event) => {
            if (event.target === DOM.clearAllRemainingTimesButton) {
                if (confirm("모든 남은 시간을 삭제하시겠습니까?")) {
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

                // 1. Data Collection & Objectification (KST-based)
                DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
                    const bossName = item.querySelector('.boss-name').textContent;
                    const remainingTimeInput = item.querySelector('.remaining-time-input');
                    const remainingTime = remainingTimeInput.value;

                    if (remainingTime) {
                        const timeParts = remainingTime.split(':').map(Number);
                        const hours = timeParts[0] || 0;
                        const minutes = timeParts[1] || 0;
                        const seconds = timeParts[2] || 0;

                        let appearanceTime = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                            hours,
                            minutes,
                            seconds
                        );

                        // If the calculated time is in the past, assume it's for the next day (using local methods)
                        if (appearanceTime.getTime() < now.getTime()) {
                            appearanceTime.setDate(appearanceTime.getDate() + 1);
                        }

                        bossObjectList.push({
                            name: bossName,
                            appearanceTime: appearanceTime
                        });
                    }
                });

                // 2. Add +12h Bosses (KST-based)
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

                // 3. Filtering Step for '침공' bosses (KST-based)
                const todayString = new Date().toDateString();
                const fullBossList = combinedList.filter(boss => {
                    const isInvasionBoss = boss.name.includes("침공");
                    if (!isInvasionBoss) {
                        return true; // Keep non-invasion bosses
                    }
                    // For invasion bosses, keep only if the appearance date is today
                    return boss.appearanceTime.toDateString() === todayString;
                });

                // 4. Accurate Time Sorting (KST-based)
                fullBossList.sort((a, b) => a.appearanceTime - b.appearanceTime);

                console.log('--- Debug Boss Scheduler ---');
                console.log('fullBossList (after sorting):', fullBossList);

                // --- NEW LOGIC: Direct BossDataManager Merge ---
                console.log('Before BossDataManager.getBossSchedule(), mockBossSchedule should be:', BossDataManager.getBossSchedule());
                const currentBossSchedule = BossDataManager.getBossSchedule();
                console.log('currentBossSchedule (from BossDataManager):', currentBossSchedule);
                const processedBossesMap = new Map();
                
                // Prepare a map of processed bosses from fullBossList keyed by name for easy lookup
                fullBossList.forEach(boss => {
                    // boss has: name, appearanceTime (Date object)
                    const timeStr = `${String(boss.appearanceTime.getHours()).padStart(2, '0')}:${String(boss.appearanceTime.getMinutes()).padStart(2, '0')}:${String(boss.appearanceTime.getSeconds()).padStart(2, '0')}`;
                    processedBossesMap.set(boss.name, {
                        name: boss.name,
                        time: timeStr, // Add formatted time string
                        scheduledDate: boss.appearanceTime, // Use the new Date object
                    });
                });

                // Create the new schedule by iterating through the currentBossSchedule
                const newScheduleItems = currentBossSchedule.map(item => {
                    if (item.type === 'boss' && processedBossesMap.has(item.name)) {
                        // This boss was processed by scheduler, update its info
                        const updatedInfo = processedBossesMap.get(item.name);
                        return {
                            ...item, // Preserve original ID and other properties
                            time: updatedInfo.time,
                            scheduledDate: updatedInfo.scheduledDate,
                            // Ensure alert states are reset for updated boss
                            alerted_5min: false, alerted_1min: false, alerted_0min: false
                        };
                    }
                    return item; // Keep date markers and unprocessed bosses as is
                });
                
                // Sort the newScheduleItems after merging all updates
                newScheduleItems.sort((a, b) => {
                    let dateA, dateB;

                    // Helper to convert MM.DD string to Date object for comparison
                    const getDateFromItem = (item, currentYear) => {
                        if (item.type === 'boss') {
                            return item.scheduledDate;
                        } else if (item.type === 'date') {
                            const [month, day] = item.value.split('.').map(Number);
                            // Use local time for date markers as the app is KST-centric
                            return new Date(currentYear, month - 1, day);
                        }
                        return null;
                    };

                    const currentYear = now.getFullYear(); // Use 'now' from the handler scope

                    dateA = getDateFromItem(a, currentYear);
                    dateB = getDateFromItem(b, currentYear);

                    if (!dateA || !dateB) {
                        // If one of the dates couldn't be formed or is null, maintain relative order
                        return 0; 
                    }

                    return dateA.getTime() - dateB.getTime();
                });
                
                console.log('newScheduleItems (before BossDataManager.setBossSchedule):', newScheduleItems);
                BossDataManager.setBossSchedule(newScheduleItems);
                updateBossListTextarea(DOM); // Refresh the UI from BossDataManager
                // --- End NEW LOGIC ---
                
                // Store current remaining times before navigating away
                _remainingTimes = {}; // Clear previous state
                DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
                    const bossName = item.querySelector('.boss-name').textContent;
                    const remainingTimeInput = item.querySelector('.remaining-time-input');
                    _remainingTimes[bossName] = remainingTimeInput.value;
                });

                EventBus.emit('navigate', 'boss-management-screen');
                log("보스 스케줄러에서 보스 설정으로 목록이 전송되었습니다.", true);
            }
        });
    }
}
export function getScreen() {
    return {
        id: 'boss-scheduler-screen',
        init: initBossSchedulerScreen
    };
}
