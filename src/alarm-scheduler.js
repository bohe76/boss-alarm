// src/alarm-scheduler.js

import { log } from './logger.js';
import { speak } from './speech.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js'; // Import managers
import { updateBossListTextarea, renderDashboard, renderAlarmStatusSummary } from './ui-renderer.js'; // Import UI function, renderDashboard, renderAlarmStatusSummary

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
    dashboardTimerId = setInterval(() => renderDashboard(DOM), 1000); // Reintroduce dashboard interval
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
    let nextBoss = null;
    let minTimeDiff = Infinity;
    
    // --- 일반 보스 알림 체크 ---
    const currentBossSchedule = BossDataManager.getBossSchedule(); // Get from manager
    for (let i = 0; i < currentBossSchedule.length; i++) {
        const boss = currentBossSchedule[i];
        if (boss.type !== 'boss') continue; // Skip date markers

        const bossScheduledTime = boss.scheduledDate.getTime();

        // 다음 보스까지의 시간 차이 계산 (nextBoss 찾기)
        const timeDiff = bossScheduledTime - now.getTime();
        if (timeDiff > 0 && timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            nextBoss = boss;
        }

        // --- 5분 전 알림 체크 ---
        if (Math.abs(bossScheduledTime - fiveMinLater.getTime()) < 1000 && !boss.alerted_5min) {
            boss.alerted_5min = true;
            const msg = `5분 전, ${boss.name}`;
            log(msg, true);
            speak(msg);
        }

        // --- 1분 전 알림 체크 ---
        if (Math.abs(bossScheduledTime - oneMinLater.getTime()) < 1000 && !boss.alerted_1min) {
            boss.alerted_1min = true;
            const msg = `1분 전, ${boss.name}`;
            log(msg, true);
            speak(msg);
        }

        // --- 정각 알림 체크 ---
        if (Math.abs(bossScheduledTime - now.getTime()) < 1000 && !boss.alerted_0min) {
            boss.alerted_0min = true;
            const msg = `${boss.name} 젠 입니다.`;
            log(msg, true);
            speak(msg);
            bossesToRemove.push(i);
        }
    }

    // 알림이 발생한 일반 보스를 bossSchedule에서 제거 (뒤에서부터 제거하여 인덱스 오류 방지)
    for (let i = bossesToRemove.length - 1; i >= 0; i--) {
        currentBossSchedule.splice(bossesToRemove[i], 1);
    }
    BossDataManager.setBossSchedule(currentBossSchedule); // Update manager after splice

    // --- 고정 알림 보스 체크 ---
    const fixedAlarms = LocalStorageManager.getFixedAlarms();
    fixedAlarms.forEach(alarm => {
        if (alarm.enabled) { // 개별 고정 알림이 활성화된 경우에만 체크
            const [bossHour, bossMinute] = alarm.time.split(':').map(Number);
            
            // 고정 알림은 매일 반복되므로, 현재 날짜 기준으로 scheduledDate를 계산
            const fixedScheduledDate = new Date(now);
            fixedScheduledDate.setHours(bossHour, bossMinute, 0, 0);

            // 만약 이미 지난 시간이라면 다음 날로 설정 (자정 넘김 처리)
            if (fixedScheduledDate.getTime() <= now.getTime() - 1000) { // 1초 여유
                fixedScheduledDate.setDate(fixedScheduledDate.getDate() + 1);
            }

            const fixedBossScheduledTime = fixedScheduledDate.getTime();

            // 다음 보스까지의 시간 차이 계산 (nextBoss 찾기)
            const timeDiff = fixedBossScheduledTime - now.getTime();
            if (timeDiff > 0 && timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                nextBoss = { ...alarm, scheduledDate: fixedScheduledDate }; // 고정 보스에 대해 fixedScheduledDate 사용
            }

            // --- 5분 전 알림 체크 ---
            if (Math.abs(fixedBossScheduledTime - fiveMinLater.getTime()) < 1000 && !alarm.alerted_5min) {
                alarm.alerted_5min = true;
                LocalStorageManager.updateFixedAlarm(alarm.id, alarm); // Save updated state
                const msg = `5분 전, ${alarm.name}`;
                log(msg, true);
                speak(msg);
            }

            // --- 1분 전 알림 체크 ---
            if (Math.abs(fixedBossScheduledTime - oneMinLater.getTime()) < 1000 && !alarm.alerted_1min) {
                alarm.alerted_1min = true;
                LocalStorageManager.updateFixedAlarm(alarm.id, alarm); // Save updated state
                const msg = `1분 전, ${alarm.name}`;
                log(msg, true);
                speak(msg);
            }

            // --- 정각 알림 체크 ---
            if (Math.abs(fixedBossScheduledTime - now.getTime()) < 1000 && !alarm.alerted_0min) {
                alarm.alerted_0min = true;
                LocalStorageManager.updateFixedAlarm(alarm.id, alarm); // Save updated state
                const msg = `${alarm.name} 젠 입니다.`;
                log(msg, true);
                speak(msg);
                // 고정 알림은 목록에서 제거하지 않음
            }
        }
    });

    // 다음 보스 정보를 BossDataManager에 저장
    BossDataManager.setNextBossInfo(nextBoss, minTimeDiff);
}
