// src/boss-parser.js

import { log } from './logger.js';
import { BossDataManager } from './data-managers.js'; // Import manager
import { generateUniqueId, padNumber } from './utils.js'; // Import utils
import { calculateBossAppearanceTime } from './calculator.js'; // Import calculateBossAppearanceTime

/**
 * 보스 목록 텍스트를 파싱하고 기존 데이터와 병합합니다.
 * @param {HTMLTextAreaElement} bossListInput - 보스 목록이 입력된 텍스트 영역
 * @returns {Object} - { success: boolean, mergedSchedule: Array, errors: string[] }
 */
export function parseBossList(bossListInput) {
    const text = bossListInput.value;
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    let baseDate = null;
    let dayOffset = 0;
    let lastBossTimeInSeconds = -1;
    
    const parsedBosses = []; // Only store boss objects temporarily
    const errors = []; // Store validation errors

    const normalizedText = text.replace(/\r\n|\r/g, '\n').replace(/[^\S\n]+/g, ' ').trim();
    const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Check if there are any date headers in the text
    const hasDateHeaders = lines.some(line => line.match(/^(\d{1,2})\.(\d{1,2})$/));

    try {
        // 1. Initial Parsing (Text -> Object with calculated Date)
        if (lines.length > 0) {
            const firstDateMatch = lines[0].match(/^(\d{1,2})\.(\d{1,2})$/);
            if (firstDateMatch) {
                const month = parseInt(firstDateMatch[1], 10) - 1;
                const day = parseInt(firstDateMatch[2], 10);
                baseDate = new Date(now.getFullYear(), month, day);
                if (isNaN(baseDate.getTime())) {
                    baseDate = new Date(now);
                }
            }
        }
        if (!baseDate) {
            baseDate = new Date(now);
        }
        baseDate.setHours(0,0,0,0);

        lines.forEach((line, index) => {
            const dateMatch = line.match(/^(\d{1,2})\.(\d{1,2})$/);
            if (dateMatch) {
                const month = parseInt(dateMatch[1], 10) - 1;
                const day = parseInt(dateMatch[2], 10);
                if (month < 0 || month > 11 || day < 1 || day > 31) {
                    const msg = `[줄 ${index + 1}] 유효하지 않은 날짜 값입니다: ${line}. 월은 1-12, 일은 1-31 사이여야 합니다.`;
                    log(msg, false);
                    errors.push(msg);
                    return;
                }
                const parsedDate = new Date(now.getFullYear(), month, day);
                if (isNaN(parsedDate.getTime())) {
                    const msg = `[줄 ${index + 1}] 유효하지 않은 날짜 형식입니다: ${line}.`;
                    log(msg, false);
                    errors.push(msg);
                    return;
                }
                baseDate = parsedDate;
                baseDate.setHours(0,0,0,0);
                dayOffset = 0;
                lastBossTimeInSeconds = -1;
                return; 
            }

            const parts = line.split(' ');
            if (parts.length < 2) {
                const msg = `[줄 ${index + 1}] 보스 이름이 없습니다: ${line}. (형식: HH:MM 보스이름)`;
                log(msg, false);
                errors.push(msg);
                return;
            }

            const timeString = parts[0];
            const appearanceTime = calculateBossAppearanceTime(timeString);

            if (!appearanceTime) {
                const msg = `[줄 ${index + 1}] 유효하지 않은 시간 형식입니다: ${timeString}. (형식: HH:MM, HH:MM:SS, HHMM, HHMMSS)`;
                log(msg, false);
                errors.push(msg);
                return;
            }

            const bossHour = appearanceTime.getHours();
            const bossMinute = appearanceTime.getMinutes();
            const bossSecond = appearanceTime.getSeconds();

            const bossTimeInSeconds = bossHour * 3600 + bossMinute * 60 + bossSecond;

            // Only apply chronological wrap-around if explicit date headers are NOT present
            if (!hasDateHeaders && lastBossTimeInSeconds !== -1 && bossTimeInSeconds < lastBossTimeInSeconds) {
                dayOffset++;
            }
            lastBossTimeInSeconds = bossTimeInSeconds;

            let scheduledDate = new Date(baseDate);
            scheduledDate.setDate(baseDate.getDate() + dayOffset);
            scheduledDate.setHours(bossHour, bossMinute, bossSecond);

            // Filtering past bosses logic removed as per instruction to allow editing.

            parsedBosses.push({
                type: 'boss',
                // ID will be assigned in the merge step
                time: `${padNumber(bossHour)}:${padNumber(bossMinute)}:${padNumber(bossSecond)}`,
                name: parts.slice(1).join(' '),
                scheduledDate: scheduledDate,
                alerted_5min: false,
                alerted_1min: false,
                alerted_0min: false,
            });
        });

        if (errors.length > 0) {
            return { success: false, mergedSchedule: [], errors: errors };
        }

        // 2. Smart Merge with Existing Data (SSOT)
        const currentSchedule = BossDataManager.getBossSchedule();
        const existingBosses = currentSchedule.filter(item => item.type === 'boss');
        const mergedBosses = [];
        
        const existingBossPool = [...existingBosses];

        parsedBosses.forEach(parsed => {
            const matchIndex = existingBossPool.findIndex(existing => existing.name === parsed.name);
            
            if (matchIndex !== -1) {
                // Found a match! Preserve ID and State.
                const existing = existingBossPool[matchIndex];
                mergedBosses.push({
                    ...existing, // Keep ID, alert states
                    time: parsed.time, // Update time string
                    scheduledDate: parsed.scheduledDate // Update calculated date
                });
                // Remove from pool to avoid double matching
                existingBossPool.splice(matchIndex, 1);
            } else {
                // New boss
                mergedBosses.push({
                    ...parsed,
                    id: generateUniqueId() // Assign new ID
                });
            }
        });

        // 3. Sort
        mergedBosses.sort((a, b) => a.scheduledDate - b.scheduledDate);

        // 4. Reconstruction with Date Markers
        const finalSchedule = [];
        let lastDateStr = "";

        mergedBosses.forEach(boss => {
            const d = boss.scheduledDate;
            const month = d.getMonth() + 1;
            const day = d.getDate();
            const currentDateStr = `${padNumber(month)}.${padNumber(day)}`;

            if (currentDateStr !== lastDateStr) {
                const markerDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                finalSchedule.push({
                    type: 'date',
                    value: currentDateStr,
                    scheduledDate: markerDate
                });
                lastDateStr = currentDateStr;
            }
            finalSchedule.push(boss);
        });
        
        // BossDataManager.setBossSchedule(finalSchedule); // Removed auto-save

        return { success: true, mergedSchedule: finalSchedule, errors: [] };

    } catch (error) {
        const msg = `보스 목록 파싱 중 치명적 오류: ${error.message}`;
        log(msg, true);
        console.error("Boss list parsing error:", error);
        return { success: false, mergedSchedule: [], errors: [msg] };
    }
}

// Deprecated: The sorting logic is now integrated into parseBossList and UI rendering.
// We keep a simplified version that just triggers the parse-sort-update cycle via BossDataManager.
export function getSortedBossListText(rawText) {
    // This function is now just a placeholder or helper.
    // Since we want "Time Sort" button to work, we should rely on parseBossList to sort and set data,
    // and then updateBossListTextarea to show it.
    // But this function is expected to RETURN text.
    
    // For now, let's just return the input text.
    // The actual sorting happens because 'parseBossList' updates the DataManager, 
    // and the UI subscribes to it.
    return rawText; 
}
