import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { getIsAlarmRunning } from './alarm-scheduler.js'; // Import getIsAlarmRunning
import { log, getLogs } from './logger.js'; // Import log and getLogs
import { loadJsonContent } from './api-service.js'; // Import loadJsonContent
import { CustomListManager } from './custom-list-manager.js';
import { getGameNames, getBossNamesForGame } from './boss-scheduler-data.js'; // Import boss-scheduler-data functions

// Helper for time validation
const isValidTime = (time) => /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(time);

// Helper function to format time difference
function formatTimeDifference(ms, showSeconds = true) {
    if (ms <= 0 || ms === Infinity) return showSeconds ? '(00:00:00)' : '(00:00)';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor((totalSeconds % 86400) / 3600); // Ensure hours don't exceed 23
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, '0');
    if (showSeconds) {
        return `(${pad(hours)}:${pad(minutes)}:${pad(seconds)})`;
    } else {
        return `(${pad(hours)}:${pad(minutes)})`;
    }
}

const MUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
const UNMUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>`;

// Helper function to format spawn time to HH:MM:SS
function formatSpawnTime(timeString) {
    const parts = timeString.split(':');
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    const seconds = (parts[2] || '00').padStart(2, '0');
    return `[${hours}:${minutes}:${seconds}]`;
}

// Function to display toast messages
export function showToast(DOM, message) {
    if (!DOM.toastContainer) {
        console.error('Toast container not found.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;

    DOM.toastContainer.appendChild(toast);

    // Force reflow to enable transition
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        }, { once: true });
    }, 3000); // Hide after 3 seconds
}

// Function to populate the boss selection dropdown with future bosses
export function populateBossSelectionDropdown(DOM) {
    if (!DOM.bossSelectionDropdown) return;

    const bossSchedule = BossDataManager.getBossSchedule();
    const now = new Date();

    // Clear existing options, keeping the default "보스 선택"
    DOM.bossSelectionDropdown.innerHTML = '<option value="">보스 선택</option>';

    bossSchedule.forEach(item => {
        if (item.type === 'boss' && item.scheduledDate && item.scheduledDate.getTime() > now.getTime()) {
            const time = item.time; // HH:MM or HH:MM:SS
            const name = item.name;
            const option = document.createElement('option');
            option.value = `${item.scheduledDate.toISOString()}__${name}`; // Store ISO string and name for uniqueness
            option.textContent = `[${time}] ${name}`; // Display [HH:MM] BossName
            DOM.bossSelectionDropdown.appendChild(option);
        }
    });
}

export function updateMuteButtonVisuals(DOM) {
    if (!DOM.muteToggleButton) return;
    const isMuted = LocalStorageManager.getMuteState();
    DOM.muteToggleButton.innerHTML = isMuted ? UNMUTE_ICON : MUTE_ICON;
    if (isMuted) {
        DOM.muteToggleButton.classList.add('muted');
    } else {
        DOM.muteToggleButton.classList.remove('muted');
    }
}

// --- Dashboard Rendering Functions ---
export function updateNextBossDisplay(DOM) {
    const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo();
    if (nextBoss) {
        const remainingTimeString = formatTimeDifference(minTimeDiff);
        const formattedSpawnTime = formatSpawnTime(nextBoss.time);
        DOM.nextBossDisplay.innerHTML = `<span class="next-boss-label">다음 보스</span><br><span class="boss-details-highlight"><span class="spawn-time">${formattedSpawnTime}</span> ${nextBoss.name} <span class="remaining-time">${remainingTimeString}</span></span>`;
    } else {
        DOM.nextBossDisplay.textContent = '다음 보스 없음';
    }
}

export function renderUpcomingBossList(DOM) {
    const upcomingBosses = BossDataManager.getUpcomingBosses(11); // Get next 11 bosses to skip the first one
    let html = '<ul>';
    if (upcomingBosses.length > 0) {
        upcomingBosses.slice(1).forEach(boss => { // Skip the first boss
            const timeDiff = boss.timestamp - Date.now();
            const showSeconds = timeDiff < 5 * 60 * 1000;
            const remaining = formatTimeDifference(timeDiff, showSeconds);

            const formattedSpawnTime = formatSpawnTime(boss.time);
            const bossNameClass = showSeconds ? 'imminent-boss-info' : '';
            const remainingTimeClass = showSeconds ? 'imminent-remaining-time' : '';
            html += `<li><span class="spawn-time ${bossNameClass}">${formattedSpawnTime}</span> <span class="${bossNameClass}">${boss.name}</span> <span class="${remainingTimeClass}">${remaining}</span></li>`;
        });
    } else {
        html += '<li>예정된 보스가 없습니다.</li>';
    }
    html += '</ul>';
    DOM.upcomingBossList.innerHTML = html;
}

export function renderAlarmStatusSummary(DOM) {
    const isAlarmRunning = getIsAlarmRunning();
    let statusText = isAlarmRunning ? '알림 실행 중' : '알림 중지됨';

    if (DOM.alarmStatusText) {
        DOM.alarmStatusText.textContent = statusText;
        if (isAlarmRunning) {
            DOM.alarmStatusText.classList.add('alarm-status-running');
        } else {
            DOM.alarmStatusText.classList.remove('alarm-status-running');
        }
    }
}

export function renderRecentAlarmLog(DOM) {
    const logs = getLogs(); // Corrected call
    let html = '<ul>';
    if (logs.length > 0) {
        // Display last 3 logs
        const recentLogs = logs.slice(-1).reverse(); // Get last 1 and reverse to show newest first
        recentLogs.forEach(logEntry => {
            html += `<li class="log-entry">${logEntry}</li>`;
        });
    } else {
        html += '<li>최근 알림 기록 없음</li>';
    }
    html += '</ul>';
    DOM.recentAlarmLog.innerHTML = html;
}

export function renderDashboard(DOM) {
    updateNextBossDisplay(DOM);
    renderUpcomingBossList(DOM);
    renderAlarmStatusSummary(DOM);
    updateMuteButtonVisuals(DOM);
    renderRecentAlarmLog(DOM);
}

// --- Light Calculator Display Functions ---
export function updateLightStopwatchDisplay(DOM, time) {
    if (DOM.lightStopwatchDisplay) {
        DOM.lightStopwatchDisplay.textContent = time;
    }
}

export function updateLightExpectedTimeDisplay(DOM, time, isOverTime) {
    if (DOM.lightExpectedTimeDisplay) {
        DOM.lightExpectedTimeDisplay.textContent = time;
        const labelSpan = DOM.lightExpectedTimeDisplay.previousElementSibling.querySelector('.expected-label');
        const labelGroup = DOM.lightExpectedTimeDisplay.previousElementSibling;

        if (isOverTime) {
            DOM.lightExpectedTimeDisplay.classList.add('over-time'); // Blue time
            if (labelSpan) labelSpan.textContent = '오버 시간'; // Change label text
            if (labelGroup) labelGroup.classList.add('over-time-label'); // Add class for blue label
        } else {
            DOM.lightExpectedTimeDisplay.classList.remove('over-time'); // Red time
            if (labelSpan) labelSpan.textContent = '예상 시간'; // Change label text back
            if (labelGroup) labelGroup.classList.remove('over-time-label'); // Remove class for red label
        }
    }
}

export function renderLightTempResults(DOM, gwangTime, afterGwangTime, totalTime) {
    if (DOM.lightTempResults) {
        if (!gwangTime && !afterGwangTime && !totalTime) { // If no results, hide the container
            DOM.lightTempResults.innerHTML = '';
            DOM.lightTempResults.style.display = 'none';
            return;
        }
        DOM.lightTempResults.style.display = 'block'; // Show the container
        DOM.lightTempResults.innerHTML = `
            <div class="light-temp-results-card">
                <h4>최근 계산 결과</h4>
                <table class="light-temp-table">
                    <thead>
                        <tr>
                            <th>광</th>
                            <th>잡힘</th>
                            <th>총 시간</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${gwangTime}</td>
                            <td>${afterGwangTime}</td>
                            <td>${totalTime}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
}

