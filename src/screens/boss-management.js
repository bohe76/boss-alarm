// src/screens/boss-management.js
import { parseBossList } from '../boss-parser.js';
import { updateBossListTextarea } from '../ui-renderer.js';
import { BossDataManager } from '../data-managers.js'; // Import BossDataManager
import { log } from '../logger.js';

export function initBossManagementScreen(DOM) {
    // "시간순 정렬" 버튼 -> "보스 설정 저장" 버튼으로 기능 변경
    if (DOM.sortBossListButton) {
        DOM.sortBossListButton.textContent = "보스 설정 저장"; // Change button text
        
        DOM.sortBossListButton.addEventListener('click', () => {
            // Parse the current input
            const result = parseBossList(DOM.bossListInput);
            
            if (!result.success) {
                alert("보스 설정 값에 오류가 있어 저장할 수 없습니다.\n\n" + result.errors.join('\n'));
                return; // Stop saving
            }

            // Save valid data
            BossDataManager.setBossSchedule(result.mergedSchedule);
            
            // Update UI
            updateBossListTextarea(DOM);
            
            window.isBossListDirty = false; // Reset dirty flag
            alert("저장되었습니다.");
            log("보스 설정이 저장되었습니다.", true);
        });
    }

    // Update dirty state when textarea input changes
    DOM.bossListInput.addEventListener('input', () => {
        window.isBossListDirty = true;
    });
}

export function getScreen() {
    return {
        id: 'boss-management-screen',
        init: initBossManagementScreen
    };
}