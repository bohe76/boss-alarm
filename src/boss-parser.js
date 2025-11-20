// src/boss-parser.js

import { log } from './logger.js';
import { BossDataManager } from './data-managers.js'; // Import manager

export function parseBossList(bossListInput) {
    const text = bossListInput.value;
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    let baseDate = null;
    let dayOffset = 0;
    let lastBossTimeInSeconds = -1;
    
    let removedPastBossCount = 0;
    const newBossSchedule = [];

    const normalizedText = text.replace(/\r\n|\r/g, '\n').replace(/[^\S\n]+/g, ' ').trim();
    const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line);

    try {
        // First, find a base date from the first line if it exists
        if (lines.length > 0) {
            const firstDateMatch = lines[0].match(/^(\d{1,2})\.(\d{1,2})$/);
            if (firstDateMatch) {
                const month = parseInt(firstDateMatch[1], 10) - 1;
                const day = parseInt(firstDateMatch[2], 10);
                baseDate = new Date(now.getFullYear(), month, day);
                if (isNaN(baseDate.getTime())) { // Check for invalid date
                    log(`경고: 유효하지 않은 날짜 형식입니다: ${lines[0]}. 현재 날짜를 기준으로 파싱을 계속합니다.`, false);
                    baseDate = new Date(now);
                }
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
                
                            // Add range validation for month and day
                            if (month < 0 || month > 11 || day < 1 || day > 31) {
                                log(`경고: 유효하지 않은 날짜 값입니다: ${line}. 월은 1-12, 일은 1-31 사이여야 합니다. 이 줄은 건너뜁니다.`, false);
                                return;
                            }
                
                            const parsedDate = new Date(now.getFullYear(), month, day);
                            if (isNaN(parsedDate.getTime())) { // This check is still useful for things like Feb 30th
                                log(`경고: 유효하지 않은 날짜 형식입니다: ${line}. 이 줄은 건너뜁니다.`, false);
                                return;
                            }                baseDate = parsedDate;
                baseDate.setHours(0,0,0,0);
                dayOffset = 0;
                lastBossTimeInSeconds = -1; // Reset for the new day's chronological check
                newBossSchedule.push({ type: 'date', value: line });
                return;
            }

            const parts = line.split(' ');
            if (parts.length < 2) {
                log(`경고: 보스 이름이 없습니다: ${line}. 이 줄은 건너뜁니다.`, false);
                return;
            }

            const timeMatch = parts[0].match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
            if (!timeMatch) {
                log(`경고: 유효하지 않은 시간 형식입니다: ${parts[0]}. 이 줄은 건너뜁니다.`, false);
                return;
            }
            const bossHour = parseInt(timeMatch[1], 10);
            const bossMinute = parseInt(timeMatch[2], 10);
            const bossSecond = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

            if (isNaN(bossHour) || isNaN(bossMinute) || isNaN(bossSecond) || bossHour < 0 || bossHour > 23 || bossMinute < 0 || bossMinute > 59 || bossSecond < 0 || bossSecond > 59) {
                log(`경고: 유효하지 않은 시간 값입니다: ${parts[0]}. 이 줄은 건너뜁니다.`, false);
                return;
            }

            const bossTimeInSeconds = bossHour * 3600 + bossMinute * 60 + bossSecond;

            // Handle chronological wrap-around (e.g., 23:00 -> 01:00)
            if (lastBossTimeInSeconds !== -1 && bossTimeInSeconds < lastBossTimeInSeconds) {
                dayOffset++;
            }
            lastBossTimeInSeconds = bossTimeInSeconds;

            let scheduledDate = new Date(baseDate);
            scheduledDate.setDate(baseDate.getDate() + dayOffset);
            scheduledDate.setHours(bossHour, bossMinute, bossSecond);

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
        });
        
        BossDataManager.setBossSchedule(newBossSchedule);

        if (newBossSchedule.filter(item => item.type === 'boss').length === 0) {
            log("보스 목록에서 유효한 보스 일정을 찾을 수 없습니다. 형식을 확인해주세요.", false);
        } else {
            log(`${newBossSchedule.filter(item => item.type === 'boss').length}개의 보스 일정을 불러왔습니다.`);
        }
        if (removedPastBossCount > 0) {
            log(`${removedPastBossCount}개의 지난 보스 일정을 목록에서 제거했습니다.`, true);
        }
    } catch (error) {
        log(`보스 목록 파싱 중 오류가 발생했습니다: ${error.message}`, true);
        console.error("Boss list parsing error:", error);
    }
}

