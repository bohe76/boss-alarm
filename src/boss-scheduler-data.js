// src/boss-scheduler-data.js

import { log } from './logger.js';
import { CustomListManager } from './custom-list-manager.js';

let bossLists = {};

/**
 * Loads boss list data and initializes custom lists.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<object>} A promise that resolves with the boss list data.
 */
export async function loadBossLists(filePath = 'data/boss_lists.json') {
    CustomListManager.init(); // Initialize custom lists from localStorage
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        bossLists = await response.json();
        log(`보스 목록을 ${filePath}에서 성공적으로 로드했습니다.`);
        return bossLists;
    } catch (error) {
        log(`보스 목록 로드 실패: ${error.message}.`);
        bossLists = {}; // Ensure bossLists is empty on failure
        return {};
    }
}

/**
 * Returns a combined list of predefined and custom game/list names.
 * Each item is an object { name: string, isCustom: boolean }.
 * @returns {Array<{name: string, isCustom: boolean}>} An array of game name objects.
 */
export function getGameNames() {
    const predefined = Object.keys(bossLists).map(name => ({ name, isCustom: false }));
    const custom = CustomListManager.getCustomLists().map(list => ({ name: list.name, isCustom: true }));
    return [...predefined, ...custom];
}

/**
 * Returns the boss names for a given game or custom list.
 * @param {string} gameName - The name of the game or custom list.
 * @returns {string[]} An array of boss names.
 */
export function getBossNamesForGame(gameName) {
    if (bossLists[gameName]) {
        return bossLists[gameName];
    }
    return CustomListManager.getBossNamesForCustomList(gameName) || [];
}
