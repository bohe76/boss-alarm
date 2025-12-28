import { log } from './logger.js';

export function parseBossList(inputElement) {
    const rawText = inputElement.value || "";
    const normalizedText = rawText.replace(/\r\n/g, '\n').trim();
    const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line);

    // Filter out date headers like "MM.DD"
    const bossLines = lines.filter(line => !line.match(/^(\d{1,2})\.(\d{1,2})$/));

    const now = new Date();
    let baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    baseDate.setHours(0, 0, 0, 0);
    let lastTimeInMinutes = -1;

    const mergedSchedule = [];
    const errors = [];

    try {
        bossLines.forEach((line, index) => {
            const timeMatch = line.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(.+)$/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1], 10);
                const minutes = parseInt(timeMatch[2], 10);
                const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
                let bossSpec = timeMatch[4].trim();

                let bossName = bossSpec;
                let memo = "";
                const memoMatch = bossSpec.match(/^(.+?)\s+(.+)$/);
                if (memoMatch) {
                    bossName = memoMatch[1].trim();
                    memo = memoMatch[2].trim();
                }

                // [시간 역전 감지] 이전 보스보다 시간이 이르면 날짜를 다음 날로 증가
                const currentTimeInMinutes = hours * 60 + minutes;
                if (lastTimeInMinutes !== -1 && currentTimeInMinutes < lastTimeInMinutes) {
                    baseDate.setDate(baseDate.getDate() + 1);
                }
                lastTimeInMinutes = currentTimeInMinutes;

                const scheduledDate = new Date(baseDate);
                scheduledDate.setHours(hours, minutes, seconds, 0);

                mergedSchedule.push({
                    id: `boss-${Date.now()}-${index}`,
                    name: bossName,
                    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${timeMatch[3] ? ':' + String(seconds).padStart(2, '0') : ''}`,
                    memo: memo,
                    type: 'boss',
                    scheduledDate: scheduledDate
                });
            } else {
                errors.push(`형식 오류 (줄 ${index + 1}): "${line}"`);
            }
        });

        if (errors.length > 0 && mergedSchedule.length === 0) {
            return { success: false, mergedSchedule: [], errors };
        }

        // Sort by time
        mergedSchedule.sort((a, b) => a.scheduledDate - b.scheduledDate);

        return { success: true, mergedSchedule, errors };

    } catch (error) {
        const msg = `보스 목록 파싱 중 치명적 오류: ${error.message}`;
        log(msg, true);
        console.error("Boss list parsing error:", error);
        return { success: false, mergedSchedule: [], errors: [msg] };
    }
}

export function getSortedBossListText(rawText) {
    return rawText;
}
