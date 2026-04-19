// src/share-encoder.js
// v3.0 공유 URL 인코딩/디코딩 — base64(JSON) 단일 payload

const VERSION = '3';

/**
 * v3 공유 payload 를 base64 로 인코딩한다.
 * @param {{ gameId: string, schedules: Array<{bossName: string, scheduledDate: string|Date, memo?: string}> }} payload
 * @returns {string} base64-encoded string (URL-safe 용도로 별도 가공 없음)
 */
export function encodeV3Data({ gameId, schedules }) {
    const normalized = {
        v: VERSION,
        gameId,
        schedules: (schedules || []).map(s => ({
            bossName: s.bossName,
            scheduledDate: typeof s.scheduledDate === 'string'
                ? s.scheduledDate
                : new Date(s.scheduledDate).toISOString(),
            memo: s.memo || ''
        }))
    };
    const json = JSON.stringify(normalized);
    const utf8Bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
    return btoa(binary);
}

/**
 * v3 공유 payload 를 디코딩한다.
 * @param {string} encoded
 * @returns {{ gameId: string, schedules: Array<{bossName: string, scheduledDate: string, memo: string}> } | null}
 */
export function decodeV3Data(encoded) {
    if (!encoded || typeof encoded !== 'string') return null;
    try {
        const binary = atob(encoded);
        const utf8Bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) utf8Bytes[i] = binary.charCodeAt(i);
        const json = new TextDecoder().decode(utf8Bytes);
        const payload = JSON.parse(json);
        if (!payload || payload.v !== VERSION) return null;
        if (typeof payload.gameId !== 'string' || !Array.isArray(payload.schedules)) return null;
        return {
            gameId: payload.gameId,
            schedules: payload.schedules.map(s => ({
                bossName: s.bossName,
                scheduledDate: s.scheduledDate,
                memo: s.memo || ''
            }))
        };
    } catch {
        return null;
    }
}