export function renderLightSavedList(DOM, records) {
    if (DOM.lightSavedList) {
        if (records.length === 0) {
            DOM.lightSavedList.innerHTML = `
                <div class="light-saved-list-header">
                    <h4>광 계산 목록</h4>
                    <button id="clearLightRecordsButton" class="button" disabled>기록 초기화</button>
                </div>
                <p>저장된 기록이 없습니다.</p>
            `;
            return;
        }
        let html = `
            <div class="light-saved-list-header">
                <h4>광 계산 목록</h4>
                <button id="clearLightRecordsButton" class="button">기록 초기화</button>
            </div>
            <table class="light-saved-table">
                <thead>
                    <tr>
                        <th>이름</th>
                        <th>광</th>
                        <th>잡힘</th>
                        <th>총 시간</th>
                    </tr>
                </thead>
                <tbody>
        `;
        records.forEach(record => {
            html += `
                <tr>
                    <td>${record.bossName}</td>
                    <td>${record.gwangTime}</td>
                    <td>${record.afterGwangTime}</td>
                    <td>${record.totalTime}</td>
                </tr>
            `;
        });
        html += `
                </tbody>
            </table>
        `;
        DOM.lightSavedList.innerHTML = html;
    }
}


// --- 5.1. 보스 목록 텍스트 영역 업데이트 함수 ---
// bossSchedule 배열의 내용을 기반으로 텍스트 영역을 업데이트합니다.
export function updateBossListTextarea(DOM) { // Function signature remains unchanged
    const bossSchedule = BossDataManager.getBossSchedule(); // Get from manager
    const outputLines = [];
    for (let i = 0; i < bossSchedule.length; i++) {
        const currentItem = bossSchedule[i];
        if (currentItem.type === 'date') {
            // Peek ahead: only show date if it has bosses under it
            const nextItem = bossSchedule[i + 1];
            if (nextItem && nextItem.type === 'boss') {
                outputLines.push(currentItem.value);
            }
        } else if (currentItem.type === 'boss') {
            outputLines.push(`${currentItem.time} ${currentItem.name}`);
        }
    }
    DOM.bossListInput.value = outputLines.join('\n');
}




