// test/share-encoder.test.js
import { describe, it, expect } from 'vitest';
import { encodeV3Data, decodeV3Data } from '../src/share-encoder.js';

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
});
