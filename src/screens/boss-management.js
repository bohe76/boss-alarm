// src/screens/boss-management.js
import { parseBossList, getSortedBossListText } from '../boss-parser.js';
import { log } from '../logger.js';
import { renderDashboard } from '../ui-renderer.js';

export function initBossManagementScreen(DOM) {
    // "시간순 정렬" 버튼 이벤트 리스너
    if (DOM.sortBossListButton) {
        DOM.sortBossListButton.addEventListener('click', () => {
            const currentText = DOM.bossListInput.value;
            const sortedText = getSortedBossListText(currentText);
            DOM.bossListInput.value = sortedText;
            
            // After sorting and updating the textarea, re-parse it to update the application state
            parseBossList(DOM.bossListInput);
            
            log("보스 목록을 시간순으로 정렬했습니다.", true);
        });
    }

    // Update boss schedule when textarea input changes
    DOM.bossListInput.addEventListener('input', () => {
        parseBossList(DOM.bossListInput);
        renderDashboard(DOM); // Re-render dashboard to reflect changes
    });
}