import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSharedBossDefinitions, importSharedCustomList } from '../src/share-custom-list.js';
import { CustomListManager } from '../src/custom-list-manager.js';
import { DB } from '../src/db.js';

vi.mock('../src/logger.js', () => ({ log: vi.fn() }));
vi.mock('../src/boss-scheduler-data.js', () => ({
    isPresetList: vi.fn(id => id === 'odin-main'),
    getGameNames: vi.fn(() => [{ id: 'odin-main', name: '오딘', isCustom: false }])
}));

const listNames = () => CustomListManager.getCustomLists().map(list => list.name);

describe('share-custom-list', () => {
    beforeEach(() => {
        localStorage.clear();
        CustomListManager.init();
    });

    describe('getSharedBossDefinitions (발신)', () => {
        it('returns null for a preset game', () => {
            expect(getSharedBossDefinitions('odin-main')).toBeNull();
        });

        it('returns null when the game is not a custom list', () => {
            expect(getSharedBossDefinitions('없는 목록')).toBeNull();
        });

        it('returns the whole list in list order, with 0 for bosses that have no DB row yet', () => {
            CustomListManager.addCustomList('내 목록', '보스A\n보스B\n보스C');
            DB.upsertBoss('내 목록', '보스C', { interval: 180, isInvasion: false });
            DB.upsertBoss('내 목록', '보스A', { interval: 120, isInvasion: false });
            DB.upsertBoss('내 목록', '목록에서 지운 보스', { interval: 60, isInvasion: false });

            expect(getSharedBossDefinitions('내 목록')).toEqual([
                { name: '보스A', interval: 120 },
                { name: '보스B', interval: 0 },
                { name: '보스C', interval: 180 }
            ]);
        });
    });

    describe('importSharedCustomList (수신)', () => {
        const shared = [{ name: '보스A', interval: 120 }, { name: '보스B', interval: 0 }];

        it('creates the list and its bosses with intervals on a clean receiver', () => {
            expect(importSharedCustomList('공유 목록', shared)).toBe('공유 목록');
            expect(CustomListManager.getBossNamesForCustomList('공유 목록')).toEqual(['보스A', '보스B']);
            expect(DB.getBossesByGameId('공유 목록').map(b => [b.name, b.interval])).toEqual([['보스A', 120], ['보스B', 0]]);
            expect(DB.getSetting('customBossLists')).toHaveLength(1); // 새로고침 후에도 남도록 저장됨
        });

        it('reuses a same-named list when the boss composition is identical, regardless of order', () => {
            CustomListManager.addCustomList('공유 목록', '보스B\n보스A');
            const existing = DB.upsertBoss('공유 목록', '보스A', { interval: 30, isInvasion: false });

            expect(importSharedCustomList('공유 목록', shared)).toBe('공유 목록');
            expect(listNames()).toEqual(['공유 목록']);
            expect(CustomListManager.getBossNamesForCustomList('공유 목록')).toEqual(['보스B', '보스A']); // 수신자의 순서 유지
            expect(DB.findBoss('공유 목록', '보스A')).toMatchObject({ id: existing.id, interval: 120 });
        });

        it('keeps the receiver interval when the shared interval is 0', () => {
            CustomListManager.addCustomList('공유 목록', '보스A\n보스B');
            DB.upsertBoss('공유 목록', '보스B', { interval: 45, isInvasion: false });

            importSharedCustomList('공유 목록', shared);
            expect(DB.findBoss('공유 목록', '보스B').interval).toBe(45);
        });

        it('creates a differently named list when the composition differs, leaving the existing list untouched', () => {
            CustomListManager.addCustomList('공유 목록', '내 보스1\n내 보스2');
            const mine = DB.upsertBoss('공유 목록', '내 보스1', { interval: 10, isInvasion: false });
            DB.addSchedule({ bossId: mine.id, scheduledDate: '2026-10-02T05:00:00.000Z' });

            expect(importSharedCustomList('공유 목록', shared)).toBe('공유 목록 (2)');
            expect(listNames()).toEqual(['공유 목록', '공유 목록 (2)']);
            expect(CustomListManager.getBossNamesForCustomList('공유 목록')).toEqual(['내 보스1', '내 보스2']);
            expect(DB.getSchedulesByGameId('공유 목록')).toHaveLength(1);
            expect(DB.getBossesByGameId('공유 목록 (2)').map(b => b.name)).toEqual(['보스A', '보스B']);
        });

        it('reuses the renamed copy on a second receive instead of piling up new lists', () => {
            CustomListManager.addCustomList('공유 목록', '내 보스1');
            expect(importSharedCustomList('공유 목록', shared)).toBe('공유 목록 (2)');
            expect(importSharedCustomList('공유 목록', shared)).toBe('공유 목록 (2)');
            expect(listNames()).toEqual(['공유 목록', '공유 목록 (2)']);
        });

        it('never merges into a preset: a preset id or preset name gets a different name', () => {
            expect(importSharedCustomList('odin-main', shared)).toBe('odin-main (2)');
            expect(importSharedCustomList('오딘', shared)).toBe('오딘 (2)');
            expect(DB.getBossesByGameId('odin-main')).toEqual([]);
        });

        it('does not use the self-healing slot name as is', () => {
            expect(importSharedCustomList('커스텀 보스_001', shared)).toBe('커스텀 보스_001 (2)');
            expect(importSharedCustomList('커스텀 보스_001', shared)).toBe('커스텀 보스_001 (2)');
            expect(listNames()).toEqual(['커스텀 보스_001 (2)']);
        });

        it('keeps a renamed list name within the 50-character limit', () => {
            const longName = '가'.repeat(50);
            CustomListManager.addCustomList(longName, '내 보스1');
            const created = importSharedCustomList(longName, shared);
            expect(created).toBe(`${'가'.repeat(46)} (2)`);
            expect(created.length).toBe(50);
        });

        it('returns null and creates nothing for an invalid list name', () => {
            expect(importSharedCustomList('<img src=x onerror=alert(1)>', shared)).toBeNull();
            expect(listNames()).toEqual([]);
            expect(DB.getBosses()).toEqual([]);
        });

        it('returns null when a boss name exceeds the custom list limit', () => {
            expect(importSharedCustomList('공유 목록', [{ name: '가'.repeat(51), interval: 10 }])).toBeNull();
            expect(listNames()).toEqual([]);
            expect(DB.getBosses()).toEqual([]);
        });

        it('drops blank, duplicate and control-character boss names', () => {
            const created = importSharedCustomList('공유 목록', [
                { name: '  보스A  ', interval: 120 },
                { name: '보스A', interval: 999 },
                { name: '줄\n바꿈', interval: 10 },
                { name: '   ', interval: 10 },
                null,
                { name: 42, interval: 10 }
            ]);
            expect(created).toBe('공유 목록');
            expect(DB.getBossesByGameId('공유 목록').map(b => [b.name, b.interval])).toEqual([['보스A', 120]]);
        });

        it('returns null for malformed input', () => {
            expect(importSharedCustomList('공유 목록', [])).toBeNull();
            expect(importSharedCustomList('공유 목록', null)).toBeNull();
            expect(importSharedCustomList(42, shared)).toBeNull();
            expect(importSharedCustomList('   ', shared)).toBeNull();
        });

        it('trims the shared list name', () => {
            expect(importSharedCustomList('  공유 목록  ', shared)).toBe('공유 목록');
            expect(listNames()).toEqual(['공유 목록']);
        });

        it('does not inherit an interval from a leftover boss row when the list is newly created', () => {
            DB.upsertBoss('공유 목록', '보스B', { interval: 45, isInvasion: true }); // 지워진 같은 이름 목록의 잔여 행
            importSharedCustomList('공유 목록', shared);
            expect(DB.findBoss('공유 목록', '보스B')).toMatchObject({ interval: 0, isInvasion: false });
        });

        describe('expansion limit for crafted links', () => {
            const at = offsetMs => new Date(Date.now() + offsetMs).toISOString();
            const DAY = 24 * 60 * 60 * 1000;

            it('keeps intervals for an ordinary share', () => {
                const schedules = [{ bossName: '보스A', scheduledDate: at(60 * 60 * 1000) }];
                importSharedCustomList('공유 목록', [{ name: '보스A', interval: 1 }], schedules);
                expect(DB.findBoss('공유 목록', '보스A').interval).toBe(1); // 48h ÷ 1분 = 2880건, 상한 이내
            });

            it('zeroes the interval of a boss whose schedule is far away with a short interval', () => {
                const schedules = [
                    { bossName: '폭주 보스', scheduledDate: at(365 * DAY) },
                    { bossName: '정상 보스', scheduledDate: at(60 * 60 * 1000) }
                ];
                importSharedCustomList('공유 목록', [{ name: '폭주 보스', interval: 1 }, { name: '정상 보스', interval: 120 }], schedules);
                expect(DB.findBoss('공유 목록', '폭주 보스').interval).toBe(0);
                expect(DB.findBoss('공유 목록', '정상 보스').interval).toBe(120);
            });

            it('zeroes intervals largest-first until many short-interval bosses fit the budget', () => {
                const bosses = Array.from({ length: 10 }, (_, i) => ({ name: `보스${i}`, interval: 1 }));
                const schedules = bosses.map(b => ({ bossName: b.name, scheduledDate: at(60 * 60 * 1000) }));
                importSharedCustomList('공유 목록', bosses, schedules);
                const kept = DB.getBossesByGameId('공유 목록').filter(b => b.interval > 0);
                expect(kept).toHaveLength(1); // 2880건짜리 10개 중 1개만 상한(5000) 안에 남는다
            });

            it('ignores bosses without schedules and invalid dates', () => {
                const schedules = [{ bossName: '보스A', scheduledDate: 'not-a-date' }, null];
                importSharedCustomList('공유 목록', [{ name: '보스A', interval: 1 }, { name: '보스B', interval: 1 }], schedules);
                expect(DB.getBossesByGameId('공유 목록').map(b => b.interval)).toEqual([1, 1]);
            });
        });
    });
});
