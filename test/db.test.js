import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

        it('should log parse failures and keep the empty-array fallback', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            localStorage.setItem(DB.KEYS.GAMES, '{not-json');

            expect(DB.getGames()).toEqual([]);
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[DB] localStorage 파싱 실패'),
                expect.objectContaining({ key: DB.KEYS.GAMES }),
                expect.any(SyntaxError)
            );

            errorSpy.mockRestore();
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

    // issue-041: 여러 행을 쓸 때 카운터는 한 번 읽고 한 번만 저장한다. ID 값과 순서는 행마다 nextId()를 부를 때와 같다.
    describe('Bulk ID allocation (issue-041)', () => {
        const counterWrites = (spy) => spy.mock.calls.filter(([key]) => key === DB.KEYS.UID_COUNTER).length;
        const storedCounter = () => JSON.parse(localStorage.getItem(DB.KEYS.UID_COUNTER));
        const rows = (count, bossId) => Array.from({ length: count }, (_, i) => ({
            bossId,
            scheduledDate: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString()
        }));

        let b1;
        beforeEach(() => {
            DB.upsertGame({ id: 'g1', name: 'G1', type: 'custom' });
            b1 = DB.upsertBoss('g1', 'B1', { interval: 60 }); // 카운터 1 사용
            localStorage.setItem(DB.KEYS.UID_COUNTER, '10');
        });

        // 단언이 실패해도 spy가 다음 테스트로 새지 않게 한다.
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('replaceSchedulesByGameId should keep given ids and allocate the rest in array order', () => {
            const prepared = DB.replaceSchedulesByGameId('g1', [
                { bossId: b1.id, scheduledDate: '2026-01-01T10:00:00Z' },
                { id: 3, bossId: b1.id, scheduledDate: '2026-01-01T11:00:00Z' },
                // 비어 있는 id(0, '', null)는 없는 것으로 보고 새로 할당한다.
                { id: 0, bossId: b1.id, scheduledDate: '2026-01-01T12:00:00Z' },
                { id: '', bossId: b1.id, scheduledDate: '2026-01-01T13:00:00Z' },
                { id: null, bossId: b1.id, scheduledDate: '2026-01-01T14:00:00Z' }
            ]);

            expect(prepared.map(s => s.id)).toEqual([11, 3, 12, 13, 14]);
            expect(DB.getSchedulesByGameId('g1').map(s => s.id)).toEqual([11, 3, 12, 13, 14]);
            expect(storedCounter()).toBe(14);
            expect(DB.nextId()).toBe(15);
        });

        it('addSchedulesBulk should ignore a given id and allocate a new one', () => {
            const added = DB.addSchedulesBulk([
                { id: 3, bossId: b1.id, scheduledDate: '2026-01-01T10:00:00Z' }
            ]);

            expect(added.map(s => s.id)).toEqual([11]);
            expect(storedCounter()).toBe(11);
        });

        it('should write the counter before the schedules', () => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
            const writtenKeys = () => setItemSpy.mock.calls.map(([key]) => key);

            DB.replaceSchedulesByGameId('g1', rows(3, b1.id));
            expect(writtenKeys()).toEqual([DB.KEYS.UID_COUNTER, DB.KEYS.SCHEDULES]);

            setItemSpy.mockClear();
            DB.addSchedulesBulk(rows(3, b1.id));
            expect(writtenKeys()).toEqual([DB.KEYS.UID_COUNTER, DB.KEYS.SCHEDULES]);
        });

        // 기준은 손대지 않은 nextId()다. 같은 카운터 값에서 n번 부른 결과와, 일괄 쓰기가 내준 ID·남긴 카운터가 같아야 한다.
        // 뒤쪽 값들은 앱이 스스로 만들지 않는 손상된 카운터다(개발자도구 등으로 직접 고친 경우).
        describe.each([
            '5', '"5"', '0', 'null', '-3', '2.5', '""', 'true', '[5]', '9007199254740992',
            '{bad', '"abc"', '{}', '[1,2]', '1e400', '-1e400', '"Infinity"'
        ])('with the stored counter %s', (raw) => {
            it.each([1, 3])('should hand out the same ids as %i nextId() calls', (count) => {
                vi.spyOn(console, 'error').mockImplementation(() => {});
                const setRawCounter = () => localStorage.setItem(DB.KEYS.UID_COUNTER, raw);
                const rawCounter = () => localStorage.getItem(DB.KEYS.UID_COUNTER);

                setRawCounter();
                const expectedIds = Array.from({ length: count }, () => DB.nextId());
                const expectedCounter = rawCounter();

                setRawCounter();
                const replaced = DB.replaceSchedulesByGameId('g1', rows(count, b1.id));
                expect(replaced.map(s => s.id)).toEqual(expectedIds);
                expect(rawCounter()).toBe(expectedCounter);

                setRawCounter();
                const added = DB.addSchedulesBulk(rows(count, b1.id));
                expect(added.map(s => s.id)).toEqual(expectedIds);
                expect(rawCounter()).toBe(expectedCounter);
            });
        });

        it('replaceSchedulesByGameId should not write the counter when no id is allocated', () => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

            DB.replaceSchedulesByGameId('g1', []);
            DB.replaceSchedulesByGameId('g1', [
                { id: 7, bossId: b1.id, scheduledDate: '2026-01-01T10:00:00Z' }
            ]);

            expect(counterWrites(setItemSpy)).toBe(0);
            expect(storedCounter()).toBe(10);
        });

        it('replaceSchedulesByGameId should write the counter once for many rows', () => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

            const prepared = DB.replaceSchedulesByGameId('g1', rows(50, b1.id));

            expect(counterWrites(setItemSpy)).toBe(1);
            expect(new Set(prepared.map(s => s.id)).size).toBe(50);
            expect(prepared[49].id).toBe(60);
            expect(storedCounter()).toBe(60);
        });

        it('addSchedulesBulk should allocate ids in array order and write the counter once', () => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

            const added = DB.addSchedulesBulk(rows(50, b1.id));

            expect(added.map(s => s.id)).toEqual(Array.from({ length: 50 }, (_, i) => 11 + i));
            expect(counterWrites(setItemSpy)).toBe(1);
            expect(storedCounter()).toBe(60);
            expect(DB.getSchedules()).toHaveLength(50);
        });

        it('addSchedulesBulk should not write the counter for an empty list', () => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

            expect(DB.addSchedulesBulk([])).toEqual([]);

            expect(counterWrites(setItemSpy)).toBe(0);
        });

        it('should keep the counter ahead of handed-out ids when the schedules write fails', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            const realSetItem = Storage.prototype.setItem;
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
                if (key === DB.KEYS.SCHEDULES) {
                    throw new DOMException('quota', 'QuotaExceededError');
                }
                return realSetItem.call(this, key, value);
            });

            const replaced = DB.replaceSchedulesByGameId('g1', rows(5, b1.id));
            const added = DB.addSchedulesBulk(rows(5, b1.id));
            setItemSpy.mockRestore();

            const handedOut = [...replaced, ...added].map(s => s.id);
            expect(new Set(handedOut).size).toBe(10);
            expect(storedCounter()).toBe(Math.max(...handedOut));
            expect(handedOut).not.toContain(DB.nextId());
            expect(DB.getSchedules()).toEqual([]);
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
