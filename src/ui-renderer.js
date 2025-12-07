import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { getIsAlarmRunning } from './alarm-scheduler.js'; // Import getIsAlarmRunning
import { log, getLogs } from './logger.js'; // Import log and getLogs
// import { loadJsonContent } from './api-service.js'; // loadJsonContent is no longer needed here
import { CustomListManager } from './custom-list-manager.js';
import { getGameNames, getBossNamesForGame } from './boss-scheduler-data.js'; // Import boss-scheduler-data functions

import { formatTimeDifference, formatSpawnTime, formatBossListTime } from './utils.js'; // New import


const MUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
const UNMUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>`;


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
            option.value = `${item.id}__${item.scheduledDate.toISOString()}__${name}`; // Store ID, ISO string and name for uniqueness
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

import { isPipWindowOpen, updatePipContent } from './pip-manager.js';

// ... (rest of the imports)

// --- Dashboard Rendering Functions ---
export function updateNextBossDisplay(DOM) {
    if (!DOM.nextBossContent) return;

    const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo();

    if (nextBoss) {
        const isImminent = minTimeDiff < 5 * 60 * 1000;
        const isMedium = minTimeDiff < 60 * 60 * 1000;

        let remainingTimeClass = '';
        if (isImminent) {
            remainingTimeClass = 'imminent-remaining-time'; // Red
        } else if (isMedium) {
            remainingTimeClass = 'medium-priority'; // Black
        } else {
            remainingTimeClass = 'default-grey'; // Grey
        }

        const remainingTimeStringRaw = formatTimeDifference(minTimeDiff);
        const remainingTimeString = remainingTimeStringRaw.replace(/[()]/g, ''); // Remove parentheses
        const formattedSpawnTime = formatSpawnTime(nextBoss.time);

        DOM.nextBossContent.innerHTML = `<span class="boss-details-highlight"><span class="spawn-time">${formattedSpawnTime}</span> ${nextBoss.name}<br><span class="remaining-time ${remainingTimeClass}">${remainingTimeString}</span></span>`;
    } else {
        DOM.nextBossContent.textContent = '다음 보스 없음';
    }

    // Synchronize PiP window if it's open
    if (isPipWindowOpen()) {
        updatePipContent(nextBoss, minTimeDiff);
    }
}

export function renderUpcomingBossList(DOM) {
    if (!DOM.upcomingBossListContent) return;

    const upcomingBosses = BossDataManager.getUpcomingBosses(11);
    let html = '<ul>';
    if (upcomingBosses.length > 0) {
        upcomingBosses.slice(1).forEach(boss => {
            const timeDiff = boss.timestamp - Date.now();
            const isImminent = timeDiff < 5 * 60 * 1000;
            const isMedium = timeDiff < 60 * 60 * 1000; // Less than 1 hour

            const remaining = formatTimeDifference(timeDiff, isImminent);
            const formattedSpawnTime = formatSpawnTime(boss.time);

            let spawnTimeClass = '';
            let bossNameClass = '';
            let remainingTimeClass = '';

            if (isImminent) { // < 5 minutes (Highest priority)
                spawnTimeClass = 'imminent-boss-info';
                bossNameClass = 'imminent-boss-info';
                remainingTimeClass = 'imminent-remaining-time';
            } else if (isMedium) { // < 1 hour
                spawnTimeClass = 'medium-priority';
                bossNameClass = 'medium-priority';
                remainingTimeClass = 'medium-priority';
            } else { // Default: >= 1 hour
                spawnTimeClass = 'default-grey';
                bossNameClass = 'default-grey';
                remainingTimeClass = 'default-grey';
            }

            html += `<li class="list-item list-item--dense"><span class="spawn-time ${spawnTimeClass}">${formattedSpawnTime}</span> <span class="${bossNameClass}">${boss.name}</span> <span class="${remainingTimeClass}">${remaining}</span></li>`;
        });
    } else {
        html += '<li>예정된 보스가 없습니다.</li>';
    }
    html += '</ul>';
    DOM.upcomingBossListContent.innerHTML = html;
}

export function renderAlarmStatusSummary(DOM) {
    if (!DOM.alarmStatusText) return;

    const isAlarmRunning = getIsAlarmRunning();
    let statusText = isAlarmRunning ? '알림 실행 중' : '알림 중지됨';

    DOM.alarmStatusText.textContent = statusText;
    if (isAlarmRunning) {
        DOM.alarmStatusText.classList.add('alarm-status-running');
    } else {
        DOM.alarmStatusText.classList.remove('alarm-status-running');
    }
}

export function renderRecentAlarmLog(DOM) {
    if (!DOM.recentAlarmLogContent) return;

    const logs = getLogs();
    let html = '<ul>';
    if (logs.length > 0) {
        const recentLogs = logs.slice(-3).reverse();
        recentLogs.forEach(logObj => {
            html += `<li class="list-item list-item--dense log-entry ${logObj.important ? 'important' : ''}">${logObj.html}</li>`;
        });
    } else {
        html += '<li>최근 알림 기록 없음</li>';
    }
    html += '</ul>';
    DOM.recentAlarmLogContent.innerHTML = html;
}

export function renderDashboard(DOM) {
    updateNextBossDisplay(DOM);
    renderUpcomingBossList(DOM);
    renderAlarmStatusSummary(DOM);
    updateMuteButtonVisuals(DOM);
}

// --- Help Screen Rendering Functions ---
export function renderHelpScreen(DOM, helpData) {
    const helpContentContainer = DOM.helpScreen.querySelector('#featureGuideContent');
    if (helpData && helpContentContainer) {
        let html = '';
        helpData.forEach((section, index) => {
            // Expand the first accordion item by default.
            const isOpen = index === 0 ? 'open' : '';
            html += `
                <details class="help-section" ${isOpen}>
                    <summary class="help-summary">${convertBoldMarkdownToHtml(section.title)}</summary>
                    <div class="help-content">
                        ${section.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                        ${section.sub_sections ? section.sub_sections.map(sub => `
                            <details class="help-sub-section">
                                <summary class="help-sub-summary">${convertBoldMarkdownToHtml(sub.title)}</summary>
                                <div class="help-sub-content">
                                    ${sub.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                                </div>
                            </details>
                        `).join('') : ''}
                    </div>
                </details>
            `;
        });
        helpContentContainer.innerHTML = html;
    } else if (helpContentContainer) {
        helpContentContainer.innerHTML = `<p>도움말 콘텐츠를 불러오는 데 실패했습니다.</p>`;
    }
}

export function renderFaqScreen(DOM, faqData) {
    const faqContentContainer = DOM.helpScreen.querySelector('#faq-content');
    if (faqData && faqContentContainer) {
        let html = '';
        faqData.forEach((section, index) => {
            const isOpen = index === 0 ? 'open' : '';
            html += `
                <details class="help-section" ${isOpen}>
                    <summary class="help-summary">${convertBoldMarkdownToHtml(section.title)}</summary>
                    <div class="help-content">
                        ${section.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                        ${section.sub_sections ? section.sub_sections.map(sub => `
                            <details class="help-sub-section">
                                <summary class="help-sub-summary">${convertBoldMarkdownToHtml(sub.title)}</summary>
                                <div class="help-sub-content">
                                    ${sub.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                                </div>
                            </details>
                        `).join('') : ''}
                    </div>
                </details>
            `;
        });
        faqContentContainer.innerHTML = html;
    } else if (faqContentContainer) {
        faqContentContainer.innerHTML = `<p>FAQ 콘텐츠를 불러오는 데 실패했습니다.</p>`;
    }
}

// 헬퍼: 마크다운 강조(**text**)를 HTML <strong> 태그로 변환
function convertBoldMarkdownToHtml(text) {
    // ** 다음에 공백이 없고, * 앞에 공백이 없는 경우 (단어 중간 강조 포함)
    // ** 다음에 어떤 문자(공백 포함)가 오든 처리하도록 변경
    return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
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
            DOM.lightExpectedTimeDisplay.classList.add('over-time');
            if (labelSpan) labelSpan.textContent = '오버 시간';
            if (labelGroup) labelGroup.classList.add('over-time-label');
        } else {
            DOM.lightExpectedTimeDisplay.classList.remove('over-time');
            if (labelSpan) labelSpan.textContent = '예상 시간';
            if (labelGroup) labelGroup.classList.remove('over-time-label');
        }
    }
}

export function renderLightTempResults(DOM, gwangTime, afterGwangTime, totalTime) {
    if (DOM.lightTempResults) {
        if (!gwangTime && !afterGwangTime && !totalTime) {
            DOM.lightTempResults.innerHTML = '';
            DOM.lightTempResults.style.display = 'none';
            return;
        }
        DOM.lightTempResults.style.display = 'block';
        DOM.lightTempResults.innerHTML = `
            <div class="card-header">
                <h4>최근 계산 결과</h4>
            </div>
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
        `;
    }
}

export function renderLightSavedList(DOM, records) {
    if (DOM.lightSavedList && DOM.lightTempResults) { // Ensure both elements exist
        if (records.length === 0) {
            DOM.lightSavedList.innerHTML = `
                <div class="card-header">
                    <h4>광 계산 목록</h4>
                </div>
                <div class="light-list-action">
                    <button id="clearLightRecordsButton" class="button" disabled>목록 초기화</button>
                </div>
                <p>저장된 기록이 없습니다.</p>
            `;
            DOM.lightTempResults.classList.add('compact-top'); // Add class when no records
        } else {
            let html = `
                <div class="card-header">
                    <h4>광 계산 목록</h4>
                </div>
                <div class="light-list-action">
                    <button id="clearLightRecordsButton" class="button">목록 초기화</button>
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
            DOM.lightTempResults.classList.remove('compact-top'); // Remove class when records exist
        }
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
            outputLines.push(currentItem.value);
        } else if (currentItem.type === 'boss') {
            // Use formatBossListTime to conditionally show seconds
            const formattedTime = formatBossListTime(currentItem.time);
            outputLines.push(`${formattedTime} ${currentItem.name}`);
        }
    }
    DOM.bossListInput.value = outputLines.join('\n');
}




