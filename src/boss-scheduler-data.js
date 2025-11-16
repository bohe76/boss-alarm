// src/boss-scheduler-data.js

import { log } from './logger.js';

let bossLists = {};

/**
 * Loads boss list data from the specified JSON file.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<object>} A promise that resolves with the boss list data.
 */
export async function loadBossLists(filePath = 'data/boss_lists.json') {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        bossLists = await response.json();
        log(`보스 목록을 ${filePath}에서 성공적으로 로드했습니다.`, true);
        return bossLists;
    } catch (error) {
        log(`보스 목록 로드 실패: ${error.message}. 기본값을 사용합니다.`, false);
        bossLists = {}; // Ensure bossLists is empty on failure
        return {};
    }
}

/**
 * Returns the list of available games (top-level keys in bossLists).
 * @returns {string[]} An array of game names.
 */
export function getGameNames() {
    return Object.keys(bossLists);
}

/**
 * Returns the boss names for a given game.
 * @param {string} gameName - The name of the game.
 * @returns {string[]} An array of boss names for the specified game.
 */
export function getBossNamesForGame(gameName) {
    return bossLists[gameName] || [];
}
