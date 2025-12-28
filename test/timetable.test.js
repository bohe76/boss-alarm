import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTimetableScreen } from '../src/screens/timetable.js';
import { LocalStorageManager } from '../src/data-managers.js';
import { updateTimetableUI } from '../src/ui-renderer.js';

// Mock dependencies
vi.mock('../src/data-managers.js', () => ({
    LocalStorageManager: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));
vi.mock('../src/ui-renderer.js', () => ({
    updateTimetableUI: vi.fn(),
}));
vi.mock('../src/analytics.js', () => ({
    trackEvent: vi.fn(),
}));
vi.mock('../src/event-bus.js', () => ({
    EventBus: {
        emit: vi.fn(),
    },
}));
vi.mock('../src/alarm-scheduler.js', () => ({
    getIsAlarmRunning: vi.fn(() => false),
}));

describe('Timetable Screen', () => {
    let DOM;

    beforeEach(() => {
        vi.clearAllMocks();

        document.body.innerHTML = `
            <section id="timetable-screen" class="screen">
                <div class="timetable-header">
                    <h2>보스 시간표</h2>
                    <button id="editTimetableButton" class="button primary-button">시간표 수정하기</button>
                </div>
                <div id="bossListCardsContainer"></div>
            </section>
        `;

        DOM = {
            timetableScreen: document.getElementById('timetable-screen'),
            editTimetableButton: document.getElementById('editTimetableButton'),
            bossListCardsContainer: document.getElementById('bossListCardsContainer'),
        };

        // Mock LocalStorageManager
        LocalStorageManager.get.mockImplementation((key) => {
            if (key === 'timetableNextBossFilter') return null;
            if (key === 'bossManagementNextBossFilter') return null;
            return undefined;
        });

        // Mock window.localStorage
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { });
    });

    it('should migrate old filter state and remove obsolete keys during initialization', () => {
        // Old key exists, new key doesn't
        LocalStorageManager.get.mockImplementation((key) => {
            if (key === 'timetableNextBossFilter') return null;
            if (key === 'bossManagementNextBossFilter') return false; // Old was OFF
            return undefined;
        });

        initTimetableScreen(DOM);

        expect(Storage.prototype.removeItem).toHaveBeenCalledWith('bossManagementMode');
        expect(LocalStorageManager.set).toHaveBeenCalledWith('timetableNextBossFilter', false);
        expect(Storage.prototype.removeItem).toHaveBeenCalledWith('bossManagementNextBossFilter');
        expect(updateTimetableUI).toHaveBeenCalledWith(DOM);
    });

    it('should use default true if no old filter state exists', () => {
        initTimetableScreen(DOM);
        expect(LocalStorageManager.set).toHaveBeenCalledWith('timetableNextBossFilter', true);
        expect(updateTimetableUI).toHaveBeenCalledWith(DOM);
    });

    it('should not migrate if new key already exists', () => {
        LocalStorageManager.get.mockImplementation((key) => {
            if (key === 'timetableNextBossFilter') return true;
            return undefined;
        });

        initTimetableScreen(DOM);

        expect(LocalStorageManager.set).not.toHaveBeenCalled();
        expect(updateTimetableUI).toHaveBeenCalledWith(DOM);
    });
});
