import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BossDataManager, LocalStorageManager } from '../src/data-managers.js';
import { getBossNamesForGame } from '../src/boss-scheduler-data.js';
import { renderBossInputs, renderFixedAlarms, renderTimetableList } from '../src/ui-renderer.js';
import { getLogs, initLogger, log } from '../src/logger.js';

vi.mock('../src/data-managers.js', () => ({
    BOSS_THRESHOLDS: {
        IMMINENT: 5 * 60 * 1000,
        WARNING: 10 * 60 * 1000,
        MEDIUM: 60 * 60 * 1000
    },
    BossDataManager: {
        getBossSchedule: vi.fn(),
        getDraftSchedule: vi.fn(),
        getBossInterval: vi.fn(),
        getNextBossInfo: vi.fn()
    },
    LocalStorageManager: {
        get: vi.fn(),
        getFixedAlarms: vi.fn(),
        getMuteState: vi.fn(),
        getVolume: vi.fn()
    }
}));

vi.mock('../src/boss-scheduler-data.js', () => ({
    getGameNames: vi.fn(() => [{ id: 'custom', name: 'custom', isCustom: true }]),
    getBossNamesForGame: vi.fn()
}));

vi.mock('../src/alarm-scheduler.js', () => ({
    getIsAlarmRunning: vi.fn(() => false)
}));

vi.mock('../src/pip-manager.js', () => ({
    isPipWindowOpen: vi.fn(() => false),
    updatePipContent: vi.fn()
}));

describe('HTML safety boundaries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        BossDataManager.getBossInterval.mockReturnValue(0);
        BossDataManager.getBossSchedule.mockReturnValue([]);
        BossDataManager.getDraftSchedule.mockReturnValue([]);
        LocalStorageManager.get.mockReturnValue(null);
        LocalStorageManager.getFixedAlarms.mockReturnValue([]);
    });

    it('renders scheduler boss names and memos as text, not markup', () => {
        const bossName = '<img src=x onerror=alert(1)>';
        const memo = 'memo "><svg onload=alert(1)>';
        const scheduledDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        getBossNamesForGame.mockReturnValue([bossName]);
        const schedule = [{
            id: 'boss-1"><img src=x>',
            type: 'boss',
            name: bossName,
            time: '12:00',
            timeFormat: 'hm',
            scheduledDate,
            memo,
            interval: 0
        }];

        const DOM = {
            bossSchedulerScreen: document.createElement('section'),
            bossInputsContainer: document.createElement('div')
        };
        DOM.bossSchedulerScreen.innerHTML = '<div class="interval-header"></div>';

        renderBossInputs(DOM, 'custom', {}, {}, schedule);

        expect(DOM.bossInputsContainer.querySelector('img')).toBeNull();
        expect(DOM.bossInputsContainer.querySelector('svg')).toBeNull();
        expect(DOM.bossInputsContainer.querySelector('.boss-name').textContent).toBe(bossName);
        expect(DOM.bossInputsContainer.querySelector('.memo-input').value).toBe(memo);
        expect(DOM.bossInputsContainer.querySelector('.remaining-time-input').dataset.bossName).toBe(bossName);
    });

    it('renders timetable names and memos as text, not markup', () => {
        const bossName = '<img src=x onerror=alert(1)>';
        const memo = '<script>alert(1)</script>';
        BossDataManager.getBossSchedule.mockReturnValue([{
            type: 'boss',
            name: bossName,
            time: '12:00:00',
            timeFormat: 'hms',
            scheduledDate: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            memo
        }]);

        const DOM = { bossListCardsContainer: document.createElement('div') };
        renderTimetableList(DOM, { displayMode: '표', dateRange: 'all' });

        expect(DOM.bossListCardsContainer.querySelector('img')).toBeNull();
        expect(DOM.bossListCardsContainer.querySelector('script')).toBeNull();
        expect(DOM.bossListCardsContainer.textContent).toContain(bossName);
        expect(DOM.bossListCardsContainer.textContent).toContain(memo);
    });

    it('renders fixed alarm names as text, not markup', () => {
        const alarmName = '<img src=x onerror=alert(1)>';
        LocalStorageManager.getFixedAlarms.mockReturnValue([{
            id: 'fixed-1"><img src=x>',
            name: alarmName,
            time: '12:00',
            enabled: true,
            days: [0, 1, 2, 3, 4, 5, 6]
        }]);

        const DOM = { fixedAlarmListDiv: document.createElement('div') };
        renderFixedAlarms(DOM);

        expect(DOM.fixedAlarmListDiv.querySelector('img')).toBeNull();
        expect(DOM.fixedAlarmListDiv.textContent).toContain(alarmName);
    });

    it('stores and renders log messages as text, not markup', () => {
        const container = document.createElement('div');
        const message = '<img src=x onerror=alert(1)>';
        initLogger(container);

        log(message, true);

        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toContain(message);
        expect(getLogs().at(-1).html).toContain('&lt;img');
    });
});
