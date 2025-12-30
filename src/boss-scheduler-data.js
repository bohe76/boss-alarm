// src/boss-scheduler-data.js

import { log } from './logger.js';
import { CustomListManager } from './custom-list-manager.js';

let bossMetadata = {}; //From boss-presets.json
let initialDefaultData = null; // From initial-default.json
let updateNoticeData = null; // From update-notice.json

/**
 * 보스 프리셋 및 초기 데이터를 로드합니다.
 */
export async function loadBossSchedulerData() {
    try {
        const [presetsRes, defaultRes, noticeRes] = await Promise.all([
            fetch('src/data/boss-presets.json'),
            fetch('src/data/initial-default.json'),
            fetch('src/data/update-notice.json')
        ]);

        if (!presetsRes.ok || !defaultRes.ok || !noticeRes.ok) {
            throw new Error('데이터 파일을 불러오는 데 실패했습니다.');
        }

        bossMetadata = await presetsRes.json();
        initialDefaultData = await defaultRes.json();
        updateNoticeData = await noticeRes.json();

        log(`보스 프리셋 및 초기 데이터를 성공적으로 로드했습니다.`);
        return { bossMetadata, initialDefaultData, updateNoticeData };
    } catch (error) {
        log(`데이터 로드 실패: ${error.message}.`);
        // 에러 발생 시 사용자에게 확인창 표시
        alert("⚠️ 보스 데이터를 불러오지 못했습니다.\n\n네트워크 연결 상태를 확인하거나 페이지를 새로고침해 주세요. 계속해서 문제가 발생할 경우 관리자에게 문의해 주시기 바랍니다.");
        return { bossMetadata: {}, initialDefaultData: { items: [] } };
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

/**
 * 업데이트 공지 데이터를 반환합니다.
 */
export function getUpdateNoticeData() {
    return updateNoticeData;
}
