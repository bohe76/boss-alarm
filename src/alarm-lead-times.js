// src/alarm-lead-times.js
// 알림 시간 설정 — 보스 출현·고정 알림 시각의 몇 분 전에 미리 알릴지. 정각 알림은 설정과 무관하게 항상 울린다.

import { LocalStorageManager } from './data-managers.js';

const STORAGE_KEY = 'alarmLeadTimes';

export const DEFAULT_ALARM_LEAD_TIMES = [5, 1];
export const MAX_ALARM_LEAD_TIMES = 5;
export const MIN_ALARM_LEAD_MINUTES = 1;
export const MAX_ALARM_LEAD_MINUTES = 60;

export function isValidAlarmLeadMinutes(minutes) {
    return Number.isInteger(minutes) && minutes >= MIN_ALARM_LEAD_MINUTES && minutes <= MAX_ALARM_LEAD_MINUTES;
}

// 저장 값은 믿지 않는다(직접 고친 localStorage 등). 범위 안의 정수만, 중복 없이, 큰 값부터, 최대 개수까지.
function normalize(list) {
    return [...new Set(list.filter(isValidAlarmLeadMinutes))]
        .sort((a, b) => b - a)
        .slice(0, MAX_ALARM_LEAD_TIMES);
}

/**
 * 알림 시간 목록(분, 큰 값부터)을 돌려준다.
 * 저장된 값이 없으면 기본값이다. 빈 배열은 사용자가 모두 지운 것이므로 그대로 돌려준다(정각 알림만 울림).
 * 값이 들어 있는데 쓸 수 있는 것이 하나도 없으면 손상된 것으로 보고 기본값을 쓴다 — 미리 알림이 말없이 꺼지지 않게.
 * @returns {number[]}
 */
export function getAlarmLeadTimes() {
    const stored = LocalStorageManager.get(STORAGE_KEY);
    if (!Array.isArray(stored)) return [...DEFAULT_ALARM_LEAD_TIMES];
    const leadTimes = normalize(stored);
    return stored.length > 0 && leadTimes.length === 0 ? [...DEFAULT_ALARM_LEAD_TIMES] : leadTimes;
}

export function saveAlarmLeadTimes(list) {
    LocalStorageManager.set(STORAGE_KEY, normalize(list));
}
