import { describe, it, expect, vi } from 'vitest';
import {
    padNumber,
    formatMonthDay,
    validateStandardClockTime,
    validateCountdownTime,
    validateBossSchedulerInput,
    validateFixedAlarmTime,
    generateUniqueId,
    formatTime,
    formatTimeDifference,
    formatSpawnTime,
    normalizeTimeFormat,
    calculateNextOccurrence
} from '../src/utils.js';
import * as Logger from '../src/logger.js';

// Mock the logger module
vi.mock('../src/logger.js', () => ({
    log: vi.fn(),
}));

// Mock the global alert function
global.alert = vi.fn();

describe('padNumber', () => {
    it('should pad single-digit numbers with a leading zero', () => {
        expect(padNumber(5)).toBe('05');
    });

    it('should not pad double-digit numbers', () => {
        expect(padNumber(12)).toBe('12');
    });
});

describe('formatMonthDay', () => {
    it('should format a date object into MM.DD format', () => {
        const date = new Date(2024, 10, 27); // Month is 0-indexed, so 10 is November
        expect(formatMonthDay(date)).toBe('11.27');
    });
});

describe('validateStandardClockTime', () => {
    it('should return true for valid HH:MM:SS format', () => {
        expect(validateStandardClockTime('23:59:59')).toBe(true);
    });

    it('should return true for valid HH:MM format', () => {
        expect(validateStandardClockTime('09:30')).toBe(true);
    });

    it('should return true for valid HHMM format', () => {
        expect(validateStandardClockTime('1400')).toBe(true);
    });

    it('should return true for valid HHMMSS format', () => {
        expect(validateStandardClockTime('140030')).toBe(true);
    });

    it('should return false for invalid time formats', () => {
        expect(validateStandardClockTime('25:00')).toBe(false);
        expect(validateStandardClockTime('12:60')).toBe(false);
        expect(validateStandardClockTime('12:30:60')).toBe(false);
        expect(validateStandardClockTime('abc')).toBe(false);
    });
});

describe('validateCountdownTime', () => {
    it('should return true for valid MM:SS format', () => {
        expect(validateCountdownTime('99:59')).toBe(true);
        expect(validateCountdownTime('120:30')).toBe(true);
    });

    it('should return true for valid MMSS format', () => {
        expect(validateCountdownTime('9959')).toBe(true);
        expect(validateCountdownTime('12030')).toBe(true);
    });

    it('should return false for invalid formats', () => {
        expect(validateCountdownTime('12:60')).toBe(false);
        expect(validateCountdownTime('12:3')).toBe(false);
        expect(validateCountdownTime('abc')).toBe(false);
    });
});

describe('validateBossSchedulerInput', () => {
    it('should return true for any valid standard or countdown time format', () => {
        expect(validateBossSchedulerInput('14:30')).toBe(true);
        expect(validateBossSchedulerInput('120:30')).toBe(true);
        expect(validateBossSchedulerInput('1430')).toBe(true);
    });
});

describe('validateFixedAlarmTime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return true for valid HH:MM format', () => {
        expect(validateFixedAlarmTime('12:30')).toBe(true);
        expect(global.alert).not.toHaveBeenCalled();
        expect(Logger.log).not.toHaveBeenCalled();
    });

    it('should return true for valid HHMM format', () => {
        expect(validateFixedAlarmTime('1230')).toBe(true);
        expect(global.alert).not.toHaveBeenCalled();
        expect(Logger.log).not.toHaveBeenCalled();
    });

    it('should return false and call alert/log for formats with seconds', () => {
        expect(validateFixedAlarmTime('12:30:45')).toBe(false);
        expect(global.alert).toHaveBeenCalledWith('고정 알림은 HH:MM 또는 HHMM (4자리) 형식만 지원합니다. 초를 포함할 수 없습니다.');
        expect(Logger.log).toHaveBeenCalledWith('고정 알림은 HH:MM 또는 HHMM (4자리) 형식만 지원합니다. 초를 포함할 수 없습니다.', false);
    });

    it('should return false and call alert/log for invalid time formats', () => {
        expect(validateFixedAlarmTime('99:99')).toBe(false);
        expect(global.alert).toHaveBeenCalledWith('유효하지 않은 시간 형식입니다. (예: HH:MM, HHMM)');
        expect(Logger.log).toHaveBeenCalledWith('유효하지 않은 시간 형식입니다. (예: HH:MM, HHMM)', false);
    });
});

describe('generateUniqueId', () => {
    it('should generate a unique string ID', () => {
        const id1 = generateUniqueId();
        const id2 = generateUniqueId();
        expect(typeof id1).toBe('string');
        expect(id1).not.toBe(id2);
    });
});

describe('formatTime', () => {
    it('should format seconds into MM:SS format', () => {
        expect(formatTime(125)).toBe('02:05');
        expect(formatTime(60)).toBe('01:00');
        expect(formatTime(59)).toBe('00:59');
    });
});

describe('formatTimeDifference', () => {
    it('should format milliseconds into (HH:MM:SS) format by default', () => {
        expect(formatTimeDifference(3661000)).toBe('(01:01:01)');
    });

    it('should format milliseconds into (HH:MM) format when showSeconds is false', () => {
        expect(formatTimeDifference(3661000, false)).toBe('(01:01)');
    });

    it('should return (00:00:00) for zero or infinite ms', () => {
        expect(formatTimeDifference(0)).toBe('(00:00:00)');
        expect(formatTimeDifference(Infinity)).toBe('(00:00:00)');
    });
});

