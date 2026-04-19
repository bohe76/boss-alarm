// src/db.js
// v3.0 - 4-table normalized database with auto-increment PK

const KEYS = {
    GAMES: 'v3_games',
    BOSSES: 'v3_bosses',
    SCHEDULES: 'v3_schedules',
    SETTINGS: 'v3_settings',
    UID_COUNTER: 'v3_uid_counter'
};

function load(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function save(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`[DB] localStorage 저장 실패 (key: ${key}):`, e.message);
        if (e.name === 'QuotaExceededError') {
            console.warn('[DB] localStorage 용량 초과. 오래된 데이터 정리가 필요합니다.');
        }
        return false;
    }
    return true;
}

const structuralSubscribers = [];
const uiSubscribers = [];

export const DB = {
    // --- UID Counter ---
    nextId() {
        let counter = load(KEYS.UID_COUNTER) || 0;
        counter++;
        save(KEYS.UID_COUNTER, counter);
        return counter;
    },

    // --- Games CRUD ---
    getGames() {
        return load(KEYS.GAMES) || [];
    },

    getGame(id) {
        return this.getGames().find(g => g.id === id) || null;
    },

    upsertGame(game) {
        const games = this.getGames();
        const idx = games.findIndex(g => g.id === game.id);
        if (idx >= 0) {
            games[idx] = { ...games[idx], ...game };
        } else {
            games.push({ ...game });
        }
        save(KEYS.GAMES, games);
        return game;
    },

    deleteGame(id) {
        const games = this.getGames().filter(g => g.id !== id);
        save(KEYS.GAMES, games);
        this.deleteBossesByGameId(id);
    },

    // --- Bosses CRUD ---
    getBosses() {
        return load(KEYS.BOSSES) || [];
    },

    getBoss(id) {
        return this.getBosses().find(b => b.id === id) || null;
    },

    getBossesByGameId(gameId) {
        return this.getBosses().filter(b => b.gameId === gameId);
    },

    findBoss(gameId, name) {
        return this.getBosses().find(b => b.gameId === gameId && b.name === name) || null;
    },

    addBoss(boss) {
        const bosses = this.getBosses();
        boss.id = this.nextId();
        bosses.push({ ...boss });
        save(KEYS.BOSSES, bosses);
        return boss;
    },

    upsertBoss(gameId, name, data) {
        const bosses = this.getBosses();
        const idx = bosses.findIndex(b => b.gameId === gameId && b.name === name);
        if (idx >= 0) {
            bosses[idx] = { ...bosses[idx], ...data, gameId, name };
            save(KEYS.BOSSES, bosses);
            return bosses[idx];
        }
        const boss = { ...data, gameId, name, id: this.nextId() };
        bosses.push(boss);
        save(KEYS.BOSSES, bosses);
        return boss;
    },

    updateBoss(id, updates) {
        const bosses = this.getBosses();
        const idx = bosses.findIndex(b => b.id === id);
        if (idx >= 0) {
            bosses[idx] = { ...bosses[idx], ...updates };
            save(KEYS.BOSSES, bosses);
            return bosses[idx];
        }
        return null;
    },

    deleteBoss(id) {
        this.deleteSchedulesByBossId(id);
        const bosses = this.getBosses().filter(b => b.id !== id);
        save(KEYS.BOSSES, bosses);
    },

    deleteBossesByGameId(gameId) {
        const bossIds = this.getBossesByGameId(gameId).map(b => b.id);
        bossIds.forEach(bid => this.deleteSchedulesByBossId(bid));
        const bosses = this.getBosses().filter(b => b.gameId !== gameId);
        save(KEYS.BOSSES, bosses);
    },

    // --- Schedules CRUD ---
    getSchedules() {
        return load(KEYS.SCHEDULES) || [];
    },

    getSchedule(id) {
        return this.getSchedules().find(s => s.id === id) || null;
    },

    getSchedulesByBossId(bossId) {
        return this.getSchedules().filter(s => s.bossId === bossId);
    },

    getSchedulesByGameId(gameId) {
        const bossIds = new Set(this.getBossesByGameId(gameId).map(b => b.id));
        return this.getSchedules().filter(s => bossIds.has(s.bossId));
    },

    addSchedule(schedule) {
        const schedules = this.getSchedules();
        const entry = {
            ...schedule,
            id: this.nextId(),
            alerted_5min: schedule.alerted_5min || false,
            alerted_1min: schedule.alerted_1min || false,
            alerted_0min: schedule.alerted_0min || false,
            memo: schedule.memo || ''
        };
        schedules.push(entry);
        save(KEYS.SCHEDULES, schedules);
        return entry;
    },

    addSchedulesBulk(newSchedules) {
        const schedules = this.getSchedules();
        const added = newSchedules.map(s => ({
            ...s,
            id: this.nextId(),
            alerted_5min: s.alerted_5min || false,
            alerted_1min: s.alerted_1min || false,
            alerted_0min: s.alerted_0min || false,
            memo: s.memo || ''
        }));
        save(KEYS.SCHEDULES, [...schedules, ...added]);
        return added;
    },

    updateSchedule(id, updates) {
        const schedules = this.getSchedules();
        const idx = schedules.findIndex(s => s.id === id);
        if (idx >= 0) {
            schedules[idx] = { ...schedules[idx], ...updates };
            save(KEYS.SCHEDULES, schedules);
            return schedules[idx];
        }
        return null;
    },

    deleteSchedule(id) {
        const schedules = this.getSchedules().filter(s => s.id !== id);
        save(KEYS.SCHEDULES, schedules);
    },

    deleteSchedulesByBossId(bossId) {
        const schedules = this.getSchedules().filter(s => s.bossId !== bossId);
        save(KEYS.SCHEDULES, schedules);
    },

    deleteSchedulesByGameId(gameId) {
        const bossIds = new Set(this.getBossesByGameId(gameId).map(b => b.id));
        const schedules = this.getSchedules().filter(s => !bossIds.has(s.bossId));
        save(KEYS.SCHEDULES, schedules);
    },

    replaceSchedulesByGameId(gameId, newSchedules) {
        const bossIds = new Set(this.getBossesByGameId(gameId).map(b => b.id));
        const otherSchedules = this.getSchedules().filter(s => !bossIds.has(s.bossId));
        const prepared = newSchedules.map(s => ({
            ...s,
            id: s.id || this.nextId(),
            alerted_5min: s.alerted_5min || false,
            alerted_1min: s.alerted_1min || false,
            alerted_0min: s.alerted_0min || false,
            memo: s.memo || ''
        }));
        save(KEYS.SCHEDULES, [...otherSchedules, ...prepared]);
        return prepared;
    },

    // --- Settings CRUD ---
    getSetting(key) {
        const settings = load(KEYS.SETTINGS) || {};
        return key in settings ? settings[key] : null;
    },

    setSetting(key, value) {
        const settings = load(KEYS.SETTINGS) || {};
        settings[key] = value;
        save(KEYS.SETTINGS, settings);
    },

    deleteSetting(key) {
        const settings = load(KEYS.SETTINGS) || {};
        delete settings[key];
        save(KEYS.SETTINGS, settings);
    },

    getAllSettings() {
        return load(KEYS.SETTINGS) || {};
    },

    // --- Bulk Operations ---
    importAll(data) {
        if (data.games) {
            const validGames = data.games.filter(g => {
                const ok = g.id !== undefined && g.name !== undefined && g.type !== undefined;
                if (!ok) console.error('[DB] importAll: games 레코드 스키마 불일치, 건너뜀:', g);
                return ok;
            });
            save(KEYS.GAMES, validGames);
        }
        if (data.bosses) {
            const validBosses = data.bosses.filter(b => {
                const ok = b.id !== undefined && b.gameId !== undefined && b.name !== undefined;
                if (!ok) console.error('[DB] importAll: bosses 레코드 스키마 불일치, 건너뜀:', b);
                return ok;
            });
            save(KEYS.BOSSES, validBosses);
            if (data.schedules) {
                const bossIdSet = new Set(validBosses.map(b => b.id));
                const validSchedules = data.schedules.filter(s => {
                    if (s.id === undefined || s.bossId === undefined || s.scheduledDate === undefined) {
                        console.error('[DB] importAll: schedules 레코드 스키마 불일치, 건너뜀:', s);
                        return false;
                    }
                    if (!bossIdSet.has(s.bossId)) {
                        console.error('[DB] importAll: schedules FK 불일치 (bossId 없음), 건너뜀:', s);
                        return false;
                    }
                    return true;
                });
                save(KEYS.SCHEDULES, validSchedules);
            }
        } else if (data.schedules) {
            const validSchedules = data.schedules.filter(s => {
                const ok = s.id !== undefined && s.bossId !== undefined && s.scheduledDate !== undefined;
                if (!ok) console.error('[DB] importAll: schedules 레코드 스키마 불일치, 건너뜀:', s);
                return ok;
            });
            save(KEYS.SCHEDULES, validSchedules);
        }
        if (data.settings) save(KEYS.SETTINGS, data.settings);
        if (typeof data.uidCounter === 'number') save(KEYS.UID_COUNTER, data.uidCounter);
    },

    exportAll() {
        return {
            games: this.getGames(),
            bosses: this.getBosses(),
            schedules: this.getSchedules(),
            settings: this.getAllSettings(),
            uidCounter: load(KEYS.UID_COUNTER) || 0
        };
    },

    // --- Subscriber Pattern ---
    subscribe(callback, type = 'structural') {
        const arr = type === 'ui' ? uiSubscribers : structuralSubscribers;
        arr.push(callback);
        return () => {
            const idx = arr.indexOf(callback);
            if (idx !== -1) arr.splice(idx, 1);
        };
    },

    notifyStructural() {
        structuralSubscribers.forEach(cb => cb());
        this.notifyUI();
    },

    notifyUI() {
        uiSubscribers.forEach(cb => cb());
    },

    // --- Utility ---
    clear() {
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    },

    hasData() {
        const games = load(KEYS.GAMES);
        return games !== null && games.length > 0;
    },

    KEYS
};
