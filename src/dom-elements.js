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
        helpButton: document.getElementById('helpButton'),
        helpModal: document.getElementById('helpModal'),
        closeButton: document.querySelector('.close-button'),
        featureGuideTabButton: document.querySelector('.tab-button[data-tab="featureGuide"]'),
        versionHistoryTabButton: document.querySelector('.tab-button[data-tab="versionHistory"]'),
        featureGuideContent: document.getElementById('featureGuideContent'),
        versionHistoryContent: document.getElementById('versionHistoryContent'),
    };
}
