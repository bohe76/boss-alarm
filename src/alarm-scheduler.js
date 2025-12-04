// src/alarm-scheduler.js

import { log } from './logger.js';
import { speak } from './speech.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { renderAlarmStatusSummary } from './ui-renderer.js';

let worker = null;

try {
    worker = new Worker('./src/workers/timer-worker.js', { type: 'module' });
    worker.onerror = function(e) {
        log(`Web Worker 오류 발생: ${e.message}`, true);
        console.error('Worker Error:', e);
    };
    worker.onmessage = function(e) {
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
    const bossSchedule = BossDataManager.getBossSchedule().filter(item => item.type === 'boss');
    const fixedAlarms = LocalStorageManager.getFixedAlarms().filter(alarm => alarm.enabled);
    
    const flatSchedule = [];

    bossSchedule.forEach(boss => {
        addAlarmsToFlatSchedule(flatSchedule, boss, false, now);
    });

    fixedAlarms.forEach(alarm => {
        addAlarmsToFlatSchedule(flatSchedule, alarm, true, now);
    });

    worker.postMessage({
        type: 'UPDATE_SCHEDULE',
        payload: flatSchedule
    });
}

function addAlarmsToFlatSchedule(list, boss, isFixed, nowTime) {
    let bossScheduledTime;

    if (isFixed) {
        const [hours, minutes, seconds] = boss.time.split(':').map(Number);
        const targetDate = new Date(nowTime);
        targetDate.setHours(hours, minutes, seconds || 0, 0);

        if (targetDate.getTime() <= nowTime - 1000) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        bossScheduledTime = targetDate.getTime();
    } else {
        bossScheduledTime = new Date(boss.scheduledDate).getTime();
    }

    if (!boss.alerted_5min) {
        list.push({ id: boss.id, name: boss.name, type: '5min', targetTime: bossScheduledTime - 5 * 60 * 1000, isFixed: isFixed });
    }
    if (!boss.alerted_1min) {
        list.push({ id: boss.id, name: boss.name, type: '1min', targetTime: bossScheduledTime - 1 * 60 * 1000, isFixed: isFixed });
    }
    if (!boss.alerted_0min) {
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

function handleAlarm({ id, name, type, isFixed }) {
    let currentBoss = null;
    if (isFixed) {
        currentBoss = LocalStorageManager.getFixedAlarms().find(a => a.id === id);
    } else {
        currentBoss = BossDataManager.getBossSchedule().find(a => a.id === id);
    }

    if (!currentBoss) return;

    if (type === '5min' && currentBoss.alerted_5min) return;
    if (type === '1min' && currentBoss.alerted_1min) return;
    if (type === '0min' && currentBoss.alerted_0min) return;

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

    if (isFixed) {
        currentBoss[`alerted_${type}`] = true;
        LocalStorageManager.updateFixedAlarm(id, currentBoss);
        syncScheduleToWorker();
    } else {
        const schedule = BossDataManager.getBossSchedule();
        const target = schedule.find(b => b.id === id);
        if (target) {
            target[`alerted_${type}`] = true;
            if (type === '0min') {
                const newSchedule = schedule.filter(b => b.id !== id);
                BossDataManager.setBossSchedule(newSchedule);
            } else {
                BossDataManager.setBossSchedule(schedule);
            }
        }
    }
}

function updateAppState() {
    const now = new Date();
    const currentTimeString = now.toTimeString().substring(0, 5);

    if (currentTimeString === '00:00') {
        let mutableBossSchedule = BossDataManager.getBossSchedule();
        const fixedAlarms = LocalStorageManager.getFixedAlarms();
        let changed = false;

        mutableBossSchedule.forEach(boss => {
            if (boss.alerted_5min || boss.alerted_1min || boss.alerted_0min) {
                boss.alerted_5min = false; boss.alerted_1min = false; boss.alerted_0min = false;
                changed = true;
            }
        });
        fixedAlarms.forEach(alarm => {
            if (alarm.alerted_5min || alarm.alerted_1min || alarm.alerted_0min) {
                alarm.alerted_5min = false; alarm.alerted_1min = false; alarm.alerted_0min = false;
                LocalStorageManager.updateFixedAlarm(alarm.id, alarm);
                changed = true;
            }
        });
        if (changed) {
            BossDataManager.setBossSchedule(mutableBossSchedule);
            syncScheduleToWorker();
            log("자정이 되어 모든 알림 상태를 초기화합니다.", true);
        }
    }

    const nextInfo = calculateNextBoss(now);
    BossDataManager.setNextBossInfo(nextInfo.nextBoss, nextInfo.minTimeDiff);
}

function calculateNextBoss(now) {
    const bossSchedule = BossDataManager.getBossSchedule().filter(item => item.type === 'boss');
    const fixedAlarms = LocalStorageManager.getFixedAlarms().filter(alarm => alarm.enabled);
    
    let allAlarms = [];
    
    bossSchedule.forEach(boss => allAlarms.push({ ...boss, isFixed: false }));

    fixedAlarms.forEach(alarm => {
        const [hours, minutes, seconds] = alarm.time.split(':').map(Number);
        let d = new Date(now);
        d.setHours(hours, minutes, seconds || 0, 0);
        if (d.getTime() <= now.getTime() - 1000) d.setDate(d.getDate() + 1);
        allAlarms.push({ ...alarm, scheduledDate: d, isFixed: true });
    });

    allAlarms.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    const futureAlarms = allAlarms.filter(a => a.scheduledDate.getTime() >= now.getTime());
    
    if (futureAlarms.length > 0) {
        const next = futureAlarms[0];
        return { nextBoss: next, minTimeDiff: next.scheduledDate.getTime() - now.getTime() };
    }
    return { nextBoss: null, minTimeDiff: Infinity };
}
