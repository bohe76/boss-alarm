// src/workers/timer-worker.js

let timerId = null;
let flatSchedule = [];
let lastTick = 0;
let sentAlarms = new Set(); // New: Keep track of alarms already sent by the worker

self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'START') {
        if (!timerId) {
            lastTick = Date.now();
            timerId = setInterval(tick, 1000);
        }
    } else if (type === 'STOP') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    } else if (type === 'UPDATE_SCHEDULE') {
        flatSchedule = payload;
        sentAlarms.clear(); // New: Reset sent alarms when schedule is updated
    }
};

function tick() {
    const now = Date.now();
    
    flatSchedule.forEach(item => {
        const alarmKey = `${item.id}-${item.type}-${item.targetTime}`; // Unique identifier including time
        if (item.targetTime > lastTick && item.targetTime <= now && !sentAlarms.has(alarmKey)) { // New: Check if already sent
            self.postMessage({ type: 'ALARM', payload: item });
            sentAlarms.add(alarmKey); // New: Mark as sent
        }
    });

    lastTick = now;
    self.postMessage({ type: 'TICK', now });
}