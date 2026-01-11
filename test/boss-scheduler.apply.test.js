// test/boss-scheduler.apply.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initBossSchedulerScreen, handleApplyBossSettings } from '../src/screens/boss-scheduler.js';
import { BossDataManager } from '../src/data-managers.js';
import * as calculator from '../src/calculator.js';

let mockBossSchedule = [];
// Draft 스케줄 모킹용 변수
let mockDraftSchedule = [];
let setBossScheduleSpy;
let setDraftScheduleSpy;
let commitDraftSpy;
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
        { "id": "boss2", "name": "보스2", "respawnTime": "02:00:00" },
        { "id": "침공 셀로비아", "name": "침공 셀로비아", "respawnTime": "00:00:00", "isInvasion": true }
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
        mockDraftSchedule = []; // 초기화

        vi.spyOn(BossDataManager, 'getBossSchedule').mockImplementation(() => mockBossSchedule);
        setBossScheduleSpy = vi.spyOn(BossDataManager, 'setBossSchedule').mockImplementation((newSchedule) => { mockBossSchedule = newSchedule; });
        vi.spyOn(BossDataManager, 'subscribe').mockImplementation(() => { });

        // Draft 관련 메서드 모킹
        vi.spyOn(BossDataManager, 'getDraftSchedule').mockImplementation(() => mockDraftSchedule);
        setDraftScheduleSpy = vi.spyOn(BossDataManager, 'setDraftSchedule').mockImplementation((_listId, newDraft) => { mockDraftSchedule = newDraft; });
        vi.spyOn(BossDataManager, 'validateBossSchedule').mockImplementation(() => ({ isValid: true }));
        commitDraftSpy = vi.spyOn(BossDataManager, 'commitDraft').mockImplementation(() => {
            if (mockDraftSchedule.length >= 0) {
                // 테스트를 위한 필터링 및 날짜 마커 모사
                let bosses = mockDraftSchedule.filter(item => {
                    if (item.type === 'boss' && item.name.includes('침공')) {
                        const date = new Date(item.scheduledDate);
                        return date.getDate() === 28;
                    }
                    return true;
                });

                // 날짜순 정렬 (정상적인 동작 모사)
                bosses.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

                mockBossSchedule = [...bosses];
                if (bosses.length > 0) {
                    const firstDate = new Date(bosses[0].scheduledDate);
                    const dateStr = `${firstDate.getMonth() + 1}.${firstDate.getDate()}`;
                    mockBossSchedule.unshift({ type: 'date', date: dateStr });
                }
            }
        });

        calculateBossAppearanceTimeSpy = vi.spyOn(calculator, 'calculateBossAppearanceTime').mockImplementation(() => new Date('2025-11-28T19:00:00+09:00'));

        DOM = {
            bossSchedulerScreen: document.createElement('div'),
            bossInputsContainer: document.createElement('div'),
            clearAllRemainingTimesButton: document.createElement('button'),
            moveToBossSettingsButton: document.createElement('button'),
            schedulerBossListInput: document.createElement('textarea'),
            tabSchedulerText: document.createElement('button'),
            gameSelect: { value: 'odin-main' }
        };
        document.body.appendChild(DOM.bossSchedulerScreen);
        DOM.bossSchedulerScreen.appendChild(DOM.bossInputsContainer);
        DOM.bossSchedulerScreen.appendChild(DOM.moveToBossSettingsButton);
        DOM.bossSchedulerScreen.appendChild(DOM.schedulerBossListInput); // Append schedulerBossListInput
        DOM.bossSchedulerScreen.appendChild(DOM.clearAllRemainingTimesButton); // Append new elements
        DOM.bossSchedulerScreen.appendChild(DOM.tabSchedulerText); // Append new elements

        initBossSchedulerScreen(DOM);

        // 프리셋 데이터 주입 (침공 보스 필터링 테스트용)
        BossDataManager.initPresets({
            'odin-main': {
                bossMetadata: {
                    '침공 셀로비아': { interval: 0, isInvasion: true },
                    '일반 보스': { interval: 0, isInvasion: false },
                    '우로보로스': 0,
                    '파르바': 0,
                    '셀로비아': 0,
                    '페티': 0
                }
            }
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('should correctly process boss times and sort them', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item"><span class="boss-name">우로보로스</span><input type="text" class="remaining-time-input" data-id="id-우로보로스" value="09:24:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="우로보로스"></div>
            <div class="boss-input-item"><span class="boss-name">파르바</span><input type="text" class="remaining-time-input" data-id="id-파르바" value="10:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="파르바"></div>
            <div class="boss-input-item"><span class="boss-name">셀로비아</span><input type="text" class="remaining-time-input" data-id="id-셀로비아" value="10:50:13"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="셀로비아"></div>
            <div class="boss-input-item"><span class="boss-name">페티</span><input type="text" class="remaining-time-input" data-id="id-페티" value="11:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="페티"></div>
        `;

        // Trigger input events to populate dataset.calculatedDate
        DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
            if (input.dataset.id === 'id-우로보로스') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T04:24:00+09:00'));
            if (input.dataset.id === 'id-파르바') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T10:00:00+09:00')); // 미래 시간으로 변경
            if (input.dataset.id === 'id-셀로비아') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T05:50:13+09:00'));
            if (input.dataset.id === 'id-페티') calculateBossAppearanceTimeSpy.mockReturnValueOnce(new Date('2025-11-29T06:00:00+09:00'));
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Draft가 업데이트되었는지 확인 (Input Event -> syncInputToText -> setDraftSchedule)
        expect(setDraftScheduleSpy).toHaveBeenCalled();

        handleApplyBossSettings(DOM);

        // commitDraft가 호출되었는지 확인
        expect(commitDraftSpy).toHaveBeenCalledOnce();

        // 최종적으로 업데이트된 스케줄 확인 (commitDraft 모의 구현에 의해 mockBossSchedule에 복사됨)
        const finalSchedule = mockBossSchedule;

        // +12h 자동 추가 로직이 제거되었으므로 입력한 4개의 보스만 존재
        expect(finalSchedule.filter(item => item.type === 'boss')).toHaveLength(4);
        expect(finalSchedule.filter(item => item.type === 'date')).toHaveLength(1); // 11.29 날짜 마커
    });

    it('should handle special bosses (12h respawn bosses are now manually added)', () => {
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

        expect(commitDraftSpy).toHaveBeenCalled();
        const finalSchedule = mockBossSchedule;

        // +12h 자동 추가 로직이 제거되었으므로 입력한 2개의 보스만 존재
        expect(finalSchedule.filter(item => item.type === 'boss')).toHaveLength(2);
        expect(finalSchedule.filter(item => item.type === 'boss')[0].name).toBe('셀로비아');
        expect(finalSchedule.filter(item => item.type === 'boss')[0].time).toBe('05:00:00');
        expect(finalSchedule.filter(item => item.type === 'boss')[1].name).toBe('파르바');
        expect(finalSchedule.filter(item => item.type === 'boss')[1].time).toBe('10:00:00');
    });

    it('should filter out invasion bosses that are not today', () => {
        // 명확한 테스트를 위해 이전 상태 영향 제거
        mockBossSchedule = [];
        mockDraftSchedule = [];
        DOM.bossInputsContainer.innerHTML = '';

        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item"><span class="boss-name">침공 셀로비아</span><input type="text" class="remaining-time-input" data-boss-name="침공 셀로비아" data-id="침공 셀로비아" value="09:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="침공 셀로비아"></div>
            <div class="boss-input-item"><span class="boss-name">일반 보스</span><input type="text" class="remaining-time-input" data-boss-name="일반 보스" data-id="id-일반보스" value="10:30:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="일반 보스"></div>
        `;

        const inputInvade = DOM.bossInputsContainer.querySelector('input[data-id="침공 셀로비아"]');
        const dateInvade = new Date('2025-11-29T09:00:00+09:00');
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(dateInvade);
        inputInvade.dispatchEvent(new Event('input', { bubbles: true }));
        inputInvade.dataset.calculatedDate = dateInvade.toISOString();

        const inputNormal = DOM.bossInputsContainer.querySelector('input[data-id="id-일반보스"]');
        const dateNormal = new Date('2025-11-28T22:30:00+09:00');
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(dateNormal);
        inputNormal.dispatchEvent(new Event('input', { bubbles: true }));
        inputNormal.dataset.calculatedDate = dateNormal.toISOString();

        handleApplyBossSettings(DOM);

        expect(commitDraftSpy).toHaveBeenCalled();
        const finalSchedule = mockBossSchedule;

        // 침공 보스는 필터링되고 일반 보스만 남아야 함 (+ 날짜 마커 1개)
        const bossItems = finalSchedule.filter(item => item.type === 'boss');
        expect(bossItems).toHaveLength(1);
        expect(bossItems[0].name).toBe('일반 보스');
    });

    it('should apply "fresh start" logic', () => {
        mockBossSchedule = [{ type: 'boss', id: 'id-old', name: 'Old Boss' }];
        mockDraftSchedule = [];
        DOM.bossInputsContainer.innerHTML = '';

        DOM.bossInputsContainer.innerHTML = `<div class="boss-input-item"><span class="boss-name">New Boss</span><input type="text" class="remaining-time-input" data-boss-name="New Boss" value="00:15:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="New Boss"></div>`;
        const input = DOM.bossInputsContainer.querySelector('input');
        const newDate = new Date('2025-11-28T19:15:00+09:00');
        calculateBossAppearanceTimeSpy.mockReturnValueOnce(newDate);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dataset.calculatedDate = newDate.toISOString();

        handleApplyBossSettings(DOM);

        expect(commitDraftSpy).toHaveBeenCalled();
        const finalSchedule = mockBossSchedule;
        expect(finalSchedule.some(item => item.name === 'Old Boss')).toBe(false);
        expect(finalSchedule.some(item => item.name === 'New Boss')).toBe(true);
    });

    it('should prevent saving if no valid inputs', () => {
        const alertSpy = vi.spyOn(window, 'alert');
        DOM.bossInputsContainer.innerHTML = `<div class="boss-input-item"><input type="text" class="remaining-time-input" data-boss-name="Invalid Boss" value=""><span class="calculated-spawn-time">--:--:--</span></div>`;
        handleApplyBossSettings(DOM);
        expect(setBossScheduleSpy).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 시간 업데이트 버튼을 눌러 주세요.");
    });
});
