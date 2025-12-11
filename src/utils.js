import { log } from './logger.js';

export function padNumber(number) {
    return String(number).padStart(2, '0');
}

export function formatMonthDay(date) {
    const month = padNumber(date.getMonth() + 1);
    const day = padNumber(date.getDate());
    return `${month}.${day}`;
}

export function validateStandardClockTime(time) {
    const trimmedTime = time.trim();

    // HH:MM:SS format
    const hmsMatch = trimmedTime.match(/^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]:[0-5][0-9]$/);
    if (hmsMatch) return true;

    // HH:MM format
    const hmMatch = trimmedTime.match(/^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/);
    if (hmMatch) return true;

    // HHMM (4-digit) format
    const hhmmMatch = trimmedTime.match(/^(?:2[0-3]|[01]?[0-9])[0-5][0-9]$/);
    if (hhmmMatch) return true;

    // HHMMSS (6-digit) format
    const hhmmssMatch = trimmedTime.match(/^(?:2[0-3]|[01]?[0-9])[0-5][0-9][0-5][0-9]$/);
    if (hhmmssMatch) return true;
    
    return false;
}

export function validateCountdownTime(time) {
    const trimmedTime = time.trim();

    // MM:SS format (e.g., 99:59, 120:30)
    const mmColonSsMatch = trimmedTime.match(/^(\d+):([0-5][0-9])$/);
    if (mmColonSsMatch) return true;

    // MMSS (numeric, 4-digit or more) format (e.g., 9959, 12030)
    // Assumes the last two digits are seconds, and preceding digits are minutes
    const mmSsMatch = trimmedTime.match(/^(\d+)([0-5][0-9])$/);
    if (mmSsMatch) return true;
    
    return false;
}

export function validateBossSchedulerInput(time) {
    return validateStandardClockTime(time) || validateCountdownTime(time);
}


/**
 * 고정 알림 시간을 검증하고, 유효하지 않을 경우 alert 및 log 메시지를 출력합니다.
 * 고정 알림은 HH:MM 또는 HHMM (4자리) 형식만 지원하며 초를 포함할 수 없습니다.
 * @param {string} time - 검증할 시간 문자열.
 * @returns {boolean} 유효하면 true, 유효하지 않으면 false.
 */
export function validateFixedAlarmTime(time) {
    const trimmedTime = time.trim();

    // 1차 검증: validateStandardClockTime을 통해 기본적인 유효성 (HH:MM, HH:MM:SS, HHMM, HHMMSS) 확인
    if (!validateStandardClockTime(trimmedTime)) {
        alert("유효하지 않은 시간 형식입니다. (예: HH:MM, HHMM)");
        log("유효하지 않은 시간 형식입니다. (예: HH:MM, HHMM)", false);
        return false;
    }

    // 2차 검증: 고정 알림에 특화된 형식 (HH:MM 또는 HHMM만) 확인
    // 즉, 초를 포함하는 형식(HH:MM:SS, HHMMSS)은 허용하지 않음.
    const isHHMM = trimmedTime.match(/^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/);
    const isHHMM_noColon = trimmedTime.match(/^(?:2[0-3]|[01]?[0-9])[0-5][0-9]$/);

    if (!isHHMM && !isHHMM_noColon) {
        alert("고정 알림은 HH:MM 또는 HHMM (4자리) 형식만 지원합니다. 초를 포함할 수 없습니다.");
        log("고정 알림은 HH:MM 또는 HHMM (4자리) 형식만 지원합니다. 초를 포함할 수 없습니다.", false);
        return false;
    }

    return true;
}

