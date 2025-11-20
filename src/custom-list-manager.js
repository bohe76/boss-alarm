/**
 * @file 사용자 지정 보스 목록 관리를 위한 모든 로직을 캡슐화합니다.
 * @see docs/feature_custom_boss_list_upload.md
 */

import { LocalStorageManager } from './data-managers.js';
import { log } from './logger.js';
import { getGameNames as getPredefinedGameNames } from './boss-scheduler-data.js';

const CUSTOM_BOSS_LISTS_KEY = 'customBossLists';

/**
 * 사용자 지정 목록 이름 유효성 검사
 * @param {string} name - 목록 이름
 * @returns {{isValid: boolean, message?: string}}
 */
function validateListName(name) {
    if (!name) return { isValid: false, message: '사용자 지정 목록 이름은 비워둘 수 없습니다.' };
    if (name.length > 50) return { isValid: false, message: '사용자 지정 목록 이름은 50자를 초과할 수 없습니다.' };
    if (!/^[a-zA-Z0-9가-힣\s\-_()]+$/.test(name)) {
        return { isValid: false, message: '사용자 지정 목록 이름은 영문, 한글, 숫자, 공백, 하이픈(-), 밑줄(_), 괄호()만 허용됩니다.' };
    }
    return { isValid: true };
}

/**
 * 보스 목록 내용 유효성 검사 및 파싱
 * @param {string} content - 텍스트 영역의 내용
 * @returns {{isValid: boolean, bosses?: string[], message?: string}}
 */
function parseAndValidateBossContent(content) {
    if (!content || !content.trim()) {
        return { isValid: false, message: '보스 목록 내용이 비어 있습니다.' };
    }
    const lines = content.split('\n');
    const bosses = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // 빈 줄 무시

        if (line.length > 50) {
            return { isValid: false, message: `${i + 1}번째 줄의 보스 이름이 50자를 초과합니다: "${line}"` };
        }
        // 제어 문자 검사 (예: 탭)
        if (/[\t\n\r]/.test(line)) {
            return { isValid: false, message: `${i + 1}번째 줄에 허용되지 않는 문자가 포함되어 있습니다.` };
        }
        bosses.push(line);
    }
    if (bosses.length === 0) {
        return { isValid: false, message: '유효한 보스 이름이 없습니다.' };
    }
    return { isValid: true, bosses };
}

function saveListsToLocalStorage() {
    LocalStorageManager.set(CUSTOM_BOSS_LISTS_KEY, customBossLists);
}

/**
 * 사용자 지정 보스 목록 객체 배열
 * @type {Array<Object>}
 */
let customBossLists = [];

/**
 * 앱 시작 시 로컬 저장소에서 사용자 지정 목록을 로드합니다.
 */
function init() {
    customBossLists = LocalStorageManager.get(CUSTOM_BOSS_LISTS_KEY) || [];
    log(`[CustomListManager] ${customBossLists.length}개의 사용자 지정 목록을 로드했습니다.`);
}

/**
 * 저장된 모든 사용자 지정 목록 객체 배열을 반환합니다.
 * @returns {Array<Object>}
 */
function getCustomLists() {
    return customBossLists;
}

/**
 * 텍스트 영역 내용을 파싱하고 유효성을 검사한 다음 새 사용자 지정 목록으로 저장합니다.
 * @param {string} listName - 사용자 지정 목록의 이름
 * @param {string} listContent - 텍스트 영역의 내용
 * @returns {{success: boolean, message?: string}} - 성공/실패 및 오류 메시지
 */
function addCustomList(listName, listContent) {
    const nameValidation = validateListName(listName);
    if (!nameValidation.isValid) {
        return { success: false, message: nameValidation.message };
    }

    const isNameDuplicate = customBossLists.some(list => list.name === listName) || getPredefinedGameNames().some(game => game.name === listName && !game.isCustom);
    if (isNameDuplicate) {
        // 기능 명세에 따라 저장 시에는 덮어쓰기 확인을 요구하나, 여기서는 우선 중복 방지 처리.
        return { success: false, message: '이미 존재하는 목록 또는 게임 이름입니다.' };
    }

    const contentValidation = parseAndValidateBossContent(listContent);
    if (!contentValidation.isValid) {
        return { success: false, message: contentValidation.message };
    }

    customBossLists.push({
        name: listName,
        bosses: contentValidation.bosses,
        content: listContent // 원본 내용 저장
    });
    saveListsToLocalStorage();

    return { success: true, message: `"${listName}" 목록이 추가되었습니다.` };
}

