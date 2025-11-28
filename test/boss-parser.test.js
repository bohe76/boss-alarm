import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseBossList } from '../src/boss-parser.js';
import { BossDataManager } from '../src/data-managers.js';

// Mock dependencies
vi.mock('../src/logger.js', () => ({
    Logger: {
        log: vi.fn()
    },
    log: vi.fn() // Exported 'log' function
}));

vi.mock('../src/data-managers.js', () => ({
    BossDataManager: {
        setBossSchedule: vi.fn(),
        getBossSchedule: vi.fn(() => []) // Default to empty schedule
    }
}));

// Import and mock calculateBossAppearanceTime
import * as calculator from '../src/calculator.js';
vi.mock('../src/calculator.js');

describe('boss-parser', () => {
    let mockBossListInput;
    let mockNow;

    beforeEach(() => {
        vi.clearAllMocks();
        mockBossListInput = { value: '' };
        
        // Set timezone to KST for all tests in this file
        process.env.TZ = 'Asia/Seoul';

        // Mock Date to a fixed time (e.g., 2025-11-27 19:00:00 KST)
        mockNow = new Date('2025-11-27T19:00:00+09:00');
        vi.useFakeTimers();
        vi.setSystemTime(mockNow);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('parseBossList', () => {
        it('should parse a simple boss list correctly and return result', () => {
            mockBossListInput.value = '11.27\n12:00 Boss A\n13:00 Boss B';
            
            // Mock calculateBossAppearanceTime for the expected results
            vi.mocked(calculator.calculateBossAppearanceTime).mockImplementation((timeString) => {
                if (timeString === '12:00') return new Date('2025-11-27T12:00:00+09:00');
                if (timeString === '13:00') return new Date('2025-11-27T13:00:00+09:00');
                return null;
            });
            
            const result = parseBossList(mockBossListInput);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            const schedule = result.mergedSchedule;
            expect(schedule.length).toBeGreaterThanOrEqual(3);
            
            const bossA = schedule.find(item => item.type === 'boss' && item.name === 'Boss A');
            const bossB = schedule.find(item => item.type === 'boss' && item.name === 'Boss B');
            
            expect(bossA).toBeDefined();
            expect(bossB).toBeDefined();
            expect(bossA.time).toBe('12:00:00'); // Normalized time
            expect(bossB.time).toBe('13:00:00');
            
            expect(BossDataManager.setBossSchedule).not.toHaveBeenCalled();
        });

        it('should handle date markers and correct reconstruction', () => {
            mockBossListInput.value = '11.27\n13:00 Boss B\n12:00 Boss A';
            
            vi.mocked(calculator.calculateBossAppearanceTime).mockImplementation((timeString) => {
                if (timeString === '12:00') return new Date('2025-11-27T12:00:00+09:00');
                if (timeString === '13:00') return new Date('2025-11-27T13:00:00+09:00');
                return null;
            });

            const result = parseBossList(mockBossListInput);
            
            expect(result.success).toBe(true);
            const schedule = result.mergedSchedule;
            
            const bossIndices = schedule.map((item, index) => item.type === 'boss' ? index : -1).filter(i => i !== -1);
            const names = bossIndices.map(i => schedule[i].name);
            
            expect(names).toEqual(['Boss A', 'Boss B']);
        });

        it('should return errors for invalid lines', () => {
            mockBossListInput.value = '12:00\ninvalid-time Boss';
            
            vi.mocked(calculator.calculateBossAppearanceTime).mockImplementation((timeString) => {
                if (timeString === '12:00') return new Date('2025-11-27T12:00:00+09:00');
                return null; // For invalid-time
            });

            const result = parseBossList(mockBossListInput);
            
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.mergedSchedule).toEqual([]); // Should be empty on failure
        });
        
        it('should not auto-rollover date if header is present', () => {
            mockBossListInput.value = '11.27\n23:00 Boss A\n01:00 Boss B';
            
            vi.mocked(calculator.calculateBossAppearanceTime).mockImplementation((timeString) => {
                if (timeString === '23:00') return new Date('2025-11-27T23:00:00+09:00');
                if (timeString === '01:00') return new Date('2025-11-27T01:00:00+09:00');
                return null;
            });

            const result = parseBossList(mockBossListInput);
            
            const schedule = result.mergedSchedule;
            const bosses = schedule.filter(item => item.type === 'boss');
            
            expect(bosses[0].name).toBe('Boss B');
            expect(bosses[1].name).toBe('Boss A');
        });

        it('should auto-rollover date if header is NOT present (legacy/init support)', () => {
            mockBossListInput.value = '23:00 Boss A\n01:00 Boss B';
            
            vi.mocked(calculator.calculateBossAppearanceTime).mockImplementation((timeString) => {
                if (timeString === '23:00') return new Date('2025-11-27T23:00:00+09:00'); // Today
                if (timeString === '01:00') return new Date('2025-11-28T01:00:00+09:00'); // Next day
                return null;
            });

            const result = parseBossList(mockBossListInput);
            
            const schedule = result.mergedSchedule;
            const bosses = schedule.filter(item => item.type === 'boss');
            
            expect(bosses[0].name).toBe('Boss A');
            expect(bosses[1].name).toBe('Boss B');
            
            const dateMarkers = schedule.filter(item => item.type === 'date');
            expect(dateMarkers.length).toBeGreaterThanOrEqual(2); // 11.27 and 11.28
        });

        it('should parse 3-digit number input as HMM (hours and minutes)', () => {
            mockBossListInput.value = '315 Boss C'; // Should be 3 hours 15 minutes
            
            vi.mocked(calculator.calculateBossAppearanceTime).mockImplementation((timeString) => {
                if (timeString === '315') return new Date('2025-11-27T03:15:00+09:00');
                return null;
            });

            const result = parseBossList(mockBossListInput);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            const schedule = result.mergedSchedule;
            const bossC = schedule.find(item => item.type === 'boss' && item.name === 'Boss C');
            
            expect(bossC).toBeDefined();
            expect(bossC.time).toBe('03:15:00');
        });
    });
});
