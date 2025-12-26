import { calculateNextOccurrence } from './utils.js';

export const BOSS_THRESHOLDS = {
    IMMINENT: 5 * 60 * 1000,    // 5 minutes
    WARNING: 10 * 60 * 1000,    // 10 minutes
    MEDIUM: 60 * 60 * 1000      // 1 hour
};

export const BossDataManager = (() => {
    let bossSchedule = []; // 파싱된 보스 정보를 저장할 배열
    let _nextBoss = null; // 다음 보스 정보를 저장할 변수
    let _minTimeDiff = Infinity; // 다음 보스까지 남은 시간을 저장할 변수
    const subscribers = []; // 구독자(콜백 함수) 목록

    const notify = () => {
        for (const subscriber of subscribers) {
            subscriber();
        }
    };

    return {
        subscribe: (callback) => {
            subscribers.push(callback);
        },
        getBossSchedule: () => bossSchedule,
        setBossSchedule: (newSchedule) => {
            bossSchedule = newSchedule;
            notify();
        },
        setNextBossInfo: (nextBoss, minTimeDiff) => {
            _nextBoss = nextBoss;
            _minTimeDiff = minTimeDiff;
            notify();
        },
        getNextBossInfo: () => ({ nextBoss: _nextBoss, minTimeDiff: _minTimeDiff }),

        /**
         * Returns all future bosses from both manual schedule and fixed alarms, sorted by time.
         * This is the CORE engine for boss calculations.
         */
        getAllUpcomingBosses: (nowTime = Date.now()) => {
            const nowAsDate = new Date(nowTime);

            const manualBosses = bossSchedule
                .filter(item => item.type === 'boss' && item.time)
                .map(boss => ({
                    ...boss,
                    timestamp: new Date(boss.scheduledDate).getTime(),
                    isFixed: false
                }));

            const fixedBosses = LocalStorageManager.getFixedAlarms()
                .filter(alarm => alarm.enabled)
                .map(alarm => {
                    const nextOccurrence = calculateNextOccurrence(alarm, nowAsDate);
                    return {
                        ...alarm,
                        timestamp: nextOccurrence ? nextOccurrence.getTime() : 0,
                        isFixed: true,
                        scheduledDate: nextOccurrence
                    };
                })
                .filter(boss => boss.timestamp > nowTime);

            return [...manualBosses, ...fixedBosses]
                .sort((a, b) => a.timestamp - b.timestamp);
        },

        /**
         * Returns a summary of the current boss status including the next boss and imminent ones.
         */
        getBossStatusSummary: (nowTime = Date.now()) => {
            const all = BossDataManager.getAllUpcomingBosses(nowTime);
            const nextBoss = all[0] || null;
            const minTimeDiff = nextBoss ? nextBoss.timestamp - nowTime : Infinity;

            // Filter bosses that are appearing within the imminent threshold (usually 5 mins)
            const imminentBosses = all.filter(boss => (boss.timestamp - nowTime) <= BOSS_THRESHOLDS.IMMINENT);

            return { nextBoss, minTimeDiff, imminentBosses, allUpcoming: all };
        },

        getUpcomingBosses: (count) => {
            return BossDataManager.getAllUpcomingBosses().slice(0, count);
        },
    };
})();

