// src/dom-elements.js

export function initDomElements() {
    return {
        bossListInput: document.getElementById('bossListInput'),
        startButton: document.getElementById('startButton'),
        logContainer: document.getElementById('log-container'),
        shareButton: document.getElementById('shareButton'),
        shareLinkInput: document.getElementById('shareLinkInput'),
        copyButton: document.getElementById('copyButton'),
        nextBossDisplay: document.getElementById('nextBossDisplay'),
        globalFixedAlarmToggle: document.getElementById('globalFixedAlarmToggle'),
        fixedAlarmListDiv: document.getElementById('fixedAlarmList'),
        logVisibilityToggle: document.getElementById('logVisibilityToggle'),
    };
}
