// src/boss-scheduler-data.js

import { log } from './logger.js';
import { CustomListManager } from './custom-list-manager.js';

let bossMetadata = {}; //From boss-presets.json
let initialDefaultData = null; // From initial-default.json

/**
 * 보스 프리셋 및 초기 데이터를 로드합니다.
 */
export async function loadBossSchedulerData() {
    try {
        const [presetsRes, defaultRes] = await Promise.all([
            fetch('src/data/boss-presets.json'),
            fetch('src/data/initial-default.json')
        ]);

        if (!presetsRes.ok || !defaultRes.ok) {
            throw new Error('데이터 파일을 불러오는 데 실패했습니다.');
        }

        bossMetadata = await presetsRes.json();
        initialDefaultData = await defaultRes.json();

        log(`보스 프리셋 및 초기 데이터를 성공적으로 로드했습니다.`);
        return { bossMetadata, initialDefaultData };
    } catch (error) {
        log(`데이터 로드 실패: ${error.message}.`);
        return { bossMetadata: {}, initialDefaultData: null };
    }
}

/**
 * 게임/프리셋 이름 목록을 반환합니다.
 */
export function getGameNames() {
    const predefined = Object.keys(bossMetadata).map(id => ({
        id: id,
        name: bossMetadata[id].gameName,
        isCustom: false
    }));
    const custom = CustomListManager.getCustomLists().map(list => ({
        id: list.name,
        name: list.name,
        isCustom: true
    }));
    return [...predefined, ...custom];
}

/**
 * 특정 게임/목록의 보스 이름 배열을 반환합니다.
 */
export function getBossNamesForGame(gameIdOrName) {
    // 1. 프리셋에서 ID로 찾기
    if (bossMetadata[gameIdOrName]) {
        return Object.keys(bossMetadata[gameIdOrName].bossMetadata);
    }

    // 2. 프리셋에서 게임 이름으로 찾기 (하위 호환성)
    const presetEntry = Object.values(bossMetadata).find(entry => entry.gameName === gameIdOrName);
    if (presetEntry) {
        return Object.keys(presetEntry.bossMetadata);
    }

    // 3. 커스텀 목록에서 찾기
    return CustomListManager.getBossNamesForCustomList(gameIdOrName) || [];
}

/**
 * 초기 디폴트 데이터를 반환합니다.
 */
export function getInitialDefaultData() {
    return initialDefaultData;
}

/**
 * 보스 프리셋 메타데이터 전체를 반환합니다.
 */
export function getBossMetadata() {
    return bossMetadata;
}