export const LocalStorageManager = (() => {
    let fixedAlarms = []; // 고정 알림 목록 (사용자 정의 가능)
    let logVisibilityState = true; // 기본값: ON
    let alarmRunningState = false; // 알람 실행 상태 (기본값: OFF)
    let sidebarExpandedState = false; // 사이드바 확장 상태 (기본값: 접힘)
    let crazyCalculatorRecords = []; // 광 계산기 기록 (사용자 정의 가능)
    let muteState = false; // 음소거 상태 (기본값: OFF)
    let volume = 1; // 볼륨 상태 (기본값: 1)
    let preMuteVolume = 1; // 음소거 전 볼륨 상태 (기본값: 1)

    function saveFixedAlarms() {
        localStorage.setItem('fixedAlarms', JSON.stringify(fixedAlarms));
    }

    function loadFixedAlarms() {
        const savedAlarms = localStorage.getItem('fixedAlarms');
        if (savedAlarms) {
            let loadedAlarms = JSON.parse(savedAlarms);
            let needsSave = false;
            // Data migration for 'days' property
            loadedAlarms.forEach(alarm => {
                if (!Object.prototype.hasOwnProperty.call(alarm, 'days')) {
                    alarm.days = [0, 1, 2, 3, 4, 5, 6];
                    needsSave = true;
                }
            });
            fixedAlarms = loadedAlarms;
            if (needsSave) {
                saveFixedAlarms();
            }
        } else {
            // Migration from old fixedAlarmStates format or initial default
            const oldFixedAlarmStates = localStorage.getItem('fixedAlarmStates');
            if (oldFixedAlarmStates) {
                const parsedOldStates = JSON.parse(oldFixedAlarmStates);
                // Default fixed alarms (hardcoded in old version)
                const defaultOldFixedBossSchedule = [
                    { time: "12:00", name: "대륙 침략자" },
                    { time: "20:00", name: "대륙 침략자" },
                    { time: "13:00", name: "발할라" },
                    { time: "18:00", name: "발할라" },
                    { time: "21:00", name: "발할라" },
                ];
                fixedAlarms = defaultOldFixedBossSchedule.map((boss, index) => ({
                    id: `fixed-${index}`,
                    name: boss.name,
                    time: boss.time,
                    enabled: parsedOldStates.individual[index] || false, // Use old individual state if available
                    days: [0, 1, 2, 3, 4, 5, 6] // Add days property
                }));
                localStorage.removeItem('fixedAlarmStates'); // Clean up old key
            } else {
                // Initial default fixed alarms if nothing saved
                fixedAlarms = [
                    { id: 'fixed-1', name: '대륙 침략자', time: '12:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-2', name: '대륙 침략자', time: '20:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-3', name: '발할라', time: '13:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-4', name: '발할라', time: '18:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-5', name: '발할라', time: '21:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                ];
            }
            saveFixedAlarms(); // Save the new format immediately
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
    }

    function saveCrazyCalculatorRecords() {
        localStorage.setItem('crazyCalculatorRecords', JSON.stringify(crazyCalculatorRecords));
    }

    function loadCrazyCalculatorRecords() {
        const savedRecords = localStorage.getItem('crazyCalculatorRecords');
        if (savedRecords) {
            crazyCalculatorRecords = JSON.parse(savedRecords);
        } else {
            crazyCalculatorRecords = [];
        }
    }

    function saveMuteState() {
        localStorage.setItem('muteState', JSON.stringify(muteState));
    }

    function loadMuteState() {
        const savedState = localStorage.getItem('muteState');
        if (savedState !== null) {
            muteState = JSON.parse(savedState);
        } else {
            muteState = false; // 기본값: OFF
        }
    }

    function saveVolume() {
        localStorage.setItem('volume', JSON.stringify(volume));
    }

    function loadVolume() {
        const savedVolume = localStorage.getItem('volume');
        if (savedVolume !== null) {
            volume = JSON.parse(savedVolume);
        } else {
            volume = 1; // 기본값: 1
        }
    }

    function savePreMuteVolume() {
        localStorage.setItem('preMuteVolume', JSON.stringify(preMuteVolume));
    }



    function loadPreMuteVolume() {
        const savedPreMuteVolume = localStorage.getItem('preMuteVolume');
        if (savedPreMuteVolume !== null) {
            preMuteVolume = JSON.parse(savedPreMuteVolume);
        } else {
            preMuteVolume = 1; // 기본값: 1
        }
    }

    return {
        // Generic getter/setter
        get: (key) => JSON.parse(localStorage.getItem(key)),
        set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),

        getFixedAlarms: () => fixedAlarms,
        getFixedAlarmById: (id) => fixedAlarms.find(alarm => alarm.id === id),
        addFixedAlarm: (alarm) => {
            fixedAlarms.push(alarm);
            saveFixedAlarms();
        },
        updateFixedAlarm: (id, updatedAlarm) => {
            const index = fixedAlarms.findIndex(alarm => alarm.id === id);
            if (index !== -1) {
                fixedAlarms[index] = { ...fixedAlarms[index], ...updatedAlarm };
                saveFixedAlarms();
            }
        },
        deleteFixedAlarm: (id) => {
            fixedAlarms = fixedAlarms.filter(alarm => alarm.id !== id);
            saveFixedAlarms();
        },
        exportFixedAlarms: () => {
            const jsonString = JSON.stringify(fixedAlarms);
            return btoa(encodeURIComponent(jsonString));
        },
        importFixedAlarms: (encodedData) => {
            try {
                const decodedJsonString = decodeURIComponent(atob(encodedData));
                const decoded = JSON.parse(decodedJsonString);
                if (Array.isArray(decoded) && decoded.every(item => item.id && item.name && item.time)) {
                    fixedAlarms = decoded;
                    saveFixedAlarms();
                    return true;
                }
            } catch (e) {
                console.error("Failed to import fixed alarms:", e);
            }
            return false;
        },
        getLogVisibilityState: () => logVisibilityState,
        setLogVisibilityState: (state) => { logVisibilityState = state; saveLogVisibilityState(); },
        getAlarmRunningState: () => alarmRunningState,
        setAlarmRunningState: (state) => { alarmRunningState = state; saveAlarmRunningState(); },
        getSidebarExpandedState: () => sidebarExpandedState,
        setSidebarExpandedState: (state) => { sidebarExpandedState = state; saveSidebarExpandedState(); },
        getMuteState: () => muteState,
        setMuteState: (state) => { muteState = state; saveMuteState(); },
        getVolume: () => volume,
        setVolume: (newVolume) => { volume = newVolume; saveVolume(); },
        getPreMuteVolume: () => preMuteVolume,
        setPreMuteVolume: (newPreMuteVolume) => { preMuteVolume = newPreMuteVolume; savePreMuteVolume(); },
        getCrazyCalculatorRecords: () => crazyCalculatorRecords,
        setCrazyCalculatorRecords: (records) => { crazyCalculatorRecords = records; saveCrazyCalculatorRecords(); },
        clearCrazyCalculatorRecords: () => { crazyCalculatorRecords = []; saveCrazyCalculatorRecords(); },
        init: () => {
            loadFixedAlarms();
            loadLogVisibilityState();
            loadAlarmRunningState(); // Load alarm running state
            loadSidebarExpandedState(); // Load sidebar expanded state
            loadCrazyCalculatorRecords(); // Load crazy calculator records
            loadMuteState(); // Load mute state
            loadVolume(); // Load volume state
            loadPreMuteVolume(); // Load pre-mute volume state
        }
    };
})();