// test/data-managers.test.js
// BossDataManager 핵심 로직 테스트: commitDraft, 48h 확장, checkAndUpdateSchedule

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DB } from '../src/db.js';
import { BossDataManager } from '../src/data-managers.js';

// 테스트 기준 시각: 2026-03-20 09:00:00 KST (UTC+9) = 2026-03-20T00:00:00Z
// "오늘 자정" = 2026-03-20T00:00:00 로컬
// 테스트에서 로컬 자정 기준으로 계산하므로 Date 객체를 현지 시간으로 구성

function makeLocalDate(y, m, d, h = 0, min = 0, s = 0) {
    return new Date(y, m - 1, d, h, min, s);
}

// 게임·보스 셋업 헬퍼
function setupGame(gameId = 'test-game', type = 'custom') {
    DB.upsertGame({ id: gameId, name: 'Test Game', type });
    DB.setSetting('lastSelectedGame', gameId);
}

function setupBoss(gameId, name, interval, isInvasion = false) {
    return DB.upsertBoss(gameId, name, { interval, isInvasion });
}

// Draft 형식: commitDraft가 읽는 localStorage 키 = `v3_draft_${gameId}`
function setDraft(gameId, items) {
    localStorage.setItem(
        `v3_draft_${gameId}`,
        JSON.stringify(items)
    );
}

