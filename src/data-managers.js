// src/data-managers.js
// v3.0 - DB-backed BossDataManager & LocalStorageManager

import { DB } from './db.js';
import { calculateNextOccurrence, padNumber, formatMonthDay } from './utils.js';

export const BOSS_THRESHOLDS = {
    IMMINENT: 5 * 60 * 1000,    // 5 minutes
    WARNING: 10 * 60 * 1000,    // 10 minutes
    MEDIUM: 60 * 60 * 1000      // 1 hour
};

const DRAFT_KEY_PREFIX = 'v3_draft_';

function loadDraftFromLs(gameId) {
    try {
        const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${gameId}`);
        if (!raw) return null;
        return JSON.parse(raw, (key, value) => {
            if (key === 'scheduledDate' && value) return new Date(value);
            return value;
        });
    } catch {
        return null;
    }
}

function saveDraftToLs(gameId, draft) {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${gameId}`, JSON.stringify(draft));
}

export const BossDataManager = (() => {
    let _nextBoss = null;
    let _minTimeDiff = Infinity;
    const structuralSubscribers = [];
    const uiSubscribers = [];

    const notifyStructural = () => {
        structuralSubscribers.forEach(cb => cb());
        notifyUI();
    };

    const notifyUI = () => {
        uiSubscribers.forEach(cb => cb());
    };

    // --- Boss metadata helpers ---
    const _getBossMetadata = (bossName, gameId) => {
        if (gameId) {
            const boss = DB.findBoss(gameId, bossName);
            if (boss) return { interval: boss.interval || 0, isInvasion: boss.isInvasion || false };
        }
        const allBosses = DB.getBosses();
        const found = allBosses.find(b => b.name === bossName);
        return found ? { interval: found.interval || 0, isInvasion: found.isInvasion || false } : { interval: 0, isInvasion: false };
    };

    // --- Enrich DB schedules for UI consumption ---
    const _enrichSchedules = (dbSchedules, uiFilter = true) => {
        const allBosses = DB.getBosses();
        const bossMap = new Map(allBosses.map(b => [b.id, b]));

        let enriched = dbSchedules.map(s => {
            const boss = bossMap.get(s.bossId);
            if (!boss) return null;
            const scheduledDate = new Date(s.scheduledDate);
            if (isNaN(scheduledDate.getTime())) return null;
            return {
                id: s.id,
                bossId: s.bossId,
                name: boss.name,
                interval: boss.interval || 0,
                isInvasion: boss.isInvasion || false,
                scheduledDate,
                time: `${padNumber(scheduledDate.getHours())}:${padNumber(scheduledDate.getMinutes())}`,
                timeFormat: 'hm',
                memo: s.memo || '',
                type: 'boss',
                alerted_5min: s.alerted_5min || false,
                alerted_1min: s.alerted_1min || false,
                alerted_0min: s.alerted_0min || false
            };
        }).filter(Boolean);

        if (uiFilter) {
            const now = Date.now();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const startTime = todayStart.getTime();
            const endTime = startTime + (48 * 60 * 60 * 1000);
            enriched = enriched.filter(item => {
                const t = item.scheduledDate.getTime();
                return t >= startTime && t <= endTime;
            });
        }

        enriched.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

        const result = [];
        let lastDateStr = '';
        enriched.forEach(item => {
            const d = item.scheduledDate;
            const dateStr = `${padNumber(d.getMonth() + 1)}.${padNumber(d.getDate())}`;
            if (dateStr !== lastDateStr) {
                result.push({ type: 'date', date: dateStr });
                lastDateStr = dateStr;
            }
            result.push(item);
        });

        if (uiFilter) {
            const filtered = [];
            for (let i = 0; i < result.length; i++) {
                const item = result[i];
                if (item.type === 'date') {
                    const nextBoss = result.slice(i + 1).find(f => f.type === 'boss');
                    if (nextBoss) {
                        const nd = nextBoss.scheduledDate;
                        const nextDateStr = `${padNumber(nd.getMonth() + 1)}.${padNumber(nd.getDate())}`;
                        if (nextDateStr === item.date) {
                            filtered.push(item);
                            continue;
                        }
                    }
                    continue;
                }
                filtered.push(item);
            }
            return filtered;
        }

        return result;
    };

    // --- 48h expansion for a game ---
    const _expandAndReconstruct = (gameId) => {
        const bosses = DB.getBossesByGameId(gameId);
        if (bosses.length === 0) return;

        const schedules = DB.getSchedulesByGameId(gameId);
        if (schedules.length === 0) return;

        const now = Date.now();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const startTime = todayStart.getTime();
        const endTime = startTime + (48 * 60 * 60 * 1000);

        const schedulesByBoss = new Map();
        schedules.forEach(s => {
            if (!schedulesByBoss.has(s.bossId)) schedulesByBoss.set(s.bossId, []);
            schedulesByBoss.get(s.bossId).push(s);
        });

        const expandedSchedules = [];
        const addedKeys = new Set();

        const addUnique = (entry) => {
            const key = `${entry.bossId}_${new Date(entry.scheduledDate).getTime()}`;
            if (!addedKeys.has(key)) {
                addedKeys.add(key);
                expandedSchedules.push(entry);
            }
        };

        const isSameDay = (d1, d2) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        for (const boss of bosses) {
            const bossSchedules = schedulesByBoss.get(boss.id) || [];
            if (bossSchedules.length === 0) continue;

            const interval = (boss.interval || 0) * 60 * 1000;
            const isTodayOnly = boss.isInvasion || false;

            // Find anchor (closest to now)
            const sorted = [...bossSchedules].sort((a, b) =>
                Math.abs(new Date(a.scheduledDate).getTime() - now) -
                Math.abs(new Date(b.scheduledDate).getTime() - now)
            );
            const anchor = sorted[0];
            const anchorTime = new Date(anchor.scheduledDate).getTime();

            // Build user-defined map for this boss
            const userDefinedTimes = new Set(
                bossSchedules.map(s => new Date(s.scheduledDate).getTime())
            );

            // Preserve user-defined instances in range or future
            bossSchedules.forEach(s => {
                const sTime = new Date(s.scheduledDate).getTime();
                if (sTime >= startTime || sTime > now) {
                    addUnique({
                        bossId: boss.id,
                        scheduledDate: s.scheduledDate,
                        memo: s.memo || '',
                        alerted_5min: s.alerted_5min || false,
                        alerted_1min: s.alerted_1min || false,
                        alerted_0min: s.alerted_0min || false
                    });
                }
            });

            if (interval > 0) {
                const createInstance = (time) => {
                    if (userDefinedTimes.has(time)) return null;
                    return {
                        bossId: boss.id,
                        scheduledDate: new Date(time).toISOString(),
                        memo: anchor.memo || '',
                        alerted_5min: false,
                        alerted_1min: false,
                        alerted_0min: false
                    };
                };

                // Expand backward
                let t = anchorTime - interval;
                while (t >= startTime) {
                    const inst = createInstance(t);
                    if (inst && (!isTodayOnly || isSameDay(new Date(t), new Date(now)))) {
                        addUnique(inst);
                    }
                    t -= interval;
                }

                // Expand forward
                t = anchorTime + interval;
                let hasFuture = expandedSchedules.some(s =>
                    s.bossId === boss.id && new Date(s.scheduledDate).getTime() > now
                );
                while (t <= endTime) {
                    const inst = createInstance(t);
                    if (inst && (!isTodayOnly || isSameDay(new Date(t), new Date(now)))) {
                        addUnique(inst);
                        if (t > now) hasFuture = true;
                    }
                    t += interval;
                }

                // Future Anchor Keeper
                if (!hasFuture) {
                    let futureTime = anchorTime;
                    while (futureTime <= now) futureTime += interval;
                    const inst = createInstance(futureTime);
                    if (inst) addUnique(inst);
                }
            }
        }

        // GC: 과거이면서 0min 알림 완료된 스케줄 제거 (보스별 최소 1개 보존)
        const bossScheduleCount = new Map();
        expandedSchedules.forEach(s => {
            bossScheduleCount.set(s.bossId, (bossScheduleCount.get(s.bossId) || 0) + 1);
        });

        const gcFiltered = expandedSchedules.filter(s => {
            const sTime = new Date(s.scheduledDate).getTime();
            if (sTime < now && s.alerted_0min && bossScheduleCount.get(s.bossId) > 1) {
                bossScheduleCount.set(s.bossId, bossScheduleCount.get(s.bossId) - 1);
                return false;
            }
            return true;
        });

        DB.replaceSchedulesByGameId(gameId, gcFiltered);
    };

    return {
        init() {
            const activeGame = DB.getSetting('lastSelectedGame');
            if (activeGame && DB.getSchedulesByGameId(activeGame).length > 0) {
                _expandAndReconstruct(activeGame);
            }
            notifyStructural();
        },

        subscribe(callback, type = 'structural') {
            if (type === 'structural') structuralSubscribers.push(callback);
            else if (type === 'ui') uiSubscribers.push(callback);
        },

        getBossSchedule(uiFilter = true) {
            const activeGame = DB.getSetting('lastSelectedGame');
            if (!activeGame) return [];
            const schedules = DB.getSchedulesByGameId(activeGame);
            return _enrichSchedules(schedules, uiFilter);
        },

        setBossSchedule(items) {
            if (!items || !Array.isArray(items)) return;
            const enrichedItems = items.filter(item => item.type === 'boss');
            enrichedItems.forEach(item => {
                if (item.id && typeof item.id === 'number') {
                    DB.updateSchedule(item.id, {
                        alerted_5min: item.alerted_5min || false,
                        alerted_1min: item.alerted_1min || false,
                        alerted_0min: item.alerted_0min || false,
                        memo: item.memo || ''
                    });
                }
            });
            notifyStructural();
        },

        isDraftDirty() {
            const activeGame = DB.getSetting('lastSelectedGame');
            if (!activeGame) return false;
            const draft = loadDraftFromLs(activeGame);
            if (!draft) return false;

            const simplify = (list) => {
                if (!Array.isArray(list)) return [];
                return list
                    .filter(item => item.type === 'boss' && item.scheduledDate)
                    .map(item => ({
                        name: item.name,
                        scheduledDate: new Date(item.scheduledDate).getTime(),
                        memo: item.memo || ""
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));
            };

            const mainSchedule = this.getBossSchedule(false);
            return JSON.stringify(simplify(mainSchedule)) !== JSON.stringify(simplify(draft));
        },

        syncDraftWithMain() {
            const activeGame = DB.getSetting('lastSelectedGame');
            if (!activeGame) return;
            const mainSchedule = this.getBossSchedule(false);
            const cloned = JSON.parse(JSON.stringify(mainSchedule), (key, value) => {
                if (key === 'scheduledDate') return new Date(value);
                return value;
            });
            saveDraftToLs(activeGame, cloned);
            notifyStructural();
        },

        checkAndUpdateSchedule(force = false, isSchedulerActive = false) {
            const now = new Date();
            const lastUpdate = DB.getSetting('lastAutoUpdateTimestamp');
            const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : null;

            let needsUpdate = force;
            if (!needsUpdate && lastUpdateDate) {
                needsUpdate = now.toDateString() !== lastUpdateDate.toDateString();
            } else if (!lastUpdateDate) {
                needsUpdate = true;
            }

            if (!needsUpdate) return;

            const activeGame = DB.getSetting('lastSelectedGame');
            if (!activeGame) return;

            const performUpdate = () => {
                _expandAndReconstruct(activeGame);
                DB.setSetting('lastAutoUpdateTimestamp', now.getTime());
                if (!BossDataManager.isDraftDirty()) {
                    BossDataManager.syncDraftWithMain();
                }
                notifyStructural();
            };

            if (isSchedulerActive && BossDataManager.isDraftDirty()) {
                const todayStr = formatMonthDay(now);
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate() + 1);
                const tomorrowStr = formatMonthDay(tomorrow);

                const msg = `오늘(${todayStr})과 내일(${tomorrowStr})의 최신 일정으로 업데이트 하시겠습니까?\n\n(확인: 새 일정 로드, 취소: 현재 수정 내용 유지)`;
                if (confirm(msg)) {
                    performUpdate();
                    BossDataManager.syncDraftWithMain();
                } else {
                    _expandAndReconstruct(activeGame);
                    DB.setSetting('lastAutoUpdateTimestamp', now.getTime());
                    notifyStructural();
                }
            } else {
                performUpdate();
                if (!isSchedulerActive) {
                    BossDataManager.syncDraftWithMain();
                }
            }
        },

        getBossInterval(bossName, contextId) {
            return _getBossMetadata(bossName, contextId).interval;
        },

        validateBossSchedule() {
            return { isValid: true };
        },

        // --- Draft Management ---
        getDraftSchedule(gameId) {
            return loadDraftFromLs(gameId) || [];
        },

        setDraftSchedule(gameId, newDraft) {
            saveDraftToLs(gameId, newDraft);
        },

        clearDraft(gameId) {
            localStorage.removeItem(`${DRAFT_KEY_PREFIX}${gameId}`);
        },

        isPresetNamesMatching(gameId, schedule) {
            const game = DB.getGame(gameId);
            if (!game || game.type !== 'preset') return true;
            const officialBosses = DB.getBossesByGameId(gameId).map(b => b.name);
            const currentNames = [...new Set(
                schedule.filter(item => item.type === 'boss').map(b => b.name)
            )];
            return currentNames.every(name => officialBosses.includes(name));
        },

        extractBossNamesText(schedule) {
            const bossNames = schedule
                .filter(item => item.type === 'boss')
                .map(item => item.name);
            return [...new Set(bossNames)].join('\n');
        },

        commitDraft(gameId) {
            const draft = loadDraftFromLs(gameId);
            if (!draft || !Array.isArray(draft)) return;

            const bossItems = draft.filter(item => item.type === 'boss' && item.scheduledDate);
            if (bossItems.length === 0) return;

            const gameBosses = DB.getBossesByGameId(gameId);
            const bossNameMap = new Map(gameBosses.map(b => [b.name, b]));

            const newSchedules = [];
            bossItems.forEach(item => {
                let boss = bossNameMap.get(item.name);
                if (!boss) {
                    boss = DB.upsertBoss(gameId, item.name, {
                        interval: item.interval || 0,
                        isInvasion: false
                    });
                    bossNameMap.set(item.name, boss);
                }
                newSchedules.push({
                    bossId: boss.id,
                    scheduledDate: new Date(item.scheduledDate).toISOString(),
                    memo: item.memo || ''
                });
            });

            DB.replaceSchedulesByGameId(gameId, newSchedules);
            _expandAndReconstruct(gameId);
            DB.setSetting('lastSelectedGame', gameId);
            notifyStructural();
        },

        expandSchedule(gameIdOrItems) {
            if (typeof gameIdOrItems === 'string') {
                _expandAndReconstruct(gameIdOrItems);
                notifyStructural();
                return this.getBossSchedule(false);
            }
            // Compat: if called with items array, just return them (expansion is DB-based now)
            return gameIdOrItems;
        },

        // --- Next Boss Info ---
        setNextBossInfo(nextBoss, minTimeDiff) {
            _nextBoss = nextBoss;
            _minTimeDiff = minTimeDiff;
            notifyUI();
        },

        getNextBossInfo() {
            return { nextBoss: _nextBoss, minTimeDiff: _minTimeDiff };
        },

        getAllUpcomingBosses(nowTime = Date.now()) {
            const nowAsDate = new Date(nowTime);
            const activeGame = DB.getSetting('lastSelectedGame');

            const dbSchedules = activeGame ? DB.getSchedulesByGameId(activeGame) : [];
            const allBosses = DB.getBosses();
            const bossMap = new Map(allBosses.map(b => [b.id, b]));

            const manualBosses = dbSchedules
                .filter(s => {
                    const t = new Date(s.scheduledDate).getTime();
                    return !isNaN(t) && t > nowTime;
                })
                .map(s => {
                    const boss = bossMap.get(s.bossId);
                    if (!boss) return null;
                    const scheduledDate = new Date(s.scheduledDate);
                    return {
                        id: s.id,
                        bossId: s.bossId,
                        name: boss.name,
                        time: `${padNumber(scheduledDate.getHours())}:${padNumber(scheduledDate.getMinutes())}`,
                        scheduledDate,
                        timestamp: scheduledDate.getTime(),
                        isFixed: false,
                        alerted_5min: s.alerted_5min || false,
                        alerted_1min: s.alerted_1min || false,
                        alerted_0min: s.alerted_0min || false
                    };
                })
                .filter(Boolean);

            const fixedAlarms = LocalStorageManager.getFixedAlarms();
            const fixedBosses = fixedAlarms
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

        getBossStatusSummary(nowTime = Date.now()) {
            const all = BossDataManager.getAllUpcomingBosses(nowTime);
            const nextBoss = all[0] || null;
            const minTimeDiff = nextBoss ? nextBoss.timestamp - nowTime : Infinity;
            const imminentBosses = all.filter(boss => (boss.timestamp - nowTime) <= BOSS_THRESHOLDS.IMMINENT);
            return { nextBoss, minTimeDiff, imminentBosses, allUpcoming: all };
        },

        getUpcomingBosses(count) {
            return BossDataManager.getAllUpcomingBosses().slice(0, count);
        },

        getImminentBosses() {
            return BossDataManager.getBossStatusSummary().imminentBosses;
        }
    };
})();

export const LocalStorageManager = (() => {
    const DEFAULT_FIXED_ALARMS = [
        { id: 'fixed-1', name: '대륙 침략자', time: '12:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
        { id: 'fixed-2', name: '대륙 침략자', time: '20:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
        { id: 'fixed-3', name: '발할라', time: '13:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
        { id: 'fixed-4', name: '발할라', time: '18:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
        { id: 'fixed-5', name: '발할라', time: '21:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
    ];

    function _getFixedAlarms() {
        return DB.getSetting('fixedAlarms') || DEFAULT_FIXED_ALARMS;
    }

    function _saveFixedAlarms(alarms) {
        DB.setSetting('fixedAlarms', alarms);
    }

    return {
        init() {
            if (DB.getSetting('fixedAlarms') === null) _saveFixedAlarms(DEFAULT_FIXED_ALARMS);
            if (DB.getSetting('logVisibilityState') === null) DB.setSetting('logVisibilityState', true);
            if (DB.getSetting('alarmRunningState') === null) DB.setSetting('alarmRunningState', false);
            if (DB.getSetting('muteState') === null) DB.setSetting('muteState', false);
            if (DB.getSetting('volume') === null) DB.setSetting('volume', 1);
            if (DB.getSetting('preMuteVolume') === null) DB.setSetting('preMuteVolume', 1);
            if (DB.getSetting('crazyCalculatorRecords') === null) DB.setSetting('crazyCalculatorRecords', []);
        },

        get(key) { return DB.getSetting(key); },
        set(key, value) { DB.setSetting(key, value); },

        getFixedAlarms() { return _getFixedAlarms(); },
        getFixedAlarmById(id) { return _getFixedAlarms().find(a => a.id === id); },
        addFixedAlarm(alarm) {
            const alarms = _getFixedAlarms();
            alarms.push(alarm);
            _saveFixedAlarms(alarms);
        },
        updateFixedAlarm(id, updatedAlarm) {
            const alarms = _getFixedAlarms();
            const idx = alarms.findIndex(a => a.id === id);
            if (idx !== -1) {
                alarms[idx] = { ...alarms[idx], ...updatedAlarm };
                _saveFixedAlarms(alarms);
            }
        },
        deleteFixedAlarm(id) {
            _saveFixedAlarms(_getFixedAlarms().filter(a => a.id !== id));
        },
        exportFixedAlarms() {
            return btoa(encodeURIComponent(JSON.stringify(_getFixedAlarms())));
        },
        importFixedAlarms(encodedData) {
            try {
                const decoded = JSON.parse(decodeURIComponent(atob(encodedData)));
                if (Array.isArray(decoded) && decoded.every(item => item.id && item.name && item.time)) {
                    _saveFixedAlarms(decoded);
                    return true;
                }
            } catch (e) {
                console.error("Failed to import fixed alarms:", e);
            }
            return false;
        },

        getLogVisibilityState() { return DB.getSetting('logVisibilityState') ?? true; },
        setLogVisibilityState(state) { DB.setSetting('logVisibilityState', state); },
        getAlarmRunningState() { return DB.getSetting('alarmRunningState') ?? false; },
        setAlarmRunningState(state) { DB.setSetting('alarmRunningState', state); },
        getMuteState() { return DB.getSetting('muteState') ?? false; },
        setMuteState(state) { DB.setSetting('muteState', state); },
        getVolume() { return DB.getSetting('volume') ?? 1; },
        setVolume(v) { DB.setSetting('volume', v); },
        getPreMuteVolume() { return DB.getSetting('preMuteVolume') ?? 1; },
        setPreMuteVolume(v) { DB.setSetting('preMuteVolume', v); },
        getCrazyCalculatorRecords() { return DB.getSetting('crazyCalculatorRecords') || []; },
        setCrazyCalculatorRecords(records) { DB.setSetting('crazyCalculatorRecords', records); },
        clearCrazyCalculatorRecords() { DB.setSetting('crazyCalculatorRecords', []); }
    };
})();
