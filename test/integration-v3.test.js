import { describe, it, expect, beforeEach } from 'vitest';
import { DB } from '../src/db.js';

describe('v3 Integration', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should support full game → boss → schedule lifecycle', () => {
        // Create game
        DB.upsertGame({ id: 'test-game', name: 'Test', type: 'custom' });

        // Add bosses
        const b1 = DB.upsertBoss('test-game', 'Boss1', { interval: 60, isInvasion: false });
        const b2 = DB.upsertBoss('test-game', 'Boss2', { interval: 120, isInvasion: false });

        // Add schedules
        const s1 = DB.addSchedule({ bossId: b1.id, scheduledDate: '2026-03-19T12:00:00Z' });
        const s2 = DB.addSchedule({ bossId: b2.id, scheduledDate: '2026-03-19T14:00:00Z' });

        // Query
        expect(DB.getSchedulesByGameId('test-game')).toHaveLength(2);

        // Update alert state
        DB.updateSchedule(s1.id, { alerted_5min: true });
        expect(DB.getSchedule(s1.id).alerted_5min).toBe(true);

        // Delete schedule
        DB.deleteSchedule(s2.id);
        expect(DB.getSchedulesByGameId('test-game')).toHaveLength(1);

        // Delete game cascades
        DB.deleteGame('test-game');
        expect(DB.getBossesByGameId('test-game')).toEqual([]);
        expect(DB.getSchedulesByGameId('test-game')).toEqual([]);
    });

    it('should support FK integrity between bosses and schedules', () => {
        DB.upsertGame({ id: 'g1', name: 'G1', type: 'preset' });
        const boss = DB.upsertBoss('g1', 'B1', { interval: 60 });
        DB.addSchedule({ bossId: boss.id, scheduledDate: '2026-03-19T12:00:00Z' });

        // Deleting boss should cascade to schedules
        DB.deleteBoss(boss.id);
        expect(DB.getSchedulesByBossId(boss.id)).toEqual([]);
    });

    it('should support replaceSchedulesByGameId', () => {
        DB.upsertGame({ id: 'g1', name: 'G1', type: 'preset' });
        const b1 = DB.upsertBoss('g1', 'B1', { interval: 60 });

        // Add initial schedules
        DB.addSchedule({ bossId: b1.id, scheduledDate: '2026-03-19T12:00:00Z' });
        DB.addSchedule({ bossId: b1.id, scheduledDate: '2026-03-19T14:00:00Z' });
        expect(DB.getSchedulesByGameId('g1')).toHaveLength(2);

        // Replace all
        const replaced = DB.replaceSchedulesByGameId('g1', [
            { bossId: b1.id, scheduledDate: '2026-03-19T16:00:00Z' },
            { bossId: b1.id, scheduledDate: '2026-03-19T18:00:00Z' },
            { bossId: b1.id, scheduledDate: '2026-03-19T20:00:00Z' }
        ]);

        expect(DB.getSchedulesByGameId('g1')).toHaveLength(3);
        expect(replaced).toHaveLength(3);
    });

    it('should support settings round-trip', () => {
        DB.setSetting('lastSelectedGame', 'odin-main');
        DB.setSetting('fixedAlarms', [{ id: 'f1', name: 'Test', time: '12:00', enabled: true, days: [1,2,3] }]);

        expect(DB.getSetting('lastSelectedGame')).toBe('odin-main');
        expect(DB.getSetting('fixedAlarms')[0].name).toBe('Test');

        // Export and reimport
        const data = DB.exportAll();
        DB.clear();
        DB.importAll(data);

        expect(DB.getSetting('lastSelectedGame')).toBe('odin-main');
    });
});
