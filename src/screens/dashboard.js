import { renderDashboard, updateMuteButtonVisuals } from '../ui-renderer.js';
import { LocalStorageManager } from '../data-managers.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';

export function initDashboardScreen(DOM) {
    // Mute Toggle Button Listener
    if (DOM.muteToggleButton) {
        DOM.muteToggleButton.addEventListener('click', () => {
            const currentMuteState = LocalStorageManager.getMuteState();
            LocalStorageManager.setMuteState(!currentMuteState);
            updateMuteButtonVisuals(DOM);
            log(`음소거가 ${!currentMuteState ? '설정' : '해제'}되었습니다.`, true);
        });
    }

    // Listen for dashboard refresh events
    EventBus.on('refresh-dashboard', () => { // Removed receivedArg
        renderDashboard(DOM); // Explicitly use the DOM object from initDashboardScreen's scope
    });
}
