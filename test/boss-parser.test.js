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

describe('boss-parser', () => {
    let mockBossListInput;
    let mockNow;

    beforeEach(() => {
        vi.clearAllMocks();
        mockBossListInput = { value: '' };
        
        // Mock Date to a fixed time (e.g., 2025-11-27 10:00:00 UTC)
        mockNow = new Date('2025-11-27T10:00:00.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(mockNow);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('parseBossList', () => {
        it('should parse a simple boss list correctly and return result', () => {
            mockBossListInput.value = '11.27\n12:00 Boss A\n13:00 Boss B';
            
            const result = parseBossList(mockBossListInput);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            // Check mergedSchedule structure (Reconstruction adds Date markers)
            // 1. Date Marker (11.27)
            // 2. Boss A (12:00)
            // 3. Boss B (13:00)
            // Note: Bosses are stored as 'boss' type objects. Date markers as 'date' type.
            
            const schedule = result.mergedSchedule;
            // Length might vary depending on reconstruction (e.g. one date marker + 2 bosses = 3 items)
            expect(schedule.length).toBeGreaterThanOrEqual(3);
            
            const bossA = schedule.find(item => item.type === 'boss' && item.name === 'Boss A');
            const bossB = schedule.find(item => item.type === 'boss' && item.name === 'Boss B');
            
            expect(bossA).toBeDefined();
            expect(bossB).toBeDefined();
            expect(bossA.time).toBe('12:00:00'); // Normalized time
            expect(bossB.time).toBe('13:00:00');
            
            // Ensure setBossSchedule was NOT called automatically
            expect(BossDataManager.setBossSchedule).not.toHaveBeenCalled();
        });

        it('should handle date markers and correct reconstruction', () => {
            // Input out of order, should be sorted
            mockBossListInput.value = '11.27\n13:00 Boss B\n12:00 Boss A';
            
            const result = parseBossList(mockBossListInput);
            
            expect(result.success).toBe(true);
            const schedule = result.mergedSchedule;
            
            // Expected order: Date(11.27) -> Boss A -> Boss B
            const bossIndices = schedule.map((item, index) => item.type === 'boss' ? index : -1).filter(i => i !== -1);
            const names = bossIndices.map(i => schedule[i].name);
            
            expect(names).toEqual(['Boss A', 'Boss B']);
        });

        it('should return errors for invalid lines', () => {
            mockBossListInput.value = '12:00\ninvalid-time Boss';
            
            const result = parseBossList(mockBossListInput);
            
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.mergedSchedule).toEqual([]); // Should be empty on failure
        });
        
        it('should not auto-rollover date if header is present', () => {
            // 11.27 header present. 23:00 -> 01:00 should stay 11.27 unless explicit header
            mockBossListInput.value = '11.27\n23:00 Boss A\n01:00 Boss B';
            
            const result = parseBossList(mockBossListInput);
            
            // Both should be on 11.27.
            // 01:00 on 11.27 is earlier than 23:00 on 11.27, so Boss B comes first.
            // Expected order: Date(11.27) -> Boss B (01:00) -> Boss A (23:00)
            
            const schedule = result.mergedSchedule;
            const bosses = schedule.filter(item => item.type === 'boss');
            
            expect(bosses[0].name).toBe('Boss B');
            expect(bosses[1].name).toBe('Boss A');
            
            // Check dates
            // mockNow is 11.27 10:00 UTC. 
            // We need to check if the date part is indeed 11.27
            // Since we can't easily access the internal Date object year/month, we rely on sorting order.
        });

        it('should auto-rollover date if header is NOT present (legacy/init support)', () => {
            // No header. 23:00 -> 01:00 should be interpreted as next day
            mockBossListInput.value = '23:00 Boss A\n01:00 Boss B';
            
            // But wait, we filter past bosses? 
            // mockNow = 11.27 10:00 UTC (19:00 KST)
            // 23:00 (11.27) > 19:00 (Today Future)
            // 01:00 (11.28) > 19:00 (Tomorrow Future)
            
            const result = parseBossList(mockBossListInput);
            
            // Expected: Boss A (11.27 23:00) -> Boss B (11.28 01:00)
            // So sort order: A -> B
            
            const schedule = result.mergedSchedule;
            const bosses = schedule.filter(item => item.type === 'boss');
            
            expect(bosses[0].name).toBe('Boss A');
            expect(bosses[1].name).toBe('Boss B');
            
            // Check if reconstruction inserted a second date marker
            const dateMarkers = schedule.filter(item => item.type === 'date');
            expect(dateMarkers.length).toBeGreaterThanOrEqual(2); // 11.27 and 11.28
        });
    });
});
