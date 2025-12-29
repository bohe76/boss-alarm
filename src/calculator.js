// src/calculator.js

/**
 * Calculates the boss appearance time based on the current time and a given remaining time.
 *
 * @param {string} remainingTimeString - The remaining time in "HH:MM" or "HH:MM:SS" format.
 * @returns {string|null} The calculated boss appearance time in "HH:MM:SS" format, or null if the input is invalid.
 */
export function calculateBossAppearanceTime(remainingTimeString) {
    let input = remainingTimeString.trim();
    let isNegative = false;

    // 음수 부호(-) 처리
    if (input.startsWith('-')) {
        isNegative = true;
        input = input.substring(1).trim();
    }

    const numericOnlyRegex = /^\d+$/;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (numericOnlyRegex.test(input)) {
        // Handle numeric format (MMSS or HHMMSS)
        if (input.length === 4) { // HHMM
            hours = parseInt(input.substring(0, 2), 10);
            minutes = parseInt(input.substring(2, 4), 10);
        } else if (input.length === 6) { // HHMMSS
            hours = parseInt(input.substring(0, 2), 10);
            minutes = parseInt(input.substring(2, 4), 10);
            seconds = parseInt(input.substring(4, 6), 10);
        } else if (input.length === 3) { // HMM
            hours = parseInt(input.substring(0, 1), 10);
            minutes = parseInt(input.substring(1, 3), 10);
        } else {
            return null;
        }
    } else {
        // Handle HH:MM:SS or HH:MM format
        const timeRegex = /^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)$/;
        const match = input.match(timeRegex);

        if (!match) return null;

        if (match[3] !== undefined) { // HH:MM:SS
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            seconds = parseInt(match[3], 10);
        } else { // HH:MM
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            seconds = 0;
        }
    }

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours < 0 || hours > 99 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        return null;
    }

    const now = new Date();
    const multiplier = isNegative ? -1 : 1;

    if (!isNegative && hours === 0 && minutes === 0 && seconds === 0) {
        // 양수 00:00:00인 경우에만 기존처럼 '내일 자정' 특수 로직 유지
        now.setDate(now.getDate() + 1);
        now.setHours(0, 0, 0, 0);
    } else {
        now.setHours(now.getHours() + (hours * multiplier));
        now.setMinutes(now.getMinutes() + (minutes * multiplier));
        now.setSeconds(now.getSeconds() + (seconds * multiplier));
    }

    return now;
}

/**
 * Calculates the boss appearance time from a remaining time string in MM:SS or MMSS format.
 * @param {string} remainingTimeString - The remaining time.
 * @returns {Date|null} The calculated appearance time as a Date object, or null if invalid.
 */
export function calculateAppearanceTimeFromMinutes(remainingTimeString) {
    const trimmedInput = remainingTimeString.trim();
    let minutes = 0;
    let seconds = 0;

    if (/^\d+$/.test(trimmedInput)) { // MMSS format
        if (trimmedInput.length <= 2) {
            seconds = parseInt(trimmedInput, 10);
        } else {
            seconds = parseInt(trimmedInput.slice(-2), 10);
            minutes = parseInt(trimmedInput.slice(0, -2), 10);
        }
    } else { // MM:SS format
        const parts = trimmedInput.split(':');
        if (parts.length === 2) {
            minutes = parseInt(parts[0], 10);
            seconds = parseInt(parts[1], 10);
        } else {
            return null; // Invalid format
        }
    }

    // Validation
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
        return null;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    now.setSeconds(now.getSeconds() + seconds);
    return now;
}
