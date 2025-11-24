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
        alert("유효하지 않은 시간 형식입니다. (예: HH:MM, HH:MM:SS, HHMM, HHMMSS)");
        log("유효하지 않은 시간 형식입니다. (예: HH:MM, HH:MM:SS, HHMM, HHMMSS)", false);
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
