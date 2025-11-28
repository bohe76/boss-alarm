// test/boss-scheduler.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initBossSchedulerScreen } from '../src/screens/boss-scheduler.js';
import { EventBus } from '../src/event-bus.js';
import { LocalStorageManager } from '../src/data-managers.js';
import * as UIRenderer from '../src/ui-renderer.js';
import { log } from '../src/logger.js';

// Mock dependencies
let listeners = {}; // Moved outside vi.mock to be accessible and clearable
let mockBossSchedule = []; // Stores the internal mock schedule

vi.mock('../src/event-bus.js', () => ({
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
    },
}));

vi.mock('../src/ui-renderer.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        renderBossInputs: vi.fn(),
        renderBossSchedulerScreen: vi.fn(),
        updateBossListTextarea: vi.fn(), // Ensure updateBossListTextarea is mocked
    };
});


vi.mock('../src/data-managers.js', async (importOriginal) => {
    const actual = await importOriginal(); // Import the actual module
    return {
        ...actual, // Spread all actual exports
        LocalStorageManager: {
            ...actual.LocalStorageManager, // Preserve actual LocalStorageManager methods if any
            get: vi.fn(),
            set: vi.fn(),
        },
        BossDataManager: {
            ...actual.BossDataManager, // Preserve actual BossDataManager methods if any
            getBossSchedule: vi.fn(() => mockBossSchedule), // Return the stored schedule
            setBossSchedule: vi.fn((newSchedule) => { mockBossSchedule = newSchedule; }), // Store the new schedule
            subscribe: vi.fn(),
            getNextBossInfo: vi.fn(() => ({ nextBoss: null, minTimeDiff: 0 })),
            getUpcomingBosses: vi.fn(() => []),
        },
    };
});

vi.mock('../src/logger.js', () => ({
    log: vi.fn(),
}));

vi.mock('../src/boss-parser.js', () => ({
    parseBossList: vi.fn(),
}));

