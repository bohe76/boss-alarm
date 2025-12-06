import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BossDataManager, LocalStorageManager } from '../src/data-managers.js';

describe('BossDataManager Sorting Logic', () => {
    beforeEach(() => {
        // Mock LocalStorageManager to return empty fixed alarms by default
        vi.spyOn(LocalStorageManager, 'getFixedAlarms').mockReturnValue([]);
        
        // Set a fixed "Now" time for consistent testing in LOCAL timezone
        // Let's say "Now" is 2023-12-03 22:00:00 (Local)
        vi.useFakeTimers();
        // Explicitly set Local time to avoid timezone issues in tests
        const date = new Date(2023, 11, 3, 22, 0, 0); // Monday, December 3rd, 10 PM Local
        vi.setSystemTime(date);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        BossDataManager.setBossSchedule([]); // Clear schedule
    });

    it('should sort bosses correctly considering the date (today vs tomorrow)', () => {
        // Scenario:
        // Boss A: Today (Dec 3) 23:00 Local
        // Boss B: Tomorrow (Dec 4) 01:00 Local
        // "Now" is 22:00 Local
        // Expected Order: Boss A -> Boss B
        
        const todayBossDate = new Date(2023, 11, 3, 23, 0, 0);
        const tomorrowBossDate = new Date(2023, 11, 4, 1, 0, 0);

        const mockSchedule = [
            {
                id: 'boss-a',
                name: 'Today Boss',
                time: '23:00',
                scheduledDate: todayBossDate,
                type: 'boss'
            },
            {
                id: 'boss-b',
                name: 'Tomorrow Boss',
                time: '01:00',
                scheduledDate: tomorrowBossDate,
                type: 'boss'
            }
        ];

        BossDataManager.setBossSchedule(mockSchedule);

        const upcoming = BossDataManager.getUpcomingBosses(5);

        expect(upcoming.length).toBe(2);
        expect(upcoming[0].id).toBe('boss-a');
        expect(upcoming[1].id).toBe('boss-b');
        
        // Verify timestamps
        expect(upcoming[0].timestamp).toBe(todayBossDate.getTime());
        expect(upcoming[1].timestamp).toBe(tomorrowBossDate.getTime());
    });

    it('should handle fixed alarms correctly alongside dynamic bosses', () => {
        // Scenario:
        // Fixed Boss: 22:30 (Today Local)
        // Dynamic Boss: 23:00 (Today Local)
        // "Now" is 22:00 Local
        
        const dynamicBossDate = new Date(2023, 11, 3, 23, 0, 0);

        const mockSchedule = [
            {
                id: 'dynamic-1',
                name: 'Dynamic Boss',
                time: '23:00',
                scheduledDate: dynamicBossDate,
                type: 'boss'
            }
        ];
        BossDataManager.setBossSchedule(mockSchedule);

        // Mock a fixed alarm
        vi.spyOn(LocalStorageManager, 'getFixedAlarms').mockReturnValue([
            { id: 'fixed-1', name: 'Fixed Boss', time: '22:30', enabled: true, days: [0,1,2,3,4,5,6] }
        ]);

        const upcoming = BossDataManager.getUpcomingBosses(5);

        expect(upcoming.length).toBe(2);
        // Fixed boss (22:30 Local) should be first
        expect(upcoming[0].name).toBe('Fixed Boss');
        expect(upcoming[0].time).toBe('22:30'); 
        
        // Dynamic boss (23:00 Local) should be second
        expect(upcoming[1].id).toBe('dynamic-1');
    });
    
    it('should correctly handle "tomorrow" logic for fixed alarms', () => {
        // Scenario:
        // Now: 22:00 Local
        // Fixed Boss A: 21:00 (Already passed today -> Should be tomorrow 21:00 Local)
        // Fixed Boss B: 23:00 (Future today -> Should be today 23:00 Local)
        
        vi.spyOn(LocalStorageManager, 'getFixedAlarms').mockReturnValue([
            { id: 'fixed-passed', name: 'Passed Boss', time: '21:00', enabled: true, days: [0,1,2,3,4,5,6] },
            { id: 'fixed-future', name: 'Future Boss', time: '23:00', enabled: true, days: [0,1,2,3,4,5,6] }
        ]);
        
        // No dynamic bosses
        BossDataManager.setBossSchedule([]);

        const upcoming = BossDataManager.getUpcomingBosses(5);

        expect(upcoming.length).toBe(2);
        
        // Fixed Boss B (Today 23:00 Local) should come first
        expect(upcoming[0].name).toBe('Future Boss');
        
        // Fixed Boss A (Tomorrow 21:00 Local) should come second
        expect(upcoming[1].name).toBe('Passed Boss');
        
        // Verify timestamps
        const todayFuture = new Date(2023, 11, 3, 23, 0, 0).getTime();
        const tomorrowPassed = new Date(2023, 11, 4, 21, 0, 0).getTime();
        
        expect(upcoming[0].timestamp).toBe(todayFuture);
        expect(upcoming[1].timestamp).toBe(tomorrowPassed);
    });
});