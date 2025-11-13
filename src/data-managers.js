// src/data-managers.js

export const BossDataManager = (() => {
    let bossSchedule = []; // 파싱된 보스 정보를 저장할 배열
    let fixedBossSchedule = [ // 고정 알림 보스 목록 (하드코딩)
        { time: "12:00", name: "대륙 침략자", alerted_5min: false, alerted_1min: false, alerted_0min: false },
        { time: "20:00", name: "대륙 침략자", alerted_5min: false, alerted_1min: false, alerted_0min: false },
        { time: "13:00", name: "발할라", alerted_5min: false, alerted_1min: false, alerted_0min: false },
        { time: "18:00", name: "발할라", alerted_5min: false, alerted_1min: false, alerted_0min: false },
        { time: "21:00", name: "발할라", alerted_5min: false, alerted_1min: false, alerted_0min: false },
    ];
    let _nextBoss = null; // 다음 보스 정보를 저장할 변수
    let _minTimeDiff = Infinity; // 다음 보스까지 남은 시간을 저장할 변수

    return {
        getBossSchedule: () => bossSchedule,
        setBossSchedule: (newSchedule) => { bossSchedule = newSchedule; },
        getFixedBossSchedule: () => fixedBossSchedule,
        setNextBossInfo: (nextBoss, minTimeDiff) => {
            _nextBoss = nextBoss;
            _minTimeDiff = minTimeDiff;
        },
        getNextBossInfo: () => ({ nextBoss: _nextBoss, minTimeDiff: _minTimeDiff }),
    };
})();


export const LocalStorageManager = (() => {
    let fixedAlarmStates = { // 고정 알림 스위치 상태 (로컬 스토리지 저장용)
        global: false, // 고정 알림 전체 ON/OFF
        individual: BossDataManager.getFixedBossSchedule().map(() => false) // 각 고정 알림 개별 ON/OFF
    };
    let logVisibilityState = true; // 기본값: ON

    function saveFixedAlarmStates() {
        localStorage.setItem('fixedAlarmStates', JSON.stringify(fixedAlarmStates));
    }

    function loadFixedAlarmStates() {
        const savedStates = localStorage.getItem('fixedAlarmStates');
        if (savedStates) {
            fixedAlarmStates = JSON.parse(savedStates);
        } else {
            // 기본값: 모두 OFF
            fixedAlarmStates = {
                global: false,
                individual: BossDataManager.getFixedBossSchedule().map(() => false)
            };
        }
    }

    function saveLogVisibilityState() {
        localStorage.setItem('logVisibilityState', JSON.stringify(logVisibilityState));
    }

    function loadLogVisibilityState() {
        const savedState = localStorage.getItem('logVisibilityState');
        if (savedState !== null) { // Check for null to distinguish from 'false'
            logVisibilityState = JSON.parse(savedState);
        } else {
            // 기본값: ON
            logVisibilityState = true;
        }
    }

    return {
        getFixedAlarmStates: () => fixedAlarmStates,
        setFixedAlarmStates: (states) => { fixedAlarmStates = states; saveFixedAlarmStates(); },
        getLogVisibilityState: () => logVisibilityState,
        setLogVisibilityState: (state) => { logVisibilityState = state; saveLogVisibilityState(); },
        init: () => {
            loadFixedAlarmStates();
            loadLogVisibilityState();
        }
    };
})();