describe('formatSpawnTime', () => {
    it('should format a time string into [HH:MM:SS] format', () => {
        expect(formatSpawnTime('14:30')).toBe('[14:30:00]');
        expect(formatSpawnTime('9:5:3')).toBe('[09:05:03]');
    });
});

describe('normalizeTimeFormat', () => {
    it('should normalize HHMM to HH:MM', () => {
        expect(normalizeTimeFormat('1230')).toBe('12:30');
    });

    it('should trim whitespace', () => {
        expect(normalizeTimeFormat('  1230  ')).toBe('12:30');
    });

    it('should return the original string if not in HHMM format', () => {
        expect(normalizeTimeFormat('12:30')).toBe('12:30');
        expect(normalizeTimeFormat('123')).toBe('123');
    });

    it('should return the original string if it is empty', () => {
        expect(normalizeTimeFormat('')).toBe('');
    });
});

describe('calculateNextOccurrence', () => {
    // Mock Date.now for consistent testing
    const originalDateNow = Date.now;
    beforeEach(() => {
        // Mocking Date for a Monday at 10:00:00 LOCAL
        vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0)); // Monday, January 1, 2024 10:00:00 LOCAL
    });

    afterEach(() => {
        vi.useRealTimers(); // Restore real timers after each test
    });

    it('should return null for invalid alarm object (no time or days)', () => {
        expect(calculateNextOccurrence({ time: '10:00', days: [] })).toBeNull();
        expect(calculateNextOccurrence({ days: [1] })).toBeNull();
        expect(calculateNextOccurrence(null)).toBeNull();
    });

    // Test Cases for Day-of-Week Logic
    it('should calculate for today if time is in the future on active day (Monday 10:00 -> Monday 11:00)', () => {
        const alarm = { time: '11:00', days: [1] }; // Monday
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 1, 11, 0, 0).toISOString());
    });

    it('should calculate for next active day if time is in the past on active day (Monday 10:00 -> Monday 09:00 -> Next Monday)', () => {
        const alarm = { time: '09:00', days: [1] }; // Monday
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 8, 9, 0, 0).toISOString()); // Next Monday
    });

    it('should calculate for this week if active day is later in the week (Monday 10:00 -> Wednesday 10:00)', () => {
        const alarm = { time: '10:00', days: [3] }; // Wednesday
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 3, 10, 0, 0).toISOString()); // Wednesday
    });

    it('should calculate for next week if active day already passed this week (Friday 10:00 -> Tuesday 10:00)', () => {
        vi.setSystemTime(new Date(2024, 0, 5, 10, 0, 0)); // Friday 10:00 LOCAL
        const alarm = { time: '10:00', days: [2] }; // Tuesday
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 9, 10, 0, 0).toISOString()); // Next Tuesday
    });

    it('should handle multiple active days and pick the soonest (Monday 10:00 -> [0,3,5] -> Wednesday)', () => {
        const alarm = { time: '10:00', days: [0, 3, 5] }; // Sunday, Wednesday, Friday
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 3, 10, 0, 0).toISOString()); // Wednesday
    });

    it('should handle multiple active days and pick the soonest for next week (Friday 10:00 -> [0,2,4] -> Sunday)', () => {
        vi.setSystemTime(new Date(2024, 0, 5, 10, 0, 0)); // Friday 10:00 LOCAL
        const alarm = { time: '10:00', days: [0, 2, 4] }; // Sunday, Tuesday, Thursday
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 7, 10, 0, 0).toISOString()); // Sunday
    });

    it('should calculate correctly for all days (Monday 10:00 -> [0-6] -> Monday 10:00)', () => {
        const alarm = { time: '10:00', days: [0, 1, 2, 3, 4, 5, 6] };
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 2, 10, 0, 0).toISOString()); // Tuesday 10:00
    });

    it('should calculate correctly for all days if time passed today (Monday 10:00 -> [0-6] -> Tuesday 09:00)', () => {
        const alarm = { time: '09:00', days: [0, 1, 2, 3, 4, 5, 6] };
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 2, 9, 0, 0).toISOString()); // Tuesday 09:00
    });

    it('should handle alarm time being very close to current time (same minute, different second)', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 30)); // Monday 10:00:30 LOCAL
        const alarm = { time: '10:00:45', days: [1] }; // Monday 10:00:45
        const nextOccurrence = calculateNextOccurrence(alarm);
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 1, 10, 0, 45).toISOString());
    });

    it('should handle alarm time being exactly current time (same second)', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0)); // Monday 10:00:00 LOCAL
        const alarm = { time: '10:00:00', days: [1] }; // Monday 10:00:00
        const nextOccurrence = calculateNextOccurrence(alarm);
        // Should be next week if "today" means strictly in the future.
        // My function considers "time > baseDate.getTime()" so exact same time means it's passed.
        expect(nextOccurrence.toISOString()).toBe(new Date(2024, 0, 8, 10, 0, 0).toISOString()); // Next Monday
    });
});
