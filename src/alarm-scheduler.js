// src/alarm-scheduler.js

import { log } from './logger.js';
import { speak } from './speech.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { renderAlarmStatusSummary } from './ui-renderer.js';

const worker = new Worker('src/workers/timer-worker.js', { type: 'module' });

worker.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'TICK') {
        // UI 갱신 및 자정 체크 등 상태 관리
        updateAppState();
    } else if (type === 'ALARM') {
        // 워커가 감지한 알림 처리
        handleAlarm(payload);
    }
};

export function syncScheduleToWorker() {
    const bossSchedule = BossDataManager.getBossSchedule().filter(item => item.type === 'boss');
    const fixedAlarms = LocalStorageManager.getFixedAlarms();
    
    worker.postMessage({
        type: 'UPDATE_SCHEDULE',
        payload: {
            bossSchedule: bossSchedule,
            fixedAlarms: fixedAlarms
        }
    });
}

BossDataManager.subscribe(() => {
    syncScheduleToWorker();
});

export function startAlarm(DOM) {
    LocalStorageManager.setAlarmRunningState(true);
    
    // 시스템 알림 권한 요청
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    log("알림 시스템을 시작합니다.");
    speak("보스 알리미를 시작합니다.");
    log(`${BossDataManager.getBossSchedule().filter(item => item.type === 'boss').length}개의 보스가 목록에 있습니다.`, true);
    
    syncScheduleToWorker();
    worker.postMessage({ type: 'START' });
    
    updateAppState(); 
    renderAlarmStatusSummary(DOM);
}

export function stopAlarm(DOM) {
    LocalStorageManager.setAlarmRunningState(false);
    worker.postMessage({ type: 'STOP' });
    log("알림 시스템을 중지합니다.");
    speak("알리미를 중지합니다.");
    renderAlarmStatusSummary(DOM);
}

export function getIsAlarmRunning() {
    return LocalStorageManager.getAlarmRunningState();
}

function handleAlarm({ alarm, alertType }) {
    // 이미 알림 처리된 상태인지 메인 스레드 데이터로 재확인 (중복 방지)
    // 워커 데이터와 메인 데이터 간의 미세한 텀이 있을 수 있음
    let currentAlarm = null;
    if (alarm.isFixed) {
        const fixedAlarms = LocalStorageManager.getFixedAlarms();
        currentAlarm = fixedAlarms.find(a => a.id === alarm.id);
    } else {
        const bossSchedule = BossDataManager.getBossSchedule();
        currentAlarm = bossSchedule.find(a => a.id === alarm.id);
    }

    if (!currentAlarm) return;

    // 이미 처리된 알림이면 스킵
    if (alertType === '5min' && currentAlarm.alerted_5min) return;
    if (alertType === '1min' && currentAlarm.alerted_1min) return;
    if (alertType === '0min' && currentAlarm.alerted_0min) return;

    // 알림 수행
    let msg = '';
    if (alertType === '5min') msg = `5분 전, ${currentAlarm.name}`;
    else if (alertType === '1min') msg = `1분 전, ${currentAlarm.name}`;
    else if (alertType === '0min') msg = `${currentAlarm.name} 젠 입니다.`;

    log(msg, true);
    speak(msg);

    // 시스템 알림 (OS Notification)
    if (Notification.permission === 'granted') {
        const notification = new Notification('보스 알리미', { body: msg });
        notification.onclick = () => {
            window.focus();
        };
    }

    // 상태 업데이트
    if (alarm.isFixed) {
        currentAlarm[`alerted_${alertType}`] = true;
        LocalStorageManager.updateFixedAlarm(currentAlarm.id, currentAlarm);
        // updateFixedAlarm 호출 시 syncScheduleToWorker 호출 필요 (현재 구조상 여기서 직접 호출)
        syncScheduleToWorker();
    } else {
        const bossSchedule = BossDataManager.getBossSchedule();
        const targetBoss = bossSchedule.find(b => b.id === alarm.id);
        if (targetBoss) {
            targetBoss[`alerted_${alertType}`] = true;
            if (alertType === '0min') {
                // 정각 알림 시 목록에서 제거 (기존 로직 유지)
                const newSchedule = bossSchedule.filter(b => b.id !== alarm.id);
                BossDataManager.setBossSchedule(newSchedule);
            } else {
                BossDataManager.setBossSchedule(bossSchedule);
            }
        }
    }
}

// 기존 checkAlarms를 대체하는 상태 관리 및 UI 갱신 함수
function updateAppState() {
    const now = new Date();
    const currentTimeString = now.toTimeString().substring(0, 5);

    // 자정 초기화 로직
    if (currentTimeString === '00:00') {
        let mutableBossSchedule = BossDataManager.getBossSchedule();
        const fixedAlarms = LocalStorageManager.getFixedAlarms();
        let changed = false;

        mutableBossSchedule.forEach(boss => {
            if (boss.alerted_5min || boss.alerted_1min || boss.alerted_0min) {
                boss.alerted_5min = false;
                boss.alerted_1min = false;
                boss.alerted_0min = false;
                changed = true;
            }
        });
        
        fixedAlarms.forEach(alarm => {
            if (alarm.alerted_5min || alarm.alerted_1min || alarm.alerted_0min) {
                alarm.alerted_5min = false;
                alarm.alerted_1min = false;
                alarm.alerted_0min = false;
                LocalStorageManager.updateFixedAlarm(alarm.id, alarm);
                changed = true;
            }
        });

        if (changed) {
            BossDataManager.setBossSchedule(mutableBossSchedule);
            log("자정이 되어 모든 알림 상태를 초기화합니다.", true);
        }
    }

    // 다음 보스 계산 및 대시보드 갱신을 위한 데이터 준비
    // (이 부분은 기존 checkAlarms의 하단부 로직과 동일)
    const bossSchedule = BossDataManager.getBossSchedule().filter(item => item.type === 'boss');
    const fixedAlarms = LocalStorageManager.getFixedAlarms().filter(alarm => alarm.enabled);
    
    let allAlarms = [];
    
    bossSchedule.forEach(boss => {
        allAlarms.push({ ...boss, isFixed: false });
    });

    fixedAlarms.forEach(alarm => {
        const [hours, minutes, seconds] = alarm.time.split(':').map(Number);
        let fixedScheduledDate = new Date(now);
        fixedScheduledDate.setHours(hours, minutes, seconds || 0, 0);

        if (fixedScheduledDate.getTime() <= now.getTime() - 1000) {
            fixedScheduledDate.setDate(fixedScheduledDate.getDate() + 1);
        }
        allAlarms.push({ ...alarm, scheduledDate: fixedScheduledDate, isFixed: true });
    });

    allAlarms.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    let nextBoss = null;
    let minTimeDiff = Infinity;

    const potentialNextAlarms = allAlarms.filter(alarm => alarm.scheduledDate.getTime() >= now.getTime());
    
    if (potentialNextAlarms.length > 0) {
        const closestAlarm = potentialNextAlarms[0];
        nextBoss = { ...closestAlarm };
        minTimeDiff = nextBoss.scheduledDate.getTime() - now.getTime();
    }

    BossDataManager.setNextBossInfo(nextBoss, minTimeDiff);
}