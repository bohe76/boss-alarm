import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { getIsAlarmRunning } from './alarm-scheduler.js'; // Import getIsAlarmRunning
import { log, getLogs } from './logger.js'; // Import log and getLogs
import { loadMarkdownContent } from './api-service.js'; // Import loadMarkdownContent

// Helper for time validation
const isValidTime = (time) => /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(time);

// Helper function to format time difference
function formatTimeDifference(ms) {
    if (ms <= 0 || ms === Infinity) return '(00:00:00)'; // Handle Infinity for no next boss
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor((totalSeconds % 86400) / 3600); // Ensure hours don't exceed 23
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, '0');
    return `(${pad(hours)}:${pad(minutes)}:${pad(seconds)})`;
}

// --- Dashboard Rendering Functions ---
export function updateNextBossDisplay(DOM) {
    const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo();
    if (nextBoss) {
        const remainingTimeString = formatTimeDifference(minTimeDiff);
        DOM.nextBossDisplay.innerHTML = `<span class="next-boss-label">다음 보스</span><br><span class="boss-details-highlight">${nextBoss.time} ${nextBoss.name} <span class="remaining-time">${remainingTimeString}</span></span>`;
    } else {
        DOM.nextBossDisplay.textContent = '다음 보스 없음';
    }
}

export function renderUpcomingBossList(DOM) {
    const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo();
    const upcomingBosses = BossDataManager.getUpcomingBosses(10); // Get next 10 bosses
    let html = '<ul>';
    if (upcomingBosses.length > 0) {
        upcomingBosses.forEach(boss => {
            const timeDiff = boss.timestamp - Date.now();
            const remaining = formatTimeDifference(timeDiff);
            html += `<li>${boss.time} ${boss.name} ${remaining}</li>`;
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
            html += `<li>${logEntry}</li>`;
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
    renderRecentAlarmLog(DOM);
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
        editButton.className = 'edit-fixed-alarm-button';
        editButton.dataset.id = alarm.id;
        actionButtonsDiv.appendChild(editButton);

        // Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '삭제';
        deleteButton.className = 'delete-fixed-alarm-button';
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
            <button id="addFixedAlarmButton">추가</button>
        </div>
    `;
    DOM.fixedAlarmListDiv.appendChild(addAlarmSection);

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

// --- Version Info Screen Rendering Functions ---
export async function renderVersionInfo(DOM) {
    const versionHistoryContent = await loadMarkdownContent('docs/version_history.txt');
    if (DOM.versionHistoryContent) {
        DOM.versionHistoryContent.innerHTML = `<pre class="doc-content-pre">${versionHistoryContent}</pre>`;
    }
}