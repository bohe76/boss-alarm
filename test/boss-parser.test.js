process.env.TZ = 'UTC';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseBossList, getSortedBossListText } from '../src/boss-parser.js';
import { BossDataManager } from '../src/data-managers.js';
import * as Logger from '../src/logger.js';

// Mock dependencies
vi.mock('../src/data-managers.js', () => ({
    BossDataManager: {
        setBossSchedule: vi.fn(),
    },
}));

vi.mock('../src/logger.js', () => ({
    log: vi.fn(),
}));

describe('boss-parser', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Mock Date to control 'now'
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-11-27T10:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('parseBossList', () => {
        const mockBossListInput = {
            value: ''
        };

        it('should parse a simple boss list correctly', () => {
            mockBossListInput.value = '11:00 Boss A\n12:00 Boss B';
            parseBossList(mockBossListInput);

            expect(BossDataManager.setBossSchedule).toHaveBeenCalledOnce();
            const schedule = BossDataManager.setBossSchedule.mock.calls[0][0];
            expect(schedule).toHaveLength(2);
            expect(schedule[0].name).toBe('Boss A');
            expect(schedule[0].scheduledDate.getUTCHours()).toBe(11);
            expect(schedule[1].name).toBe('Boss B');
            expect(schedule[1].scheduledDate.getUTCHours()).toBe(12);
        });

        it('should handle date markers and day rollovers', () => {
            mockBossListInput.value = '11.27\n23:00 Boss C\n01:00 Boss D';
            parseBossList(mockBossListInput);

            expect(BossDataManager.setBossSchedule).toHaveBeenCalledOnce();
            const schedule = BossDataManager.setBossSchedule.mock.calls[0][0];
            expect(schedule).toHaveLength(3); // date marker + 2 bosses
            expect(schedule[0].type).toBe('date');
            expect(schedule[1].name).toBe('Boss C');
            expect(schedule[1].scheduledDate.getUTCDate()).toBe(27);
            expect(schedule[2].name).toBe('Boss D');
            expect(schedule[2].scheduledDate.getUTCDate()).toBe(28); // Day rolled over
        });

        it('should filter out past bosses', () => {
            mockBossListInput.value = '09:00 Past Boss\n11:00 Future Boss';
            parseBossList(mockBossListInput);
            
            expect(BossDataManager.setBossSchedule).toHaveBeenCalledOnce();
            const schedule = BossDataManager.setBossSchedule.mock.calls[0][0];
            expect(schedule).toHaveLength(1);
            expect(schedule[0].name).toBe('Future Boss');
            expect(Logger.log).toHaveBeenCalledWith('1개의 지난 보스 일정을 목록에서 제거했습니다.', true);
        });

        it('should log warnings for invalid lines', () => {
            mockBossListInput.value = '12:00\ninvalid-time Boss';
            parseBossList(mockBossListInput);
            expect(Logger.log).toHaveBeenCalledWith('경고: 보스 이름이 없습니다: 12:00. 이 줄은 건너뜁니다.', false);
            expect(Logger.log).toHaveBeenCalledWith('경고: 유효하지 않은 시간 형식입니다: invalid-time. 이 줄은 건너뜁니다.', false);
        });
    });

    describe('getSortedBossListText', () => {
        it('should sort a simple list by time, handling day rollover', () => {
            const rawText = '14:00 Boss B\n11:00 Boss A';
            const sortedText = getSortedBossListText(rawText);
            // Expect 14:00 to be today (Nov 27) and 11:00 to be tomorrow (Nov 28)
            const expectedText = '11.27\n14:00 Boss B\n11.28\n11:00 Boss A';
            expect(sortedText).toBe(expectedText);
        });

        it('should sort across different date markers', () => {
            const rawText = '11.28\n01:00 Boss D\n11.27\n23:00 Boss C';
            const sortedText = getSortedBossListText(rawText);
            const expectedText = '11.27\n23:00 Boss C\n11.28\n01:00 Boss D';
            expect(sortedText).toBe(expectedText);
        });

        it('should handle day rollovers within a block', () => {
            const rawText = '11.27\n23:00 Boss C\n01:00 Boss D';
            const sortedText = getSortedBossListText(rawText);
            const correctExpectedText = '11.27\n23:00 Boss C\n11.28\n01:00 Boss D';
            expect(sortedText).toBe(correctExpectedText);
        });

        it('should return an empty string for empty input', () => {
            expect(getSortedBossListText('')).toBe('');
        });

        it('should ignore invalid lines during sorting', () => {
            const rawText = '14:00 Boss B\ninvalid line\n11:00 Boss A';
            const sortedText = getSortedBossListText(rawText);
            const expectedText = '11.27\n14:00 Boss B\n11.28\n11:00 Boss A';
            expect(sortedText.includes('invalid line')).toBe(false);
            expect(sortedText).toBe(expectedText);
        });
    });
});
