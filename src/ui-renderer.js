import { BossDataManager, LocalStorageManager, BOSS_THRESHOLDS } from './data-managers.js'; // Import managers and thresholds
import { CustomListManager } from './custom-list-manager.js'; // Import CustomListManager
import { getIsAlarmRunning } from './alarm-scheduler.js'; // Import getIsAlarmRunning
import { log, getLogs } from './logger.js'; // Import log and getLogs
// import { loadJsonContent } from './api-service.js'; // loadJsonContent is no longer needed here
import { getGameNames, getBossNamesForGame } from './boss-scheduler-data.js';
import { formatMonthDay, getKoreanDayOfWeek, padNumber, formatTimeDifference, formatSpawnTime } from './utils.js';

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
        const isImminent = minTimeDiff < BOSS_THRESHOLDS.IMMINENT;
        const isWarning = minTimeDiff < BOSS_THRESHOLDS.WARNING;
        const isMedium = minTimeDiff < BOSS_THRESHOLDS.MEDIUM;
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
        const { nextBoss: pipNextBoss, minTimeDiff: pipMinTimeDiff, imminentBosses } = BossDataManager.getBossStatusSummary();
        updatePipContent(pipNextBoss, pipMinTimeDiff, imminentBosses);
    }
}

export function renderUpcomingBossList(DOM) {
    if (!DOM.upcomingBossListContent) return;
    const upcomingBosses = BossDataManager.getUpcomingBosses(11);
    let html = '<ul>';
    if (upcomingBosses.length > 0) {
        const now = Date.now();
        upcomingBosses.slice(1).forEach(boss => {
            const timeDiff = boss.timestamp - now;
            const isImminent = timeDiff < BOSS_THRESHOLDS.IMMINENT;
            const isWarning = timeDiff < BOSS_THRESHOLDS.WARNING;
            const isMedium = timeDiff < BOSS_THRESHOLDS.MEDIUM;
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
                <section class="help-section-wrapper">
                    <details class="help-section" ${isOpen}>
                        <summary class="help-summary"><h3>${convertBoldMarkdownToHtml(section.title)}</h3></summary>
                        <div class="help-content">
                            ${section.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                            ${section.sub_sections ? section.sub_sections.map(sub => `
                                <article class="help-sub-section-wrapper">
                                    <details class="help-sub-section">
                                        <summary class="help-sub-summary"><h4>${convertBoldMarkdownToHtml(sub.title)}</h4></summary>
                                        <div class="help-sub-content">
                                            ${sub.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                                        </div>
                                    </details>
                                </article>
                            `).join('') : ''}
                        </div>
                    </details>
                </section>
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
                <section class="help-section-wrapper">
                    <details class="help-section" ${isOpen}>
                        <summary class="help-summary"><h3>${convertBoldMarkdownToHtml(section.title)}</h3></summary>
                        <div class="help-content">
                            ${section.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                            ${section.sub_sections ? section.sub_sections.map(sub => `
                                <article class="help-sub-section-wrapper">
                                    <details class="help-sub-section">
                                        <summary class="help-sub-summary"><h4>${convertBoldMarkdownToHtml(sub.title)}</h4></summary>
                                        <div class="help-sub-content">
                                            ${sub.content.map(p => `<p>${convertBoldMarkdownToHtml(p)}</p>`).join('')}
                                        </div>
                                    </details>
                                </article>
                            `).join('') : ''}
                        </div>
                    </details>
                </section>
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

// --- 5.1. 보스 목록 텍스트 영역 업데이트 함수 (SSOT -> UI) ---
export function updateBossListTextarea(DOM) {
    if (!DOM.schedulerBossListInput) return;

    // 1. 전체 스케줄 데이터 가져오기 (미래 앵커 포함, 필터링 없이)
    const schedule = BossDataManager.getBossSchedule(false);
    if (!schedule || schedule.length === 0) {
        DOM.schedulerBossListInput.value = '';
        return;
    }

    const now = Date.now();
    const bossMap = new Map(); // 보스 이름 -> 가장 가까운 미래 데이터

    // 2. 보스별로 "가장 가까운 미래 데이터 1개" 추출 (앵커 선정 로직)
    // 데이터 구조상 bossSchedule에는 { type: 'date' } 객체도 있으나, 
    // 여기서는 type: 'boss' 객체만 추출하여 재구성함.
    schedule.forEach(item => {
        if (item.type === 'boss') {
            const itemTime = new Date(item.scheduledDate).getTime();
            // 현재(now)보다 미래인 데이터만 고려
            if (itemTime > now) {
                const existing = bossMap.get(item.name);
                // 아직 등록된 미래 데이터가 없거나, 현재 아이템이 더 가까운 미래라면 등록
                // (기존 데이터보다 itemTime이 더 작으면 더 가까운 미래임)
                if (!existing || itemTime < new Date(existing.scheduledDate).getTime()) {
                    bossMap.set(item.name, item);
                }
            }
        }
    });

    const outputLines = [];
    let lastDateStr = '';
    const pad = (n) => String(n).padStart(2, '0');

    // 3. 추출된 앵커들을 시간순으로 정렬하여 출력
    const sortedAnchors = Array.from(bossMap.values()).sort((a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    sortedAnchors.forEach(item => {
        const d = new Date(item.scheduledDate);
        const dateStr = `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

        // 날짜 헤더 추가
        if (dateStr !== lastDateStr) {
            outputLines.push(dateStr);
            lastDateStr = dateStr;
        }

        // 시간 포맷팅
        let formattedTime;
        if (item.timeFormat === 'hm') {
            formattedTime = item.time.substring(0, 5);
        } else {
            formattedTime = item.time;
        }

        const memoText = item.memo ? ` #${item.memo}` : "";

        // 젠 주기(@) 정보는 SSOT에 interval(ms) 또는 intervalMinutes가 있을 경우 출력
        // 사용자가 입력한 @젠시간 정보를 보존하기 위함
        let intervalText = "";
        let intervalMin = 0;

        if (item.intervalMinutes) {
            intervalMin = item.intervalMinutes;
        } else if (item.interval && item.interval > 0) {
            // [Fix] interval은 분 단위로 저장되므로 나눗셈 없이 그대로 사용
            intervalMin = item.interval;
        }

        if (intervalMin > 0) {
            intervalText = ` @${intervalMin}`;
        }

        outputLines.push(`${formattedTime} ${item.name}${memoText}${intervalText}`);
    });

    DOM.schedulerBossListInput.value = outputLines.join('\n');
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
            if (item && item.fullVersion) {
                versionEntries.push(item);
            } else if (item && item.value && Array.isArray(item.value)) {
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
            const isOpen = index === 0 ? 'open' : '';
            // Extract date part from fullVersion if possible
            const dateMatch = versionEntry.fullVersion.match(/\((.*?)\)/);
            const dateStr = dateMatch ? dateMatch[1] : versionEntry.date || '';
            const versionStr = versionEntry.fullVersion.split(' ')[0];

            html += `
                <article class="version-entry">
                    <details class="version-accordion" ${isOpen}>
                        <summary class="version-summary">
                            <h3 class="version-number">${versionStr} ${dateStr ? `<time datetime="${dateStr}">(${dateStr})</time>` : ''}</h3>
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
                </article>
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
export function renderBossSchedulerScreen(DOM, remainingTimes = {}, memoInputs = {}, scheduleData = null) {
    if (!DOM.bossSchedulerScreen) return;
    // Populate game selection dropdown
    const gameNameObjects = getGameNames();
    if (DOM.gameSelect) {
        DOM.gameSelect.innerHTML = gameNameObjects.map(game =>
            `<option value="${game.id}">${game.isCustom ? '*' : ''}${game.name}</option>`
        ).join('');

        // 로컬 스토리지에서 마지막 선택한 게임 로드
        const lastSelectedGame = LocalStorageManager.get('lastSelectedGame');
        if (lastSelectedGame && gameNameObjects.some(g => g.id === lastSelectedGame)) {
            DOM.gameSelect.value = lastSelectedGame;
        } else if (gameNameObjects.length > 0) {
            // 저장된 값이 없거나 유효하지 않으면 첫 번째 항목 선택
            DOM.gameSelect.value = gameNameObjects[0].id;
            LocalStorageManager.set('lastSelectedGame', gameNameObjects[0].id);
        }
    }

    // Render bosses for the selected game
    const currentGame = DOM.gameSelect && DOM.gameSelect.value ? DOM.gameSelect.value : (gameNameObjects.length > 0 ? gameNameObjects[0].id : null);

    if (currentGame) {
        renderBossInputs(DOM, currentGame, remainingTimes, memoInputs, scheduleData);
    } else {
        if (DOM.bossInputsContainer) {
            DOM.bossInputsContainer.innerHTML = '<p>선택할 수 있는 게임 목록이 없습니다.</p>';
        }
    }
}

/**
 * Renders the boss input fields for a selected game.
 * 간편 입력 모드는 boss-presets.json의 보스 이름 목록으로 입력 폼을 생성합니다.
 */
export function renderBossInputs(DOM, gameName, remainingTimes = {}, memoInputs = {}, scheduleData = null) {
    const bossNames = getBossNamesForGame(gameName);
    if (!bossNames || bossNames.length === 0) {
        DOM.bossInputsContainer.innerHTML = '<p>선택된 게임/목록에 보스가 없습니다.</p>';
        return;
    }
    // SSOT에서 기존 입력값 복원용 (현재 시각 기준 가장 가까운 미래 보스 선택)
    const now = Date.now();
    const currentSchedule = scheduleData || BossDataManager.getDraftSchedule();
    const bossMap = new Map();

    // 보스별로 가장 가까운 미래 항목을 찾기 위해 정렬된 리스트 활용
    currentSchedule.forEach(item => {
        if (item.type === 'boss') {
            const itemTime = new Date(item.scheduledDate).getTime();

            // [수정된 로직] 철저하게 현재(now)보다 미래인 데이터만 고려
            if (itemTime > now) {
                const existing = bossMap.get(item.name);
                // 아직 등록된 미래 데이터가 없거나, 현재 아이템이 더 가까운 미래라면 등록/갱신
                if (!existing || itemTime < new Date(existing.scheduledDate).getTime()) {
                    bossMap.set(item.name, item);
                }
            }
        }
    });

    // 커스텀 게임 여부 확인 (getGameNames() 활용)
    const games = getGameNames();
    const isCustomGame = games.find(g => g.id === gameName)?.isCustom || false;

    // 헤더 노출 제어
    const intervalHeader = DOM.bossSchedulerScreen.querySelector('.interval-header');
    if (intervalHeader) {
        intervalHeader.style.display = isCustomGame ? 'flex' : 'none';
    }

    DOM.bossInputsContainer.innerHTML = bossNames.map(bossName => {
        const initialTimeValue = remainingTimes[bossName] || '';
        const existingBoss = bossMap.get(bossName);
        const bossId = existingBoss ? existingBoss.id : '';
        const initialMemoValue = memoInputs[bossName] !== undefined ? memoInputs[bossName] : (existingBoss && existingBoss.memo ? existingBoss.memo : '');

        // SSOT에 이미 저장된 데이터가 있다면 정밀한 시간을 직접 사용
        let spawnTimeDisplay = '--:--:--';
        let isoDateAttr = '';
        if (existingBoss && existingBoss.scheduledDate) {
            const sDate = new Date(existingBoss.scheduledDate);
            spawnTimeDisplay = `${padNumber(sDate.getHours())}:${padNumber(sDate.getMinutes())}:${padNumber(sDate.getSeconds())}`;
            isoDateAttr = `data-calculated-date="${sDate.toISOString()}"`;
        }

        // 젠 주기(interval)를 시/분으로 환산 (0인 경우 입력창을 비워 플레이스홀더 노출)
        const totalInterval = existingBoss && existingBoss.interval ? existingBoss.interval : 0;
        const hh = totalInterval > 0 ? Math.floor(totalInterval / 60) : "";
        const mm = totalInterval > 0 ? totalInterval % 60 : "";
        const mmDisplay = (mm !== "" && mm !== 0) ? padNumber(mm) : "";

        return `
            <div class="list-item boss-input-item">
                <div class="boss-input-row-main">
                    <span class="boss-name">${bossName}</span>
                    <input type="text" class="remaining-time-input" data-boss-name="${bossName}" data-id="${bossId}" ${isoDateAttr} value="${initialTimeValue}">
                    <span class="calculated-spawn-time">${spawnTimeDisplay}</span>
                </div>
                <div class="boss-input-row-details">
                    <div class="memo-input-group">
                        <span class="mobile-label">비고</span>
                        <input type="text" class="memo-input" data-boss-name="${bossName}" value="${initialMemoValue}" placeholder="25자 내로 써주세요." maxlength="25">
                    </div>
                    <div class="interval-input-group" style="display: ${isCustomGame ? 'flex' : 'none'}">
                        <span class="mobile-label">젠 주기</span>
                        <div class="interval-inputs">
                            <input type="number" class="interval-hh" data-boss-name="${bossName}" value="${hh}" min="0" max="99" placeholder="0">
                            <span class="separator">:</span>
                            <input type="number" class="interval-mm" data-boss-name="${bossName}" value="${mmDisplay}" min="0" max="59" placeholder="00">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
// --- Timetable Screen Rendering Functions ---
export function updateTimetableUI(DOM, options = {}) {
    if (DOM.bossListCardsContainer) DOM.bossListCardsContainer.style.removeProperty('display');

    const filterNextBoss = options.nextBossOnly !== undefined
        ? options.nextBossOnly
        : LocalStorageManager.get('timetableNextBossFilter');

    renderTimetableList(DOM, {
        nextBossOnly: filterNextBoss,
        dateRange: options.dateRange || 'all',
        displayMode: options.displayMode || LocalStorageManager.get('timetableDisplayMode') || '표'
    });
}

export function renderTimetableList(DOM, options = {}) {
    if (!DOM.bossListCardsContainer) return;

    const { nextBossOnly = false, dateRange = 'all', displayMode = '표' } = options;

    // 1. 원본 스케줄 데이터를 가져옴
    const schedule = BossDataManager.getBossSchedule();
    const now = new Date();

    // 2. 보스 데이터 추출 및 날짜 필터링
    let bosses = schedule.filter(item => item.type === 'boss');

    if (dateRange !== 'all') {
        const targetDate = new Date();
        if (dateRange === 'tomorrow') targetDate.setDate(targetDate.getDate() + 1);
        const targetDateStr = targetDate.toDateString();
        bosses = bosses.filter(boss => new Date(boss.scheduledDate).toDateString() === targetDateStr);
    }

    // 시간순 정렬
    bosses.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    // 3. '다음 보스' 필터 적용
    const filteredBosses = nextBossOnly
        ? bosses.filter(boss => boss.scheduledDate && new Date(boss.scheduledDate) > now)
        : bosses;

    // 4. 가장 긴 보스 이름을 찾아 최소 너비 계산 (한글 기준 1자당 18px 확보)
    const maxNameLength = bosses.reduce((max, boss) => {
        const len = (boss.name || '').length;
        return len > max ? len : max;
    }, 0);
    // 한글 비중이 높으므로 18px 배율 적용 및 최소 폭 확보
    const nameMinWidth = Math.max(110, maxNameLength * 18);

    let html = '';

    if (displayMode === '카드') {
        // --- 카드 모드 렌더링 (기존 리스트 스타일 복구) ---
        // 기존 클래스 제거 및 전용 그리드 클래스 추가
        DOM.bossListCardsContainer.classList.remove('card-size-list');
        DOM.bossListCardsContainer.classList.remove('boss-card-grid');
        DOM.bossListCardsContainer.classList.add('timetable-grid-container');

        let currentCardHtml = '';
        let lastDateStr = '';

        // 헬퍼: 현재 카드의 HTML 구성을 마무리하고 전체 결과에 추가
        const closeCurrentCard = () => {
            if (currentCardHtml) {
                html += `
                    <div class="card-standard" style="margin-bottom: 16px;">
                        ${currentCardHtml}
                        </div> <!-- .card-list-content 닫기 -->
                    </div> <!-- .card-standard 닫기 -->
                `;
                currentCardHtml = '';
            }
        };

        filteredBosses.forEach(boss => {
            const scheduledDate = new Date(boss.scheduledDate);
            const dateStr = formatMonthDay(scheduledDate); // MM.DD 형식

            // 날짜가 바뀌면 새로운 카드를 시작
            if (dateStr !== lastDateStr) {
                closeCurrentCard();

                const dayOfWeek = getKoreanDayOfWeek(scheduledDate);
                currentCardHtml = `
                    <div class="card-header">
                        <h3>${dateStr} (${dayOfWeek})</h3>
                    </div>
                    <div class="card-list-content">
                `;
                lastDateStr = dateStr;
            }

            // 시간 표시 형식 결정
            let time;
            if (boss.timeFormat === 'hm') {
                time = boss.time.substring(0, 5); // HH:MM
            } else {
                time = boss.time; // HH:MM:SS
            }

            currentCardHtml += `
                <div class="list-item list-item--dense" style="display: flex; flex-direction: row; align-items: center; justify-content: flex-start; flex-wrap: nowrap; overflow: hidden; padding: 10px 0;">
                    <span style="font-weight: bold; min-width: 60px; flex-shrink: 0;">${time}</span>
                    <span style="display: inline-block; margin-left: 16px; min-width: ${nameMinWidth}px; flex-shrink: 0; white-space: nowrap; font-weight: 500;">${boss.name}</span>
                    ${boss.memo ? `<span style="font-size: 0.9em; color: #666; margin-left: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${boss.memo}</span>` : ''}
                </div>
            `;
        });

        // 마지막으로 열려있던 카드 닫기
        closeCurrentCard();

    } else {
        // --- 표(Table) 모드 렌더링 (엑셀 스타일) ---
        // 기존 클래스 제거 및 전용 그리드 클래스 추가
        DOM.bossListCardsContainer.classList.remove('card-size-list');
        DOM.bossListCardsContainer.classList.remove('boss-card-grid');
        DOM.bossListCardsContainer.classList.add('timetable-grid-container');

        // 전체를 감싸는 컨테이너 시작
        // 중요: 내부 컨테이너(boss-list-table)는 그리드 아이템이 아니라 그리드 그 자체가 되어야 할 수도 있고, 
        // 혹은 부모인 bossListCardsContainer가 그리드가 되고 내부는 fragment처럼 동작해야 함.
        // 현재 구조상 bossListCardsContainer 내부에 html 문자열을 넣으므로, 
        // 2열 배치를 위해서는 bossListCardsContainer 자체가 Grid여야 하고, 자식들이 카드여야 함.
        // 따라서 여기서 'div#boss-list-table'로 감싸버리면 1개의 자식이 되어 2열 배치가 안 됨.
        // 해결책: 감싸는 div 없이 자식들을 바로 나열.
        // 단, '내보내기'를 위해 ID가 필요하다면, bossListCardsContainer 자체를 캡처하면 됨.
        html = ''; // 래퍼 제거

        let currentTableHtml = '';
        let lastDateStr = '';

        // 헬퍼: 현재 날짜의 테이블 카드를 마무리하고 전체 결과에 추가
        const closeCurrentTableCard = () => {
            if (currentTableHtml) {
                html += `
                    <div class="boss-table-card">
                        <div class="boss-table-header">
                            <h3>${lastDateStr}</h3>
                        </div>
                        <table class="boss-table" style="table-layout: fixed;">
                            <colgroup>
                                <col style="width: 80px;">
                                <col>
                                <col style="width: 30%;">
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style="text-align: center;">시간</th>
                                    <th>보스 이름</th>
                                    <th>비고</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${currentTableHtml}
                            </tbody>
                        </table>
                    </div>
                `;
                currentTableHtml = '';
            }
        };

        filteredBosses.forEach(boss => {
            const scheduledDate = new Date(boss.scheduledDate);
            const dateStr = formatMonthDay(scheduledDate); // MM.DD 형식
            const dayOfWeek = getKoreanDayOfWeek(scheduledDate);
            const fullDateStr = `${dateStr} (${dayOfWeek})`;

            // 날짜가 바뀌면 새로운 테이블 카드를 시작
            if (fullDateStr !== lastDateStr) {
                closeCurrentTableCard();
                lastDateStr = fullDateStr;
            }

            // 시간 표시 형식 결정
            let time;
            if (boss.timeFormat === 'hm') {
                time = boss.time.substring(0, 5); // HH:MM
            } else {
                time = boss.time; // HH:MM:SS
            }

            currentTableHtml += `
                <tr>
                    <td class="boss-table-time">${time}</td>
                    <td class="boss-table-name">${boss.name}</td>
                    <td class="boss-table-memo">${boss.memo || ''}</td>
                </tr>
            `;
        });

        // 마지막으로 열려있던 테이블 카드 닫기
        closeCurrentTableCard();

        // 전체 컨테이너 닫기
        html += '</div>';
    }

    // 결과가 없을 경우 메시지 표시
    if (!html || html === '<div id="boss-list-table" class="table-view-container"></div>') {
        const noBossMsg = '<p class="no-boss-message" style="text-align: center; color: #888; padding: 20px;">표시할 보스가 없습니다.</p>';
        if (displayMode === '카드') {
            html = noBossMsg;
        } else {
            // 표 모드인 경우 컨테이너 내부에 메시지 삽입
            html = `<div id="boss-list-table" class="table-view-container">${noBossMsg}</div>`;
        }
    }

    DOM.bossListCardsContainer.innerHTML = html;
}
// --- Version Update Modal Rendering (v2.6) ---
export function renderUpdateModal(DOM, noticeData) {
    if (!DOM.versionUpdateModal || !noticeData) return;

    const version = window.APP_VERSION || "v2.16.2";
    DOM.versionModalTitle.textContent = `${version} 업데이트 안내`;

    // 개발자 한마디
    DOM.devMessageContent.textContent = noticeData.developerMessage || "";

    // 업데이트 요약 목록
    const summaryItems = noticeData.summaryItems || [];

    DOM.updateSummaryList.innerHTML = summaryItems
        .map(item => `<li>${item}</li>`)
        .join("");

    DOM.versionUpdateModal.style.display = 'flex';
}
