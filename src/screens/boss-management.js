// src/screens/boss-management.js
import { parseBossList } from '../boss-parser.js';
import { updateBossListTextarea, updateBossManagementUI } from '../ui-renderer.js'; // updateBossManagementUI 추가
import { BossDataManager, LocalStorageManager } from '../data-managers.js'; // LocalStorageManager 추가
import { log } from '../logger.js';
import { trackEvent } from '../analytics.js'; // Added GA import

// 모드 상수 정의
const VIEW_MODE = 'view';
const EDIT_MODE = 'edit';

export function initBossManagementScreen(DOM) {
    // 초기 모드 설정 (localStorage에서 로드 또는 기본값 'view')
    let currentMode = LocalStorageManager.get('bossManagementMode') || VIEW_MODE;
    let filterNextBoss = LocalStorageManager.get('bossManagementNextBossFilter');
    if (filterNextBoss === null) { // If not set, default to true (ON)
        filterNextBoss = true;
        LocalStorageManager.set('bossManagementNextBossFilter', filterNextBoss);
    }
    DOM.nextBossToggleButton.classList.toggle('active', filterNextBoss); // Set initial state of the button
    updateBossManagementUI(DOM, currentMode); // 초기 UI 업데이트

    // "뷰/편집" 토글 버튼 이벤트 리스너
    if (DOM.viewEditModeToggleButton) {
        DOM.viewEditModeToggleButton.addEventListener('click', () => {
            currentMode = (currentMode === VIEW_MODE) ? EDIT_MODE : VIEW_MODE;
            LocalStorageManager.set('bossManagementMode', currentMode); // 모드 저장
            updateBossManagementUI(DOM, currentMode); // UI 업데이트
            trackEvent('Click Button', { event_category: 'Interaction', event_label: `보스 설정 ${currentMode === VIEW_MODE ? '뷰' : '편집'} 모드 전환` });
        });
    }

    // "다음 보스" 토글 버튼 이벤트 리스너 (뷰 모드일 때만 활성)
    if (DOM.nextBossToggleButton) {
        DOM.nextBossToggleButton.addEventListener('click', () => {
            let filterNextBoss = LocalStorageManager.get('bossManagementNextBossFilter');
            filterNextBoss = !filterNextBoss; // Toggle filter state
            LocalStorageManager.set('bossManagementNextBossFilter', filterNextBoss); // Save filter state
            // Re-render the view mode table with the new filter.
            // This will be called via updateBossManagementUI later.
            // For now, just update the active class on the button.
            DOM.nextBossToggleButton.classList.toggle('active', filterNextBoss);
            updateBossManagementUI(DOM, currentMode); // Update UI based on current mode and new filter state
            trackEvent('Click Button', { event_category: 'Interaction', event_label: `보스 설정 다음 보스 필터 ${filterNextBoss ? '활성화' : '비활성화'}` });
        });
    }

    // "시간순 정렬" 버튼 -> "보스 설정 저장" 버튼으로 기능 변경
    if (DOM.sortBossListButton) {
        DOM.sortBossListButton.textContent = "보스 설정 저장"; // Change button text
        
        DOM.sortBossListButton.addEventListener('click', () => {
            const currentModeOnSave = LocalStorageManager.get('bossManagementMode') || VIEW_MODE;
            if (currentModeOnSave !== EDIT_MODE) {
                // Should not happen if UI is correctly hidden, but good for defensive programming
                console.warn('Attempted to save in view mode. Operation blocked.');
                return;
            }

            // Parse the current input
            const result = parseBossList(DOM.bossListInput);
            
            if (!result.success) {
                alert("보스 설정 값에 오류가 있어 저장할 수 없습니다.\n\n" + result.errors.join('\n'));
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 설정 저장 실패' }); // Track failure
                return; // Stop saving
            }

            // Save valid data
            BossDataManager.setBossSchedule(result.mergedSchedule);
            
            // Update UI
            updateBossListTextarea(DOM);
            
            window.isBossListDirty = false; // Reset dirty flag
            alert("저장되었습니다.");
            log("보스 설정이 저장되었습니다.", true);
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '보스 설정 저장' }); // Track success
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