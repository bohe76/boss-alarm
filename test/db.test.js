import { describe, it, expect, beforeEach } from 'vitest';
import { DB } from '../src/db.js';

describe('DB', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('nextId', () => {
        it('should auto-increment from 1', () => {
            expect(DB.nextId()).toBe(1);
            expect(DB.nextId()).toBe(2);
            expect(DB.nextId()).toBe(3);
        });

        it('should persist across calls', () => {
            DB.nextId();
            DB.nextId();
            // Simulate reload by reading from localStorage
            const counter = JSON.parse(localStorage.getItem('v3_uid_counter'));
            expect(counter).toBe(2);
        });
    });

    describe('Games CRUD', () => {
        it('should return empty array initially', () => {
            expect(DB.getGames()).toEqual([]);
        });

        it('should upsert and get games', () => {
            DB.upsertGame({ id: 'odin-main', name: '오딘', type: 'preset' });
            expect(DB.getGames()).toHaveLength(1);
            expect(DB.getGame('odin-main')).toEqual({ id: 'odin-main', name: '오딘', type: 'preset' });
        });

        it('should update existing game on upsert', () => {
            DB.upsertGame({ id: 'odin-main', name: '오딘', type: 'preset' });
            DB.upsertGame({ id: 'odin-main', name: '오딘 (수정)', type: 'preset' });
            expect(DB.getGames()).toHaveLength(1);
            expect(DB.getGame('odin-main').name).toBe('오딘 (수정)');
        });

        it('should delete game and cascade to bosses', () => {
            DB.upsertGame({ id: 'g1', name: 'Game1', type: 'custom' });
            DB.upsertBoss('g1', 'Boss1', { interval: 60 });
            DB.deleteGame('g1');
            expect(DB.getGame('g1')).toBeNull();
            expect(DB.getBossesByGameId('g1')).toEqual([]);
        });
    });

    describe('Bosses CRUD', () => {
        it('should add boss with auto-increment id', () => {
            const boss = DB.addBoss({ gameId: 'g1', name: 'B1', interval: 60 });
            expect(boss.id).toBe(1);
            expect(DB.getBoss(1)).toBeTruthy();
        });

        it('should upsert boss (idempotent)', () => {
            DB.upsertBoss('g1', 'B1', { interval: 60 });
            DB.upsertBoss('g1', 'B1', { interval: 120 });
            const bosses = DB.getBossesByGameId('g1');
            expect(bosses).toHaveLength(1);
            expect(bosses[0].interval).toBe(120);
        });

        it('should find boss by gameId and name', () => {
            DB.upsertBoss('g1', 'B1', { interval: 60 });
            expect(DB.findBoss('g1', 'B1')).toBeTruthy();
            expect(DB.findBoss('g1', 'B2')).toBeNull();
        });

        it('should cascade delete schedules when boss deleted', () => {
            const boss = DB.upsertBoss('g1', 'B1', { interval: 60 });
            DB.addSchedule({ bossId: boss.id, scheduledDate: '2026-01-01T12:00:00Z', memo: '' });
            expect(DB.getSchedulesByBossId(boss.id)).toHaveLength(1);
            DB.deleteBoss(boss.id);
            expect(DB.getSchedulesByBossId(boss.id)).toEqual([]);
        });
    });

    describe('Schedules CRUD', () => {
        it('should add schedule with defaults', () => {
            const s = DB.addSchedule({ bossId: 1, scheduledDate: '2026-01-01T12:00:00Z' });
            expect(s.id).toBeGreaterThan(0);
            expect(s.alerted_5min).toBe(false);
            expect(s.alerted_1min).toBe(false);
            expect(s.alerted_0min).toBe(false);
            expect(s.memo).toBe('');
        });

        it('should update schedule', () => {
            const s = DB.addSchedule({ bossId: 1, scheduledDate: '2026-01-01T12:00:00Z' });
            DB.updateSchedule(s.id, { alerted_5min: true });
            expect(DB.getSchedule(s.id).alerted_5min).toBe(true);
        });

        it('should delete schedule', () => {
            const s = DB.addSchedule({ bossId: 1, scheduledDate: '2026-01-01T12:00:00Z' });
            DB.deleteSchedule(s.id);
            expect(DB.getSchedule(s.id)).toBeNull();
        });

        it('should get schedules by gameId', () => {
            DB.upsertGame({ id: 'g1', name: 'G1', type: 'preset' });
            const b1 = DB.upsertBoss('g1', 'B1', { interval: 60 });
            const b2 = DB.upsertBoss('g1', 'B2', { interval: 120 });
            DB.addSchedule({ bossId: b1.id, scheduledDate: '2026-01-01T12:00:00Z' });
            DB.addSchedule({ bossId: b2.id, scheduledDate: '2026-01-01T14:00:00Z' });
            expect(DB.getSchedulesByGameId('g1')).toHaveLength(2);
        });

        it('should replace schedules by gameId', () => {
            DB.upsertGame({ id: 'g1', name: 'G1', type: 'preset' });
            const b1 = DB.upsertBoss('g1', 'B1', { interval: 60 });
            DB.addSchedule({ bossId: b1.id, scheduledDate: '2026-01-01T12:00:00Z' });
            DB.addSchedule({ bossId: b1.id, scheduledDate: '2026-01-01T14:00:00Z' });
            expect(DB.getSchedulesByGameId('g1')).toHaveLength(2);

            DB.replaceSchedulesByGameId('g1', [
                { bossId: b1.id, scheduledDate: '2026-01-01T16:00:00Z' }
            ]);
            expect(DB.getSchedulesByGameId('g1')).toHaveLength(1);
        });
    });

    describe('Settings CRUD', () => {
        it('should get/set settings', () => {
            DB.setSetting('theme', 'dark');
            expect(DB.getSetting('theme')).toBe('dark');
        });

        it('should return null for missing setting', () => {
            expect(DB.getSetting('nonexistent')).toBeNull();
        });

        it('should delete setting', () => {
            DB.setSetting('key', 'value');
            DB.deleteSetting('key');
            expect(DB.getSetting('key')).toBeNull();
        });
    });

    describe('Bulk Operations', () => {
        it('should export and import all data', () => {
            DB.upsertGame({ id: 'g1', name: 'G1', type: 'preset' });
            DB.upsertBoss('g1', 'B1', { interval: 60 });
            DB.setSetting('key', 'value');

            const exported = DB.exportAll();
            DB.clear();
            expect(DB.getGames()).toEqual([]);

            DB.importAll(exported);
            expect(DB.getGames()).toHaveLength(1);
            expect(DB.getSetting('key')).toBe('value');
        });
    });

    describe('Subscriber Pattern', () => {
        it('should notify structural subscribers', () => {
            let called = false;
            DB.subscribe(() => { called = true; }, 'structural');
            DB.notifyStructural();
            expect(called).toBe(true);
        });

        it('should notify UI subscribers on structural notify', () => {
            let uiCalled = false;
            DB.subscribe(() => { uiCalled = true; }, 'ui');
            DB.notifyStructural();
            expect(uiCalled).toBe(true);
        });
    });
});
