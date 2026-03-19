// src/alarm-scheduler.js

import { log } from './logger.js';
import { speak } from './speech.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { renderAlarmStatusSummary } from './ui-renderer.js';
import { DB } from './db.js';

let worker = null;

try {
    worker = new Worker('./src/workers/timer-worker.js', { type: 'module' });
    worker.onerror = function (e) {
        log(`Web Worker 오류 발생: ${e.message}`, true);
        console.error('Worker Error:', e);
    };
    worker.onmessage = function (e) {
        const { type, payload } = e.data;
        if (type === 'TICK') {
            updateAppState();
        } else if (type === 'ALARM') {
            handleAlarm(payload);
        }
    };
} catch (e) {
    log("Web Worker 초기화 실패.", true);
    console.error(e);
}

export function syncScheduleToWorker() {
    if (!worker) return;

    const now = Date.now();
    // Use the centralized engine to get all sorted upcoming bosses
    const allUpcoming = BossDataManager.getAllUpcomingBosses(now);

    const flatSchedule = [];
    allUpcoming.forEach(boss => {
        addAlarmsToFlatSchedule(flatSchedule, boss);
    });

    worker.postMessage({
        type: 'UPDATE_SCHEDULE',
        payload: flatSchedule
    });
}

function addAlarmsToFlatSchedule(list, boss) {
    const bossScheduledTime = boss.timestamp;
    const isFixed = boss.isFixed;

    if (!boss.alerted_5min || boss.alerted_5min !== bossScheduledTime - 5 * 60 * 1000) {
        list.push({ id: boss.id, name: boss.name, type: '5min', targetTime: bossScheduledTime - 5 * 60 * 1000, isFixed: isFixed });
    }
    if (!boss.alerted_1min || boss.alerted_1min !== bossScheduledTime - 1 * 60 * 1000) {
        list.push({ id: boss.id, name: boss.name, type: '1min', targetTime: bossScheduledTime - 1 * 60 * 1000, isFixed: isFixed });
    }
    if (!boss.alerted_0min || boss.alerted_0min !== bossScheduledTime) {
        list.push({ id: boss.id, name: boss.name, type: '0min', targetTime: bossScheduledTime, isFixed: isFixed });
    }
}

BossDataManager.subscribe(() => {
    syncScheduleToWorker();
});

export function startAlarm(DOM) {
    LocalStorageManager.setAlarmRunningState(true);

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    log("알림 시스템을 시작합니다.");
    speak("보스 알리미를 시작합니다.");

    syncScheduleToWorker();
    if (worker) worker.postMessage({ type: 'START' });

    updateAppState();
    renderAlarmStatusSummary(DOM);
}

export function stopAlarm(DOM) {
    LocalStorageManager.setAlarmRunningState(false);
    if (worker) worker.postMessage({ type: 'STOP' });
    log("알림 시스템을 중지합니다.");
    speak("알리미를 중지합니다.");
    renderAlarmStatusSummary(DOM);
}

export function getIsAlarmRunning() {
    return LocalStorageManager.getAlarmRunningState();
}

function handleAlarm({ id, name, type, isFixed, targetTime }) {
    if (isFixed) {
        const currentBoss = LocalStorageManager.getFixedAlarms().find(a => a.id === id);
        if (!currentBoss) return;
        if (currentBoss[`alerted_${type}`] === targetTime) return;

        let msg = '';
        if (type === '5min') msg = `5분 전, ${name}`;
        else if (type === '1min') msg = `1분 전, ${name}`;
        else if (type === '0min') msg = `${name} 젠 입니다.`;

        log(msg, true);
        speak(msg);
        if (Notification.permission === 'granted') {
            const notification = new Notification('보스 알리미', { body: msg });
            notification.onclick = () => window.focus();
        }

        currentBoss[`alerted_${type}`] = targetTime;
        LocalStorageManager.updateFixedAlarm(id, currentBoss);
        syncScheduleToWorker();
    } else {
        const schedule = DB.getSchedule(id);
        if (!schedule) return;
        if (schedule[`alerted_${type}`] === targetTime) return;

        let msg = '';
        if (type === '5min') msg = `5분 전, ${name}`;
        else if (type === '1min') msg = `1분 전, ${name}`;
        else if (type === '0min') msg = `${name} 젠 입니다.`;

        log(msg, true);
        speak(msg);
        if (Notification.permission === 'granted') {
            const notification = new Notification('보스 알리미', { body: msg });
            notification.onclick = () => window.focus();
        }

        DB.updateSchedule(id, { [`alerted_${type}`]: targetTime });
        DB.notifyStructural();
    }
}

function updateAppState() {
    // [Step 3/4] Periodic Update Check (Triggered via Timer Worker TICK)
    const activeScreen = document.querySelector('.screen.active');
    const isSchedulerActive = activeScreen && activeScreen.id === 'boss-scheduler-screen';
    BossDataManager.checkAndUpdateSchedule(false, isSchedulerActive);

    // Use the centralized summary engine
    const { nextBoss, minTimeDiff } = BossDataManager.getBossStatusSummary();
    BossDataManager.setNextBossInfo(nextBoss, minTimeDiff);
}
