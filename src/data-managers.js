import { calculateNextOccurrence, padNumber } from './utils.js';

export const BOSS_THRESHOLDS = {
    IMMINENT: 5 * 60 * 1000,    // 5 minutes
    WARNING: 10 * 60 * 1000,    // 10 minutes
    MEDIUM: 60 * 60 * 1000      // 1 hour
};

export const BossDataManager = (() => {
    // LocalStorage Key
    const STORAGE_KEY = 'bossSchedule';
    const DRAFT_STORAGE_KEY = 'bossSchedule_draft';

    /**
     * 초기 로드된 데이터의 유효성을 검사하고 손상된 데이터를 정제합니다.
     */
    const _sanitizeInitData = (items) => {
        if (!items || !Array.isArray(items)) return [];
        return items.filter(item => {
            if (!item || typeof item !== 'object') return false;

            if (item.type === 'date') {
                return !!item.date;
            }

            if (item.type === 'boss') {
                const hasName = !!item.name;
                // scheduledDate가 문자열로 들어올 수도 있으므로 Date 객체로 변환 시도
                const d = item.scheduledDate instanceof Date ? item.scheduledDate : new Date(item.scheduledDate);
                const hasValidDate = !isNaN(d.getTime());

                // ID가 없으면 생성 (영속성 식별을 위해 필요)
                if (hasName && hasValidDate && !item.id) {
                    item.id = `boss-${item.name}-${d.getTime()}`;
                }

                // Date 객체로 확실히 변환하여 저장
                if (hasValidDate) {
                    item.scheduledDate = d;
                }

                return hasName && hasValidDate;
            }
            return false;
        });
    };

    // IIFE 선언 시점에 로컬 스토리지에서 SSOT(Main) 데이터를 즉시 로드 후 정제
    let bossSchedule = (() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved, (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
                return _sanitizeInitData(parsed);
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

    const _getInternalBossMetadata = (bossName, contextId) => {
        const getMeta = (val) => {
            if (typeof val === 'number') return { interval: val, isInvasion: false };
            return { interval: val.interval || 0, isInvasion: !!val.isInvasion };
        };

        if (contextId && _presets[contextId] && _presets[contextId].bossMetadata && _presets[contextId].bossMetadata[bossName]) {
            return getMeta(_presets[contextId].bossMetadata[bossName]);
        }
        for (const context of Object.values(_presets)) {
            if (context.bossMetadata && context.bossMetadata[bossName]) {
                return getMeta(context.bossMetadata[bossName]);
            }
        }
        return { interval: 0, isInvasion: false };
    };

    const _getInternalBossInterval = (bossName, contextId) => {
        return _getInternalBossMetadata(bossName, contextId).interval;
    };

    const notify = () => {
        for (const subscriber of subscribers) {
            subscriber();
        }
    };

    /**
     * 보스 아이템 리스트를 48시간 분량(오늘~내일)으로 확장하고 날짜별로 재구성합니다.
     */
    const _expandAndReconstruct = (items) => {
        if (!items || items.length === 0) return [];

        const now = Date.now();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const startTime = todayStart.getTime();
        const endTime = startTime + (48 * 60 * 60 * 1000); // 오늘 00:00 ~ 내일 24:00 (48시간)

        const expandedBosses = [];
        const userDefinedMap = new Map(); // 사용자 정의 인스턴스 저장 (Key: 이름_타임스탬프)

        // 1. 사용자 정의 인스턴스 수집 (텍스트 모드 등에서 넘어온 모든 인스턴스)
        const bossItems = items.filter(item => item.type === 'boss' && item.scheduledDate);
        bossItems.forEach(boss => {
            const t = new Date(boss.scheduledDate).getTime();
            const key = `${boss.name}_${t}`;
            userDefinedMap.set(key, boss);
        });

        const bossNames = [...new Set(bossItems.map(b => b.name))];

        // 2. 각 보스별 확장 로직
        bossNames.forEach(bossName => {
            // 해당 보스의 사용자 정의 데이터 중 interval 정보( @젠시간 )가 있는지 확인 (Bohe 님 우선순위 적용)
            const userDefinedItems = bossItems.filter(b => b.name === bossName);
            const customInterval = userDefinedItems.find(b => b.interval > 0)?.interval;

            // 사용자 정의 값이 있으면 사용, 없으면 프리셋에서 가져옴
            const intervalMinutes = (customInterval !== undefined && customInterval > 0)
                ? customInterval
                : _getInternalBossInterval(bossName);

            const interval = intervalMinutes * 60 * 1000;
            // 해당 보스의 사용자 입력 중 현재와 가장 가까운 것을 기준 앵커로 설정 (자동 확장을 위한 기준)
            const sameBosses = bossItems.filter(b => b.name === bossName)
                .sort((a, b) => Math.abs(new Date(a.scheduledDate).getTime() - now) - Math.abs(new Date(b.scheduledDate).getTime() - now));

            const anchor = sameBosses[0];
            if (!anchor) return;

            const anchorTime = new Date(anchor.scheduledDate).getTime();

            const createInstance = (time) => {
                const key = `${bossName}_${time}`;
                if (userDefinedMap.has(key)) {
                    // 보헤님이 직접 입력한 인스턴스가 있으면 그대로 사용 (UID 유지 및 메모 보존)
                    return { ...userDefinedMap.get(key) };
                } else {
                    // 없으면 새 UID를 가진 인스턴스 생성 (복사가 아닌 새로운 인스턴스)
                    return {
                        ...anchor,
                        id: `boss-${bossName}-${time}`,
                        scheduledDate: new Date(time),
                        time: `${padNumber(new Date(time).getHours())}:${padNumber(new Date(time).getMinutes())}`,
                        memo: anchor.memo || "" // 앵커의 메모를 기본값으로 사용
                    };
                }
            };

            const isSameDay = (d1, d2) => {
                return d1.getFullYear() === d2.getFullYear() &&
                    d1.getMonth() === d2.getMonth() &&
                    d1.getDate() === d2.getDate();
            };

            const meta = _getInternalBossMetadata(bossName);
            const isTodayOnly = meta.isInvasion;

            if (interval > 0) {
                // 과거로 확장
                let t = anchorTime;
                while (t >= startTime) {
                    const inst = createInstance(t);
                    if (!isTodayOnly || isSameDay(inst.scheduledDate, new Date(now))) {
                        expandedBosses.push(inst);
                    }
                    t -= interval;
                }
                // 미래로 확장
                t = anchorTime + interval;
                while (t <= endTime) {
                    const inst = createInstance(t);
                    if (!isTodayOnly || isSameDay(inst.scheduledDate, new Date(now))) {
                        expandedBosses.push(inst);
                    }
                    t += interval;
                }
            } else {
                // 주기가 없는 경우 사용자 입력들만 유효 범위 내에서 유지
                sameBosses.forEach(b => {
                    const bt = new Date(b.scheduledDate);
                    const btime = bt.getTime();
                    if (btime >= startTime && btime <= endTime) {
                        if (!isTodayOnly || isSameDay(bt, new Date(now))) {
                            expandedBosses.push({ ...b });
                        }
                    }
                });
            }
        });

        // 중복 제거 (확장 과정에서 사용자가 입력한 시간과 겹칠 수 있음)
        const finalUniqueItems = [];
        const seenIds = new Set();
        expandedBosses.forEach(boss => {
            if (!seenIds.has(boss.id)) {
                finalUniqueItems.push(boss);
                seenIds.add(boss.id);
            }
        });

        // 3. 시간순 정렬
        finalUniqueItems.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

        const reconstructed = [];
        let lastDateStr = '';
        finalUniqueItems.forEach(boss => {
            const d = boss.scheduledDate;
            const dateStr = `${padNumber(d.getMonth() + 1)}.${padNumber(d.getDate())}`;
            if (dateStr !== lastDateStr) {
                reconstructed.push({ type: 'date', date: dateStr });
                lastDateStr = dateStr;
            }
            reconstructed.push(boss);
        });

        return reconstructed;
    };

    // Load Draft from LocalStorage helper
    const loadDraft = () => {
        if (!_draftSchedule) {
            const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft, (key, value) => {
                        if (key === 'scheduledDate') return new Date(value);
                        return value;
                    });
                    const sanitized = _sanitizeInitData(parsed);
                    // 정제 후에도 데이터가 유효할 때만 적용
                    if (sanitized && sanitized.length > 0) {
                        _draftSchedule = sanitized;
                    }
                } catch (e) {
                    console.error('Failed to parse draftSchedule', e);
                    _draftSchedule = null;
                }
            }
        }
    };

    return {
        initPresets: (presets) => {
            _presets = presets;

            // 프리셋이 로드되면 기존 스케줄을 즉시 확장 및 정규화
            if (bossSchedule && bossSchedule.length > 0) {
                bossSchedule = _expandAndReconstruct(bossSchedule);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule));

                // Draft도 동기화
                _draftSchedule = JSON.parse(JSON.stringify(bossSchedule), (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(_draftSchedule));
                notify();
            }
        },
        getBossInterval: (bossName, contextId) => {
            return _getInternalBossInterval(bossName, contextId);
        },
        /**
         * 입력된 보스 스케줄의 논리적 일관성(젠 주기 준수 여부)을 검증합니다.
         */
        validateBossSchedule: (items) => {
            if (!items || items.length === 0) return { isValid: true };

            const bossGroups = {};
            items.filter(item => item.type === 'boss').forEach(item => {
                if (!bossGroups[item.name]) bossGroups[item.name] = [];
                bossGroups[item.name].push(item);
            });

            for (const [name, instances] of Object.entries(bossGroups)) {
                const interval = _getInternalBossInterval(name);
                if (interval <= 0 || instances.length < 2) continue;

                const intervalMs = interval * 60 * 1000;
                // 시간순 정렬
                const sorted = [...instances].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

                for (let i = 0; i < sorted.length - 1; i++) {
                    const d1 = new Date(sorted[i].scheduledDate).getTime();
                    const d2 = new Date(sorted[i + 1].scheduledDate).getTime();
                    const diffMs = d2 - d1;

                    if (diffMs < intervalMs) {
                        return {
                            isValid: false,
                            message: `'${name}' 보스는 젠 주기가 ${interval}분입니다.\n입력된 시간(${sorted[i].time}, ${sorted[i + 1].time})이 주기보다 너무 가깝습니다. 중복 여부를 확인해 주세요.`
                        };
                    }

                    if (diffMs % intervalMs !== 0) {
                        const hours = Math.floor(diffMs / (60 * 60 * 1000));
                        const mins = Math.round((diffMs % (60 * 60 * 1000)) / (60 * 1000));
                        return {
                            isValid: false,
                            message: `'${name}' 보스의 젠 주기는 ${interval}분입니다.\n입력된 시간 사이의 간격(${hours}시간 ${mins}분)이 주기의 배수가 아닙니다. (입력 시점: ${sorted[i].time}, ${sorted[i + 1].time})`
                        };
                    }
                }
            }

            return { isValid: true };
        },
        subscribe: (callback) => {
            subscribers.push(callback);
        },
        getBossSchedule: () => bossSchedule,
        setBossSchedule: (newSchedule) => {
            // 들어온 리스트를 즉시 48시간(오늘~내일) 분량으로 확장하고 정규화함
            bossSchedule = _expandAndReconstruct(newSchedule || []);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule)); // 원본 영구 저장
            notify();
        },
        // --- Draft Management ---
        getDraftSchedule: () => {
            loadDraft();
            // Draft 데이터가 없으면 원본(Main)에서 복제하여 생성
            if (!_draftSchedule) {
                _draftSchedule = JSON.parse(JSON.stringify(bossSchedule), (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
            }
            return _draftSchedule;
        },
        setDraftSchedule: (newDraft) => {
            _draftSchedule = newDraft;
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(newDraft));
        },
        commitDraft: () => {
            if (_draftSchedule) {
                // 커밋 시에도 48시간 확장 로직을 적용하여 스케줄을 완성함
                bossSchedule = _expandAndReconstruct(_draftSchedule);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule));
                localStorage.removeItem(DRAFT_STORAGE_KEY);
                _draftSchedule = null;
                notify();
            }
        },
        expandSchedule: (items) => {
            return _expandAndReconstruct(items);
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
                .filter(item => item.type === 'boss' && item.scheduledDate)
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

        getImminentBosses: () => {
            return BossDataManager.getBossStatusSummary().imminentBosses;
        }
    };
})();

export const LocalStorageManager = (() => {
    let fixedAlarms = [];
    let logVisibilityState = true;
    let alarmRunningState = false;
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
            loadCrazyCalculatorRecords();
            loadMuteState();
            loadVolume();
            loadPreMuteVolume();
        }
    };
})();