describe('BossSchedulerScreen', () => {
    let DOM;
    let mockNow;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock current date for consistent testing (UTC)
        mockNow = new Date('2025-11-28T10:00:00.000Z'); // 10:00 AM UTC
        vi.useFakeTimers();
        vi.setSystemTime(mockNow);

        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        listeners = {}; // Clear EventBus listeners for each test
        mockBossSchedule = [ // Initialize with a realistic schedule (KST times converted to UTC)
            { type: 'date', value: '11.28' },
            { type: 'boss', id: 'id-우로보로스', time: '09:00:00', name: '우로보로스', scheduledDate: new Date('2025-11-28T00:00:00.000Z') }, // 09:00 KST = 00:00 UTC
            { type: 'boss', id: 'id-셀로비아', time: '11:00:00', name: '셀로비아', scheduledDate: new Date('2025-11-28T02:00:00.000Z') }, // 11:00 KST = 02:00 UTC
            { type: 'boss', id: 'id-페티', time: '11:00:00', name: '페티', scheduledDate: new Date('2025-11-28T02:00:00.000Z') }, // 11:00 KST = 02:00 UTC
            { type: 'boss', id: 'id-파르바', time: '00:00:00', name: '파르바', scheduledDate: new Date('2025-11-28T15:00:00.000Z') }, // 00:00 KST on 11.29 = 15:00 UTC on 11.28
            { type: 'boss', id: 'id-오딘', time: '05:00:00', name: '오딘', scheduledDate: new Date('2025-11-28T20:00:00.000Z') }, // 05:00 KST on 11.29 = 20:00 UTC on 11.28
            { type: 'boss', id: 'id-일반보스', time: '10:30:00', name: '일반 보스', scheduledDate: new Date('2025-11-29T01:30:00.000Z') }, // 10:30 KST on 11.29 = 01:30 UTC on 11.29
            { type: 'boss', id: 'id-침공흐니르', time: '11:00:00', name: '침공 흐니르', scheduledDate: new Date('2025-11-29T02:00:00.000Z') }, // 11:00 KST on 11.29 = 02:00 UTC on 11.29
        ];


        // Mock DOM elements
        DOM = {
            bossSchedulerScreen: document.createElement('div'),
            gameSelect: document.createElement('select'),
            bossInputsContainer: document.createElement('div'),
            clearAllRemainingTimesButton: document.createElement('button'),
            moveToBossSettingsButton: document.createElement('button'),
            bossListInput: document.createElement('textarea'),
        };
        DOM.bossSchedulerScreen.id = 'boss-scheduler-screen';
        DOM.gameSelect.innerHTML = `<option value="game1">Game 1</option>`;
        DOM.bossInputsContainer.className = 'boss-inputs-container';
        DOM.clearAllRemainingTimesButton.id = 'clear-all-remaining-times-button';
        DOM.moveToBossSettingsButton.id = 'move-to-boss-settings-button';
        DOM.bossListInput.id = 'boss-list-input';

        // Append to body to make addEventListener work (delegation)
        document.body.appendChild(DOM.bossSchedulerScreen);
        DOM.bossSchedulerScreen.appendChild(DOM.gameSelect);
        DOM.bossSchedulerScreen.appendChild(DOM.bossInputsContainer);
        DOM.bossSchedulerScreen.appendChild(DOM.clearAllRemainingTimesButton);
        DOM.bossSchedulerScreen.appendChild(DOM.moveToBossSettingsButton);
        DOM.bossSchedulerScreen.appendChild(DOM.bossListInput);

        initBossSchedulerScreen(DOM);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.removeChild(DOM.bossSchedulerScreen);
    });

    it('should initialize EventBus listeners', () => {
        expect(EventBus.on).toHaveBeenCalledWith('show-boss-scheduler-screen', expect.any(Function));
        expect(EventBus.on).toHaveBeenCalledWith('rerender-boss-scheduler', expect.any(Function));
    });

    it('should correctly process boss times for today and next day and sort them', () => {
        // Setup boss inputs
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <span class="boss-name">우로보로스</span>
                <input type="text" class="remaining-time-input" value="09:24:00">
                <span class="calculated-time">--:--:--</span>
            </div>
            <div class="boss-input-item">
                <span class="boss-name">셀로비아</span>
                <input type="text" class="remaining-time-input" value="10:50:13">
                <span class="calculated-time">--:--:--</span>
            </div>
            <div class="boss-input-item">
                <span class="boss-name">페티</span>
                <input type="text" class="remaining-time-input" value="11:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
            <div class="boss-input-item">
                <span class="boss-name">파르바</span>
                <input type="text" class="remaining-time-input" value="00:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
        `;
        
        // Simulate click on "Move to Boss Settings" button
        DOM.moveToBossSettingsButton.click();

        const expectedText = `11.29
00:00 파르바
09:24 우로보로스
10:50 셀로비아
11:00 페티
12:00 파르바
22:50 셀로비아
23:00 페티`;

        expect(DOM.bossListInput.value.trim()).toEqual(expectedText);
        expect(EventBus.emit).toHaveBeenCalledWith('navigate', 'boss-management-screen');
    });

    it('should handle special bosses with +12h logic and sort them correctly', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <span class="boss-name">오딘</span>
                <input type="text" class="remaining-time-input" value="05:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
            <div class="boss-input-item">
                <span class="boss-name">파르바</span>
                <input type="text" class="remaining-time-input" value="10:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
        `;
        // Current time is 2025-11-28T10:00:00.000Z
        // Odin 05:00:00 -> 2025-11-29 05:00:00 (+12h -> 2025-11-29 17:00:00)
        // Parba 10:00:00 -> 2025-11-28 10:00:00 (this is 'now', so it becomes next day's 10:00:00) -> 2025-11-29 10:00:00

        DOM.moveToBossSettingsButton.click();

        const expectedText = `11.29
05:00 오딘
10:00 파르바
17:00 오딘
22:00 파르바`;
        
        expect(DOM.bossListInput.value.trim()).toEqual(expectedText);
    });

    it('should filter out invasion bosses that are not today', () => {
        // Current time is 2025-11-28T10:00:00.000Z
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <span class="boss-name">침공 셀로비아</span>
                <input type="text" class="remaining-time-input" value="09:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
            <div class="boss-input-item">
                <span class="boss-name">침공 흐니르</span>
                <input type="text" class="remaining-time-input" value="11:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
            <div class="boss-input-item">
                <span class="boss-name">일반 보스</span>
                <input type="text" class="remaining-time-input" value="10:30:00">
                <span class="calculated-time">--:--:--</span>
            </div>
        `;
        
        DOM.moveToBossSettingsButton.click();

        // 침공 셀로비아 (09:00:00) is in the past for 2025-11-28 10:00:00, so it becomes 2025-11-29 09:00:00 and filtered out.
        // 침공 흐니르 (11:00:00) is in the future for 2025-11-28 10:00:00, so it remains 2025-11-28 11:00:00 and remains.
        // 일반 보스 (10:30:00) is in the future for 2025-11-28 10:00:00, so it remains 2025-11-28 10:30:00.

        const expectedText = `11.29
10:30 일반 보스`;
        
        expect(DOM.bossListInput.value.trim()).toEqual(expectedText);
    });

    it('should clear all remaining times', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <span class="boss-name">Boss 1</span>
                <input type="text" class="remaining-time-input" value="01:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
        `;
        DOM.clearAllRemainingTimesButton.click();
        expect(DOM.bossInputsContainer.querySelector('.remaining-time-input').value).toBe('');
        expect(DOM.bossInputsContainer.querySelector('.calculated-time').textContent).toBe('--:--:--');
        expect(vi.mocked(log)).toHaveBeenCalledWith('모든 남은 시간이 삭제되었습니다.', true);
    });

    it('should update calculated time on input change', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <span class="boss-name">Boss 1</span>
                <input type="text" class="remaining-time-input" value="">
                <span class="calculated-time">--:--:--</span>
            </div>
        `;
        const input = DOM.bossInputsContainer.querySelector('.remaining-time-input');
        input.value = '00:30:00';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // Current time is 2025-11-28T10:00:00.000Z
        // Adding 30 minutes to 10:00:00 results in 10:30:00
        expect(DOM.bossInputsContainer.querySelector('.calculated-time').textContent).toBe('19:30:00');
    });

    it('should persist remaining times when navigating away', () => {
        DOM.bossInputsContainer.innerHTML = `
            <div class="boss-input-item">
                <span class="boss-name">Boss A</span>
                <input type="text" class="remaining-time-input" value="01:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
            <div class="boss-input-item">
                <span class="boss-name">Boss B</span>
                <input type="text" class="remaining-time-input" value="02:00:00">
                <span class="calculated-time">--:--:--</span>
            </div>
        `;
        DOM.moveToBossSettingsButton.click();

        // EventBus.emit('rerender-boss-scheduler') would re-render the screen and use the persisted _remainingTimes
        // For this test, we just check if the internal state _remainingTimes is updated.
        EventBus.emit('rerender-boss-scheduler'); // Simulate rerender

        // Verify that the initial values are retained if no new input.
        // This is implicit through renderBossSchedulerScreen mock.
        // A more robust test would involve checking renderBossSchedulerScreen args.
        expect(vi.mocked(UIRenderer.renderBossSchedulerScreen)).toHaveBeenCalledWith(
            DOM,
            { 'Boss A': '01:00:00', 'Boss B': '02:00:00' }
        );
    });
});