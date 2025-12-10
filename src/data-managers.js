// src/data-managers.js
import { calculateNextOccurrence } from './utils.js';

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
                getUpcomingBosses: (count) => {
                                const currentTimestamp = Date.now(); // Standardize `now` as currentTimestamp
                                const nowAsDate = new Date(currentTimestamp); // Consistent Local Date object for comparisons
                    
                                const upcoming = [];                    let addedCount = 0;
        
                    // Get fixed bosses from LocalStorageManager
                    const fixedBosses = LocalStorageManager.getFixedAlarms()
                        .filter(alarm => alarm.enabled) // Only consider enabled fixed alarms
                        .map(alarm => ({ ...alarm, isFixed: true })); // Copy all properties including id, and mark as fixed
        
                                // Combine bossSchedule and fixedBosses, filter out non-boss entries and past bosses, then sort
        
                                const allBosses = [...bossSchedule, ...fixedBosses]
        
                                    .filter(boss => boss.time) // Filter out entries without a 'time' property (i.e., date entries)
        
                                                                .map(boss => {
                                    
                                                                    let timestamp;
                                    
                                                                    if (boss.isFixed) {
                                                                        // Use the new helper function to calculate the next occurrence
                                                                        const nextOccurrence = calculateNextOccurrence(boss, nowAsDate); // Pass consistent nowAsDate
                                                                        timestamp = nextOccurrence ? nextOccurrence.getTime() : 0; // If null, set to 0 to filter out
                                                                    } else if (boss.scheduledDate) {
                                    
                                                                        // Dynamic boss: Use the already calculated scheduledDate
                                                                        const scheduledDateAsDate = new Date(boss.scheduledDate);
                                                                        timestamp = new Date(
                                                                            scheduledDateAsDate.getFullYear(),
                                                                            scheduledDateAsDate.getMonth(),
                                                                            scheduledDateAsDate.getDate(),
                                                                            scheduledDateAsDate.getHours(),
                                                                            scheduledDateAsDate.getMinutes(),
                                                                            scheduledDateAsDate.getSeconds()
                                                                        ).getTime();
                                                                    } else {
                                    
                                                                         // Fallback (should rarely happen for valid bosses): treat as today
                                    
                                                                        const [hours, minutes, seconds] = boss.time.split(':').map(Number);
                                    
                                                                        const bossDateTime = new Date(nowAsDate.getFullYear(), nowAsDate.getMonth(), nowAsDate.getDate(), hours, minutes, seconds || 0);
                                    
                                                                        timestamp = bossDateTime.getTime();
                                    
                                                                    }
                                    
                                                                    return { ...boss, timestamp };
                                    
                                                                })
                                                                .filter(boss => {
                                                                    return boss.timestamp > currentTimestamp;
                                                                })
                                                                .sort((a, b) => {
                                                                    return a.timestamp - b.timestamp;
                                                                });                            
                                        for (const boss of allBosses) {
                                            if (addedCount < count) {
                                                upcoming.push(boss);
                                                addedCount++;
                                            } else {                    break;
                        }
                    }
                    return upcoming;
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
    let volume = 0.5; // 볼륨 상태 (기본값: 0.5)
    let preMuteVolume = 0.5; // 음소거 전 볼륨 상태 (기본값: 0.5)

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
            volume = 0.5; // 기본값: 0.5
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
            preMuteVolume = 0.5; // 기본값: 0.5
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