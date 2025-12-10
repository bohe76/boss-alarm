import { updateSoundControls, renderRecentAlarmLog } from '../ui-renderer.js';
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
            log(`음소거가 ${!currentMuteState ? '설정' : '해제'}되었습니다.`, true);
            updateSoundControls(DOM); // Update both button and slider visuals
        });
    }

    // Volume Slider Listener
    if (DOM.volumeSlider) {
        // Set initial value from storage
        DOM.volumeSlider.value = LocalStorageManager.getVolume();

        DOM.volumeSlider.addEventListener('input', () => {
            const newVolume = parseFloat(DOM.volumeSlider.value);
            LocalStorageManager.setVolume(newVolume);

            // If user adjusts volume, unmute if it was muted
            if (LocalStorageManager.getMuteState()) {
                LocalStorageManager.setMuteState(false);
                log(`음소거가 해제되었습니다.`, true);
            }
            
            updateSoundControls(DOM); // Update visuals to reflect potential unmute
        });
    }
}

export function getScreen() {
    return {
        id: 'dashboard-screen',
        init: initDashboardScreen
    };
}
