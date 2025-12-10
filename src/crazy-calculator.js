import { LocalStorageManager } from './data-managers.js';
import { log } from './logger.js';

export const formatTime = (seconds) => { // Export formatTime
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const CrazyCalculator = (() => {
    let stopwatchInterval = null;
    let countdownInterval = null;
    let stopwatchStartTime = 0;
    let gwangTime = 0; // Time when '광' button was pressed
    let currentStopwatchTime = 0;
    let expectedCountdownTime = 0; // Time to countdown from
    let currentCountdownTime = 0;
    let currentOverTime = 0;

    const startStopwatch = (updateDisplayCallback) => {
        if (stopwatchInterval) return; // Already running

        stopwatchStartTime = Date.now() - currentStopwatchTime * 1000; // Adjust start time if resuming
        stopwatchInterval = setInterval(() => {
            currentStopwatchTime = Math.floor((Date.now() - stopwatchStartTime) / 1000);
            updateDisplayCallback(formatTime(currentStopwatchTime));
        }, 1000);
    };

    const stopStopwatch = () => {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    };

    const resetCalculator = () => {
        stopStopwatch();
        clearInterval(countdownInterval);
        countdownInterval = null;
        stopwatchStartTime = 0;
        gwangTime = 0;
        currentStopwatchTime = 0;
        expectedCountdownTime = 0;
        currentCountdownTime = 0;
        currentOverTime = 0;
    };

    const triggerGwang = (updateExpectedTimeCallback) => {
        clearInterval(countdownInterval); // Clear previous countdown

        gwangTime = currentStopwatchTime;
        // Calculate 30% of the time based on 70% elapsed
        // If gwangTime is 70s, then 30s remaining.
        // gwangTime / 70 * 30
        expectedCountdownTime = Math.floor(gwangTime / 70 * 30);
        currentCountdownTime = expectedCountdownTime;

        // Update immediately
        updateExpectedTimeCallback(formatTime(currentCountdownTime), false);

        countdownInterval = setInterval(() => {
            if (currentCountdownTime > 0) {
                currentCountdownTime--;
                updateExpectedTimeCallback(formatTime(currentCountdownTime), false);
            } else {
                // Countdown finished, start over time
                clearInterval(countdownInterval);
                currentOverTime = 0;
                // Update immediately when transitioning to over time
                updateExpectedTimeCallback(formatTime(currentOverTime), true);
                countdownInterval = setInterval(() => {
                    currentOverTime++;
                    updateExpectedTimeCallback(formatTime(currentOverTime), true); // true for over time
                }, 1000);
            }
        }, 1000);
    };

    const calculateGwangTimesIfMissing = () => {
        if (gwangTime === 0 && currentStopwatchTime > 0) {
            // If gwang button was not pressed, calculate gwangTime as 70% of total time
            gwangTime = Math.floor(currentStopwatchTime * 70 / 100);
        }
        // afterGwangTime will be calculated based on gwangTime
    };

    const saveCrazyCalculation = async (bossName) => {
        if (!bossName) {
            log('보스 이름이 입력되지 않았습니다.', true);
            return false;
        }

        calculateGwangTimesIfMissing(); // Ensure gwangTime is set if not already

        const gwangTimeFormatted = formatTime(gwangTime);
        const afterGwangTime = currentStopwatchTime - gwangTime;
        const afterGwangTimeFormatted = formatTime(afterGwangTime);
        const totalTimeFormatted = formatTime(currentStopwatchTime);

        const newRecord = {
            id: Date.now(),
            bossName: bossName,
            gwangTime: gwangTimeFormatted,
            afterGwangTime: afterGwangTimeFormatted,
            totalTime: totalTimeFormatted,
            timestamp: new Date().toISOString()
        };

        const savedRecords = LocalStorageManager.getCrazyCalculatorRecords();
        savedRecords.unshift(newRecord); // Add to the beginning for "latest on top"
        LocalStorageManager.setCrazyCalculatorRecords(savedRecords);
        log(`광 계산 기록 저장됨: ${bossName} - 총 시간: ${totalTimeFormatted}`, false);
        return true;
    };

    const getCrazyCalculatorRecords = () => {
        return LocalStorageManager.getCrazyCalculatorRecords();
    };

    return {
        startStopwatch,
        stopStopwatch,
        resetCalculator,
        triggerGwang,
        saveCrazyCalculation,
        getCrazyCalculatorRecords,
        getGwangTime: () => { calculateGwangTimesIfMissing(); return gwangTime; },
        getAfterGwangTime: () => { calculateGwangTimesIfMissing(); return currentStopwatchTime - gwangTime; },
        getTotalTime: () => currentStopwatchTime,
        isStopwatchRunning: () => stopwatchInterval !== null,
        isGwangTriggered: () => gwangTime > 0
    };
})();

export { CrazyCalculator };