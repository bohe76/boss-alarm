// test/boss-scheduler.init.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initBossSchedulerScreen } from '../src/screens/boss-scheduler.js';
import { EventBus } from '../src/event-bus.js';
import * as UIRenderer from '../src/ui-renderer.js';
import { BossDataManager } from '../src/data-managers.js';
import * as calculator from '../src/calculator.js';

let mockBossSchedule = [];

let calculateBossAppearanceTimeSpy;

vi.mock('../src/event-bus.js', () => {
    const listeners = {};
    return {
        EventBus: {
            on: vi.fn((event, callback) => {
                if (!listeners[event]) {
                    listeners[event] = [];
                }
                listeners[event].push(callback);
            }),
            emit: vi.fn((event, ...args) => {
                if (listeners[event]) {
                    listeners[event].forEach(callback => callback(...args));
                }
            }),
        }
    };
});
vi.mock('../src/ui-renderer.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, renderBossInputs: vi.fn(), renderBossSchedulerScreen: vi.fn() };
});

vi.mock('../src/default-boss-list.js', () => ({
    DEFAULT_BOSS_LIST_KOR: [
        { "id": "boss1", "name": "보스1", "respawnTime": "01:00:00" },
        { "id": "boss2", "name": "보스2", "respawnTime": "02:00:00" }
    ]
}));

vi.mock('../src/logger.js', () => ({ log: vi.fn() }));

describe('BossSchedulerScreen Initialization and UI State', () => {
    let DOM;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.TZ = 'Asia/Seoul';
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-11-28T19:00:00+09:00'));
        vi.spyOn(window, 'alert').mockImplementation(() => { });

        mockBossSchedule = [];
        vi.spyOn(BossDataManager, 'getBossSchedule').mockImplementation(() => mockBossSchedule);
        vi.spyOn(BossDataManager, 'subscribe').mockImplementation(() => { });

        calculateBossAppearanceTimeSpy = vi.spyOn(calculator, 'calculateBossAppearanceTime').mockImplementation(() => new Date('2025-11-28T19:00:00+09:00'));

        DOM = {
            bossSchedulerScreen: document.createElement('div'),
            gameSelect: document.createElement('select'),
            bossInputsContainer: document.createElement('div'),
            moveToBossSettingsButton: document.createElement('button'),
            schedulerBossListInput: document.createElement('textarea'), // 추가
        };
        document.body.appendChild(DOM.bossSchedulerScreen);
        DOM.bossSchedulerScreen.appendChild(DOM.gameSelect);
        DOM.bossSchedulerScreen.appendChild(DOM.bossInputsContainer);
        DOM.bossSchedulerScreen.appendChild(DOM.moveToBossSettingsButton);
        DOM.bossSchedulerScreen.appendChild(DOM.schedulerBossListInput); // 추가

        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item"><span class="boss-name">Boss 1</span><input type="text" class="remaining-time-input" data-boss-name="Boss 1" value="00:30:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="Boss 1"></div>
        `;
        initBossSchedulerScreen(DOM);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('should initialize EventBus listeners', () => {
        expect(EventBus.on).toHaveBeenCalledWith('show-boss-scheduler-screen', expect.any(Function));
        expect(EventBus.on).toHaveBeenCalledWith('rerender-boss-scheduler', expect.any(Function));
    });

    it('should correctly update calculated times and dataset.calculatedDate on rerender', () => {
        const input = DOM.bossInputsContainer.querySelector('.remaining-time-input');

        // Ensure that calculateBossAppearanceTimeSpy is called and sets the dataset
        calculateBossAppearanceTimeSpy.mockReturnValue(new Date('2025-11-28T19:30:00+09:00'));
        input.dispatchEvent(new Event('input', { bubbles: true }));

        EventBus.emit('rerender-boss-scheduler');

        const calculatedTimeSpan = DOM.bossInputsContainer.querySelector('.calculated-spawn-time');

        expect(calculatedTimeSpan.textContent).toBe('19:30:00');
        expect(input.dataset.calculatedDate).toBeDefined();
        const date = new Date(input.dataset.calculatedDate);
        expect(date.getHours()).toBe(19);
        expect(date.getMinutes()).toBe(30);
    });

    it('should persist remaining times when navigating away', () => {
        const expectedRemainingTimes = { 'Boss 1': '00:30:00', 'Boss A': '01:00:00', 'Boss B': '02:00:00' };

        // Simulate inputs
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item"><span class="boss-name">Boss A</span><input type="text" class="remaining-time-input" data-boss-name="Boss A" value="01:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="Boss A"></div>
            <div class="boss-input-item"><span class="boss-name">Boss B</span><input type="text" class="remaining-time-input" data-boss-name="Boss B" value="02:00:00"><span class="calculated-spawn-time">--:--:--</span><input class="memo-input" type="text" data-boss-name="Boss B"></div>
        `;
        DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
            calculateBossAppearanceTimeSpy.mockReturnValue(new Date()); // Mock any valid date
            input.dispatchEvent(new Event('input', { bubbles: true })); // Populate dataset
        });

        vi.spyOn(UIRenderer, 'renderBossSchedulerScreen').mockClear(); // Clear previous calls
        DOM.moveToBossSettingsButton.click(); // This calls handleApplyBossSettings which saves _remainingTimes

        // Simulate navigation back
        EventBus.emit('rerender-boss-scheduler');

        expect(UIRenderer.renderBossSchedulerScreen).toHaveBeenCalledWith(
            DOM,
            expectedRemainingTimes,
            {} // expectedMemoInputs
        );
    });
});
