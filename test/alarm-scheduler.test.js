import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { DB } from '../src/db.js';
import { speak } from '../src/speech.js';

vi.mock('../src/logger.js', () => ({ log: vi.fn() }));
vi.mock('../src/speech.js', () => ({ speak: vi.fn() }));
vi.mock('../src/ui-renderer.js', () => ({ renderAlarmStatusSummary: vi.fn() }));

const MINUTE = 60 * 1000;
const NOW = new Date(2026, 0, 5, 10, 0, 0);          // 월요일 10:00 (로컬)
const BOSS_TIME = new Date(2026, 0, 5, 11, 0, 0).getTime();
const FIXED_TIME = new Date(2026, 0, 5, 12, 0, 0).getTime();

let worker;
let syncScheduleToWorker;
let scheduleId;

beforeAll(async () => {
    // alarm-scheduler는 불러올 때 Worker를 만든다. 그 인스턴스를 잡아 두려고 먼저 바꿔 놓고 불러온다.
    const BaseWorker = global.Worker;
    global.Worker = class extends BaseWorker {
        constructor(url) {
            super(url);
            this.postMessage = vi.fn();
            worker = this;
        }
    };
    ({ syncScheduleToWorker } = await import('../src/alarm-scheduler.js'));
    global.Worker = BaseWorker;
});

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    localStorage.clear();
    DB.upsertGame({ id: 'g1', name: 'G1', type: 'custom' });
    const boss = DB.upsertBoss('g1', '보스', { interval: 0 });
    scheduleId = DB.addSchedule({ bossId: boss.id, scheduledDate: new Date(BOSS_TIME).toISOString() }).id;
    DB.setSetting('lastSelectedGame', 'g1');
    DB.setSetting('fixedAlarms', [
        { id: 'fixed-t', name: '고정', time: '12:00', enabled: true, days: [0, 1, 2, 3, 4, 5, 6] }
    ]);
    worker.postMessage.mockClear();
    speak.mockClear();
});

afterEach(() => {
    vi.useRealTimers();
});

const sentSchedule = () => {
    syncScheduleToWorker();
    const updates = worker.postMessage.mock.calls.filter(([message]) => message.type === 'UPDATE_SCHEDULE');
    return updates.at(-1)[0].payload;
};
const alarmsOf = (id) => sentSchedule().filter(item => item.id === id).map(item => [item.type, item.targetTime]);
const fire = (payload) => worker.onmessage({ data: { type: 'ALARM', payload } });

