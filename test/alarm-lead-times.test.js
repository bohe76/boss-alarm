import { describe, it, expect, beforeEach } from 'vitest';
import { DB } from '../src/db.js';
import {
    getAlarmLeadTimes,
    saveAlarmLeadTimes,
    isValidAlarmLeadMinutes,
    DEFAULT_ALARM_LEAD_TIMES
} from '../src/alarm-lead-times.js';

describe('alarm-lead-times', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('저장된 값이 없으면 기본값 5분·1분을 돌려준다', () => {
        expect(getAlarmLeadTimes()).toEqual([5, 1]);
    });

    it('기본값 배열을 그대로 내주지 않는다 (호출부가 고쳐도 기본값은 그대로)', () => {
        getAlarmLeadTimes().push(99);

        expect(DEFAULT_ALARM_LEAD_TIMES).toEqual([5, 1]);
        expect(getAlarmLeadTimes()).toEqual([5, 1]);
    });

    it('빈 배열은 사용자가 모두 지운 것으로 보고 그대로 돌려준다', () => {
        saveAlarmLeadTimes([]);

        expect(getAlarmLeadTimes()).toEqual([]);
    });

    it('큰 값부터 정렬해 저장하고 localStorage 설정에 남긴다', () => {
        saveAlarmLeadTimes([1, 30, 5]);

        expect(getAlarmLeadTimes()).toEqual([30, 5, 1]);
        expect(JSON.parse(localStorage.getItem('v3_settings')).alarmLeadTimes).toEqual([30, 5, 1]);
    });

    it.each([
        ['배열이 아닌 값', '5,1', [5, 1]],
        ['객체', { 0: 5 }, [5, 1]],
        ['범위 밖·정수 아님·숫자 아님', [0, 61, -5, 2.5, '10', null, NaN, 7], [7]],
        ['쓸 수 있는 값이 하나도 없는 배열(손상) → 기본값', ['5', '1'], [5, 1]],
        ['중복', [5, 5, 1, 1], [5, 1]],
        ['5개 초과', [1, 2, 3, 4, 5, 6, 7], [7, 6, 5, 4, 3]]
    ])('직접 고친 저장 값(%s)은 걸러서 읽는다', (_label, stored, expected) => {
        DB.setSetting('alarmLeadTimes', stored);

        expect(getAlarmLeadTimes()).toEqual(expected);
    });

    it.each([
        [1, true], [60, true], [0, false], [61, false], [1.5, false], ['5', false], [NaN, false]
    ])('isValidAlarmLeadMinutes(%s) → %s', (value, expected) => {
        expect(isValidAlarmLeadMinutes(value)).toBe(expected);
    });
});
