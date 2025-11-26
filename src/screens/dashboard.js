import { updateMuteButtonVisuals } from '../ui-renderer.js';
import { LocalStorageManager } from '../data-managers.js';
import { log } from '../logger.js';

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

}
