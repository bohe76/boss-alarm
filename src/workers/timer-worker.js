// src/workers/timer-worker.js

let timerId = null;
let bossSchedule = [];
let fixedAlarms = [];

self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'START') {
        if (!timerId) {
            timerId = setInterval(tick, 1000);
        }
    } else if (type === 'STOP') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    } else if (type === 'UPDATE_SCHEDULE') {
        if (payload.bossSchedule) {
            bossSchedule = payload.bossSchedule;
        }
        if (payload.fixedAlarms) {
            fixedAlarms = payload.fixedAlarms;
        }
    }
};

function tick() {
    const now = Date.now();
    self.postMessage({ type: 'TICK', now }); // UI 갱신용

    checkAlarms(now);
}

function checkAlarms(nowTime) {
    const now = new Date(nowTime);
    const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
    const oneMinLater = new Date(now.getTime() + 1 * 60 * 1000);

    // Combine all alarms
    let allAlarms = [];

    // Dynamic bosses
    bossSchedule.forEach(boss => {
        allAlarms.push({ ...boss, isFixed: false });
    });

    // Fixed alarms
    fixedAlarms.forEach(alarm => {
        if (alarm.enabled) {
            const [hours, minutes, seconds] = alarm.time.split(':').map(Number);
            let fixedScheduledDate = new Date(now);
            fixedScheduledDate.setHours(hours, minutes, seconds || 0, 0);

            if (fixedScheduledDate.getTime() <= now.getTime() - 1000) {
                fixedScheduledDate.setDate(fixedScheduledDate.getDate() + 1);
            }
            allAlarms.push({ ...alarm, scheduledDate: fixedScheduledDate, isFixed: true });
        }
    });

    for (const alarm of allAlarms) {
        let bossScheduledTime;

        if (alarm.isFixed) {
            const [hours, minutes, seconds] = alarm.time.split(':').map(Number);
            const alarmTimeToday = new Date();
            alarmTimeToday.setHours(hours, minutes, seconds || 0, 0);

            if (alarmTimeToday.getTime() <= now.getTime() - 1000) {
                alarmTimeToday.setDate(alarmTimeToday.getDate() + 1);
            }
            bossScheduledTime = alarmTimeToday.getTime();
        } else {
             bossScheduledTime = new Date(alarm.scheduledDate).getTime();
        }

        // Check 5 min before
        if (Math.abs(bossScheduledTime - fiveMinLater.getTime()) < 1000 && !alarm.alerted_5min) {
            self.postMessage({ type: 'ALARM', payload: { alarm, alertType: '5min' } });
        }

        // Check 1 min before
        if (Math.abs(bossScheduledTime - oneMinLater.getTime()) < 1000 && !alarm.alerted_1min) {
            self.postMessage({ type: 'ALARM', payload: { alarm, alertType: '1min' } });
        }

        // Check exact time
        if (Math.abs(bossScheduledTime - now.getTime()) < 1000 && !alarm.alerted_0min) {
            self.postMessage({ type: 'ALARM', payload: { alarm, alertType: '0min' } });
        }
    }
}
