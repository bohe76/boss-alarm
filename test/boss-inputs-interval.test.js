import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DB } from '../src/db.js';
import { getBossNamesForGame } from '../src/boss-scheduler-data.js';
import { renderBossInputs } from '../src/ui-renderer.js';

vi.mock('../src/boss-scheduler-data.js', () => ({
    getGameNames: vi.fn(() => [{ id: '내 목록', name: '내 목록', isCustom: true }]),
    getBossNamesForGame: vi.fn()
}));

vi.mock('../src/alarm-scheduler.js', () => ({
    getIsAlarmRunning: vi.fn(() => false)
}));

vi.mock('../src/pip-manager.js', () => ({
    isPipWindowOpen: vi.fn(() => false),
    updatePipContent: vi.fn()
}));

// issue-039: 입력 화면의 젠 주기 칸. 저장은 화면의 값을 그대로 쓰므로, 저장된 주기가 칸에 보여야 빈칸 저장으로 지워지지 않는다.
describe('renderBossInputs 젠 주기 칸', () => {
    const LIST = '내 목록';
    let DOM;
    const intervalOf = (bossName) => {
        const row = [...DOM.bossInputsContainer.querySelectorAll('.boss-input-item')]
            .find(item => item.querySelector('.boss-name').textContent === bossName);
        return [row.querySelector('.interval-hh').value, row.querySelector('.interval-mm').value];
    };
    const draftItem = (name, interval) => ({
        type: 'boss', name, interval, memo: '',
        scheduledDate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    beforeEach(() => {
        localStorage.clear();
        DOM = {
            bossSchedulerScreen: document.createElement('section'),
            bossInputsContainer: document.createElement('div')
        };
        DOM.bossSchedulerScreen.innerHTML = '<div class="interval-header"></div>';
        getBossNamesForGame.mockReturnValue(['보스A', '보스B']);
    });

    it('Draft 항목이 없는 보스는 이 목록에 저장된 주기를 보여 줘야 한다', () => {
        DB.upsertBoss(LIST, '보스A', { interval: 150 });
        DB.upsertBoss(LIST, '보스B', { interval: 120 });

        renderBossInputs(DOM, LIST, {}, {}, []);

        expect(intervalOf('보스A')).toEqual(['2', '30']);
        expect(intervalOf('보스B')).toEqual(['2', '']); // 분이 0이면 칸을 비운다 (기존 표시 규칙)
    });

    it('Draft 항목의 주기가 0이어도 저장된 주기를 보여 줘야 한다', () => {
        DB.upsertBoss(LIST, '보스A', { interval: 150 });

        renderBossInputs(DOM, LIST, {}, {}, [draftItem('보스A', 0)]);

        expect(intervalOf('보스A')).toEqual(['2', '30']);
    });

    it('Draft에 주기가 있으면(저장 전 수정 중) 그 값을 우선해야 한다', () => {
        DB.upsertBoss(LIST, '보스A', { interval: 150 });

        renderBossInputs(DOM, LIST, {}, {}, [draftItem('보스A', 90)]);

        expect(intervalOf('보스A')).toEqual(['1', '30']);
    });

    it('저장된 주기가 없으면 칸을 비워 둬야 한다 (다른 게임의 같은 이름 보스는 참조하지 않는다)', () => {
        DB.upsertBoss('other-game', '보스A', { interval: 240 });

        renderBossInputs(DOM, LIST, {}, {}, []);

        expect(intervalOf('보스A')).toEqual(['', '']);
        expect(intervalOf('보스B')).toEqual(['', '']);
    });
});
