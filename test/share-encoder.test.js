// test/share-encoder.test.js
import { describe, it, expect } from 'vitest';
import { encodeV3Data, decodeV3Data, encodeV4Data, decodeShareData } from '../src/share-encoder.js';

describe('share-encoder', () => {
    it('encodes and decodes a schedule round-trip', () => {
        const input = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '' }
            ]
        };
        const encoded = encodeV3Data(input);
        expect(typeof encoded).toBe('string');
        expect(encoded.length).toBeGreaterThan(0);
        const decoded = decodeV3Data(encoded);
        expect(decoded).toEqual(input);
    });

    it('normalizes Date object to ISO string', () => {
        const input = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: new Date('2026-04-19T15:11:00.000Z'), memo: '' }
            ]
        };
        const decoded = decodeV3Data(encodeV3Data(input));
        expect(decoded.schedules[0].scheduledDate).toBe('2026-04-19T15:11:00.000Z');
    });

    it('returns null for invalid input', () => {
        expect(decodeV3Data('')).toBeNull();
        expect(decodeV3Data(null)).toBeNull();
        expect(decodeV3Data(undefined)).toBeNull();
        expect(decodeV3Data(42)).toBeNull();
    });

    it('rejects base64 payload with wrong version', () => {
        const v2Payload = btoa(JSON.stringify({ v: '2', gameId: 'x', schedules: [] }));
        expect(decodeV3Data(v2Payload)).toBeNull();
    });

    it('rejects malformed payload shape', () => {
        const badShape = btoa(JSON.stringify({ v: '3', gameId: 'x' })); // schedules missing
        expect(decodeV3Data(badShape)).toBeNull();

        const badGame = btoa(JSON.stringify({ v: '3', gameId: 42, schedules: [] }));
        expect(decodeV3Data(badGame)).toBeNull();
    });

    it('handles multiple Korean boss names and memos', () => {
        const input = {
            gameId: 'odin-invasion',
            schedules: [
                { bossName: '셀로비아', scheduledDate: '2026-04-19T20:00:00.000Z', memo: '우선순위' },
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '' },
                { bossName: '최하층굴베이그', scheduledDate: '2026-04-20T00:00:00.000Z', memo: '🔥' }
            ]
        };
        const decoded = decodeV3Data(encodeV3Data(input));
        expect(decoded).toEqual(input);
    });

    it('encodes empty schedules array', () => {
        const input = { gameId: 'odin-main', schedules: [] };
        const decoded = decodeV3Data(encodeV3Data(input));
        expect(decoded).toEqual(input);
    });

    it('produces URL-safe output without +, /, or = characters', () => {
        // 대량 한글 데이터로 표준 base64에서 +/가 나올 상황 재현
        const names = ['파르바','하츨링','그림자','란도아','콜레닉스','바실리스크','셀로비아','굴베이그','최하층굴베이그','우드에바','헬드레드','리스배리그','우르드','단조장인','미호','모든 보스 파티','난도아스'];
        const schedules = Array.from({ length: 40 }, (_, i) => ({
            bossName: names[i % names.length],
            scheduledDate: new Date(Date.UTC(2026, 3, 22, 0, i)).toISOString(),
            memo: `메모${i}`
        }));
        const encoded = encodeV3Data({ gameId: 'odin-invasion', schedules });
        expect(encoded).not.toMatch(/[+/=]/);
    });

    it('survives URLSearchParams round-trip (the shared-link scenario)', () => {
        // 링크가 무효해 보이는 버그 재현용: +가 공백으로 디코딩되면 atob 실패
        const names = ['파르바','하츨링','그림자','란도아','콜레닉스','바실리스크','셀로비아','굴베이그','최하층굴베이그','우드에바'];
        const input = {
            gameId: 'odin-invasion',
            schedules: Array.from({ length: 30 }, (_, i) => ({
                bossName: names[i % names.length],
                scheduledDate: new Date(Date.UTC(2026, 3, 22, 0, i)).toISOString(),
                memo: i % 2 ? '우선순위' : ''
            }))
        };
        const encoded = encodeV3Data(input);
        const url = new URL(`https://example.com/app?v3data=${encoded}`);
        const fromQuery = new URLSearchParams(url.search).get('v3data');
        expect(fromQuery).toBe(encoded);
        const decoded = decodeV3Data(fromQuery);
        expect(decoded).toEqual(input);
    });
});

