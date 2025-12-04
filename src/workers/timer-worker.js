// src/workers/timer-worker.js

let timerId = null;
let flatSchedule = [];
let lastTick = 0;

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
    }
};

function tick() {
    const now = Date.now();
    
    flatSchedule.forEach(item => {
        if (item.targetTime > lastTick && item.targetTime <= now) {
            self.postMessage({ type: 'ALARM', payload: item });
        }
    });

    lastTick = now;
    self.postMessage({ type: 'TICK', now });
}