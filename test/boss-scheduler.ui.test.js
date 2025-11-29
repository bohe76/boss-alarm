// test/boss-scheduler.ui.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initBossSchedulerScreen } from '../src/screens/boss-scheduler.js';
import * as calculator from '../src/calculator.js';

let calculateBossAppearanceTimeSpy;

vi.mock('../src/logger.js', () => ({ log: vi.fn() }));

vi.mock('../src/default-boss-list.js', () => ({
    DEFAULT_BOSS_LIST_KOR: [
        { "id": "boss1", "name": "보스1", "respawnTime": "01:00:00" },
        { "id": "boss2", "name": "보스2", "respawnTime": "02:00:00" }
    ]
}));

describe('BossSchedulerScreen UI Interaction', () => {
    let DOM;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-11-28T19:00:00+09:00'));
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        calculateBossAppearanceTimeSpy = vi.spyOn(calculator, 'calculateBossAppearanceTime').mockImplementation(() => new Date('2025-11-28T19:00:00+09:00'));

        DOM = {
            bossSchedulerScreen: document.createElement('div'),
            bossInputsContainer: document.createElement('div'),
            clearAllRemainingTimesButton: document.createElement('button'),
        };
        DOM.bossSchedulerScreen.appendChild(DOM.bossInputsContainer);
        DOM.bossSchedulerScreen.appendChild(DOM.clearAllRemainingTimesButton);
        document.body.appendChild(DOM.bossSchedulerScreen);
        initBossSchedulerScreen(DOM);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('should update calculated time on input change', () => {
        calculateBossAppearanceTimeSpy.mockReturnValue(new Date('2025-11-28T19:30:00+09:00'));
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <input type="text" class="remaining-time-input" value="">
                <span class="calculated-spawn-time">--:--:--</span>
            </div>
        `;
        const input = DOM.bossInputsContainer.querySelector('.remaining-time-input');
        input.value = '00:30:00';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(DOM.bossInputsContainer.querySelector('.calculated-spawn-time').textContent).toBe('19:30:00');
    });

    it('should clear all remaining times and dataset.calculatedDate', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <input type="text" class="remaining-time-input" value="01:00:00" data-calculated-date="some-date">
                <span class="calculated-spawn-time">...</span>
            </div>
        `;
        const input = DOM.bossInputsContainer.querySelector('.remaining-time-input');
        
        DOM.clearAllRemainingTimesButton.click();

        expect(input.value).toBe('');
        expect(input.dataset.calculatedDate).toBeUndefined();
    });
});