export function getSortedBossListText(rawText) {
    try {
        const now = new Date();
        const allBossObjects = [];
        const normalizedText = rawText.replace(/\r\n|\r/g, '\n').trim();
        if (!normalizedText) return "";

        // Step 1: Group lines by the date markers that precede them.
        const dateBlockRegex = /(\d{1,2}\.\d{1,2})/;
        const parts = normalizedText.split(dateBlockRegex).filter(Boolean);

        const blocks = [];
        let i = 0;
        // If the first part is not a date, it belongs to "today" or the first available date
        if (parts.length > 0 && !parts[0].match(dateBlockRegex)) {
            blocks.push({ date: null, lines: parts[0].trim().split('\n') });
            i = 1;
        }

        for (; i < parts.length; i += 2) {
            const date = parts[i];
            const lines = (parts[i + 1] || "").trim().split('\n');
            blocks.push({ date, lines });
        }

        // Step 2: Process each block
        for (const block of blocks) {
            let baseDate;
            if (block.date) {
                const month = parseInt(block.date.split('.')[0], 10) - 1;
                const day = parseInt(block.date.split('.')[1], 10);
                if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                    const parsedDate = new Date(now.getFullYear(), month, day);
                    if (!isNaN(parsedDate.getTime())) {
                        baseDate = parsedDate;
                    }
                }
            }
            
            if (!baseDate) {
                // Find the first valid date in the whole text if the first block has no date
                const firstDateMatch = normalizedText.match(dateBlockRegex);
                if(firstDateMatch) {
                    const month = parseInt(firstDateMatch[0].split('.')[0], 10) - 1;
                    const day = parseInt(firstDateMatch[0].split('.')[1], 10);
                    baseDate = new Date(now.getFullYear(), month, day);
                } else {
                    baseDate = new Date(now);
                }
            }
            baseDate.setHours(0, 0, 0, 0);

            const bossLinesInBlock = block.lines.map(l => l.trim()).filter(Boolean);
            const tempBosses = [];

            // Create simple objects
            bossLinesInBlock.forEach(line => {
                const normalizedLine = line.replace(/[^\S\n]+/g, ' '); // 여러 공백을 단일 공백으로 정규화
                const parts = normalizedLine.split(' ');
                if (parts.length < 2) return;
                const timeMatch = parts[0].match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                if (!timeMatch) return;
                tempBosses.push({ time: parts[0], name: parts.slice(1).join(' ') });
            });

            // Sort by time string within the block
            tempBosses.sort((a, b) => a.time.localeCompare(b.time));

            // Assign full dates with dayOffset logic
            let dayOffset = 0;
            let lastBossTimeInSeconds = -1;
            tempBosses.forEach(boss => {
                const timeMatch = boss.time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                const bossHour = parseInt(timeMatch[1], 10);
                const bossMinute = parseInt(timeMatch[2], 10);
                const bossSecond = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
                if (isNaN(bossHour) || isNaN(bossMinute)) return;

                const bossTimeInSeconds = bossHour * 3600 + bossMinute * 60 + bossSecond;
                if (lastBossTimeInSeconds !== -1 && bossTimeInSeconds < lastBossTimeInSeconds) {
                    dayOffset++;
                }
                lastBossTimeInSeconds = bossTimeInSeconds;

                let scheduledDate = new Date(baseDate);
                scheduledDate.setDate(baseDate.getDate() + dayOffset);
                scheduledDate.setHours(bossHour, bossMinute, bossSecond);

                allBossObjects.push({ ...boss, scheduledDate });
            });
        }

        // Step 3: Final sort and reconstruction
        allBossObjects.sort((a, b) => a.scheduledDate - b.scheduledDate);

        let newText = "";
        let lastDateStr = "";
        allBossObjects.forEach(boss => {
            const d = boss.scheduledDate;
            const currentDateStr = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
            if (currentDateStr !== lastDateStr) {
                if (newText !== "") newText += "\n";
                newText += currentDateStr;
                lastDateStr = currentDateStr;
            }
            newText += `\n${boss.time} ${boss.name}`;
        });

        return newText.trim();
    } catch (error) {
        log(`보스 목록 정렬 중 오류가 발생했습니다: ${error.message}`, true);
        console.error("Boss list sorting error:", error);
        return rawText;
    }
}
