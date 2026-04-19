import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DB } from '../src/db.js';
import { BossDataManager, LocalStorageManager } from '../src/data-managers.js';

describe('BossDataManager Sorting Logic', () => {
    const GAME_ID = 'test-sorting';

    beforeEach(() => {
        vi.spyOn(LocalStorageManager, 'getFixedAlarms').mockReturnValue([]);

        vi.useFakeTimers();
        const date = new Date(2023, 11, 3, 22, 0, 0); // Monday, December 3rd, 10 PM Local
        vi.setSystemTime(date);

        // v3: DB를 통해 게임/보스/스케줄 설정
        DB.upsertGame({ id: GAME_ID, name: 'Test Game', type: 'preset' });
        DB.setSetting('lastSelectedGame', GAME_ID);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        DB.deleteGame(GAME_ID);
    });

    it('should sort bosses correctly considering the date (today vs tomorrow)', () => {
        const todayBossDate = new Date(2023, 11, 3, 23, 0, 0);
        const tomorrowBossDate = new Date(2023, 11, 4, 1, 0, 0);

        const bossA = DB.upsertBoss(GAME_ID, 'Today Boss', { interval: 0 });
        const bossB = DB.upsertBoss(GAME_ID, 'Tomorrow Boss', { interval: 0 });

        DB.addSchedule({ bossId: bossA.id, scheduledDate: todayBossDate.toISOString(), memo: '' });
        DB.addSchedule({ bossId: bossB.id, scheduledDate: tomorrowBossDate.toISOString(), memo: '' });

        const upcoming = BossDataManager.getUpcomingBosses(5);

        expect(upcoming.length).toBe(2);
        expect(upcoming[0].name).toBe('Today Boss');
        expect(upcoming[1].name).toBe('Tomorrow Boss');

        expect(upcoming[0].timestamp).toBe(todayBossDate.getTime());
        expect(upcoming[1].timestamp).toBe(tomorrowBossDate.getTime());
    });

    it('should handle fixed alarms correctly alongside dynamic bosses', () => {
        const dynamicBossDate = new Date(2023, 11, 3, 23, 0, 0);

        const boss = DB.upsertBoss(GAME_ID, 'Dynamic Boss', { interval: 0 });
        DB.addSchedule({ bossId: boss.id, scheduledDate: dynamicBossDate.toISOString(), memo: '' });

        vi.spyOn(LocalStorageManager, 'getFixedAlarms').mockReturnValue([
            { id: 'fixed-1', name: 'Fixed Boss', time: '22:30', enabled: true, days: [0, 1, 2, 3, 4, 5, 6] }
        ]);

        const upcoming = BossDataManager.getUpcomingBosses(5);

        expect(upcoming.length).toBe(2);
        expect(upcoming[0].name).toBe('Fixed Boss');
        expect(upcoming[0].time).toBe('22:30');

        expect(upcoming[1].name).toBe('Dynamic Boss');
        expect(upcoming[1].timestamp).toBe(dynamicBossDate.getTime());
    });

    it('should correctly handle "tomorrow" logic for fixed alarms', () => {
        vi.spyOn(LocalStorageManager, 'getFixedAlarms').mockReturnValue([
            { id: 'fixed-passed', name: 'Passed Boss', time: '21:00', enabled: true, days: [0, 1, 2, 3, 4, 5, 6] },
            { id: 'fixed-future', name: 'Future Boss', time: '23:00', enabled: true, days: [0, 1, 2, 3, 4, 5, 6] }
        ]);

        const upcoming = BossDataManager.getUpcomingBosses(5);

        expect(upcoming.length).toBe(2);

        expect(upcoming[0].name).toBe('Future Boss');
        expect(upcoming[1].name).toBe('Passed Boss');

        const todayFuture = new Date(2023, 11, 3, 23, 0, 0).getTime();
        const tomorrowPassed = new Date(2023, 11, 4, 21, 0, 0).getTime();

        expect(upcoming[0].timestamp).toBe(todayFuture);
        expect(upcoming[1].timestamp).toBe(tomorrowPassed);
    });
});