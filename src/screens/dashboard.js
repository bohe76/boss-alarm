import { updateMuteButtonVisuals, renderRecentAlarmLog } from '../ui-renderer.js';
import { LocalStorageManager } from '../data-managers.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js'; // Import EventBus

export function initDashboardScreen(DOM) {
    // Initial render for recent alarm log
    renderRecentAlarmLog(DOM);

    // Listen for log updates
    EventBus.on('log-updated', () => renderRecentAlarmLog(DOM));

    // Mute Toggle Button Listener
    if (DOM.muteToggleButton) {
        DOM.muteToggleButton.addEventListener('click', () => {
            const currentMuteState = LocalStorageManager.getMuteState();
            LocalStorageManager.setMuteState(!currentMuteState);
            updateMuteButtonVisuals(DOM); // This should still be called to update visuals after a click
            log(`음소거가 ${!currentMuteState ? '설정' : '해제'}되었습니다.`, true);
        });
    }

}

export function getScreen() {
    return {
        id: 'dashboard-screen',
        init: initDashboardScreen
    };
}
