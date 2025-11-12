// src/boss-parser.js

import { log } from './logger.js';

export function parseBossList(bossListInput, BossDataManager) {
    const text = bossListInput.value;
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    let baseDate = null;
    let dayOffset = 0;
    let lastBossTimeInMinutes = -1;
    
    let removedPastBossCount = 0;
    const newBossSchedule = [];

    const normalizedText = text.replace(/\r\n|\r/g, '\n').replace(/[^\S\n]+/g, ' ').trim();
    const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line);

    // First, find a base date from the first line if it exists
    if (lines.length > 0) {
        const firstDateMatch = lines[0].match(/^(\d{1,2})\.(\d{1,2})$/);
        if (firstDateMatch) {
            const month = parseInt(firstDateMatch[1], 10) - 1;
            const day = parseInt(firstDateMatch[2], 10);
            baseDate = new Date(now.getFullYear(), month, day);
        }
    }
    // If no date was found in the whole file, default to today
    if (!baseDate) {
        baseDate = new Date(now);
    }
    baseDate.setHours(0,0,0,0); // Start at midnight for calculations

    lines.forEach(line => {
        const dateMatch = line.match(/^(\d{1,2})\.(\d{1,2})$/);
        if (dateMatch) {
            // When we find a date marker, we reset our base date and offsets
            const month = parseInt(dateMatch[1], 10) - 1;
            const day = parseInt(dateMatch[2], 10);
            baseDate = new Date(now.getFullYear(), month, day);
            baseDate.setHours(0,0,0,0);
            dayOffset = 0;
            lastBossTimeInMinutes = -1; // Reset for the new day's chronological check
            newBossSchedule.push({ type: 'date', value: line });
            return;
        }

        const parts = line.split(' ');
        if (parts.length >= 2) {
            const [bossHour, bossMinute] = parts[0].split(':').map(Number);
            const bossTimeInMinutes = bossHour * 60 + bossMinute;

            // Handle chronological wrap-around (e.g., 23:00 -> 01:00)
            if (lastBossTimeInMinutes !== -1 && bossTimeInMinutes < lastBossTimeInMinutes) {
                dayOffset++;
            }
            lastBossTimeInMinutes = bossTimeInMinutes;

            let scheduledDate = new Date(baseDate);
            scheduledDate.setDate(baseDate.getDate() + dayOffset);
            scheduledDate.setHours(bossHour, bossMinute);

            // Final, single filter for past bosses
            if (scheduledDate.getTime() < now.getTime()) {
                removedPastBossCount++;
                return; // Skip this boss
            }

            newBossSchedule.push({
                type: 'boss',
                time: parts[0],
                name: parts.slice(1).join(' '),
                scheduledDate: scheduledDate,
                alerted_5min: false,
                alerted_1min: false,
                alerted_0min: false,
            });
        }
    });
    
    BossDataManager.setBossSchedule(newBossSchedule);

    log(`${BossDataManager.getBossSchedule().filter(item => item.type === 'boss').length}개의 보스 일정을 불러왔습니다.`);
    if (removedPastBossCount > 0) {
        log(`${removedPastBossCount}개의 지난 보스 일정을 목록에서 제거했습니다.`, true);
    }
    // updateBossListTextarea(); // This function will be moved to ui-renderer.js
}