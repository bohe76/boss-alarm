// src/calculator.js

/**
 * Calculates the boss appearance time based on the current time and a given remaining time.
 *
 * @param {string} remainingTimeString - The remaining time in "HH:MM" or "HH:MM:SS" format.
 * @returns {string|null} The calculated boss appearance time in "HH:MM:SS" format, or null if the input is invalid.
 */
export function calculateBossAppearanceTime(remainingTimeString) {
    const trimmedInput = remainingTimeString.trim();
    const numericOnlyRegex = /^\d+$/;

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (numericOnlyRegex.test(trimmedInput)) {
        // Handle numeric format (HHMM or HHMMSS)
        if (trimmedInput.length === 4) { // HHMM
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
        // Handle HH:MM or HH:MM:SS format
        const timeRegex = /^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)$/;
        const match = trimmedInput.match(timeRegex);

        if (!match) {
            return null; // Invalid format
        }
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        seconds = match[3] ? parseInt(match[3], 10) : 0;
    }

    // Basic validation for time components
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours < 0 || hours > 99 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        return null; // Invalid time values
    }

    const now = new Date();
    now.setHours(now.getHours() + hours);
    now.setMinutes(now.getMinutes() + minutes);
    now.setSeconds(now.getSeconds() + seconds);

    const appearanceHours = String(now.getHours()).padStart(2, '0');
    const appearanceMinutes = String(now.getMinutes()).padStart(2, '0');
    const appearanceSeconds = String(now.getSeconds()).padStart(2, '0');

    return `${appearanceHours}:${appearanceMinutes}:${appearanceSeconds}`;
}
