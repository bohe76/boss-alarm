// src/ui-renderer.js

import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { getIsAlarmRunning } from './alarm-scheduler.js'; // Import getIsAlarmRunning
import { log, getLogs } from './logger.js'; // Import log and getLogs
import { bossPresets } from './default-boss-list.js'; // Import bossPresets

// Helper function to format time difference
function formatTimeDifference(ms) {
    if (ms <= 0 || ms === Infinity) return '(00:00:00)'; // Handle Infinity for no next boss
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
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
        DOM.nextBossDisplay.innerHTML = `다음 보스: ${nextBoss.time} ${nextBoss.name} <span class="remaining-time">${remainingTimeString}</span>`;
    } else {
        DOM.nextBossDisplay.textContent = '다음 보스 없음';
    }
}

export function renderUpcomingBossList(DOM) {
    const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo();
    const upcomingBosses = BossDataManager.getUpcomingBosses(3); // Get next 3 bosses
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
    const isAlarmRunning = getIsAlarmRunning(); // Corrected call
    let statusText = isAlarmRunning ? '알림 실행 중' : '알림 중지됨';
    let nextAlarmTime = 'N/A';

    if (isAlarmRunning) {
        const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo();
        if (nextBoss && minTimeDiff > 0) {
            const nextAlarmTimestamp = nextBoss.timestamp;
            const fiveMinBefore = nextAlarmTimestamp - (5 * 60 * 1000);
            const oneMinBefore = nextAlarmTimestamp - (1 * 60 * 1000);

            const now = Date.now();
            if (now < fiveMinBefore) {
                nextAlarmTime = `5분 전 알림: ${new Date(fiveMinBefore).toLocaleTimeString()}`;
            } else if (now < oneMinBefore) {
                nextAlarmTime = `1분 전 알림: ${new Date(oneMinBefore).toLocaleTimeString()}`;
            } else if (now < nextAlarmTimestamp) {
                nextAlarmTime = `보스 출현 알림: ${new Date(nextAlarmTimestamp).toLocaleTimeString()}`;
            } else {
                nextAlarmTime = '곧 다음 알림 예정';
            }
        }
    }

    if (DOM.alarmStatusText) {
        DOM.alarmStatusText.textContent = statusText;
    }
    if (DOM.nextAlarmTimeDisplay) {
        DOM.nextAlarmTimeDisplay.textContent = nextAlarmTime;
    }
}

export function renderRecentAlarmLog(DOM) {
    const logs = getLogs(); // Corrected call
    let html = '<ul>';
    if (logs.length > 0) {
        // Display last 3 logs
        const recentLogs = logs.slice(-3).reverse(); // Get last 3 and reverse to show newest first
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
    renderAlarmStatusSummary(DOM);
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

// --- Boss Management Screen Rendering Functions ---
export function renderBossPresets(DOM) {
    if (!DOM.presetBossListSelect) return;

    DOM.presetBossListSelect.innerHTML = ''; // Clear existing options

    bossPresets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index; // Use index as value to easily retrieve the preset
        option.textContent = preset.name;
        DOM.presetBossListSelect.appendChild(option);
    });
}


// --- 5.2. 고정 알림 목록 렌더링 함수 ---
export function renderFixedAlarms(DOM) { // Added DOM parameter back
    DOM.fixedAlarmListDiv.innerHTML = ''; // 기존 목록 초기화

    BossDataManager.getFixedBossSchedule().forEach((boss, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'fixed-alarm-item';
        itemDiv.id = `fixed-alarm-item-${index}`; // 개별 항목 ID

        const bossInfoSpan = document.createElement('span');
        bossInfoSpan.textContent = `${boss.time} ${boss.name}`;
        itemDiv.appendChild(bossInfoSpan);

        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        const switchInput = document.createElement('input');
        switchInput.type = 'checkbox';
        switchInput.id = `fixedAlarmToggle-${index}`;
        switchInput.checked = LocalStorageManager.getFixedAlarmStates().individual[index]; // 로컬 스토리지 상태 반영
        switchInput.addEventListener('change', (event) => {
            const currentStates = LocalStorageManager.getFixedAlarmStates(); // Use LocalStorageManager
            currentStates.individual[index] = event.target.checked;
            LocalStorageManager.setFixedAlarmStates(currentStates); // Use LocalStorageManager
            updateFixedAlarmVisuals(DOM); // Added DOM parameter back
        });
        const sliderSpan = document.createElement('span');
        sliderSpan.className = 'slider round';

        switchLabel.appendChild(switchInput);
        switchLabel.appendChild(sliderSpan);
        itemDiv.appendChild(switchLabel);

        DOM.fixedAlarmListDiv.appendChild(itemDiv);
    });
    updateFixedAlarmVisuals(DOM); // Added DOM parameter back // 초기 비주얼 업데이트
}

// --- 5.3. 고정 알림 비주얼 업데이트 함수 (faded 효과) ---
export function updateFixedAlarmVisuals(DOM) { // Removed DOM parameter
    const fixedAlarmListDivElement = DOM.fixedAlarmListDiv; // Re-get the element
    if (!fixedAlarmListDivElement) return; // Guard against null if element not found

    const fixedAlarmItems = fixedAlarmListDivElement.querySelectorAll('.fixed-alarm-item');
    if (!LocalStorageManager.getFixedAlarmStates().global) {
        fixedAlarmItems.forEach(item => item.classList.add('faded'));
    } else {
        fixedAlarmItems.forEach(item => item.classList.remove('faded'));
    }
}

// --- Version Info Screen Rendering Functions ---
export function renderVersionInfo(DOM) {
    const footer = document.querySelector('footer p');
    if (footer) {
        const versionMatch = footer.textContent.match(/v(\d+\.\d+\.\d+)/);
        if (versionMatch && DOM.appVersion) {
            DOM.appVersion.textContent = `현재 버전: ${versionMatch[0]}`;
        }
    }
}
