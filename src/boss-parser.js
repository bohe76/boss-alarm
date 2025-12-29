import { log } from './logger.js';

export function parseBossList(inputElement) {
    const rawText = inputElement.value || "";
    const normalizedText = rawText.replace(/\r\n/g, '\n').trim();
    const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length === 0) return { success: true, mergedSchedule: [], errors: [] };

    // [강제 규칙] 첫 번째 줄은 반드시 날짜(MM.DD) 형식이어야 함
    const firstLine = lines[0];
    const dateMatch = firstLine.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (!dateMatch) {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return {
            success: false,
            mergedSchedule: [],
            errors: [`첫 번째 줄은 반드시 날짜 형식(예: ${mm}.${dd})이어야 합니다.`]
        };
    }

    const now = new Date();
    let baseDate = new Date(now.getFullYear(), parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]));
    baseDate.setHours(0, 0, 0, 0);

    let lastTimeInMinutes = -1;
    const mergedSchedule = [];
    const errors = [];

    try {
        lines.forEach((line, index) => {
            // 날짜 행인 경우 (첫 줄 포함)
            const currentDateMatch = line.match(/^(\d{1,2})\.(\d{1,2})$/);
            if (currentDateMatch) {
                baseDate = new Date(now.getFullYear(), parseInt(currentDateMatch[1]) - 1, parseInt(currentDateMatch[2]));
                baseDate.setHours(0, 0, 0, 0);
                lastTimeInMinutes = -1; // 날짜가 바뀌면 시간 역전 감지 초기화
                return;
            }

            // 보스 행 파싱 (HH:MM 또는 HH:MM:SS)
            const timeMatch = line.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(.+)$/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1], 10);
                const minutes = parseInt(timeMatch[2], 10);
                const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
                let content = timeMatch[4].trim();

                // 1. 시간 범위 검사
                if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
                    errors.push(`시간 범위 오류 (줄 ${index + 1}): "${line}" - 유효하지 않은 시간입니다.`);
                    return;
                }

                // 2. 이름 및 메모 분리 (# 구분자 우선)
                let bossName = content;
                let memo = "";
                if (content.includes('#')) {
                    const parts = content.split('#');
                    bossName = parts[0].trim();
                    memo = parts[1].trim();
                } else {
                    // 기존 공백 하위 호환성 (단, 이름에 공백이 있을 수 있으므로 주의)
                    const legacyMemoMatch = content.match(/^(.+?)\s+(.+)$/);
                    if (legacyMemoMatch) {
                        bossName = legacyMemoMatch[1].trim();
                        memo = legacyMemoMatch[2].trim();
                    }
                }

                if (!bossName) {
                    errors.push(`이름 오류 (줄 ${index + 1}): 보스 이름이 비어 있습니다.`);
                    return;
                }

                // 3. 시간 역전 감지 (자동 날짜 롤오버)
                const currentTimeInMinutes = hours * 60 + minutes;
                if (lastTimeInMinutes !== -1 && currentTimeInMinutes < lastTimeInMinutes) {
                    baseDate.setDate(baseDate.getDate() + 1);
                }
                lastTimeInMinutes = currentTimeInMinutes;

                const scheduledDate = new Date(baseDate);
                scheduledDate.setHours(hours, minutes, seconds, 0);

                mergedSchedule.push({
                    id: `boss-${bossName}-${scheduledDate.getTime()}`,
                    name: bossName,
                    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${timeMatch[3] ? ':' + String(seconds).padStart(2, '0') : ''}`,
                    timeFormat: timeMatch[3] ? 'hms' : 'hm',
                    memo: memo,
                    type: 'boss',
                    scheduledDate: scheduledDate
                });
            } else {
                errors.push(`형식 오류 (줄 ${index + 1}): "${line}" - (HH:MM 보스명) 형식이 아닙니다.`);
            }
        });

        if (errors.length > 0 && mergedSchedule.length === 0) {
            return { success: false, mergedSchedule: [], errors };
        }

        // 시간순 정렬
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