// --- 5.2. 고정 알림 목록 렌더링 함수 ---
export function renderFixedAlarms(DOM) {
    if (!DOM.fixedAlarmListDiv) return;
    DOM.fixedAlarmListDiv.innerHTML = ''; // Clear existing list

    const fixedAlarms = LocalStorageManager.getFixedAlarms();

    if (fixedAlarms.length === 0) {
        DOM.fixedAlarmListDiv.innerHTML = '<p class="empty-list-message">등록된 고정 알림이 없습니다.</p>';
        return;
    }

    fixedAlarms.forEach((alarm) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item fixed-alarm-item';
        itemDiv.id = `fixed-alarm-item-${alarm.id}`;
        if (!alarm.enabled) {
            itemDiv.classList.add('faded');
        }

        // 2줄 구조의 HTML
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        // 데이터 마이그레이션 전의 기존 알람은 days 속성이 없으므로, 기본값으로 모든 요일을 활성화
        const activeDays = alarm.days ?? [0, 1, 2, 3, 4, 5, 6];

        itemDiv.innerHTML = `
            <div class="alarm-item-line1">
                <span class="alarm-info">
                    <span class="alarm-time">${alarm.time}</span>
                    <span class="alarm-name">${alarm.name}</span>
                </span>
                <label class="switch">
                    <input type="checkbox" data-id="${alarm.id}" ${alarm.enabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
            <div class="alarm-item-line2">
                <div class="alarm-days">
                    ${days.map((day, index) => {
                        const isActive = activeDays.includes(index);
                        return `<button class="day-button ${isActive ? 'active' : ''}" data-day-index="${index}">${day}</button>`;
                    }).join('')}
                </div>
                <div class="button-group">
                    <button class="button edit-fixed-alarm-button" data-id="${alarm.id}">편집</button>
                    <button class="button delete-fixed-alarm-button" data-id="${alarm.id}">삭제</button>
                </div>
            </div>
        `;
        DOM.fixedAlarmListDiv.appendChild(itemDiv);
    });

    // 참고: 기존의 '새 고정 알림 추가' UI 생성 및 이벤트 리스너 로직은 모두 제거되었습니다.
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


