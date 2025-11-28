import { renderBossInputs, renderBossSchedulerScreen } from '../ui-renderer.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager } from '../data-managers.js';
import { updateBossListTextarea } from '../ui-renderer.js';
import { generateUniqueId, padNumber } from '../utils.js';

let _remainingTimes = {}; // Encapsulated state

function handleShowScreen(DOM) {
    renderBossSchedulerScreen(DOM, _remainingTimes);
    updateCalculatedTimes(DOM);
}

export function initBossSchedulerScreen(DOM) {
    // Listen for the show screen event for this screen
    EventBus.on('show-boss-scheduler-screen', () => handleShowScreen(DOM));
    EventBus.on('rerender-boss-scheduler', () => {
        renderBossSchedulerScreen(DOM, _remainingTimes);
        updateCalculatedTimes(DOM);
    });

    // Event handlers
    if (DOM.bossSchedulerScreen) {
        // Game selection change
        DOM.bossSchedulerScreen.addEventListener('change', (event) => {
            if (event.target === DOM.gameSelect) {
                renderBossInputs(DOM, DOM.gameSelect.value);
                updateCalculatedTimes(DOM);
            }
        });

        // Remaining time input change (event delegation)
        DOM.bossSchedulerScreen.addEventListener('input', (event) => {
            if (event.target.classList.contains('remaining-time-input')) {
                const inputField = event.target;
                const remainingTime = inputField.value;
                const calculatedTimeSpan = inputField.nextElementSibling;

                const bossAppearanceTimeStr = calculateBossAppearanceTime(remainingTime);
                
                if (bossAppearanceTimeStr && calculatedTimeSpan) {
                    calculatedTimeSpan.textContent = bossAppearanceTimeStr;
                    
                    // Calculate and store the exact Date object
                    // Re-implementing basic parsing logic here to get the Date
                    // Note: This duplicates logic from calculator.js slightly but is needed for Date context
                    const trimmedInput = remainingTime.trim();
                    let hours = 0, minutes = 0, seconds = 0;
                    
                    // Simple parsing reuse (assuming validity since calculateBossAppearanceTime returned non-null)
                    if (/^\d+$/.test(trimmedInput)) {
                        if (trimmedInput.length === 4) {
                            minutes = parseInt(trimmedInput.substring(0, 2), 10);
                            seconds = parseInt(trimmedInput.substring(2, 4), 10);
                        } else if (trimmedInput.length === 6) {
                            hours = parseInt(trimmedInput.substring(0, 2), 10);
                            minutes = parseInt(trimmedInput.substring(2, 4), 10);
                            seconds = parseInt(trimmedInput.substring(4, 6), 10);
                        }
                    } else {
                        const parts = trimmedInput.split(':');
                        if (parts.length === 2) {
                            minutes = parseInt(parts[0], 10);
                            seconds = parseInt(parts[1], 10);
                        } else if (parts.length === 3) {
                            hours = parseInt(parts[0], 10);
                            minutes = parseInt(parts[1], 10);
                            seconds = parseInt(parts[2], 10);
                        }
                    }
                    
                    const now = new Date();
                    const calculatedDate = new Date(now);
                    calculatedDate.setHours(now.getHours() + hours);
                    calculatedDate.setMinutes(now.getMinutes() + minutes);
                    calculatedDate.setSeconds(now.getSeconds() + seconds);
                    
                    inputField.dataset.calculatedDate = calculatedDate.toISOString();
                } else {
                    if (calculatedTimeSpan) calculatedTimeSpan.textContent = '--:--:--';
                    delete inputField.dataset.calculatedDate;
                }
            }
        });

        // Remaining time input focusout (validation)
        DOM.bossSchedulerScreen.addEventListener('focusout', (event) => {
            if (event.target.classList.contains('remaining-time-input')) {
                const inputField = event.target;
                const remainingTime = inputField.value.trim();

                if (remainingTime === '') {
                    return; // Empty is valid (skip)
                }

                const bossAppearanceTimeStr = calculateBossAppearanceTime(remainingTime);

                if (!bossAppearanceTimeStr) {
                    const bossNameElement = inputField.parentElement.querySelector('.boss-name');
                    const bossName = bossNameElement ? bossNameElement.textContent : '알 수 없는 보스';
                    
                    // Find index
                    const allInputs = Array.from(DOM.bossInputsContainer.querySelectorAll('.remaining-time-input'));
                    const index = allInputs.indexOf(inputField) + 1;

                    alert(`[${index}번째 줄] ${bossName}의 시간이 잘못 입력되었습니다.\n(입력값: ${remainingTime})`);
                    
                    // Refocus
                    setTimeout(() => {
                        inputField.focus();
                    }, 0);
                }
            }
        });

        // Clear all remaining times button
        DOM.bossSchedulerScreen.addEventListener('click', (event) => {
            if (event.target === DOM.clearAllRemainingTimesButton) {
                if (confirm("모든 남은 시간을 삭제하시겠습니까?")) {
                    DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
                        input.value = '';
                        delete input.dataset.calculatedDate; // Clear stored data
                        input.nextElementSibling.textContent = '--:--:--';
                    });
                    log("모든 남은 시간이 삭제되었습니다.", true);
                }
            }
        });

        // Move to Boss Settings button
        DOM.bossSchedulerScreen.addEventListener('click', (event) => {
            if (event.target === DOM.moveToBossSettingsButton) {
                // Check if there is at least one valid input
                const hasValidInput = Array.from(DOM.bossInputsContainer.querySelectorAll('.remaining-time-input'))
                    .some(input => input.value.trim() !== '' && input.dataset.calculatedDate);

                if (!hasValidInput) {
                    alert("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 설정 적용 버튼을 눌러 주세요.");
                    return;
                }

                const specialBossNames = [
                    "오딘", "오딘(본섭, 침공)",
                    "파르바", "셀로비아", "흐니르", "페티", "바우티", "니드호그", "야른", "라이노르", "비요른", "헤르모드", "스칼라니르", "브륀힐드", "라타토스크", "수드리", "지감4층",
                    "침공 파르바", "침공 셀로비아", "침공 흐니르", "침공 페티", "침공 바우티", "침공 니드호그", "침공 야른", "침공 라이노르", "침공 비요른", "침공 헤르모드", "침공 스칼라니르", "침공 브륀힐드", "침공 라타토스크", "침공 수드리"
                ];

                const now = new Date();

                // 1. Get Current Data for ID Lookup
                // We will build a NEW list based on inputs, ignoring previous schedule (Fresh Start)
                const currentSchedule = BossDataManager.getBossSchedule();
                // We need existing bosses only for ID mapping to preserve settings if possible
                const existingBossesForMap = currentSchedule.filter(item => item.type === 'boss');
                const bossMap = new Map();
                existingBossesForMap.forEach(boss => bossMap.set(boss.id, boss));

                // Start with an empty list for the new schedule
                let currentBosses = [];

                // 2. Process User Inputs (Update existing or Add new)
                DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
                    const bossName = item.querySelector('.boss-name').textContent;
                    const remainingTimeInput = item.querySelector('.remaining-time-input');
                    const remainingTime = remainingTimeInput.value;
                    const bossId = remainingTimeInput.dataset.id; // Get ID from data attribute
                    const calculatedDateIso = remainingTimeInput.dataset.calculatedDate;

                    if (remainingTime && calculatedDateIso) {
                        const appearanceTime = new Date(calculatedDateIso);
                        
                        // Normalize time string
                        const timeStr = `${padNumber(appearanceTime.getHours())}:${padNumber(appearanceTime.getMinutes())}:${padNumber(appearanceTime.getSeconds())}`;

                        if (bossId && bossMap.has(bossId)) {
                            // Found existing boss ID, clone and update it
                            const existingBoss = bossMap.get(bossId);
                            const updatedBoss = {
                                ...existingBoss,
                                scheduledDate: appearanceTime,
                                time: timeStr,
                                // Reset alert states
                                alerted_5min: false,
                                alerted_1min: false,
                                alerted_0min: false
                            };
                            currentBosses.push(updatedBoss);
                        } else {
                            // Add new boss (if not found in map, though renderBossInputs should have handled known bosses)
                            const newBoss = {
                                type: 'boss',
                                id: bossId || generateUniqueId(), // Use existing ID if available, else generate new
                                name: bossName,
                                time: timeStr,
                                scheduledDate: appearanceTime,
                                alerted_5min: false,
                                alerted_1min: false,
                                alerted_0min: false
                            };
                            currentBosses.push(newBoss);
                            // If it's a new boss, we might want to add it to the map if we need to reference it later for +12h logic
                            // But for +12h logic below, we iterate 'currentBosses' which we are building now.
                            // So we don't need to update bossMap.
                        }
                    }
                });

                // 3. Add +12h Bosses logic
                // This part is tricky with IDs. If we generate +12h boss, it should be a separate entity or handled implicitly?
                // The original logic added new objects. Let's stick to that but ensuring unique IDs.
                const additionalBosses = [];
                // We iterate over the *updated* currentBosses to generate +12h versions
                currentBosses.forEach(boss => {
                     if (specialBossNames.includes(boss.name)) {
                        // Only add if this boss was actually updated/touched or valid? 
                        // Original logic: "bossObjectList" came from inputs. 
                        // Here "currentBosses" includes ALL bosses in the system.
                        // We should probably only generate +12h for bosses that are RELEVANT (e.g. updated just now or in the near future).
                        // BUT, to be safe and follow previous logic: generate +12h for ALL matching special bosses in the list.
                        // CHECK: Does this duplicate existing +12h bosses?
                        // The previous logic was: take inputs -> generate list -> add +12h -> replace.
                        // NEW LOGIC: The "currentBosses" list MIGHT ALREADY contain previously generated +12h bosses.
                        // We need to distinguish between "base" boss and "generated" boss to avoid infinite multiplication.
                        // For now, let's assume the user inputs the NEXT spawn.
                        // If we want to strictly follow "input -> +12h", we should only do it for the bosses currently being input.
                        // However, `currentBosses` contains everything.
                        
                        // To solve this simply without complex tracking:
                        // We will filter out any existing "+12h" lookalikes and re-generate them? No, that's dangerous.
                        
                        // Let's strictly follow the original "input-driven" approach for +12h additions.
                        // We only generate +12h for bosses that were present in the input fields.
                        const inputItem = Array.from(DOM.bossInputsContainer.querySelectorAll('.remaining-time-input'))
                            .find(input => input.dataset.id === boss.id && input.value); // Find input for this boss ID
                        
                        if (inputItem) {
                             const newAppearanceTime = new Date(boss.scheduledDate);
                             newAppearanceTime.setHours(newAppearanceTime.getHours() + 12);
                             
                             // Check if this +12h boss already exists to update it, or create new
                             // This is hard because we don't link them.
                             // For now, simply create a new entry. It might duplicate if done repeatedly without cleanup.
                             // Ideally, we should have a mechanism to identify "future instance".
                             // Given the constraints, let's ADD it as a new boss. The user can delete duplicates if they appear.
                             // Or better: The "Reconstruction" implies we build the list.
                             
                             additionalBosses.push({
                                type: 'boss',
                                id: generateUniqueId(), // New ID for the future instance
                                name: boss.name,
                                time: `${padNumber(newAppearanceTime.getHours())}:${padNumber(newAppearanceTime.getMinutes())}:${padNumber(newAppearanceTime.getSeconds())}`,
                                scheduledDate: newAppearanceTime,
                                alerted_5min: false, alerted_1min: false, alerted_0min: false
                             });
                        }
                    }
                });
                
                // Merge additional bosses
                currentBosses = [...currentBosses, ...additionalBosses];


                // 4. Filtering Step for '침공' bosses
                const todayString = new Date().toDateString();
                currentBosses = currentBosses.filter(boss => {
                    const isInvasionBoss = boss.name.includes("침공");
                    if (!isInvasionBoss) {
                        return true; // Keep non-invasion bosses
                    }
                    // For invasion bosses, keep only if the appearance date is today
                    return boss.scheduledDate.toDateString() === todayString;
                });

                // 5. Accurate Time Sorting
                currentBosses.sort((a, b) => a.scheduledDate - b.scheduledDate);

                // 6. Reconstruction with Date Markers
                const newScheduleItems = [];
                let lastDateStr = "";

                currentBosses.forEach(boss => {
                    const d = boss.scheduledDate;
                    const month = d.getMonth() + 1;
                    const day = d.getDate();
                    const currentDateStr = `${padNumber(month)}.${padNumber(day)}`;

                    if (currentDateStr !== lastDateStr) {
                        // Insert Date Marker
                        // Use local time 00:00:00 for the date marker's scheduledDate
                        const markerDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        newScheduleItems.push({
                            type: 'date',
                            value: currentDateStr,
                            scheduledDate: markerDate
                        });
                        lastDateStr = currentDateStr;
                    }
                    newScheduleItems.push(boss);
                });

                // 7. Save & Update UI
                BossDataManager.setBossSchedule(newScheduleItems);
                updateBossListTextarea(DOM);
                
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

// Helper function to trigger input events for initial values
function updateCalculatedTimes(DOM) {
    if (!DOM.bossInputsContainer) return;
    DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
        if (input.value) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}
export function getScreen() {
    return {
        id: 'boss-scheduler-screen',
        init: initBossSchedulerScreen
    };
}
