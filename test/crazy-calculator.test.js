process.env.TZ = 'UTC';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrazyCalculator } from '../src/crazy-calculator.js';
import { LocalStorageManager } from '../src/data-managers.js';
import * as Logger from '../src/logger.js';

// Mock dependencies
vi.mock('../src/data-managers.js', () => ({
    LocalStorageManager: {
        getCrazyCalculatorRecords: vi.fn(() => []),
        setCrazyCalculatorRecords: vi.fn(),
    },
}));

vi.mock('../src/logger.js', () => ({
    log: vi.fn(),
}));

describe('CrazyCalculator', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        CrazyCalculator.resetCalculator();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should start and update the stopwatch', () => {
        const updateDisplayCallback = vi.fn();
        CrazyCalculator.startStopwatch(updateDisplayCallback);

        vi.advanceTimersByTime(1000);
        expect(updateDisplayCallback).toHaveBeenCalledWith('00:01');

        vi.advanceTimersByTime(2000);
        expect(updateDisplayCallback).toHaveBeenCalledWith('00:03');
    });

    it('should stop the stopwatch', () => {
        const updateDisplayCallback = vi.fn();
        CrazyCalculator.startStopwatch(updateDisplayCallback);

        vi.advanceTimersByTime(1000);
        CrazyCalculator.stopStopwatch();
        vi.advanceTimersByTime(2000);

        // Should not have been called after stopping
        expect(updateDisplayCallback).toHaveBeenCalledTimes(1);
    });

    it('should reset the calculator state', () => {
        const updateDisplayCallback = vi.fn();
        CrazyCalculator.startStopwatch(updateDisplayCallback);
        vi.advanceTimersByTime(1000);
        
        CrazyCalculator.resetCalculator();

        expect(CrazyCalculator.isStopwatchRunning()).toBe(false);
        expect(CrazyCalculator.getTotalTime()).toBe(0);
        expect(CrazyCalculator.isGwangTriggered()).toBe(false);

        // Try starting again to see if it's really reset
        CrazyCalculator.startStopwatch(updateDisplayCallback);
        vi.advanceTimersByTime(1000);
        expect(updateDisplayCallback).toHaveBeenCalledWith('00:01');
        expect(CrazyCalculator.getTotalTime()).toBe(1);
    });

    it('should trigger "gwang" and start countdown', () => {
        const stopwatchCb = vi.fn();
        const countdownCb = vi.fn();
        CrazyCalculator.startStopwatch(stopwatchCb);

        // Let stopwatch run for 70 seconds
        vi.advanceTimersByTime(70 * 1000);
        expect(CrazyCalculator.getTotalTime()).toBe(70);

        CrazyCalculator.triggerGwang(countdownCb);
        
        // Expected countdown time is 30% of gwangTime (70s), so 30s.
        expect(countdownCb).toHaveBeenCalledWith('00:30', false);

        vi.advanceTimersByTime(1000);
        expect(countdownCb).toHaveBeenCalledWith('00:29', false);

        // Advance to the end of countdown
        vi.advanceTimersByTime(29 * 1000);
        expect(countdownCb).toHaveBeenCalledWith('00:00', false);

        // Check over time
        vi.advanceTimersByTime(1000);
        expect(countdownCb).toHaveBeenCalledWith('00:00', true); // First tick of over time
        vi.advanceTimersByTime(1000);
        expect(countdownCb).toHaveBeenCalledWith('00:01', true);
    });

    it('should save the crazy calculation record', async () => {
        const stopwatchCb = vi.fn();
        CrazyCalculator.startStopwatch(stopwatchCb);
        vi.advanceTimersByTime(100 * 1000); // Total time is 100s
        
        CrazyCalculator.stopStopwatch();

        // Gwang not triggered, should be calculated as 70% of total time
        const result = await CrazyCalculator.saveCrazyCalculation('Test Boss');

        expect(result).toBe(true);
        expect(LocalStorageManager.setCrazyCalculatorRecords).toHaveBeenCalledOnce();
        
        const savedRecords = LocalStorageManager.setCrazyCalculatorRecords.mock.calls[0][0];
        const newRecord = savedRecords[0];
        
        expect(newRecord.bossName).toBe('Test Boss');
        expect(newRecord.gwangTime).toBe('01:10'); // 70% of 100s is 70s
        expect(newRecord.afterGwangTime).toBe('00:30'); // 100s - 70s
        expect(newRecord.totalTime).toBe('01:40'); // 100s
        expect(Logger.log).toHaveBeenCalledWith('광 계산 기록 저장됨: Test Boss - 총 시간: 01:40', false);
    });

    it('should not save if boss name is missing', async () => {
        const result = await CrazyCalculator.saveCrazyCalculation('');
        expect(result).toBe(false);
        expect(Logger.log).toHaveBeenCalledWith('보스 이름이 입력되지 않았습니다.', true);
        expect(LocalStorageManager.setCrazyCalculatorRecords).not.toHaveBeenCalled();
    });

    it('should handle multiple "gwang" triggers, using the last one', () => {
        const stopwatchCb = vi.fn();
        const countdownCb = vi.fn();
        CrazyCalculator.startStopwatch(stopwatchCb);

        // 1. First trigger
        vi.advanceTimersByTime(70 * 1000);
        expect(CrazyCalculator.getTotalTime()).toBe(70);
        CrazyCalculator.triggerGwang(countdownCb);
        
        // Expected countdown time is 30s.
        expect(countdownCb).toHaveBeenLastCalledWith('00:30', false);
        vi.advanceTimersByTime(1000);
        expect(countdownCb).toHaveBeenLastCalledWith('00:29', false);

        // 2. Second trigger
        vi.advanceTimersByTime(29 * 1000); // Total time is now 70 + 30 = 100s
        expect(CrazyCalculator.getTotalTime()).toBe(100);
        CrazyCalculator.triggerGwang(countdownCb);

        // Expected new countdown time is floor(100 / 70 * 30) = 42s.
        expect(countdownCb).toHaveBeenLastCalledWith('00:42', false);
        vi.advanceTimersByTime(1000);
        expect(countdownCb).toHaveBeenLastCalledWith('00:41', false);
    });
});