export function renderVersionInfo(DOM, versionData) {
    console.log('ui-renderer.js: renderVersionInfo received versionData:', versionData); // Debug log
    console.log('ui-renderer.js: Array.isArray(versionData):', Array.isArray(versionData)); // Debug log
    let versionEntries = [];

    // Check if versionData is an array and process accordingly
    if (Array.isArray(versionData)) {
        versionData.forEach(item => {
            if (item && item.fullVersion) { // This is a direct version entry like v2.7.0
                versionEntries.push(item);
            } else if (item && item.value && Array.isArray(item.value)) { // This is the object containing 'value' array
                versionEntries = versionEntries.concat(item.value);
            }
        });
    } else {
        log("버전 정보 JSON 형식이 올바르지 않습니다.", false);
        if (DOM.versionHistoryContent) {
            DOM.versionHistoryContent.innerHTML = `<p>버전 정보를 불러오는 데 실패했습니다.</p>`;
        }
        return;
    }

    if (DOM.versionHistoryContent && versionEntries.length > 0) {
        let html = '';
        versionEntries.forEach((versionEntry, index) => {
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
                                    ${change.details && change.details.length > 0 ? `
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

    // Get current schedule to find existing IDs
    const currentSchedule = BossDataManager.getBossSchedule();
    const bossMap = new Map();
    currentSchedule.forEach(item => {
        if (item.type === 'boss') {
            // Map boss name to ID. Note: If duplicate names exist, this simple map might pick one arbitrarily.
            // However, for the scheduler view which typically lists unique boss names per game, this serves as a bridge.
            if (!bossMap.has(item.name)) {
                bossMap.set(item.name, item.id);
            }
        }
    });

    DOM.bossInputsContainer.innerHTML = bossNames.map(bossName => {
        const initialValue = remainingTimes[bossName] || '';
        const bossId = bossMap.get(bossName) || ''; // Get existing ID or empty string
        return `
            <div class="list-item boss-input-item">
                <span class="boss-name">${bossName}</span>
                <input type="text" class="remaining-time-input" data-boss-name="${bossName}" data-id="${bossId}" value="${initialValue}">
                <span class="calculated-spawn-time">--:--:--</span>
            </div>
        `;
    }).join('');
}