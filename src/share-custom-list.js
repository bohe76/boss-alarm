// src/share-custom-list.js
// 커스텀 보스 목록 공유 — 발신 쪽의 목록 정의 추출과 수신 쪽의 목록 생성 (issue-038)

import { DB } from './db.js';
import { CustomListManager } from './custom-list-manager.js';
import { isPresetList } from './boss-scheduler-data.js';

const MAX_LIST_NAME_LENGTH = 50; // CustomListManager 의 목록 이름 제한과 동일
const MAX_NAME_ATTEMPTS = 100;
// app.js 의 자가 치유(performReverseMigration)가 이 이름의 목록을 Draft 가 비면 삭제하므로,
// 공유받은 목록에는 이 이름을 그대로 쓰지 않는다.
const RESERVED_LIST_NAMES = ['커스텀 보스_001'];
// 받은 젠 주기로 48h 확장이 만들어 낼 수 있는 스케줄 수의 상한.
// 정상 링크는 이미 확장된 스케줄을 싣고 오므로(수백 건) 이 값에 닿지 않는다.
const MAX_EXPANDED_INSTANCES = 5000;
const WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * 공유할 커스텀 목록의 보스 정의를 반환한다. 프리셋이거나 커스텀 목록이 아니면 null.
 * 시간을 입력하지 않은 보스도 포함해 목록 전체를 목록 순서대로 싣는다.
 * @param {string} gameId
 * @returns {Array<{name: string, interval: number}>|null}
 */
export function getSharedBossDefinitions(gameId) {
    if (isPresetList(gameId)) return null;
    const names = CustomListManager.getBossNamesForCustomList(gameId);
    if (!names) return null;

    const intervalByName = new Map(DB.getBossesByGameId(gameId).map(b => [b.name, b.interval || 0]));
    return names.map(name => ({ name, interval: intervalByName.get(name) || 0 }));
}

function candidateName(sharedName, attempt) {
    if (attempt === 1) return sharedName;
    const suffix = ` (${attempt})`;
    return sharedName.slice(0, MAX_LIST_NAME_LENGTH - suffix.length).trimEnd() + suffix;
}

function hasSameBosses(existingNames, sharedNames) {
    const existing = new Set(existingNames);
    return existing.size === sharedNames.length && sharedNames.every(name => existing.has(name));
}

/**
 * 조작된 링크(짧은 주기 + 먼 날짜)가 48h 확장으로 스케줄을 수십만 건 만들어 앱을 멈추지 못하게,
 * 예상 확장량이 큰 보스부터 주기를 0(확장 안 함)으로 낮춘다. 받은 스케줄 자체는 그대로 적재된다.
 */
function limitExpansion(intervalByName, sharedSchedules) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const windowStart = todayStart.getTime();

    // 보스별로 확장이 훑는 구간: 오늘 0시 ~ +48h 를 기본으로, 받은 스케줄 시각까지 넓힌다
    const spanByName = new Map();
    (sharedSchedules || []).forEach(schedule => {
        const time = new Date(schedule?.scheduledDate).getTime();
        if (!intervalByName.has(schedule?.bossName) || isNaN(time)) return;
        const span = spanByName.get(schedule.bossName) || { from: windowStart, to: windowStart + WINDOW_MS };
        span.from = Math.min(span.from, time);
        span.to = Math.max(span.to, time);
        spanByName.set(schedule.bossName, span);
    });

    const estimates = [];
    spanByName.forEach((span, name) => {
        const intervalMs = intervalByName.get(name) * 60 * 1000;
        if (intervalMs > 0) estimates.push({ name, count: Math.ceil((span.to - span.from) / intervalMs) });
    });

    let total = estimates.reduce((sum, estimate) => sum + estimate.count, 0);
    estimates.sort((a, b) => b.count - a.count);
    for (const estimate of estimates) {
        if (total <= MAX_EXPANDED_INSTANCES) break;
        intervalByName.set(estimate.name, 0);
        total -= estimate.count;
    }
}

/**
 * 공유받은 커스텀 목록을 수신자 쪽에 만든다.
 * - 같은 이름의 목록이 없으면 그 이름으로 새로 만든다.
 * - 같은 이름의 목록이 있고 보스 구성이 같으면 그 목록을 그대로 쓴다 (시간만 갱신되는 프리셋 공유와 같은 동작).
 * - 구성이 다르거나 프리셋 이름과 겹치면 "이름 (2)", "이름 (3)" 순으로 다른 이름을 쓴다.
 * 기존 목록을 재사용할 때 젠 주기는 공유된 값이 0보다 클 때만 덮어쓴다.
 * @param {string} sharedName
 * @param {Array<{name: string, interval: number}>} sharedBosses
 * @param {Array<{bossName: string, scheduledDate: string}>} [sharedSchedules] 확장량 추정용
 * @returns {string|null} 실제로 적재할 목록 이름. 만들 수 없으면 null.
 */
export function importSharedCustomList(sharedName, sharedBosses, sharedSchedules = []) {
    if (typeof sharedName !== 'string' || !Array.isArray(sharedBosses)) return null;
    const baseName = sharedName.trim();
    if (!baseName) return null;

    // 목록 저장 형식(한 줄에 보스 하나, 앞뒤 공백 제거)과 어긋나는 이름은 버린다
    const intervalByName = new Map();
    sharedBosses.forEach(boss => {
        if (!boss || typeof boss.name !== 'string' || /[\t\n\r]/.test(boss.name)) return;
        const name = boss.name.trim();
        if (name && !intervalByName.has(name)) intervalByName.set(name, boss.interval || 0);
    });
    const bossNames = [...intervalByName.keys()];
    if (bossNames.length === 0) return null;
    limitExpansion(intervalByName, sharedSchedules);

    let targetName = null;
    let isNewList = false;
    for (let attempt = 1; attempt <= MAX_NAME_ATTEMPTS && !targetName; attempt++) {
        const candidate = candidateName(baseName, attempt);
        if (RESERVED_LIST_NAMES.includes(candidate)) continue;
        if (isPresetList(candidate) || CustomListManager.isPredefinedGameName(candidate)) continue;

        const existingNames = CustomListManager.getBossNamesForCustomList(candidate);
        if (existingNames) {
            if (hasSameBosses(existingNames, bossNames)) targetName = candidate;
            continue;
        }

        // 이름·보스 이름 유효성은 addCustomList 가 검사한다 (URL 은 신뢰할 수 없는 입력)
        const added = CustomListManager.addCustomList(candidate, bossNames.join('\n'));
        if (!added.success) return null;
        targetName = candidate;
        isNewList = true;
    }
    if (!targetName) return null;

    bossNames.forEach(name => {
        // 새로 만든 목록이면 공유된 값을 그대로 쓴다 (지워진 같은 이름 목록의 보스 행이 DB에 남아 있을 수 있다)
        const existingBoss = isNewList ? null : DB.findBoss(targetName, name);
        const sharedInterval = intervalByName.get(name);
        DB.upsertBoss(targetName, name, {
            interval: sharedInterval > 0 ? sharedInterval : (existingBoss?.interval || 0),
            isInvasion: existingBoss?.isInvasion || false
        });
    });

    return targetName;
}