/**
 * 기존 사용자 지정 목록의 내용을 업데이트합니다.
 * @param {string} originalName - 업데이트할 사용자 지정 목록의 원래 이름
 * @param {string} newListContent - 새로운 텍스트 영역의 내용
 * @returns {{success: boolean, message?: string}} - 성공/실패 및 오류 메시지
 */
function updateCustomList(originalName, newListContent) {
    const listToUpdate = customBossLists.find(list => list.name === originalName);
    if (!listToUpdate) {
        return { success: false, message: '수정할 목록을 찾을 수 없습니다.' };
    }

    const contentValidation = parseAndValidateBossContent(newListContent);
    if (!contentValidation.isValid) {
        return { success: false, message: contentValidation.message };
    }

    listToUpdate.bosses = contentValidation.bosses;
    listToUpdate.content = newListContent; // 원본 내용 업데이트
    saveListsToLocalStorage();

    return { success: true, message: `"${originalName}" 목록이 수정되었습니다.` };
}

/**
 * 사용자 지정 목록을 삭제합니다.
 * @param {string} listName - 삭제할 사용자 지정 목록의 이름
 * @returns {{success: boolean, message?: string}}
 */
function deleteCustomList(listName) {
    const initialLength = customBossLists.length;
    customBossLists = customBossLists.filter(list => list.name !== listName);
    if (customBossLists.length === initialLength) {
        return { success: false, message: '삭제할 목록을 찾을 수 없습니다.' };
    }
    saveListsToLocalStorage();
    return { success: true, message: `"${listName}" 목록이 삭제되었습니다.` };
}

/**
 * 기존 사용자 지정 목록의 이름을 변경합니다.
 * @param {string} oldName - 이전 이름
 * @param {string} newName - 새로운 이름
 * @returns {{success: boolean, message?: string}} - 성공/실패 및 오류 메시지
 */
function renameCustomList(oldName, newName) {
    if (oldName === newName) {
        return { success: true }; // 이름이 같으면 변경할 필요 없음
    }

    const nameValidation = validateListName(newName);
    if (!nameValidation.isValid) {
        return { success: false, message: nameValidation.message };
    }

    const isNameDuplicate = customBossLists.some(list => list.name === newName) || getPredefinedGameNames().some(game => game.name === newName && !game.isCustom);
    if (isNameDuplicate) {
        return { success: false, message: '이미 존재하는 목록 또는 게임 이름입니다.' };
    }

    const listToRename = customBossLists.find(list => list.name === oldName);
    if (!listToRename) {
        return { success: false, message: '이름을 변경할 목록을 찾을 수 없습니다.' };
    }

    listToRename.name = newName;
    saveListsToLocalStorage();

    return { success: true, message: `"${oldName}"이(가) "${newName}"(으)로 이름 변경되었습니다.` };
}

/**
 * 특정 사용자 지정 목록의 보스 이름 배열을 반환합니다.
 * @param {string} listName - 조회할 사용자 지정 목록의 이름
 * @returns {string[]|null} - 보스 이름 배열 또는 null
 */
function getBossNamesForCustomList(listName) {
    const list = customBossLists.find(l => l.name === listName);
    return list ? list.bosses : null;
}

/**
 * 특정 사용자 지정 목록의 원본 텍스트 내용을 반환합니다.
 * @param {string} listName - 조회할 사용자 지정 목록의 이름
 * @returns {string|null} - 원본 텍스트 내용 또는 null
 */
function getCustomListContent(listName) {
    const list = customBossLists.find(l => l.name === listName);
    return list ? list.content : null;
}


export const CustomListManager = {
    init,
    getCustomLists,
    addCustomList,
    updateCustomList,
    deleteCustomList,
    renameCustomList,
    getBossNamesForCustomList,
    getCustomListContent,
};
