// src/alarm-scheduler.js

import { log } from './logger.js';
import { speak } from './speech.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { renderAlarmStatusSummary } from './ui-renderer.js'; // Import UI function, renderAlarmStatusSummary
import { EventBus } from './event-bus.js';

let alertTimerId = null;
let dashboardTimerId = null; // New variable for dashboard interval
// Removed: let isAlarmRunning = false; // No longer needed, rely on LocalStorageManager

export function startAlarm(DOM) { // Added DOM parameter
    // Removed: isAlarmRunning = true; // No longer needed
    LocalStorageManager.setAlarmRunningState(true); // Save state
    log("알림 시스템을 시작합니다.");
    speak("보스 알리미를 시작합니다.");
    log(`${BossDataManager.getBossSchedule().filter(item => item.type === 'boss').length}개의 보스가 목록에 있습니다.`, true);
    alertTimerId = setInterval(checkAlarms, 1000); // Simplified setInterval call
    dashboardTimerId = setInterval(() => EventBus.emit('refresh-dashboard', DOM), 1000); // Reintroduce dashboard interval
    renderAlarmStatusSummary(DOM); // Update status immediately
}

export function stopAlarm(DOM) {
    // Removed: isAlarmRunning = false; // No longer needed
    LocalStorageManager.setAlarmRunningState(false); // Save state
    if (alertTimerId) {
        clearInterval(alertTimerId);
        alertTimerId = null;
    }
    if (dashboardTimerId) { // Reintroduce clearing dashboard interval
        clearInterval(dashboardTimerId);
        dashboardTimerId = null;
    }
    log("알림 시스템을 중지합니다.");
    speak("알리미를 중지합니다.");
    renderAlarmStatusSummary(DOM); // Update status immediately
}

export function getIsAlarmRunning() {
    return LocalStorageManager.getAlarmRunningState(); // Get state from LocalStorageManager
}

