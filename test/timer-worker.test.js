import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// 타이머 워커는 "직전 tick 이후에 지난 시각"만 알린다. 사용자가 추가한 알림 시간(예: 10분 전)의 발화 기록은
// 48시간 재구축 때 사라지므로, 그 뒤에 다시 울리지 않는 것은 이 조건 하나가 지킨다. (issue-042)

const START_TIME = 1_000_000;
let posted;

const send = (type, payload) => self.onmessage({ data: { type, payload } });
const alarms = () => posted.filter(message => message.type === 'ALARM').map(message => message.payload);
const item = (overrides = {}) => ({ id: 1, name: '보스', type: '10min', targetTime: START_TIME + 3000, isFixed: false, ...overrides });

beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START_TIME);
    vi.resetModules();
    posted = [];
    vi.stubGlobal('postMessage', (message) => posted.push(message));
    await import('../src/workers/timer-worker.js');
});

afterEach(() => {
    send('STOP');
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('timer-worker', () => {
    it('목표 시각이 지나면 한 번 알리고 매초 TICK을 보낸다', () => {
        send('UPDATE_SCHEDULE', [item()]);
        send('START');

        vi.advanceTimersByTime(2000);
        expect(alarms()).toEqual([]);

        vi.advanceTimersByTime(3000);
        expect(alarms()).toEqual([item()]);
        expect(posted.filter(message => message.type === 'TICK')).toHaveLength(5);
    });

    it('알린 뒤 같은 항목이 다시 들어와도(발화 기록이 사라진 재동기화) 다시 알리지 않는다', () => {
        send('UPDATE_SCHEDULE', [item()]);
        send('START');
        vi.advanceTimersByTime(3000);
        expect(alarms()).toHaveLength(1);

        send('UPDATE_SCHEDULE', [item()]);
        vi.advanceTimersByTime(5000);

        expect(alarms()).toHaveLength(1);
    });

    it('재구축으로 ID가 바뀐 같은 시각의 항목도 지난 시각이면 알리지 않는다', () => {
        send('UPDATE_SCHEDULE', [item()]);
        send('START');
        vi.advanceTimersByTime(3000);

        send('UPDATE_SCHEDULE', [item({ id: 99 })]);
        vi.advanceTimersByTime(5000);

        expect(alarms()).toHaveLength(1);
    });

    it('중지했다가 다시 시작해도 지난 시각은 알리지 않는다', () => {
        send('UPDATE_SCHEDULE', [item()]);
        send('START');
        vi.advanceTimersByTime(3000);

        send('STOP');
        send('UPDATE_SCHEDULE', [item()]);
        send('START');
        vi.advanceTimersByTime(5000);

        expect(alarms()).toHaveLength(1);
    });

    it('시작할 때 이미 지난 시각은 알리지 않고, 앞으로 올 시각만 알린다', () => {
        send('UPDATE_SCHEDULE', [
            item({ type: '10min', targetTime: START_TIME - 60_000 }),
            item({ type: '5min', targetTime: START_TIME + 2000 })
        ]);
        send('START');
        vi.advanceTimersByTime(4000);

        expect(alarms().map(alarm => alarm.type)).toEqual(['5min']);
    });
});