describe('alarm-scheduler', () => {
    describe('기본 알림 시간 (5분, 1분, 정각)', () => {
        it('보스와 고정 알림에 5분 전·1분 전·정각 알림을 순서대로 보낸다', () => {
            expect(sentSchedule()).toEqual([
                { id: scheduleId, name: '보스', type: '5min', targetTime: BOSS_TIME - 5 * MINUTE, isFixed: false },
                { id: scheduleId, name: '보스', type: '1min', targetTime: BOSS_TIME - 1 * MINUTE, isFixed: false },
                { id: scheduleId, name: '보스', type: '0min', targetTime: BOSS_TIME, isFixed: false },
                { id: 'fixed-t', name: '고정', type: '5min', targetTime: FIXED_TIME - 5 * MINUTE, isFixed: true },
                { id: 'fixed-t', name: '고정', type: '1min', targetTime: FIXED_TIME - 1 * MINUTE, isFixed: true },
                { id: 'fixed-t', name: '고정', type: '0min', targetTime: FIXED_TIME, isFixed: true }
            ]);
        });

        it.each([
            ['5min', 5 * MINUTE, '5분 전, 보스'],
            ['1min', 1 * MINUTE, '1분 전, 보스'],
            ['0min', 0, '보스 젠 입니다.']
        ])('보스 %s 알림은 문구를 읽고 발화 기록을 남긴다', (type, lead, message) => {
            const targetTime = BOSS_TIME - lead;

            fire({ id: scheduleId, name: '보스', type, isFixed: false, targetTime });

            expect(speak).toHaveBeenCalledWith(message);
            expect(DB.getSchedule(scheduleId)[`alerted_${type}`]).toBe(targetTime);
        });

        it('이미 발화 기록이 있는 알림은 다시 울리지 않고 목록에서도 빠진다', () => {
            const targetTime = BOSS_TIME - 5 * MINUTE;
            const payload = { id: scheduleId, name: '보스', type: '5min', isFixed: false, targetTime };

            fire(payload);
            fire(payload);

            expect(speak).toHaveBeenCalledTimes(1);
            expect(alarmsOf(scheduleId).map(([type]) => type)).toEqual(['1min', '0min']);
        });

        it('고정 알림은 발화 기록을 고정 알림 설정에 남기고 다시 울리지 않는다', () => {
            const targetTime = FIXED_TIME - 1 * MINUTE;
            const payload = { id: 'fixed-t', name: '고정', type: '1min', isFixed: true, targetTime };

            fire(payload);
            fire(payload);

            expect(speak).toHaveBeenCalledTimes(1);
            expect(speak).toHaveBeenCalledWith('1분 전, 고정');
            expect(DB.getSetting('fixedAlarms')[0].alerted_1min).toBe(targetTime);
            expect(alarmsOf('fixed-t').map(([type]) => type)).toEqual(['5min', '0min']);
        });
    });

    describe('사용자가 정한 알림 시간', () => {
        it('설정한 알림 시간과 정각을 보스·고정 알림에 똑같이 적용한다', () => {
            DB.setSetting('alarmLeadTimes', [10, 5, 1]);

            expect(alarmsOf(scheduleId)).toEqual([
                ['10min', BOSS_TIME - 10 * MINUTE],
                ['5min', BOSS_TIME - 5 * MINUTE],
                ['1min', BOSS_TIME - 1 * MINUTE],
                ['0min', BOSS_TIME]
            ]);
            expect(alarmsOf('fixed-t')).toEqual([
                ['10min', FIXED_TIME - 10 * MINUTE],
                ['5min', FIXED_TIME - 5 * MINUTE],
                ['1min', FIXED_TIME - 1 * MINUTE],
                ['0min', FIXED_TIME]
            ]);
        });

        it('알림 시간을 모두 지우면 정각 알림만 보낸다', () => {
            DB.setSetting('alarmLeadTimes', []);

            expect(sentSchedule().map(item => [item.id, item.type])).toEqual([
                [scheduleId, '0min'],
                ['fixed-t', '0min']
            ]);
        });

        it('목록에서 뺀 알림 시간은 더 이상 보내지 않는다', () => {
            DB.setSetting('alarmLeadTimes', [30, 5]);
            expect(alarmsOf(scheduleId).map(([type]) => type)).toEqual(['30min', '5min', '0min']);

            DB.setSetting('alarmLeadTimes', [5]);
            expect(alarmsOf(scheduleId).map(([type]) => type)).toEqual(['5min', '0min']);
        });

        it('추가한 알림 시간도 "N분 전" 문구를 읽고 한 번만 울린다', () => {
            DB.setSetting('alarmLeadTimes', [10, 5, 1]);
            const targetTime = BOSS_TIME - 10 * MINUTE;
            const payload = { id: scheduleId, name: '보스', type: '10min', isFixed: false, targetTime };

            fire(payload);
            fire(payload);

            expect(speak).toHaveBeenCalledTimes(1);
            expect(speak).toHaveBeenCalledWith('10분 전, 보스');
            expect(DB.getSchedule(scheduleId).alerted_10min).toBe(targetTime);
        });

        it('고정 알림도 추가한 알림 시간에 한 번만 울린다', () => {
            DB.setSetting('alarmLeadTimes', [30]);
            const targetTime = FIXED_TIME - 30 * MINUTE;
            const payload = { id: 'fixed-t', name: '고정', type: '30min', isFixed: true, targetTime };

            fire(payload);
            fire(payload);

            expect(speak).toHaveBeenCalledTimes(1);
            expect(speak).toHaveBeenCalledWith('30분 전, 고정');
            expect(alarmsOf('fixed-t').map(([type]) => type)).toEqual(['0min']);
        });
    });
});