export function checkAlarms() { // Removed updateBossListTextarea parameter
    const now = new Date();
    const currentTimeString = now.toTimeString().substring(0, 5); 

    const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
    const oneMinLater = new Date(now.getTime() + 1 * 60 * 1000);

    // 자정(00:00)이 되면 모든 보스의 알림 상태를 'false'로 초기화 (매일 반복을 위함)
    if (currentTimeString === '00:00') {
        let resetCount = 0;
        BossDataManager.getBossSchedule().forEach(boss => {
            if (boss.type === 'boss' && (boss.alerted_5min || boss.alerted_1min || boss.alerted_0min)) {
                boss.alerted_5min = false;
                boss.alerted_1min = false;
                boss.alerted_0min = false;
                resetCount++;
            }
        });
        
        const fixedAlarms = LocalStorageManager.getFixedAlarms();
        fixedAlarms.forEach(alarm => {
            if (alarm.alerted_5min || alarm.alerted_1min || alarm.alerted_0min) {
                alarm.alerted_5min = false;
                alarm.alerted_1min = false;
                alarm.alerted_0min = false;
                LocalStorageManager.updateFixedAlarm(alarm.id, alarm); // Save updated state
                resetCount++;
            }
        });
        if (resetCount > 0) {
            log("자정이 되어 모든 알림 상태를 초기화합니다.", true);
        }
    }

    let bossesToRemove = [];
    
    // Combine dynamic and fixed alarms for checking and next boss determination
    const allAlarms = [
        ...BossDataManager.getBossSchedule().filter(boss => boss.type === 'boss'),
        ...LocalStorageManager.getFixedAlarms().filter(alarm => alarm.enabled).map(alarm => ({ ...alarm, isFixed: true }))
    ];

    // Sort all alarms by time for consistent processing
    allAlarms.sort((a, b) => {
        const [aH, aM, aS] = a.time.split(':').map(Number);
        const aTotalSeconds = aH * 3600 + aM * 60 + (aS || 0);
        const [bH, bM, bS] = b.time.split(':').map(Number);
        const bTotalSeconds = bH * 3600 + bM * 60 + (bS || 0);
        return aTotalSeconds - bTotalSeconds;
    });

    let nextBoss = null;
    let minTimeDiff = Infinity;

    for (const alarm of allAlarms) {
        const [hours, minutes, seconds] = alarm.time.split(':').map(Number);
        const alarmTimeToday = new Date();
        alarmTimeToday.setHours(hours, minutes, seconds || 0, 0);

        // If alarm time has already passed today, consider it for tomorrow
        if (alarmTimeToday.getTime() <= now.getTime() - 1000) { // 1 second grace period
            alarmTimeToday.setDate(alarmTimeToday.getDate() + 1);
        }

        const bossScheduledTime = alarmTimeToday.getTime();

        // --- 5분 전 알림 체크 ---
        if (Math.abs(bossScheduledTime - fiveMinLater.getTime()) < 1000 && !alarm.alerted_5min) {
            alarm.alerted_5min = true;
            if (alarm.isFixed) LocalStorageManager.updateFixedAlarm(alarm.id, alarm);
            const msg = `5분 전, ${alarm.name}`;
            log(msg, true);
            speak(msg);
        }

        // --- 1분 전 알림 체크 ---
        if (Math.abs(bossScheduledTime - oneMinLater.getTime()) < 1000 && !alarm.alerted_1min) {
            alarm.alerted_1min = true;
            if (alarm.isFixed) LocalStorageManager.updateFixedAlarm(alarm.id, alarm);
            const msg = `1분 전, ${alarm.name}`;
            log(msg, true);
            speak(msg);
        }

        // --- 정각 알림 체크 ---
        if (Math.abs(bossScheduledTime - now.getTime()) < 1000 && !alarm.alerted_0min) {
            alarm.alerted_0min = true;
            if (alarm.isFixed) LocalStorageManager.updateFixedAlarm(alarm.id, alarm);
            const msg = `${alarm.name} 젠 입니다.`;
            log(msg, true);
            speak(msg);
            if (!alarm.isFixed) { // Only remove dynamic bosses
                bossesToRemove.push(alarm); // Store reference to boss object
            }
        }
    }

    // 알림이 발생한 일반 보스를 bossSchedule에서 제거
    if (bossesToRemove.length > 0) {
        let currentBossSchedule = BossDataManager.getBossSchedule();
        currentBossSchedule = currentBossSchedule.filter(boss =>
            !bossesToRemove.some(removedBoss => removedBoss === boss)
        );
        BossDataManager.setBossSchedule(currentBossSchedule);
    }

    // Determine the next boss for display (simplified and correct)
    let potentialNextAlarms = allAlarms.map(alarm => {
        const [hours, minutes, seconds] = alarm.time.split(':').map(Number);
        const alarmTimeToday = new Date();
        alarmTimeToday.setHours(hours, minutes, seconds || 0, 0);

        let timeDiff = alarmTimeToday.getTime() - now.getTime();
        if (timeDiff < 0) {
            alarmTimeToday.setDate(alarmTimeToday.getDate() + 1);
            timeDiff = alarmTimeToday.getTime() - now.getTime();
        }
        return { ...alarm, timestamp: alarmTimeToday.getTime(), timeDiff: timeDiff };
    }).filter(alarm => alarm.timeDiff >= 0) // Only consider future alarms
      .sort((a, b) => a.timeDiff - b.timeDiff); // Sort by closest future alarm

    if (potentialNextAlarms.length > 0) {
        const closestAlarm = potentialNextAlarms[0];
        minTimeDiff = closestAlarm.timeDiff;
        nextBoss = { ...closestAlarm };
        delete nextBoss.timeDiff; // Clean up temporary property
    } else {
        nextBoss = null;
        minTimeDiff = Infinity;
    }

    BossDataManager.setNextBossInfo(nextBoss, minTimeDiff);
}
