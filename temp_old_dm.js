import { calculateNextOccurrence } from './utils.js';

export const BOSS_THRESHOLDS = {
    IMMINENT: 5 * 60 * 1000,    // 5 minutes
    WARNING: 10 * 60 * 1000,    // 10 minutes
    MEDIUM: 60 * 60 * 1000      // 1 hour
};

export const BossDataManager = (() => {
    // LocalStorage Key
    const STORAGE_KEY = 'bossSchedule';
    const DRAFT_STORAGE_KEY = 'bossSchedule_draft';

    // IIFE 선언 시점에 로컬 스토리지에서 SSOT(Main) 데이터를 즉시 로드
    let bossSchedule = (() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved, (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
            } catch (e) {
                console.error('Failed to parse initial bossSchedule', e);
                return [];
            }
        }
        return [];
    })();

    let _draftSchedule = null; // Draft 스케줄 저장용 (임시 SSOT)
    let _nextBoss = null; // 다음 보스 정보를 저장할 변수
    let _minTimeDiff = Infinity; // 다음 보스까지 남은 시간을 저장할 변수
    let _presets = {}; // 보스 프리셋 메타데이터 저장용
    const subscribers = []; // 구독자(콜백 함수) 목록

    const notify = () => {
        for (const subscriber of subscribers) {
            subscriber();
        }
    };

    // Load Draft from LocalStorage helper
    const loadDraft = () => {
        if (!_draftSchedule) {
            const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraft) {
                _draftSchedule = JSON.parse(savedDraft, (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
            }
        }
    };

    return {
        initPresets: (presets) => {
            _presets = presets;
        },
        getBossInterval: (bossName, contextId) => {
            if (contextId && _presets[contextId] && _presets[contextId].bossMetadata[bossName]) {
                return _presets[contextId].bossMetadata[bossName].interval || 0;
            }
            // ID가 없는 경우 전체 프리셋에서 검색 (하위 호환성)
            for (const context of Object.values(_presets)) {
                if (context.bossMetadata[bossName]) {
                    return context.bossMetadata[bossName].interval || 0;
                }
            }
            return 0;
        },
        subscribe: (callback) => {
            subscribers.push(callback);
        },
        getBossSchedule: () => bossSchedule,
        setBossSchedule: (newSchedule) => {
            console.log('[Debug] BossDataManager.setBossSchedule - incoming:', newSchedule);
            bossSchedule = newSchedule || [];

            // [SSOT 즉시 동기화] 원본 데이터가 새롭게 주입되면, Draft도 즉시 새 원본으로 복사합니다.
            // 삭제만 하면 빈 상태가 생기므로, 즉시 복사하여 항상 동기화된 상태를 유지합니다.
            _draftSchedule = JSON.parse(JSON.stringify(bossSchedule), (key, value) => {
                if (key === 'scheduledDate') return new Date(value);
                return value;
            });
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(_draftSchedule));

            // 원본 데이터 영구 저장
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule));
            notify();
        },

        // --- Draft Management ---
        getDraftSchedule: () => {
            loadDraft();
            console.log('[Debug] BossDataManager.getDraftSchedule - Draft:', _draftSchedule, 'Main:', bossSchedule);

            // Draft 데이터가 없으면 원본(Main)에서 복제하여 생성
            if (!_draftSchedule) {
                _draftSchedule = JSON.parse(JSON.stringify(bossSchedule), (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
                console.log('[Debug] BossDataManager.getDraftSchedule - Draft created from Main');
            }
            return _draftSchedule;
        },
        setDraftSchedule: (newDraft) => {
            _draftSchedule = newDraft;
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(newDraft));
        },
        commitDraft: () => {
            if (_draftSchedule) {
                bossSchedule = _draftSchedule;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule)); // 원본 영구 저장
                localStorage.removeItem(DRAFT_STORAGE_KEY); // Draft 삭제
                _draftSchedule = null;
                notify();
            }
        },
        clearDraft: () => {
            _draftSchedule = null;
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        },
        // ------------------------

        setNextBossInfo: (nextBoss, minTimeDiff) => {
            _nextBoss = nextBoss;
            _minTimeDiff = minTimeDiff;
            notify();
        },
        getNextBossInfo: () => ({ nextBoss: _nextBoss, minTimeDiff: _minTimeDiff }),

        getAllUpcomingBosses: (nowTime = Date.now()) => {
            const nowAsDate = new Date(nowTime);
            const manualBosses = bossSchedule
                .filter(item => item.type === 'boss' && item.time)
                .map(boss => ({
                    ...boss,
                    timestamp: new Date(boss.scheduledDate).getTime(),
                    isFixed: false
                }))
                .filter(boss => boss.timestamp > nowTime);

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

        getBossStatusSummary: (nowTime = Date.now()) => {
            const all = BossDataManager.getAllUpcomingBosses(nowTime);
            const nextBoss = all[0] || null;
            const minTimeDiff = nextBoss ? nextBoss.timestamp - nowTime : Infinity;
            const imminentBosses = all.filter(boss => (boss.timestamp - nowTime) <= BOSS_THRESHOLDS.IMMINENT);
            return { nextBoss, minTimeDiff, imminentBosses, allUpcoming: all };
        },

        getUpcomingBosses: (count) => {
            return BossDataManager.getAllUpcomingBosses().slice(0, count);
        },
    };
})();

export const LocalStorageManager = (() => {
    let fixedAlarms = [];
    let logVisibilityState = true;
    let alarmRunningState = false;
    let sidebarExpandedState = false;
    let crazyCalculatorRecords = [];
    let muteState = false;
    let volume = 1;
    let preMuteVolume = 1;

    function saveFixedAlarms() {
        localStorage.setItem('fixedAlarms', JSON.stringify(fixedAlarms));
    }

    function loadFixedAlarms() {
        const savedAlarms = localStorage.getItem('fixedAlarms');
        if (savedAlarms) {
            let loadedAlarms = JSON.parse(savedAlarms);
            let needsSave = false;
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
            const oldFixedAlarmStates = localStorage.getItem('fixedAlarmStates');
            if (oldFixedAlarmStates) {
                const parsedOldStates = JSON.parse(oldFixedAlarmStates);
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
                    enabled: parsedOldStates.individual[index] || false,
                    days: [0, 1, 2, 3, 4, 5, 6]
                }));
                localStorage.removeItem('fixedAlarmStates');
            } else {
                fixedAlarms = [
                    { id: 'fixed-1', name: '대륙 침략자', time: '12:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-2', name: '대륙 침략자', time: '20:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-3', name: '발할라', time: '13:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-4', name: '발할라', time: '18:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-5', name: '발할라', time: '21:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                ];
            }
            saveFixedAlarms();
        }
    }

    function saveLogVisibilityState() {
        localStorage.setItem('logVisibilityState', JSON.stringify(logVisibilityState));
    }

    function loadLogVisibilityState() {
        const savedState = localStorage.getItem('logVisibilityState');
        if (savedState !== null) {
            logVisibilityState = JSON.parse(savedState);
        } else {
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
            alarmRunningState = false;
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
            sidebarExpandedState = false;
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
            muteState = false;
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
            volume = 1;
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
            preMuteVolume = 1;
        }
    }

    return {
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
            loadAlarmRunningState();
            loadSidebarExpandedState();
            loadCrazyCalculatorRecords();
            loadMuteState();
            loadVolume();
            loadPreMuteVolume();
        }
    };
})();