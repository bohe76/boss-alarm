import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BossDataManager, LocalStorageManager } from '../src/data-managers.js';
import { renderExportCapture, renderTimetableList } from '../src/ui-renderer.js';

vi.mock('../src/data-managers.js', () => ({
    BOSS_THRESHOLDS: {
        IMMINENT: 5 * 60 * 1000,
        WARNING: 10 * 60 * 1000,
        MEDIUM: 60 * 60 * 1000
    },
    BossDataManager: {
        getBossSchedule: vi.fn()
    },
    LocalStorageManager: {
        get: vi.fn(),
        getFixedAlarms: vi.fn(),
        getMuteState: vi.fn(),
        getVolume: vi.fn()
    }
}));

vi.mock('../src/custom-list-manager.js', () => ({
    CustomListManager: {
        getCustomLists: vi.fn(() => [])
    }
}));

vi.mock('../src/alarm-scheduler.js', () => ({
    getIsAlarmRunning: vi.fn(() => false)
}));

vi.mock('../src/logger.js', () => ({
    getLogs: vi.fn(() => []),
    log: vi.fn()
}));

vi.mock('../src/boss-scheduler-data.js', () => ({
    getBossNamesForGame: vi.fn(() => []),
    getGameNames: vi.fn(() => [])
}));

vi.mock('../src/pip-manager.js', () => ({
    isPipWindowOpen: vi.fn(() => false),
    updatePipContent: vi.fn()
}));

function makeBoss(name, scheduledDate, memo = '', extra = {}) {
    return {
        type: 'boss',
        name,
        time: `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`,
        timeFormat: 'hm',
        scheduledDate: scheduledDate.toISOString(),
        memo,
        ...extra
    };
}

describe('timetable and export rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 24, 10, 0, 0));
        BossDataManager.getBossSchedule.mockReturnValue([]);
        LocalStorageManager.getFixedAlarms.mockReturnValue([]);
        LocalStorageManager.get.mockReturnValue(null);
    });

    it('applies the same dateRange, fixed alarm merge, sort, and escaping to timetable and export table views', () => {
        const maliciousName = '<img src=x onerror=alert(1)>';
        const maliciousMemo = '<script>alert(1)</script>';
        BossDataManager.getBossSchedule.mockReturnValue([
            makeBoss('내일보스', new Date(2026, 5, 25, 9, 0, 0)),
            makeBoss(maliciousName, new Date(2026, 5, 24, 12, 0, 0), maliciousMemo)
        ]);
        LocalStorageManager.getFixedAlarms.mockReturnValue([{
            id: 'fixed-1',
            name: '고정알림',
            time: '11:00',
            enabled: true,
            days: [new Date(2026, 5, 24).getDay()]
        }]);

        const timetableDOM = { bossListCardsContainer: document.createElement('div') };
        const exportDOM = { exportCaptureContainer: document.createElement('div') };

        renderTimetableList(timetableDOM, { displayMode: '표', dateRange: 'today' });
        renderExportCapture(exportDOM, { displayMode: '표', dateRange: 'today' });

        for (const container of [timetableDOM.bossListCardsContainer, exportDOM.exportCaptureContainer]) {
            expect(container.querySelector('img')).toBeNull();
            expect(container.querySelector('script')).toBeNull();
            expect(container.textContent).toContain('고정알림');
            expect(container.textContent).toContain(maliciousName);
            expect(container.textContent).toContain(maliciousMemo);
            expect(container.textContent).not.toContain('내일보스');
            expect(container.textContent.indexOf('고정알림')).toBeLessThan(container.textContent.indexOf(maliciousName));
        }
    });

    it('applies nextBossOnly consistently to timetable and export renderers', () => {
        BossDataManager.getBossSchedule.mockReturnValue([
            makeBoss('지난보스', new Date(2026, 5, 24, 9, 0, 0)),
            makeBoss('미래보스', new Date(2026, 5, 24, 11, 0, 0))
        ]);

        const timetableDOM = { bossListCardsContainer: document.createElement('div') };
        const exportDOM = { exportCaptureContainer: document.createElement('div') };

        renderTimetableList(timetableDOM, { displayMode: '표', nextBossOnly: true });
        renderExportCapture(exportDOM, { displayMode: '표', nextBossOnly: true });

        expect(timetableDOM.bossListCardsContainer.textContent).not.toContain('지난보스');
        expect(exportDOM.exportCaptureContainer.textContent).not.toContain('지난보스');
        expect(timetableDOM.bossListCardsContainer.textContent).toContain('미래보스');
        expect(exportDOM.exportCaptureContainer.textContent).toContain('미래보스');
    });

    it('keeps the intended card name-width difference between screen and export layouts', () => {
        const longName = '긴보스이름테스트';
        BossDataManager.getBossSchedule.mockReturnValue([
            makeBoss(longName, new Date(2026, 5, 24, 11, 0, 0))
        ]);

        const timetableDOM = { bossListCardsContainer: document.createElement('div') };
        const exportDOM = { exportCaptureContainer: document.createElement('div') };

        renderTimetableList(timetableDOM, { displayMode: '카드' });
        renderExportCapture(exportDOM, { displayMode: '카드' });

        expect(timetableDOM.bossListCardsContainer.innerHTML).toContain('min-width: 144px');
        expect(exportDOM.exportCaptureContainer.innerHTML).toContain('min-width: 112px');
    });
});
