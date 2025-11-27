import { renderBossInputs, renderDashboard, renderBossSchedulerScreen } from '../ui-renderer.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { parseBossList } from '../boss-parser.js';
import { EventBus } from '../event-bus.js';

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
