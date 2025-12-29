import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseBossList } from '../src/boss-parser.js';

vi.mock('../src/logger.js', () => ({
    log: vi.fn()
}));

vi.mock('../src/data-managers.js', () => ({
    BossDataManager: {
        expandSchedule: vi.fn(items => {
            // 정렬 로직만 흉내내어 반환 (getTime() 사용으로 정확도 향상)
            return [...items].sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
        }),
        getDraftSchedule: vi.fn(() => []),
        setDraftSchedule: vi.fn()
    }
}));

describe('boss-parser', () => {
    let mockBossListInput;

    beforeEach(() => {
        vi.clearAllMocks();
        mockBossListInput = { value: '' };
    });

    describe('parseBossList', () => {
        it('should return error if first line is NOT a date', () => {
            mockBossListInput.value = '12:00 Boss A';
            const result = parseBossList(mockBossListInput);
            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('날짜 형식');
        });

        it('should correctly parse a valid list', () => {
            mockBossListInput.value = `11.27
12:00 Boss A
13:00 Boss B`;
            const result = parseBossList(mockBossListInput);
            expect(result.success).toBe(true);
            const bosses = result.mergedSchedule.filter(item => item.type === 'boss');
            expect(bosses.map(b => b.name)).toContain('Boss A');
            expect(bosses.map(b => b.name)).toContain('Boss B');
        });

        it('should handle time-order sorting', () => {
            mockBossListInput.value = `11.27
12:00 Boss A
15:00 Boss B`;
            const result = parseBossList(mockBossListInput);
            expect(result.success).toBe(true);
            const bosses = result.mergedSchedule.filter(item => item.type === 'boss');
            // 시간순 정렬 결과: 12:00 Boss A -> 15:00 Boss B
            expect(bosses[0].name).toBe('Boss A');
            expect(bosses[1].name).toBe('Boss B');
        });

        it('should handle rollover (23:00 -> 01:00)', () => {
            mockBossListInput.value = `11.27
23:00 Boss A
01:00 Boss B`;
            const result = parseBossList(mockBossListInput);
            const bosses = result.mergedSchedule.filter(item => item.type === 'boss');
            // 23:00(27일) -> 01:00(28일) 이므로 정렬 시에도 23:00가 먼저 옴
            expect(bosses[0].name).toBe('Boss A');
            expect(bosses[0].scheduledDate.getDate()).toBe(27);
            expect(bosses[1].name).toBe('Boss B');
            expect(bosses[1].scheduledDate.getDate()).toBe(28);
        });

        it('should parse memo and interval', () => {
            mockBossListInput.value = `11.27
14:00 Boss C #메모전달 @120`;
            const result = parseBossList(mockBossListInput);
            const boss = result.mergedSchedule.find(item => item.name === 'Boss C');
            expect(boss.memo).toBe('메모전달');
            expect(boss.interval).toBe(120);
        });
    });
});
