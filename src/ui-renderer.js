// src/ui-renderer.js

import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { initDomElements } from './dom-elements.js'; // Import DOM initializer

const DOM = initDomElements(); // Initialize DOM elements once

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

// --- 5.1. 보스 목록 텍스트 영역 업데이트 함수 ---
// bossSchedule 배열의 내용을 기반으로 텍스트 영역을 업데이트합니다.
export function updateBossListTextarea() { // Function signature remains unchanged
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

    // 다음 보스 표시 업데이트
    const { nextBoss, minTimeDiff } = BossDataManager.getNextBossInfo(); // Retrieve from BossDataManager
    if (nextBoss) {
        const remainingTimeString = formatTimeDifference(minTimeDiff);
        DOM.nextBossDisplay.innerHTML = `다음 보스: ${nextBoss.time} ${nextBoss.name} <span class="remaining-time">${remainingTimeString}</span>`;
    } else {
        DOM.nextBossDisplay.textContent = '다음 보스 없음';
    }
}


// --- 5.2. 고정 알림 목록 렌더링 함수 ---
export function renderFixedAlarms(targetDiv) { // Removed DOM parameter
    targetDiv.innerHTML = ''; // 기존 목록 초기화

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
            updateFixedAlarmVisuals(); // Removed DOM parameter
        });
        const sliderSpan = document.createElement('span');
        sliderSpan.className = 'slider round';

        switchLabel.appendChild(switchInput);
        switchLabel.appendChild(sliderSpan);
        itemDiv.appendChild(switchLabel);

        targetDiv.appendChild(itemDiv);
    });
    updateFixedAlarmVisuals(); // Removed DOM parameter // 초기 비주얼 업데이트
}

// --- 5.3. 고정 알림 비주얼 업데이트 함수 (faded 효과) ---
export function updateFixedAlarmVisuals() { // Removed DOM parameter
    const fixedAlarmListDivElement = DOM.fixedAlarmListDiv; // Re-get the element
    if (!fixedAlarmListDivElement) return; // Guard against null if element not found

    const fixedAlarmItems = fixedAlarmListDivElement.querySelectorAll('.fixed-alarm-item');
    if (!LocalStorageManager.getFixedAlarmStates().global) {
        fixedAlarmItems.forEach(item => item.classList.add('faded'));
    } else {
        fixedAlarmItems.forEach(item => item.classList.remove('faded'));
    }
}
