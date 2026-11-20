// src/alarm-scheduler.js

import { log } from './logger.js';
import { speak } from './speech.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { renderAlarmStatusSummary } from './ui-renderer.js';
import { DB } from './db.js';
import { getAlarmLeadTimes } from './alarm-lead-times.js';

let worker = null;

// iOS Safari 일반 탭 등 Notification API가 없는 환경에서는 시스템 알림을 건너뛴다
function isNotificationSupported() {
    return 'Notification' in window;
}

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

    // 알림 시각 = 설정한 알림 시간(분 전) + 정각. 정각(0)은 항상 포함한다.
    const leadMinutes = [...getAlarmLeadTimes(), 0];
    const flatSchedule = [];
    allUpcoming.forEach(boss => {
        addAlarmsToFlatSchedule(flatSchedule, boss, leadMinutes);
    });

    worker.postMessage({
        type: 'UPDATE_SCHEDULE',
        payload: flatSchedule
    });
}

// 알림 유형은 `${분}min`이고 발화 기록은 `alerted_${분}min`에 남긴다 (5min·1min·0min은 기존 이름 그대로).
function addAlarmsToFlatSchedule(list, boss, leadMinutes) {
    const bossScheduledTime = boss.timestamp;
    const isFixed = boss.isFixed;

    leadMinutes.forEach(minutes => {
        const type = `${minutes}min`;
        const targetTime = bossScheduledTime - minutes * 60 * 1000;
        if (!boss[`alerted_${type}`] || boss[`alerted_${type}`] !== targetTime) {
            list.push({ id: boss.id, name: boss.name, type, targetTime, isFixed: isFixed });
        }
    });
}

function buildAlarmMessage(type, name) {
    const minutes = parseInt(type, 10);
    if (minutes > 0) return `${minutes}분 전, ${name}`;
    if (minutes === 0) return `${name} 젠 입니다.`;
    return '';
}

BossDataManager.subscribe(() => {
    syncScheduleToWorker();
});

export function startAlarm(DOM) {
    LocalStorageManager.setAlarmRunningState(true);

    if (isNotificationSupported() && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
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

        const msg = buildAlarmMessage(type, name);

        log(msg, true);
        speak(msg);
        if (isNotificationSupported() && Notification.permission === 'granted') {
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

        const msg = buildAlarmMessage(type, name);

        log(msg, true);
        speak(msg);
        if (isNotificationSupported() && Notification.permission === 'granted') {
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