// --- 5.2. 고정 알림 목록 렌더링 함수 ---
export function renderFixedAlarms(DOM) {
    DOM.fixedAlarmListDiv.innerHTML = ''; // 기존 목록 초기화

    const fixedAlarms = LocalStorageManager.getFixedAlarms();

    fixedAlarms.forEach((alarm) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'fixed-alarm-item';
        itemDiv.id = `fixed-alarm-item-${alarm.id}`;

        const infoAndToggleDiv = document.createElement('div');
        infoAndToggleDiv.className = 'fixed-alarm-info-toggle';

        const bossInfoSpan = document.createElement('span');
        bossInfoSpan.textContent = `${alarm.time} ${alarm.name}`;
        infoAndToggleDiv.appendChild(bossInfoSpan);

        // Toggle Switch
        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        const switchInput = document.createElement('input');
        switchInput.type = 'checkbox';
        switchInput.id = `fixedAlarmToggle-${alarm.id}`;
        switchInput.checked = alarm.enabled; // 로컬 스토리지 상태 반영
        switchInput.dataset.id = alarm.id;
        const sliderSpan = document.createElement('span');
        sliderSpan.className = 'slider round';

        switchLabel.appendChild(switchInput);
        switchLabel.appendChild(sliderSpan);
        infoAndToggleDiv.appendChild(switchLabel);

        itemDiv.appendChild(infoAndToggleDiv);

        const actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.className = 'fixed-alarm-action-buttons';

        // Edit Button
        const editButton = document.createElement('button');
        editButton.textContent = '편집';
        editButton.className = 'button edit-fixed-alarm-button';
        editButton.dataset.id = alarm.id;
        actionButtonsDiv.appendChild(editButton);

        // Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '삭제';
        deleteButton.className = 'button delete-fixed-alarm-button';
        deleteButton.dataset.id = alarm.id;
        actionButtonsDiv.appendChild(deleteButton);

        itemDiv.appendChild(actionButtonsDiv);
        DOM.fixedAlarmListDiv.appendChild(itemDiv);
    });

    // Add New Fixed Alarm Section
    const addAlarmSection = document.createElement('div');
    addAlarmSection.className = 'add-fixed-alarm-section';
                    addAlarmSection.innerHTML = `
                        <h3>새 고정 알림 추가</h3>
                        <div class="add-alarm-card">
                            <input type="text" id="newFixedAlarmTime" placeholder="시간 (HH:MM)">
                            <input type="text" id="newFixedAlarmName" placeholder="이름">
                            <button id="addFixedAlarmButton" class="button">추가</button>
                        </div>
                    `;    DOM.fixedAlarmListDiv.appendChild(addAlarmSection);

    // Attach event listener for the add button
    const addFixedAlarmButton = addAlarmSection.querySelector('#addFixedAlarmButton');
    const newFixedAlarmTimeInput = addAlarmSection.querySelector('#newFixedAlarmTime');
    const newFixedAlarmNameInput = addAlarmSection.querySelector('#newFixedAlarmName');

    if (addFixedAlarmButton) {
        addFixedAlarmButton.addEventListener('click', () => {
            const time = newFixedAlarmTimeInput.value.trim();
            const name = newFixedAlarmNameInput.value.trim();

            if (!time || !name) {
                log("시간과 이름을 모두 입력해주세요.", false);
                return;
            }
            if (!isValidTime(time)) {
                log("유효하지 않은 시간 형식입니다. HH:MM 형식으로 입력해주세요.", false);
                return;
            }

            const newAlarm = {
                id: `fixed-${Date.now()}`, // Simple unique ID
                name: name,
                time: time,
                enabled: true // New alarms are enabled by default
            };

            LocalStorageManager.addFixedAlarm(newAlarm);
            renderFixedAlarms(DOM); // Re-render to show new alarm
            log(`새 고정 알림 "${name} ${time}"이(가) 추가되었습니다.`, true);

            // Clear inputs
            newFixedAlarmTimeInput.value = '';
            newFixedAlarmNameInput.value = '';
        });
    }

    updateFixedAlarmVisuals(DOM); // 초기 비주얼 업데이트
}

