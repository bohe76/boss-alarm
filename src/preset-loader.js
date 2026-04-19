// src/preset-loader.js
// v3.0 - Loads boss-presets.json and syncs to DB tables (idempotent upsert)

import { DB } from './db.js';

let rawPresets = {};
let initialDefaultData = null;
let updateNoticeData = null;

export async function loadPresets() {
    try {
        const [presetsRes, defaultRes, noticeRes] = await Promise.all([
            fetch('src/data/boss-presets.json'),
            fetch('src/data/initial-default.json'),
            fetch('src/data/update-notice.json')
        ]);

        if (!presetsRes.ok || !defaultRes.ok || !noticeRes.ok) {
            throw new Error('데이터 파일을 불러오는 데 실패했습니다.');
        }

        rawPresets = await presetsRes.json();
        initialDefaultData = await defaultRes.json();
        updateNoticeData = await noticeRes.json();

        syncPresetsToDb(rawPresets);
        return { rawPresets, initialDefaultData, updateNoticeData };
    } catch (error) {
        console.error(`프리셋 로드 실패: ${error.message}`);
        alert("⚠️ 보스 데이터를 불러오지 못했습니다.\n\n네트워크 연결 상태를 확인하거나 페이지를 새로고침해 주세요.");
        return { rawPresets: {}, initialDefaultData: { items: [] }, updateNoticeData: null };
    }
}

export function syncPresetsToDb(presets) {
    for (const [gameId, gameData] of Object.entries(presets)) {
        DB.upsertGame({
            id: gameId,
            name: gameData.gameName,
            type: 'preset'
        });

        const presetBossNames = new Set(Object.keys(gameData.bossMetadata));

        for (const [bossName, metaValue] of Object.entries(gameData.bossMetadata)) {
            const interval = typeof metaValue === 'number' ? metaValue : (metaValue.interval || 0);
            const isInvasion = typeof metaValue === 'object' ? !!metaValue.isInvasion : false;

            DB.upsertBoss(gameId, bossName, { interval, isInvasion });
        }

        // 프리셋에서 제거된 보스 정리
        const dbBosses = DB.getBossesByGameId(gameId);
        dbBosses.forEach(boss => {
            if (!presetBossNames.has(boss.name)) {
                DB.deleteBoss(boss.id);
            }
        });
    }
}

export function getRawPresets() {
    return rawPresets;
}

export function getInitialDefaultData() {
    return initialDefaultData;
}

export function getUpdateNoticeData() {
    return updateNoticeData;
}