// Helper function to generate a unique ID
export function generateUniqueId() {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculates the next occurrence of a fixed alarm based on selected days.
 * @param {object} alarm - The alarm object with `time` and `days` properties.
 * @param {Date} baseDate - The starting date for calculation, defaults to now.
 * @returns {Date|null} - The Date object for the next occurrence, or null if invalid.
 */
export function calculateNextOccurrence(alarm, baseDate = new Date()) {
    if (!alarm || !alarm.time || !alarm.days || alarm.days.length === 0) {
        return null;
    }

    const [hours, minutes, seconds] = alarm.time.split(':').map(Number);

    for (let i = 0; i < 8; i++) { // Check for the next 7 days + today (up to 8 iterations to cover a full week cycle)
        const nextDate = new Date(baseDate); // Start with a local Date copy of baseDate
        nextDate.setDate(baseDate.getDate() + i); // Set local day

        const dayOfWeek = nextDate.getDay(); // Get local day of week

        if (alarm.days.includes(dayOfWeek)) {
            nextDate.setHours(hours, minutes, seconds || 0, 0); // Set local hours, minutes, seconds

            // Compare with baseDate (which is also local now)
            if (nextDate.getTime() > baseDate.getTime()) {
                return nextDate;
            }
        }
    }

    return null; // Should not happen if days array is not empty
}


export const formatTime = (seconds) => { // Export formatTime
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${padNumber(minutes)}:${padNumber(remainingSeconds)}`;
};

export function formatTimeDifference(ms, showSeconds = true) {
    if (ms <= 0 || ms === Infinity) return showSeconds ? '(00:00:00)' : '(00:00)';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor((totalSeconds % 86400) / 3600); // Ensure hours don't exceed 23
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (showSeconds) {
        return `(${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)})`;
    } else {
        return `(${padNumber(hours)}:${padNumber(minutes)})`;
    }
}

// Helper function to format spawn time to HH:MM:SS
export function formatSpawnTime(timeString) {
    const parts = timeString.split(':');
    const hours = padNumber(parseInt(parts[0], 10));
    const minutes = padNumber(parseInt(parts[1], 10));
    const seconds = padNumber(parseInt(parts[2] || '00', 10));
    return `[${hours}:${minutes}:${seconds}]`;
}

/**
 * 시간 문자열을 HH:MM 형식으로 정규화합니다.
 * @param {string} timeStr - 입력된 시간 문자열 (예: "1230", "12:30")
 * @returns {string} - 정규화된 시간 문자열 (예: "12:30")
 */
export function normalizeTimeFormat(timeStr) {
    if (!timeStr) return timeStr;
    const cleanTime = timeStr.trim().replace(/:/g, ''); // 콜론 및 공백 제거
    if (cleanTime.length === 4) {
        return `${cleanTime.substring(0, 2)}:${cleanTime.substring(2)}`;
    }
    return timeStr.trim(); // 이미 포맷이 맞거나 4자리가 아닌 경우 (유효성 검사는 별도로 수행됨)
}

/**
 * 보스 목록 출력용 시간 포맷터
 * @param {string} timeStr - HH:MM:SS 형식의 시간 문자열
 * @returns {string} - 초가 00이면 HH:MM, 아니면 HH:MM:SS
 */
export function formatBossListTime(timeStr) {
    if (!timeStr) return "";
    // Check if it ends with ":00"
    if (timeStr.endsWith(':00')) {
        return timeStr.substring(0, 5); // Return "HH:MM"
    }
    return timeStr; // Return "HH:MM:SS"
}

/**
 * Parses a time string (HH:MM, HH:MM:SS, HHMM, HHMMSS) into its components.
 * This function PURELY parses the string and does NOT calculate based on current time.
 * @param {string} timeString - The time string to parse.
 * @returns {{hours: number, minutes: number, seconds: number}|null}
 */
export function getKoreanDayOfWeek(date) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
}

export function parseTime(timeString) {
    const trimmedInput = timeString.trim();
    const numericOnlyRegex = /^\d+$/;

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (numericOnlyRegex.test(trimmedInput)) {
        if (trimmedInput.length === 3) { // HMM (e.g., 315 -> 0315 -> 3h 15m)
            hours = parseInt(trimmedInput.substring(0, 1), 10);
            minutes = parseInt(trimmedInput.substring(1, 3), 10);
        } else if (trimmedInput.length === 4) { // HHMM
            hours = parseInt(trimmedInput.substring(0, 2), 10);
            minutes = parseInt(trimmedInput.substring(2, 4), 10);
        } else if (trimmedInput.length === 6) { // HHMMSS
            hours = parseInt(trimmedInput.substring(0, 2), 10);
            minutes = parseInt(trimmedInput.substring(2, 4), 10);
            seconds = parseInt(trimmedInput.substring(4, 6), 10);
        } else {
            return null; // Not a supported numeric format
        }
    } else {
        const timeRegex = /^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)$/;
        const match = trimmedInput.match(timeRegex);

        if (!match) return null;

        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        seconds = match[3] !== undefined ? parseInt(match[3], 10) : 0;
    }

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        return null; // Invalid time values
    }

    return { hours, minutes, seconds };
}
