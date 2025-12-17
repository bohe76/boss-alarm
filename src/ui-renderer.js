import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { getIsAlarmRunning } from './alarm-scheduler.js'; // Import getIsAlarmRunning
import { log, getLogs } from './logger.js'; // Import log and getLogs
// import { loadJsonContent } from './api-service.js'; // loadJsonContent is no longer needed here
import { CustomListManager } from './custom-list-manager.js';
import { getGameNames, getBossNamesForGame } from './boss-scheduler-data.js'; // Import boss-scheduler-data functions
import { formatTimeDifference, formatSpawnTime, getKoreanDayOfWeek } from './utils.js'; // New import

const MUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
const UNMUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>`;

const EYE_ICON_SVG = `<div class="action-chip-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>`;
const PENCIL_ICON_SVG = `<div class="action-chip-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg></div>`;

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

export function updateSoundControls(DOM) {
    if (!DOM.muteToggleButton || !DOM.volumeSlider) return;
    const isMuted = LocalStorageManager.getMuteState();
    const volume = LocalStorageManager.getVolume();
    // Update mute button icon and class
    DOM.muteToggleButton.innerHTML = isMuted ? UNMUTE_ICON : MUTE_ICON;
    DOM.muteToggleButton.classList.toggle('muted', isMuted);
    // Determine the volume to display on the slider
    const displayVolume = isMuted ? 0 : volume;
    DOM.volumeSlider.value = displayVolume;
    // Update the CSS custom property for the track background
    const percentage = (displayVolume / DOM.volumeSlider.max) * 100;
    DOM.volumeSlider.style.setProperty('--volume-progress', `${percentage}%`);
}

import { isPipWindowOpen, updatePipContent } from './pip-manager.js';

// ... (rest of the imports)