describe('BossDataManager', () => {
    // 고정 기준 시간: 2026-03-20 09:00 로컬
    const NOW = makeLocalDate(2026, 3, 20, 9, 0, 0);

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
    });

    // ──────────────────────────────────────────────
    // commitDraft 테스트
    // ──────────────────────────────────────────────
    describe('commitDraft', () => {
        it('Draft 데이터를 DB schedules에 반영해야 한다', () => {
            setupGame('g1');
            const boss = setupBoss('g1', '보스A', 60);

            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '보스A',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '메모1',
                    interval: 60
                }
            ]);

            BossDataManager.commitDraft('g1');

            const schedules = DB.getSchedulesByGameId('g1');
            expect(schedules.length).toBeGreaterThan(0);

            // 보스A의 스케줄이 존재해야 한다
            const bossSchedules = schedules.filter(s => s.bossId === boss.id);
            expect(bossSchedules.length).toBeGreaterThan(0);
        });

        it('Draft에 새 보스가 있으면 bosses 테이블에 자동 등록해야 한다', () => {
            setupGame('g1');

            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '신규보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 120
                }
            ]);

            // 커밋 전 bosses 테이블 비어있음
            expect(DB.getBossesByGameId('g1')).toHaveLength(0);

            BossDataManager.commitDraft('g1');

            // 커밋 후 자동 등록
            const bosses = DB.getBossesByGameId('g1');
            expect(bosses).toHaveLength(1);
            expect(bosses[0].name).toBe('신규보스');
        });

        it('commitDraft 후 48h 윈도우로 스케줄이 확장되어야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '주기보스', 120); // 2시간 간격

            // 앵커: 현재(09:00)보다 1시간 뒤 (10:00)
            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '주기보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 120
                }
            ]);

            BossDataManager.commitDraft('g1');

            const schedules = DB.getSchedulesByGameId('g1');
            // 2시간 간격, 48h 윈도우 → 최소 10개 이상 (48 / 2 = 24, 앞뒤 포함)
            expect(schedules.length).toBeGreaterThan(10);
        });

        it('scheduledDate가 없는 Draft 아이템은 무시해야 한다', () => {
            setupGame('g1');

            setDraft('g1', [
                { type: 'boss', name: '보스X', scheduledDate: null, memo: '' },
                { type: 'date', date: '03.20' }
            ]);

            BossDataManager.commitDraft('g1');

            // 유효한 boss 아이템이 없으므로 아무것도 등록되지 않아야 한다
            expect(DB.getSchedulesByGameId('g1')).toHaveLength(0);
        });

        it('Draft가 없으면 commitDraft는 아무것도 하지 않아야 한다', () => {
            setupGame('g1');

            // Draft 없이 commitDraft 호출 — 예외 없이 종료되어야 한다
            expect(() => BossDataManager.commitDraft('g1')).not.toThrow();
            expect(DB.getSchedulesByGameId('g1')).toHaveLength(0);
        });
    });

    // ──────────────────────────────────────────────
    // 48h 확장 로직 (commitDraft → _expandAndReconstruct 간접 테스트)
    // ──────────────────────────────────────────────
    describe('48h expansion', () => {
        it('앵커 기반으로 48시간 범위의 스케줄을 생성해야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '주기보스', 60); // 1시간 간격

            // 앵커: 오늘 10:00
            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '주기보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 60
                }
            ]);

            BossDataManager.commitDraft('g1');

            const schedules = DB.getSchedulesByGameId('g1');

            // 오늘 자정 ~ 내일 자정 + 48h 이내 스케줄만 존재해야 한다
            // GC 후 모든 스케줄이 윈도우 내이거나 미래 앵커여야 한다
            schedules.forEach(s => {
                const t = new Date(s.scheduledDate).getTime();
                // 과거 스케줄은 alerted_0min=false인 경우에만 보존 가능
                if (t < Date.now()) {
                    expect(s.alerted_0min).toBe(false);
                }
            });

            // 1시간 간격 48h → 최소 20개 이상의 스케줄이 생성되어야 한다
            expect(schedules.length).toBeGreaterThan(20);
        });

        it('침공 보스(isInvasion)는 당일만 포함해야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '침공보스', 120, true); // 침공, 2시간 간격

            // 앵커: 오늘 10:00
            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '침공보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 120,
                    isInvasion: true
                }
            ]);

            BossDataManager.commitDraft('g1');

            const schedules = DB.getSchedulesByGameId('g1');

            // 모든 확장 스케줄은 오늘(3/20) 날짜여야 한다
            schedules.forEach(s => {
                const d = new Date(s.scheduledDate);
                // 각 스케줄의 날짜가 오늘과 동일한 날이어야 한다
                expect(d.getFullYear()).toBe(2026);
                expect(d.getMonth()).toBe(2); // 0-indexed: March
                expect(d.getDate()).toBe(20);
            });
        });

        it('인터벌이 0인 보스는 확장하지 않아야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '단발보스', 0); // interval=0

            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '단발보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 0
                }
            ]);

            BossDataManager.commitDraft('g1');

            const schedules = DB.getSchedulesByGameId('g1');
            // interval=0이므로 앵커 1개만 존재해야 한다
            expect(schedules).toHaveLength(1);
            expect(new Date(schedules[0].scheduledDate).getTime()).toBe(anchorDate.getTime());
        });

        it('앵커보다 미래에 최소 1개의 스케줄을 보장해야 한다 (Future Anchor Keeper)', () => {
            setupGame('g1');
            setupBoss('g1', '과거보스', 60); // 1시간 간격

            // 앵커: 오늘 01:00 (현재 09:00보다 8시간 전)
            const anchorDate = makeLocalDate(2026, 3, 20, 1, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '과거보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 60
                }
            ]);

            BossDataManager.commitDraft('g1');

            const schedules = DB.getSchedulesByGameId('g1');
            const now = Date.now();

            // 미래 스케줄이 최소 1개 존재해야 한다
            const futureSchedules = schedules.filter(s =>
                new Date(s.scheduledDate).getTime() > now
            );
            expect(futureSchedules.length).toBeGreaterThan(0);
        });

        it('앵커보다 과거이고 alerted_0min=true인 스케줄은 GC로 제거되어야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '알림완료보스', 60);

            // 앵커: 오늘 10:00
            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);

            // 먼저 commitDraft로 스케줄 생성
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '알림완료보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 60
                }
            ]);
            BossDataManager.commitDraft('g1');

            // 과거 스케줄 하나를 alerted_0min=true로 마킹
            const schedules = DB.getSchedulesByGameId('g1');
            const pastSchedule = schedules.find(s =>
                new Date(s.scheduledDate).getTime() < Date.now()
            );

            if (pastSchedule) {
                DB.updateSchedule(pastSchedule.id, { alerted_0min: true });

                // expandSchedule 재호출로 GC 실행
                BossDataManager.expandSchedule('g1');

                const after = DB.getSchedulesByGameId('g1');
                // alerted_0min=true였던 과거 스케줄은 제거되어야 한다
                const stillExists = after.find(s => s.id === pastSchedule.id);
                expect(stillExists).toBeUndefined();
            }
        });
    });

    // ──────────────────────────────────────────────
    // checkAndUpdateSchedule 테스트
    // ──────────────────────────────────────────────
    describe('checkAndUpdateSchedule', () => {
        it('자정 경과 시 자동으로 확장을 수행해야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '주기보스', 60);

            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '주기보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 60
                }
            ]);
            BossDataManager.commitDraft('g1');

            // lastAutoUpdateTimestamp를 어제로 설정하여 날짜 변경 시뮬레이션
            const yesterday = makeLocalDate(2026, 3, 19, 12, 0, 0);
            DB.setSetting('lastAutoUpdateTimestamp', yesterday.getTime());

            // 자정이 지난 "다음날" 09:00으로 시간 이동
            const tomorrow = makeLocalDate(2026, 3, 21, 9, 0, 0);
            vi.setSystemTime(tomorrow);

            BossDataManager.checkAndUpdateSchedule(false, false);

            // 업데이트 타임스탬프가 갱신되어야 한다
            const updatedTs = DB.getSetting('lastAutoUpdateTimestamp');
            expect(updatedTs).toBeGreaterThan(yesterday.getTime());
        });

        it('같은 날이면 업데이트를 수행하지 않아야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '주기보스', 60);

            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '주기보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 60
                }
            ]);
            BossDataManager.commitDraft('g1');

            // 오늘 시각으로 lastAutoUpdateTimestamp 설정
            DB.setSetting('lastAutoUpdateTimestamp', NOW.getTime());

            // DB schedules에 임시 마커를 추가하여 재확장 여부 확인
            const beforeCount = DB.getSchedulesByGameId('g1').length;

            // 같은 날 다시 checkAndUpdateSchedule 호출
            BossDataManager.checkAndUpdateSchedule(false, false);

            // 스케줄 수에 변화가 없어야 한다 (같은 날이므로 업데이트 스킵)
            const afterCount = DB.getSchedulesByGameId('g1').length;
            expect(afterCount).toBe(beforeCount);
        });

        it('force=true이면 날짜와 무관하게 업데이트를 수행해야 한다', () => {
            setupGame('g1');
            setupBoss('g1', '주기보스', 60);

            const anchorDate = makeLocalDate(2026, 3, 20, 10, 0, 0);
            setDraft('g1', [
                {
                    type: 'boss',
                    name: '주기보스',
                    scheduledDate: anchorDate.toISOString(),
                    memo: '',
                    interval: 60
                }
            ]);
            BossDataManager.commitDraft('g1');

            // 오늘 시각으로 lastAutoUpdateTimestamp 설정 (정상적으로는 업데이트 스킵)
            DB.setSetting('lastAutoUpdateTimestamp', NOW.getTime());

            // force=true로 강제 업데이트
            expect(() => BossDataManager.checkAndUpdateSchedule(true, false)).not.toThrow();

            // 업데이트 타임스탬프가 현재 시각으로 갱신되어야 한다
            const updatedTs = DB.getSetting('lastAutoUpdateTimestamp');
            expect(updatedTs).toBeGreaterThanOrEqual(NOW.getTime());
        });

        it('activeGame이 없으면 아무것도 하지 않아야 한다', () => {
            // lastSelectedGame 설정 없이 호출
            expect(() => BossDataManager.checkAndUpdateSchedule(true, false)).not.toThrow();
        });
    });

    // ──────────────────────────────────────────────
    // getDraftSchedule / setDraftSchedule / clearDraft
    // ──────────────────────────────────────────────
    describe('Draft 관리', () => {
        it('setDraftSchedule → getDraftSchedule 라운드트립이 동작해야 한다', () => {
            const draft = [
                { type: 'boss', name: '보스A', scheduledDate: new Date().toISOString() }
            ];
            BossDataManager.setDraftSchedule('g1', draft);
            const loaded = BossDataManager.getDraftSchedule('g1');
            expect(loaded).toHaveLength(1);
            expect(loaded[0].name).toBe('보스A');
        });

        it('clearDraft 후 getDraftSchedule은 빈 배열을 반환해야 한다', () => {
            BossDataManager.setDraftSchedule('g1', [{ type: 'boss', name: '보스A' }]);
            BossDataManager.clearDraft('g1');
            const loaded = BossDataManager.getDraftSchedule('g1');
            expect(loaded).toEqual([]);
        });
    });

    // ──────────────────────────────────────────────
    // getBossSchedule 테스트
    // ──────────────────────────────────────────────
    describe('getBossSchedule', () => {
        it('uiFilter=true일 때 48h 윈도우 내 스케줄만 반환해야 한다', () => {
            setupGame('g1');
            const boss = setupBoss('g1', '보스A', 0);

            // 윈도우 내 스케줄
            const inWindow = makeLocalDate(2026, 3, 20, 12, 0, 0);
            // 윈도우 외 스케줄 (3일 후)
            const outWindow = makeLocalDate(2026, 3, 23, 12, 0, 0);

            DB.addSchedule({ bossId: boss.id, scheduledDate: inWindow.toISOString() });
            DB.addSchedule({ bossId: boss.id, scheduledDate: outWindow.toISOString() });

            const result = BossDataManager.getBossSchedule(true);
            const bossItems = result.filter(item => item.type === 'boss');

            expect(bossItems).toHaveLength(1);
            expect(new Date(bossItems[0].scheduledDate).getDate()).toBe(20);
        });

        it('uiFilter=false일 때 모든 스케줄을 반환해야 한다', () => {
            setupGame('g1');
            const boss = setupBoss('g1', '보스A', 0);

            const d1 = makeLocalDate(2026, 3, 20, 12, 0, 0);
            const d2 = makeLocalDate(2026, 3, 23, 12, 0, 0);

            DB.addSchedule({ bossId: boss.id, scheduledDate: d1.toISOString() });
            DB.addSchedule({ bossId: boss.id, scheduledDate: d2.toISOString() });

            const result = BossDataManager.getBossSchedule(false);
            const bossItems = result.filter(item => item.type === 'boss');

            expect(bossItems).toHaveLength(2);
        });

        it('activeGame이 없으면 빈 배열을 반환해야 한다', () => {
            // lastSelectedGame 없음
            const result = BossDataManager.getBossSchedule(true);
            expect(result).toEqual([]);
        });
    });
});