// --- 5.3. 고정 알림 비주얼 업데이트 함수 (faded 효과) ---
export function updateFixedAlarmVisuals(DOM) {
    const fixedAlarms = LocalStorageManager.getFixedAlarms();
    fixedAlarms.forEach(alarm => {
        const itemDiv = DOM.fixedAlarmListDiv.querySelector(`#fixed-alarm-item-${alarm.id}`);
        if (itemDiv) {
            if (alarm.enabled) {
                itemDiv.classList.remove('faded');
            } else {
                itemDiv.classList.add('faded');
            }
        }
    });
}


export async function renderVersionInfo(DOM) {
    const versionData = await loadJsonContent(`docs/version_history.json?v=${window.APP_VERSION}`);
    if (DOM.versionHistoryContent && versionData) {
        let html = '';
        versionData.forEach((versionEntry, index) => {
            const isOpen = index === 0 ? 'open' : ''; // Add 'open' attribute to the first item
            html += `
                <details class="version-accordion" ${isOpen}>
                    <summary class="version-summary">
                        <span class="version-number">${versionEntry.fullVersion}</span>
                    </summary>
                    <div class="version-details">
                        <ul>
                            ${versionEntry.changes.map(change => `
                                <li>
                                    <strong>${change.type}:</strong> ${change.description}
                                    ${change.details.length > 0 ? `
                                        <ul>
                                            ${change.details.map(detail => `<li>${detail}</li>`).join('')}
                                        </ul>
                                    ` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </details>
            `;
        });
        DOM.versionHistoryContent.innerHTML = html;
    } else if (DOM.versionHistoryContent) {
        DOM.versionHistoryContent.innerHTML = `<p>버전 정보를 불러오는 데 실패했습니다.</p>`;
    }
}

// --- Calculator Screen Rendering Functions ---
export function renderCalculatorScreen(DOM) {
    // Zen Calculator initialization
    if (DOM.remainingTimeInput) {
        DOM.remainingTimeInput.value = ''; // Clear input on screen load
    }
    if (DOM.bossAppearanceTimeDisplay) {
        DOM.bossAppearanceTimeDisplay.textContent = '--:--:--'; // Reset display
    }

    // New: Populate boss selection dropdown
    populateBossSelectionDropdown(DOM);
    // New: Disable update button initially
    if (DOM.updateBossTimeButton) {
        DOM.updateBossTimeButton.disabled = true;
    }
    // New: Reset boss selection dropdown
    if (DOM.bossSelectionDropdown) {
        DOM.bossSelectionDropdown.value = ''; // Reset selected option
    }
    // New: Ensure toast container is clear
    if (DOM.toastContainer) {
        DOM.toastContainer.innerHTML = '';
    }

    // Light Calculator initialization
    if (DOM.lightStopwatchDisplay) {
        DOM.lightStopwatchDisplay.textContent = '00:00';
    }
    if (DOM.lightExpectedTimeDisplay) {
        DOM.lightExpectedTimeDisplay.textContent = '--:--';
        const labelSpan = DOM.lightExpectedTimeDisplay.previousElementSibling.querySelector('.expected-label');
        const labelGroup = DOM.lightExpectedTimeDisplay.previousElementSibling;
        if (labelSpan) labelSpan.textContent = '예상 시간';
        if (labelGroup) labelGroup.classList.remove('over-time-label');
    }
    if (DOM.lightTempResults) {
        DOM.lightTempResults.innerHTML = '';
        DOM.lightTempResults.style.display = 'none'; // Hide on initial load
    }
    if (DOM.lightSavedList) {
        DOM.lightSavedList.innerHTML = '';
    }
}


export function renderCustomListManagementModalContent(DOM) {
    if (!DOM.customListManagementContainer) return;
    const lists = CustomListManager.getCustomLists();
    if (lists.length === 0) {
        DOM.customListManagementContainer.innerHTML = '<p>관리할 커스텀 목록이 없습니다.</p>';
        return;
    }
    DOM.customListManagementContainer.innerHTML = lists.map(list => `
        <div class="custom-list-manage-item" data-list-name="${list.name}">
            <span class="list-name">${list.name}</span>
            <div class="button-group">
                <button class="button edit-custom-list-button">수정</button>
                <button class="button delete-custom-list-button">삭제</button>
            </div>
        </div>
    `).join('');
}

export function showCustomListTab(DOM, tabId) {
    // Deactivate all tab buttons and hide all tab contents
    [DOM.tabAddCustomList, DOM.tabManageCustomLists].forEach(btn => btn.classList.remove('active'));
    [DOM.customListAddSection, DOM.customListManageSection].forEach(section => section.classList.remove('active'));

    // Activate the selected tab button and show its content
    if (tabId === 'add') {
        DOM.tabAddCustomList.classList.add('active');
        DOM.customListAddSection.classList.add('active');
        // Clear inputs when switching to add tab
        DOM.customListNameInput.value = '';
        DOM.customListContentTextarea.value = '';
        delete DOM.saveCustomListButton.dataset.editTarget;
        DOM.saveCustomListButton.textContent = '저장';
    } else if (tabId === 'manage') {
        DOM.tabManageCustomLists.classList.add('active');
        DOM.customListManageSection.classList.add('active');
        renderCustomListManagementModalContent(DOM); // Re-render content when tab is shown
    }
}


// --- Boss Scheduler Screen Rendering Functions ---
export function renderBossSchedulerScreen(DOM, remainingTimes = {}) {
    if (!DOM.bossSchedulerScreen) return;

    // Populate game selection dropdown
    const gameNameObjects = getGameNames();
    if (DOM.gameSelect) {
        DOM.gameSelect.innerHTML = gameNameObjects.map(game => 
            `<option value="${game.name}">${game.isCustom ? '*' : ''}${game.name}</option>`
        ).join('');
    }

    // Render bosses for the initially selected game
    if (gameNameObjects.length > 0) {
        renderBossInputs(DOM, gameNameObjects[0].name, remainingTimes);
    } else {
        if (DOM.bossInputsContainer) {
            DOM.bossInputsContainer.innerHTML = '<p>선택할 수 있는 게임 목록이 없습니다.</p>';
        }
    }
}

/**
 * Renders the boss input fields for a selected game.
 * @param {object} DOM - The DOM elements object.
 * @param {string} gameName - The name of the selected game.
 */
export function renderBossInputs(DOM, gameName, remainingTimes = {}) {
    const bossNames = getBossNamesForGame(gameName);
    if (!bossNames || bossNames.length === 0) {
        DOM.bossInputsContainer.innerHTML = '<p>선택된 게임/목록에 보스가 없습니다.</p>';
        return;
    }
    DOM.bossInputsContainer.innerHTML = bossNames.map(bossName => {
        const initialValue = remainingTimes[bossName] || '';
        return `
            <div class="boss-input-item">
                <span class="boss-name">${bossName}</span>
                <input type="text" class="remaining-time-input" data-boss-name="${bossName}" value="${initialValue}">
                <span class="calculated-spawn-time">--:--:--</span>
            </div>
        `;
    }).join('');
}