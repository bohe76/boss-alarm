import { describe, it, expect } from 'vitest';
import { calculateBossAppearanceTime } from './calculator.js';

describe('calculateBossAppearanceTime', () => {

    it('should correctly calculate the boss appearance time from a HH:MM:SS string', () => {
        // Arrange
        const remainingTime = '01:30:15'; // 1 hour, 30 minutes, 15 seconds
        const now = new Date();
        const expectedDate = new Date(now.getTime() + (1 * 60 * 60 * 1000) + (30 * 60 * 1000) + (15 * 1000));

        // Act
        const resultString = calculateBossAppearanceTime(remainingTime); // e.g., "11:30:15"
        
        // Assert
        expect(resultString).not.toBeNull();
        const [hours, minutes, seconds] = resultString.split(':').map(Number);
        const resultDate = new Date();
        resultDate.setHours(hours, minutes, seconds);

        // Allow for a small difference (e.g., 2 seconds) to account for test execution time
        const timeDifference = Math.abs(resultDate.getTime() - expectedDate.getTime());
        expect(timeDifference).toBeLessThan(2000); 
    });

    it('should return null for invalid time formats', () => {
        expect(calculateBossAppearanceTime('abc')).toBeNull();
        expect(calculateBossAppearanceTime('12:34:56:78')).toBeNull();
        expect(calculateBossAppearanceTime('12-34-56')).toBeNull();
    });
});
