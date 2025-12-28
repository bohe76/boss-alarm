// test/boss-scheduler.apply.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initBossSchedulerScreen, handleApplyBossSettings } from '../src/screens/boss-scheduler.js';
import { BossDataManager } from '../src/data-managers.js';
import * as calculator from '../src/calculator.js';

let mockBossSchedule = [];
let setBossScheduleSpy;
let calculateBossAppearanceTimeSpy;

vi.mock('../src/event-bus.js', () => {
    let listeners = {};
    return {
        EventBus: { on: vi.fn((event, callback) => { listeners[event] = callback; }), emit: vi.fn() }
    };
});
vi.mock('../src/ui-renderer.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, renderBossInputs: vi.fn(), renderBossSchedulerScreen: vi.fn() };
});
vi.mock('../src/logger.js', () => ({ log: vi.fn() }));

vi.mock('../src/default-boss-list.js', () => ({
    DEFAULT_BOSS_LIST_KOR: [
        { "id": "boss1", "name": "보스1", "respawnTime": "01:00:00" },
        { "id": "boss2", "name": "보스2", "respawnTime": "02:00:00" }
    ]
}));

describe('BossSchedulerScreen Apply Logic', () => {
    let DOM;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.TZ = 'Asia/Seoul';
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-11-28T19:00:00+09:00'));
        vi.spyOn(window, 'alert').mockImplementation(() => { });

        mockBossSchedule = [];
        vi.spyOn(BossDataManager, 'getBossSchedule').mockImplementation(() => mockBossSchedule);
        setBossScheduleSpy = vi.spyOn(BossDataManager, 'setBossSchedule').mockImplementation((newSchedule) => { mockBossSchedule = newSchedule; });
        vi.spyOn(BossDataManager, 'subscribe').mockImplementation(() => { });

        calculateBossAppearanceTimeSpy = vi.spyOn(calculator, 'calculateBossAppearanceTime').mockImplementation(() => new Date('2025-11-28T19:00:00+09:00'));

        DOM = {
            bossSchedulerScreen: document.createElement('div'),
            bossInputsContainer: document.createElement('div'),
            moveToBossSettingsButton: document.createElement('button'),
            schedulerBossListInput: document.createElement('textarea'), // Add schedulerBossListInput
        };
        document.body.appendChild(DOM.bossSchedulerScreen);
        DOM.bossSchedulerScreen.appendChild(DOM.bossInputsContainer);
        DOM.bossSchedulerScreen.appendChild(DOM.moveToBossSettingsButton);
        DOM.bossSchedulerScreen.appendChild(DOM.schedulerBossListInput); // Append schedulerBossListInput

        initBossSchedulerScreen(DOM);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('should correctly process boss times and sort them', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item"><span class="boss-name">우로보로스</span><input type="text" class="remaining-time-input" data-id="id-우로보로스" value="09:24:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="우로보로스"></div>
            <div class="boss-input-item"><span class="boss-name">파르바</span><input type="text" class="remaining-time-input" data-id="id-파르바" value="00:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="파르바"></div>
            <div class="boss-input-item"><span class="boss-name">셀로비아</span><input type="text" class="remaining-time-input" data-id="id-셀로비아" value="10:50:13"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="셀로비아"></div>
            <div class="boss-input-item"><span class="boss-name">페티</span><input type="text" class="remaining-time-input" data-id="id-페티" value="11:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="페티"></div>
        `;

        // Trigger input events to populate dataset.calculatedDate
        DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
            if (input.dataset.id === 'id-우로보로스') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T04:24:00+09:00'));
            if (input.dataset.id === 'id-파르바') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T00:00:00+09:00'));
            if (input.dataset.id === 'id-셀로비아') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T05:50:13+09:00'));
            if (input.dataset.id === 'id-페티') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T06:00:00+09:00'));
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });

        handleApplyBossSettings(DOM);

        expect(setBossScheduleSpy).toHaveBeenCalledOnce();
        const finalSchedule = setBossScheduleSpy.mock.calls[0][0];

        expect(finalSchedule.filter(item => item.type === 'boss')).toHaveLength(7);
        expect(finalSchedule.filter(item => item.type === 'date')).toHaveLength(1); // 11.29 날짜 마커
    });

    it('should handle special bosses with +12h logic', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item"><span class="boss-name">셀로비아</span><input type="text" class="remaining-time-input" data-id="id-셀로비아" value="05:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="셀로비아"></div>
            <div class="boss-input-item"><span class="boss-name">파르바</span><input type="text" class="remaining-time-input" data-id="id-파르바" value="10:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="파르바"></div>
        `;
        const inputSelovia = DOM.bossInputsContainer.querySelector('input[data-id="id-셀로비아"]');
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T05:00:00+09:00'));
        inputSelovia.dispatchEvent(new Event('input', { bubbles: true }));

        const inputParba = DOM.bossInputsContainer.querySelector('input[data-id="id-파르바"]');
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T10:00:00+09:00'));
        inputParba.dispatchEvent(new Event('input', { bubbles: true }));

        handleApplyBossSettings(DOM);
        const finalSchedule = setBossScheduleSpy.mock.calls[0][0];
        expect(finalSchedule.filter(item => item.type === 'boss')).toHaveLength(4);
        expect(finalSchedule.filter(item => item.type === 'boss')[0].name).toBe('셀로비아');
        expect(finalSchedule.filter(item => item.type === 'boss')[0].time).toBe('05:00:00');
        expect(finalSchedule.filter(item => item.type === 'boss')[1].name).toBe('파르바');
        expect(finalSchedule.filter(item => item.type === 'boss')[1].time).toBe('10:00:00');
        expect(finalSchedule.filter(item => item.type === 'boss')[2].name).toBe('셀로비아');
        expect(finalSchedule.filter(item => item.type === 'boss')[2].time).toBe('17:00:00');
        expect(finalSchedule.filter(item => item.type === 'boss')[3].name).toBe('파르바');
        expect(finalSchedule.filter(item => item.type === 'boss')[3].time).toBe('22:00:00');
    });

    it('should filter out invasion bosses that are not today', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item"><span class="boss-name">침공 셀로비아</span><input type="text" class="remaining-time-input" data-id="침공 셀로비아" value="09:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="침공 셀로비아"></div>
            <div class="boss-input-item"><span class="boss-name">일반 보스</span><input type="text" class="remaining-time-input" data-id="id-일반보스" value="10:30:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="일반 보스"></div>
        `;
        const inputInvade = DOM.bossInputsContainer.querySelector('input[data-id="침공 셀로비아"]');
        // 침공 보스는 다음날로 계산되어 필터링되어야 함
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T09:00:00+09:00'));
        inputInvade.dispatchEvent(new Event('input', { bubbles: true }));

        const inputNormal = DOM.bossInputsContainer.querySelector('input[data-id="id-일반보스"]');
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-28T22:30:00+09:00')); // 오늘로 계산
        inputNormal.dispatchEvent(new Event('input', { bubbles: true }));

        handleApplyBossSettings(DOM);
        const finalSchedule = setBossScheduleSpy.mock.calls[0][0];
        expect(finalSchedule.filter(item => item.type === 'boss')).toHaveLength(1); // 일반 보스만 남아있어야 함
        expect(finalSchedule.filter(item => item.type === 'boss')[0].name).toBe('일반 보스');
    });

    it('should apply "fresh start" logic', () => {
        mockBossSchedule = [{ type: 'boss', id: 'id-old', name: 'Old Boss' }];
        DOM.bossInputsContainer.innerHTML = `<div class="boss-input-item"><span class="boss-name">New Boss</span><input type="text" class="remaining-time-input" value="00:15:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="New Boss"></div>`;
        const input = DOM.bossInputsContainer.querySelector('input');
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-28T19:15:00+09:00'));
        input.dispatchEvent(new Event('input', { bubbles: true }));

        handleApplyBossSettings(DOM);

        expect(setBossScheduleSpy).toHaveBeenCalledOnce();
        const finalSchedule = setBossScheduleSpy.mock.calls[0][0];
        expect(finalSchedule.some(item => item.name === 'Old Boss')).toBe(false); // Old Boss should be gone
        expect(finalSchedule.some(item => item.name === 'New Boss')).toBe(true); // New Boss should be added
    });

    it('should prevent saving if no valid inputs', () => {
        const alertSpy = vi.spyOn(window, 'alert');
        DOM.bossInputsContainer.innerHTML = `<div class="boss-input-item"><input type="text" class="remaining-time-input" value=""><span class="calculated-spawn-time">--:--:--</span></div>`;
        handleApplyBossSettings(DOM);
        expect(setBossScheduleSpy).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 설정 적용 버튼을 눌러 주세요.");
    });
});
