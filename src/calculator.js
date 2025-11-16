// src/calculator.js

/**
 * Calculates the boss appearance time based on the current time and a given remaining time.
 *
 * @param {string} remainingTimeString - The remaining time in "HH:MM" or "HH:MM:SS" format.
 * @returns {string|null} The calculated boss appearance time in "HH:MM:SS" format, or null if the input is invalid.
 */
export function calculateBossAppearanceTime(remainingTimeString) {
    // Regex to validate HH:MM or HH:MM:SS format
    const timeRegex = /^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)$/;
    const match = remainingTimeString.match(timeRegex);

    if (!match) {
        return null; // Invalid format
    }

    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2], 10);
    let seconds = match[3] ? parseInt(match[3], 10) : 0; // Default to 0 if seconds are omitted

    // Basic validation for time components
    if (hours < 0 || hours > 99 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
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