// ─── v4 신규 테스트 11건 ───────────────────────────────────────────────────────
describe('share-encoder v4', () => {
    // A. v4 라운드트립 (한글 보스명 + memo)
    it('A: v4 round-trip with Korean boss name and memo', () => {
        const input = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '우선순위' }
            ]
        };
        const encoded = encodeV4Data(input);
        expect(typeof encoded).toBe('string');
        expect(encoded.length).toBeGreaterThan(0);
        const decoded = decodeShareData(encoded);
        expect(decoded).toEqual({
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '우선순위' }
            ]
        });
    });

    // B. v4 디코딩 결과가 v3와 동일 shape 반환
    it('B: v4 and v3 decoded result have the same shape', () => {
        const input = {
            gameId: 'odin-invasion',
            schedules: [
                { bossName: '셀로비아', scheduledDate: '2026-04-19T20:00:00.000Z', memo: '메모' },
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '' }
            ]
        };
        const decodedV3 = decodeShareData(encodeV3Data(input));
        const decodedV4 = decodeShareData(encodeV4Data(input));
        expect(decodedV4).toEqual(decodedV3);
    });

    // C. v4 인코딩 결과 URL-safe (대량 한글 데이터)
    it('C: v4 encoding is URL-safe (no +, /, = characters)', () => {
        const names = ['파르바','하츨링','그림자','란도아','콜레닉스','바실리스크','셀로비아','굴베이그','최하층굴베이그','우드에바','헬드레드','리스배리그','우르드','단조장인','미호','모든 보스 파티','난도아스'];
        const schedules = Array.from({ length: 40 }, (_, i) => ({
            bossName: names[i % names.length],
            scheduledDate: new Date(Date.UTC(2026, 3, 22, 0, i)).toISOString(),
            memo: `메모${i}`
        }));
        const encoded = encodeV4Data({ gameId: 'odin-invasion', schedules });
        expect(encoded).not.toMatch(/[+/=]/);
    });

    // D. v4 byte 길이가 v3보다 30% 이상 짧음
    it('D: v4 encoded length is at least 30% shorter than v3', () => {
        const names = ['파르바','하츨링','그림자','란도아','콜레닉스','바실리스크','셀로비아','굴베이그','최하층굴베이그','우드에바'];
        const input = {
            gameId: 'odin-invasion',
            schedules: Array.from({ length: 30 }, (_, i) => ({
                bossName: names[i % names.length],
                scheduledDate: new Date(Date.UTC(2026, 3, 22, 0, i)).toISOString(),
                memo: i % 2 ? '우선순위' : ''
            }))
        };
        const v3Len = encodeV3Data(input).length;
        const v4Len = encodeV4Data(input).length;
        expect(v4Len).toBeLessThan(v3Len * 0.7);
    });

    // E. 호환성: v3 base64를 decodeShareData로 디코딩 가능
    it('E: v3 encoded string is decodable by decodeShareData', () => {
        const input = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '' }
            ]
        };
        const encoded = encodeV3Data(input);
        const decoded = decodeShareData(encoded);
        expect(decoded).toEqual(input);
    });

    // F. fragment URL 라운드트립
    it('F: fragment URL round-trip', () => {
        const input = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '셀로비아', scheduledDate: '2026-04-20T00:00:00.000Z', memo: '테스트' }
            ]
        };
        const encoded = encodeV4Data(input);
        const url = new URL('https://example.com/app#d=' + encoded);
        const fromHash = url.hash.slice(3); // '#d=' 제거
        const decoded = decodeShareData(fromHash);
        expect(decoded).toEqual({
            gameId: 'odin-main',
            schedules: [
                { bossName: '셀로비아', scheduledDate: '2026-04-20T00:00:00.000Z', memo: '테스트' }
            ]
        });
    });

    // G. (회귀 ①) v 필드 타입 혼동
    it('G: v field type mismatch returns null', () => {
        // v4는 number 4이어야 함. string "4"는 null
        const makePayload = (v) => {
            const json = JSON.stringify({ v, g: 'odin-main', s: [] });
            const utf8Bytes = new TextEncoder().encode(json);
            let binary = '';
            for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };
        expect(decodeShareData(makePayload('4'))).toBeNull(); // string "4" → null
        expect(decodeShareData(makePayload(3))).toBeNull();   // number 3 → null (v3는 string "3"만)
    });

    // H. (회귀 ②) hash에 추가 파라미터 들어왔을 때 안전 추출
    it('H: additional hash params do not break decoding when pre-extracted', () => {
        const input = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '' }
            ]
        };
        const encoded = encodeV4Data(input);
        // hash 파라미터 추출 시뮬레이션: '#d=ENCODED&utm_source=share' → ENCODED만 추출
        const rawHash = '#d=' + encoded + '&utm_source=share';
        const extracted = rawHash.split('&')[0].slice(3); // '#d=' 제거
        expect(extracted).toBe(encoded);
        const decoded = decodeShareData(extracted);
        expect(decoded).toEqual({
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: '' }
            ]
        });
    });

    // I. (회귀 ③) epoch 정밀도 — ms 손실 OK, 초 단위 보존
    it('I: epoch precision loses milliseconds but preserves seconds', () => {
        const input = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '파르바', scheduledDate: '2026-04-19T15:11:30.500Z', memo: '' }
            ]
        };
        const decoded = decodeShareData(encodeV4Data(input));
        // ms(500)은 손실되어 000이 됨
        expect(decoded.schedules[0].scheduledDate).toBe('2026-04-19T15:11:30.000Z');
    });

    // J. (회귀 ④) 음수/0 timestamp
    it('J: epoch 0 and negative epoch round-trip correctly', () => {
        const input0 = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '테스트', scheduledDate: '1970-01-01T00:00:00.000Z', memo: '' }
            ]
        };
        const decoded0 = decodeShareData(encodeV4Data(input0));
        expect(decoded0.schedules[0].scheduledDate).toBe('1970-01-01T00:00:00.000Z');

        const inputNeg = {
            gameId: 'odin-main',
            schedules: [
                { bossName: '테스트', scheduledDate: '1969-12-31T23:59:00.000Z', memo: '' }
            ]
        };
        const decodedNeg = decodeShareData(encodeV4Data(inputNeg));
        expect(decodedNeg.schedules[0].scheduledDate).toBe('1969-12-31T23:59:00.000Z');
    });

    // K. 잘못된 v 값 reject
    it('K: unsupported v values return null', () => {
        const makePayload = (v) => {
            const json = JSON.stringify({ v, g: 'odin-main', s: [] });
            const utf8Bytes = new TextEncoder().encode(json);
            let binary = '';
            for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };
        expect(decodeShareData(makePayload(5))).toBeNull();    // v:5 (미지원 버전)
        expect(decodeShareData(makePayload(null))).toBeNull(); // v:null
        expect(decodeShareData(makePayload(undefined))).toBeNull(); // v 없음
    });

    // 다층 방어 회귀 (Stage 6 reviewer 권고)
    it('L: rejects non-object payload (array/primitive)', () => {
        const encode = (val) => {
            const json = JSON.stringify(val);
            const utf8Bytes = new TextEncoder().encode(json);
            let binary = '';
            for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };
        expect(decodeShareData(encode([1, 2, 3]))).toBeNull();      // array payload
        expect(decodeShareData(encode('string'))).toBeNull();        // string payload
        expect(decodeShareData(encode(42))).toBeNull();              // number payload
        expect(decodeShareData(encode(null))).toBeNull();            // null payload
    });

    it('M: v4 schedules array — null/non-object items filtered out', () => {
        const json = JSON.stringify({
            v: 4,
            g: 'odin-main',
            s: [
                null,                                                 // filtered
                'string-item',                                        // filtered
                [1, 2],                                               // filtered (array)
                { n: '파르바', d: 1745074260, m: '' }                 // kept
            ]
        });
        const utf8Bytes = new TextEncoder().encode(json);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
        const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const decoded = decodeShareData(encoded);
        expect(decoded.gameId).toBe('odin-main');
        expect(decoded.schedules).toHaveLength(1);
        expect(decoded.schedules[0].bossName).toBe('파르바');
    });

    it('N: bossName length capped at 64 chars (defense-in-depth)', () => {
        const longName = '가'.repeat(100);
        const decoded = decodeShareData(encodeV4Data({
            gameId: 'odin-main',
            schedules: [{ bossName: longName, scheduledDate: '2026-04-19T15:11:00.000Z', memo: '' }]
        }));
        expect(decoded.schedules[0].bossName.length).toBe(64);
    });

    it('O: memo length capped at 200 chars (defense-in-depth)', () => {
        const longMemo = 'x'.repeat(300);
        const decoded = decodeShareData(encodeV4Data({
            gameId: 'odin-main',
            schedules: [{ bossName: '파르바', scheduledDate: '2026-04-19T15:11:00.000Z', memo: longMemo }]
        }));
        expect(decoded.schedules[0].memo.length).toBe(200);
    });
});
