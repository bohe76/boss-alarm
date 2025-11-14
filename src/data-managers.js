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
        getUpcomingBosses: (count) => {
            const now = Date.now();
            const upcoming = [];
            let addedCount = 0;

            // Combine bossSchedule and fixedBossSchedule, filter out past bosses, and sort
            const allBosses = [...bossSchedule, ...fixedBossSchedule].map(boss => {
                const [hours, minutes] = boss.time.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes, 0, 0);
                // If the boss time has already passed today, set it for tomorrow
                if (date.getTime() < now) {
                    date.setDate(date.getDate() + 1);
                }
                return { ...boss, timestamp: date.getTime() };
            }).filter(boss => boss.timestamp > now)
              .sort((a, b) => a.timestamp - b.timestamp);

            for (const boss of allBosses) {
                if (addedCount < count) {
                    upcoming.push(boss);
                    addedCount++;
                } else {
                    break;
                }
            }
            return upcoming;
        },
    };
})();


export const LocalStorageManager = (() => {
    let fixedAlarmStates = { // 고정 알림 스위치 상태 (로컬 스토리지 저장용)
        global: false, // 고정 알림 전체 ON/OFF
        individual: BossDataManager.getFixedBossSchedule().map(() => false) // 각 고정 알림 개별 ON/OFF
    };
    let logVisibilityState = true; // 기본값: ON
    let alarmRunningState = false; // 알람 실행 상태 (기본값: OFF)
    let sidebarExpandedState = false; // 사이드바 확장 상태 (기본값: 접힘)

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

    function saveAlarmRunningState() {
        localStorage.setItem('alarmRunningState', JSON.stringify(alarmRunningState));
    }

    function loadAlarmRunningState() {
        const savedState = localStorage.getItem('alarmRunningState');
        if (savedState !== null) {
            alarmRunningState = JSON.parse(savedState);
        } else {
            alarmRunningState = false; // 기본값: OFF
        }
    }

    function saveSidebarExpandedState() {
        localStorage.setItem('sidebarExpandedState', JSON.stringify(sidebarExpandedState));
    }

    function loadSidebarExpandedState() {
        const savedState = localStorage.getItem('sidebarExpandedState');
        if (savedState !== null) {
            sidebarExpandedState = JSON.parse(savedState);
        } else {
            sidebarExpandedState = false; // 기본값: 접힘
        }
    }        const savedState = localStorage.getItem('alarmRunningState');
        if (savedState !== null) {
            alarmRunningState = JSON.parse(savedState);
        } else {
            alarmRunningState = false; // 기본값: OFF
        }
    }

    return {
        getFixedAlarmStates: () => fixedAlarmStates,
        setFixedAlarmStates: (states) => { fixedAlarmStates = states; saveFixedAlarmStates(); },
        getLogVisibilityState: () => logVisibilityState,
        setLogVisibilityState: (state) => { logVisibilityState = state; saveLogVisibilityState(); },
        getAlarmRunningState: () => alarmRunningState,
        setAlarmRunningState: (state) => { alarmRunningState = state; saveAlarmRunningState(); },
        getSidebarExpandedState: () => sidebarExpandedState,
        setSidebarExpandedState: (state) => { sidebarExpandedState = state; saveSidebarExpandedState(); },
        init: () => {
            loadFixedAlarmStates();
            loadLogVisibilityState();
            loadAlarmRunningState(); // Load alarm running state
            loadSidebarExpandedState(); // Load sidebar expanded state
        }
    };
})();