// --- Dashboard Rendering Functions ---
export function updateNextBossDisplay(DOM) {
    if (!DOM.nextBossContent) return;
    const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo();
    if (nextBoss) {
        const isImminent = minTimeDiff < 5 * 60 * 1000;
        const isWarning = minTimeDiff < 10 * 60 * 1000;
        const isMedium = minTimeDiff < 60 * 60 * 1000;
        let remainingTimeClass = '';
        if (isImminent) {
            remainingTimeClass = 'imminent-remaining-time'; // Red
        } else if (isWarning) {
            remainingTimeClass = 'warning-priority'; // Orange
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
            const isWarning = timeDiff < 10 * 60 * 1000; // New
            const isMedium = timeDiff < 60 * 60 * 1000;
            const remaining = formatTimeDifference(timeDiff, isImminent);
            const formattedSpawnTime = formatSpawnTime(boss.time);
            let spawnTimeClass = '';
            let bossNameClass = '';
            let remainingTimeClass = '';
            if (isImminent) { // < 5 minutes (Highest priority)
                spawnTimeClass = 'imminent-boss-info';
                bossNameClass = 'imminent-boss-info';
                remainingTimeClass = 'imminent-remaining-time';
            } else if (isWarning) { // < 10 minutes
                spawnTimeClass = 'imminent-boss-info';
                bossNameClass = 'imminent-boss-info';
                remainingTimeClass = 'warning-priority';
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
    if (getIsAlarmRunning()) {
        updateNextBossDisplay(DOM);
        renderUpcomingBossList(DOM);
    }
    renderAlarmStatusSummary(DOM);
    updateSoundControls(DOM);
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

// --- Crazy Calculator Display Functions ---
export function updateCrazyStopwatchDisplay(DOM, time) {
    if (DOM.crazyStopwatchDisplay) {
        DOM.crazyStopwatchDisplay.textContent = time;
    }
}

export function updateCrazyExpectedTimeDisplay(DOM, time, isOverTime) {
    if (DOM.crazyExpectedTimeDisplay) {
        DOM.crazyExpectedTimeDisplay.textContent = time;
        const labelSpan = DOM.crazyExpectedTimeDisplay.previousElementSibling.querySelector('.expected-label');
        const labelGroup = DOM.crazyExpectedTimeDisplay.previousElementSibling;
        if (isOverTime) {
            DOM.crazyExpectedTimeDisplay.classList.add('over-time');
            if (labelSpan) labelSpan.textContent = '오버 시간';
            if (labelGroup) labelGroup.classList.add('over-time-label');
        } else {
            DOM.crazyExpectedTimeDisplay.classList.remove('over-time');
            if (labelSpan) labelSpan.textContent = '예상 시간';
            if (labelGroup) labelGroup.classList.remove('over-time-label');
        }
    }
}

export function renderCrazyTempResults(DOM, gwangTime, afterGwangTime, totalTime) {
    if (DOM.crazyTempResults) {
        if (!gwangTime && !afterGwangTime && !totalTime) {
            DOM.crazyTempResults.innerHTML = '';
            DOM.crazyTempResults.style.display = 'none';
            return;
        }
        DOM.crazyTempResults.style.display = 'block';
        DOM.crazyTempResults.innerHTML = `
            <div class="card-header">
                <h4>최근 계산 결과</h4>
            </div>
            <table class="crazy-temp-table">
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

export function renderCrazySavedList(DOM, records) {
    if (DOM.crazySavedList && DOM.crazyTempResults) { // Ensure both elements exist
        if (records.length === 0) {
            DOM.crazySavedList.innerHTML = `
                <div class="card-header">
                    <h4>광 계산 목록</h4>
                </div>
                <div class="crazy-list-action">
                    <button id="clearCrazyRecordsButton" class="button" disabled>목록 초기화</button>
                </div>
                <p>저장된 기록이 없습니다.</p>
            `;
            DOM.crazyTempResults.classList.add('compact-top'); // Add class when no records
        } else {
            let html = `
                <div class="card-header">
                    <h4>광 계산 목록</h4>
                </div>
                <div class="crazy-list-action">
                    <button id="clearCrazyRecordsButton" class="button">목록 초기화</button>
                </div>
                <table class="crazy-saved-table">
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
            DOM.crazySavedList.innerHTML = html;
            DOM.crazyTempResults.classList.remove('compact-top'); // Remove class when records exist
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
            // Use the new timeFormat property to decide the format
            let formattedTime;
            if (currentItem.timeFormat === 'hm') {
                formattedTime = currentItem.time.substring(0, 5); // HH:MM
            } else { // 'hms' or undefined for backward compatibility
                formattedTime = currentItem.time; // HH:MM:SS
            }
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
                                    <strong>${change.type}:</strong> ${convertBoldMarkdownToHtml(change.description)}
                                    ${change.details && change.details.length > 0 ? `
                                        <ul>
                                            ${change.details.map(detail => `<li>${convertBoldMarkdownToHtml(detail)}</li>`).join('')}
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
    // Crazy Calculator initialization
    if (DOM.crazyStopwatchDisplay) {
        DOM.crazyStopwatchDisplay.textContent = '00:00';
    }
    if (DOM.crazyExpectedTimeDisplay) {
        DOM.crazyExpectedTimeDisplay.textContent = '--:--';
        const labelSpan = DOM.crazyExpectedTimeDisplay.previousElementSibling.querySelector('.expected-label');
        const labelGroup = DOM.crazyExpectedTimeDisplay.previousElementSibling;
        if (labelSpan) labelSpan.textContent = '예상 시간';
        if (labelGroup) labelGroup.classList.remove('over-time-label');
    }
    if (DOM.crazyTempResults) {
        DOM.crazyTempResults.innerHTML = '';
        DOM.crazyTempResults.style.display = 'none'; // Hide on initial load
    }
    if (DOM.crazySavedList) {
        DOM.crazySavedList.innerHTML = '';
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
export function renderBossSchedulerScreen(DOM, remainingTimes = {}, memoInputs = {}) {
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
        renderBossInputs(DOM, gameNameObjects[0].name, remainingTimes, memoInputs);
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
export function renderBossInputs(DOM, gameName, remainingTimes = {}, memoInputs = {}) {
    const bossNames = getBossNamesForGame(gameName);
    if (!bossNames || bossNames.length === 0) {
        DOM.bossInputsContainer.innerHTML = '<p>선택된 게임/목록에 보스가 없습니다.</p>';
        return;
    }
    // Get current schedule to find existing IDs and Memos
    const currentSchedule = BossDataManager.getBossSchedule();
    const bossMap = new Map();
    currentSchedule.forEach(item => {
        if (item.type === 'boss') {
            if (!bossMap.has(item.name)) {
                bossMap.set(item.name, item); // Store whole item
            }
        }
    });

    DOM.bossInputsContainer.innerHTML = bossNames.map(bossName => {
        const initialTimeValue = remainingTimes[bossName] || '';
        const existingBoss = bossMap.get(bossName);
        const bossId = existingBoss ? existingBoss.id : '';
        // Use stored memo input if available, otherwise use existing memo from data, or empty string
        const initialMemoValue = memoInputs[bossName] !== undefined ? memoInputs[bossName] : (existingBoss && existingBoss.memo ? existingBoss.memo : '');

        return `
            <div class="list-item boss-input-item">
                <div class="boss-input-row-main">
                    <span class="boss-name">${bossName}</span>
                    <input type="text" class="remaining-time-input" data-boss-name="${bossName}" data-id="${bossId}" value="${initialTimeValue}">
                    <span class="calculated-spawn-time">--:--:--</span>
                </div>
                <div class="boss-input-row-memo">
                    <input type="text" class="memo-input" data-boss-name="${bossName}" value="${initialMemoValue}" placeholder="비고 (20자)" maxlength="20">
                </div>
            </div>
        `;
    }).join('');
}
// --- Boss Management Screen Rendering Functions ---
export function updateBossManagementUI(DOM, mode) {
    const isViewMode = mode === 'view';
    
    // Toggle button active state (removed as it's always primary color)
    // DOM.viewEditModeToggleButton.classList.toggle('active', isViewMode);
    
    // Set innerHTML for the button including the icon and label
    DOM.viewEditModeToggleButton.innerHTML = isViewMode ? `${PENCIL_ICON_SVG} 편집` : `${EYE_ICON_SVG} 뷰`;

    // console.log("viewEditModeToggleButton innerHTML after set:", DOM.viewEditModeToggleButton.innerHTML); // Debug log

            // Show/hide elements based on mode
            if (DOM.bossManagementInstruction) DOM.bossManagementInstruction.style.display = isViewMode ? 'none' : 'block';
            if (DOM.bossListInput) DOM.bossListInput.style.display = isViewMode ? 'none' : 'block';
            if (DOM.sortBossListButton) DOM.sortBossListButton.style.display = isViewMode ? 'none' : 'block';
            if (DOM.nextBossToggleButton) DOM.nextBossToggleButton.style.display = isViewMode ? 'block' : 'none';
            if (DOM.bossListTableContainer) DOM.bossListTableContainer.style.display = isViewMode ? 'block' : 'none';
    
            if (isViewMode) {        let filterNextBoss = LocalStorageManager.get('bossManagementNextBossFilter');
        renderBossListTableView(DOM, filterNextBoss);
    }
}

export function renderBossListTableView(DOM, filterNextBoss) {
    if (!DOM.bossListTableContainer) return;
    let schedule = BossDataManager.getBossSchedule();
    const now = new Date();
    if (filterNextBoss) {
        // 날짜 필터링 로직: 
        // 1. 현재 시간 이후의 보스만 남김
        // 2. 단, 'date' 타입(날짜 마커)은 일단 모두 유지했다가, 
        //    렌더링 단계에서 해당 날짜에 보스가 하나도 없으면 카드를 아예 안 그리는 방식으로 처리하는 것이 깔끔함.
        //    하지만 여기서는 리스트 순회하며 동적으로 카드를 여닫는 구조이므로,
        //    일단 보스만 필터링하고 날짜 마커는 살려둠.
        schedule = schedule.filter(item => {
            if (item.type === 'date') return true; 
            return item.scheduledDate && item.scheduledDate > now;
        });
    }

    let html = '';
    let currentCardHtml = ''; // 현재 처리 중인 날짜 카드의 내용
    let hasBossInCurrentDate = false; // 현재 날짜에 보스가 하나라도 있는지 확인

    // 헬퍼: 현재 열려 있는 카드를 닫고 html에 추가하는 함수
    const closeCurrentCard = () => {
        if (currentCardHtml && hasBossInCurrentDate) {
            html += `
                <div class="card-standard card-size-list" style="margin-bottom: 16px;">
                    ${currentCardHtml}
                    </div>
                </div>
            `;
        }
        currentCardHtml = '';
        hasBossInCurrentDate = false;
    };

    schedule.forEach(item => {
        if (item.type === 'date') {
            // 이전 날짜 카드 닫기
            closeCurrentCard();

            // 새 날짜 카드 헤더 시작
            const currentDate = item.value;
            const currentYear = new Date().getFullYear();
            const dateObj = new Date(`${currentYear}-${currentDate.replace('.', '-')}`);
            const dayOfWeek = getKoreanDayOfWeek(dateObj);
            
            currentCardHtml = `
                <div class="card-header">
                    <h3>${currentDate} (${dayOfWeek})</h3>
                </div>
                <div class="card-list-content">
            `;
        } else if (item.type === 'boss') {
            let time;
            if (item.timeFormat === 'hm') {
                time = item.time.substring(0, 5); // HH:MM
            } else { // 'hms' or undefined for backward compatibility
                time = item.time; // HH:MM:SS
            }
            currentCardHtml += `
                <div class="list-item list-item--dense" style="flex-direction: column; align-items: flex-start;">
                    <div style="display: flex; width: 100%; align-items: center;">
                        <span style="font-weight: bold; min-width: 60px;">${time}</span>
                        <span style="margin-left: 16px; flex-grow: 1;">${item.name}</span>
                    </div>
                    ${item.memo ? `<div style="font-size: 0.85em; color: #888; margin-top: 4px; margin-left: 76px;">${item.memo}</div>` : ''}
                </div>
            `;
            hasBossInCurrentDate = true;
        }
    });

    // 마지막 날짜 카드 닫기
    closeCurrentCard();

    if (!html) {
        html = '<p class="no-boss-message" style="text-align: center; color: #888; padding: 20px;">표시할 보스가 없습니다.</p>';
    }

    DOM.bossListTableContainer.innerHTML = html;
}