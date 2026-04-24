// src/share-encoder.js
// v3.0 공유 URL 인코딩/디코딩 — base64(JSON) 단일 payload

const VERSION = '3';

/**
 * @deprecated test-only export; production uses encodeV4Data
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
    // URL-safe base64: '+' → '-', '/' → '_', trailing '=' 제거
    // (표준 base64의 '+' 는 쿼리 파라미터에서 공백으로 디코딩되어 링크가 깨짐)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @deprecated for new shares; PERMANENT KEEP for v3.0.x backwards compatibility — DO NOT REMOVE
 * v3 공유 payload 를 디코딩한다.
 * @param {string} encoded
 * @returns {{ gameId: string, schedules: Array<{bossName: string, scheduledDate: string, memo: string}> } | null}
 */
export function decodeV3Data(encoded) {
    if (!encoded || typeof encoded !== 'string') return null;
    try {
        // URL-safe base64 → 표준 base64 복원 (+ '=' 패딩 복원)
        let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (b64.length % 4)) % 4;
        if (padLen > 0) b64 += '='.repeat(padLen);
        const binary = atob(b64);
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

/**
 * v4 공유 payload 를 base64 로 인코딩한다.
 * v3 대비 키를 단축해 URL 길이를 대폭 줄인다.
 * @param {{ gameId: string, schedules: Array<{bossName: string, scheduledDate: string|Date, memo?: string}> }} payload
 * @returns {string} URL-safe base64 문자열
 */
export function encodeV4Data({ gameId, schedules }) {
    const normalized = {
        v: 4, // number (v3의 string '3'과 구분)
        g: gameId,
        s: (schedules || []).map(s => ({
            n: s.bossName,
            d: Math.floor(new Date(
                typeof s.scheduledDate === 'string'
                    ? s.scheduledDate
                    : s.scheduledDate.toISOString()
            ).getTime() / 1000),
            m: s.memo !== undefined ? s.memo : ''
        }))
    };
    const json = JSON.stringify(normalized);
    const utf8Bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
    // URL-safe base64: '+' → '-', '/' → '_', trailing '=' 제거
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 공유 payload 를 디코딩한다 (v3/v4 자동 분기).
 * @param {string} encoded
 * @returns {{ gameId: string, schedules: Array<{bossName: string, scheduledDate: string, memo: string}> } | null}
 */
export function decodeShareData(encoded) {
    if (!encoded || typeof encoded !== 'string') return null;
    try {
        // URL-safe base64 → 표준 base64 복원
        let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (b64.length % 4)) % 4;
        if (padLen > 0) b64 += '='.repeat(padLen);
        const binary = atob(b64);
        const utf8Bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) utf8Bytes[i] = binary.charCodeAt(i);
        const json = new TextDecoder().decode(utf8Bytes);
        const payload = JSON.parse(json);
        // payload는 object여야 함 (null/array/primitive 거부)
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

        if (payload.v === 4) {
            // v4 디코딩 — schedules 항목 타입/길이 강제 (다층 방어)
            if (typeof payload.g !== 'string' || !Array.isArray(payload.s)) return null;
            return {
                gameId: payload.g,
                schedules: payload.s
                    .filter(s => s && typeof s === 'object' && !Array.isArray(s))
                    .map(s => ({
                        bossName: typeof s.n === 'string' ? s.n.slice(0, 64) : '',
                        scheduledDate: new Date(Number(s.d) * 1000).toISOString(),
                        memo: typeof s.m === 'string' ? s.m.slice(0, 200) : ''
                    }))
            };
        } else if (payload.v === '3') {
            // v3 위임
            return decodeV3Data(encoded);
        }
        return null;
    } catch {
        return null;
    }
}
