import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { initDomElements } from '../src/dom-elements.js';
import { initSettingsScreen } from '../src/screens/settings.js';
import { syncScheduleToWorker, getIsAlarmRunning } from '../src/alarm-scheduler.js';
import { DB } from '../src/db.js';

vi.mock('../src/alarm-scheduler.js', () => ({
    syncScheduleToWorker: vi.fn(),
    getIsAlarmRunning: vi.fn(() => false)
}));
vi.mock('../src/logger.js', () => ({ log: vi.fn(), getLogs: vi.fn(() => []) }));
vi.mock('../src/analytics.js', () => ({ trackEvent: vi.fn() }));
vi.mock('../src/pip-manager.js', () => ({ isPipWindowOpen: vi.fn(() => false), updatePipContent: vi.fn() }));

// 실제 index.html의 마크업으로 검증한다 (ID·클래스가 어긋나면 여기서 드러난다).
const bodyHtml = readFileSync('index.html', 'utf8').match(/<body>([\s\S]*)<\/body>/)[1];

let DOM;
const storedLeadTimes = () => DB.getSetting('alarmLeadTimes');
const listLabels = () => [...DOM.alarmLeadTimeListDiv.querySelectorAll('.alarm-time')].map(el => el.textContent);
const rowButton = (kind, minutes) => DOM.alarmLeadTimeListDiv.querySelector(`.${kind}-lead-time-button[data-minutes="${minutes}"]`);
const saveInModal = (value) => {
    DOM.leadTimeInput.value = value;
    DOM.saveLeadTimeButton.click();
};

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = bodyHtml;
    DOM = initDomElements();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));
    getIsAlarmRunning.mockReturnValue(false);
    initSettingsScreen(DOM);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('설정 화면 탭', () => {
    it('처음에는 고정 알림 탭이 보인다', () => {
        expect(document.getElementById('settings-fixed-alarm-tab').classList.contains('active')).toBe(true);
        expect(document.getElementById('settings-lead-time-tab').classList.contains('active')).toBe(false);
    });

    it('탭을 누르면 해당 내용만 보인다', () => {
        const [fixedTab, leadTab] = DOM.settingsTabs.querySelectorAll('.tab-button');

        leadTab.click();
        expect(leadTab.classList.contains('active')).toBe(true);
        expect(fixedTab.classList.contains('active')).toBe(false);
        expect(document.getElementById('settings-lead-time-tab').classList.contains('active')).toBe(true);
        expect(document.getElementById('settings-fixed-alarm-tab').classList.contains('active')).toBe(false);

        fixedTab.click();
        expect(document.getElementById('settings-fixed-alarm-tab').classList.contains('active')).toBe(true);
        expect(document.getElementById('settings-lead-time-tab').classList.contains('active')).toBe(false);
    });
});

describe('알림 시간 설정', () => {
    it('저장된 값이 없으면 기본값 5분·1분과 정각을 보여 준다', () => {
        expect(listLabels()).toEqual(['5분 전', '1분 전', '정각 (항상 알림)']);
        expect(storedLeadTimes()).toBeNull();
    });

    it('추가하면 큰 값부터 정렬해 보여 주고 저장한다', () => {
        DOM.addLeadTimeButton.click();
        expect(DOM.leadTimeModal.style.display).toBe('flex');
        expect(DOM.leadTimeModalTitle.textContent).toBe('알림 시간 추가');

        saveInModal('10');

        expect(DOM.leadTimeModal.style.display).toBe('none');
        expect(listLabels()).toEqual(['10분 전', '5분 전', '1분 전', '정각 (항상 알림)']);
        expect(storedLeadTimes()).toEqual([10, 5, 1]);
    });

    it('수정하면 그 값만 바뀐다', () => {
        rowButton('edit', 5).click();
        expect(DOM.leadTimeModalTitle.textContent).toBe('알림 시간 수정');
        expect(DOM.leadTimeInput.value).toBe('5');

        saveInModal('30');

        expect(listLabels()).toEqual(['30분 전', '1분 전', '정각 (항상 알림)']);
        expect(storedLeadTimes()).toEqual([30, 1]);
    });

    it('수정에서 값을 바꾸지 않고 저장하면 모달만 닫는다', () => {
        getIsAlarmRunning.mockReturnValue(true);
        rowButton('edit', 5).click();
        saveInModal('5');

        expect(alert).not.toHaveBeenCalled();
        expect(DOM.leadTimeModal.style.display).toBe('none');
        expect(storedLeadTimes()).toBeNull();
        expect(syncScheduleToWorker).not.toHaveBeenCalled();
    });

    it('삭제는 확인을 받은 뒤에만 한다', () => {
        confirm.mockReturnValueOnce(false);
        rowButton('delete', 5).click();

        expect(confirm).toHaveBeenCalledWith('5분 전 알림을 삭제하시겠습니까?');
        expect(listLabels()).toEqual(['5분 전', '1분 전', '정각 (항상 알림)']);
        expect(storedLeadTimes()).toBeNull();
    });

    it('모달을 연 뒤 다른 탭에서 최대 개수가 차면 추가하지 않고 알린다', () => {
        DOM.addLeadTimeButton.click();
        DB.setSetting('alarmLeadTimes', [50, 40, 30, 20, 10]);

        saveInModal('2');

        expect(alert).toHaveBeenCalledWith('알림 시간 목록이 바뀌어 저장하지 못했습니다. 목록을 확인한 뒤 다시 시도해주세요.');
        expect(storedLeadTimes()).toEqual([50, 40, 30, 20, 10]);
        expect(listLabels()).toEqual(['50분 전', '40분 전', '30분 전', '20분 전', '10분 전', '정각 (항상 알림)']);
        expect(DOM.leadTimeModal.style.display).toBe('none');
    });

    it('수정하던 값이 다른 탭에서 지워졌으면 새로 추가하지 않고 알린다', () => {
        rowButton('edit', 5).click();
        DB.setSetting('alarmLeadTimes', [1]);

        saveInModal('30');

        expect(alert).toHaveBeenCalledWith('알림 시간 목록이 바뀌어 저장하지 못했습니다. 목록을 확인한 뒤 다시 시도해주세요.');
        expect(storedLeadTimes()).toEqual([1]);
        expect(listLabels()).toEqual(['1분 전', '정각 (항상 알림)']);
    });

    it('수정하던 값이 다른 탭에서 지워졌으면 같은 값으로 저장해도 되살리지 않고 알린다', () => {
        rowButton('edit', 5).click();
        DB.setSetting('alarmLeadTimes', [1]);

        saveInModal('5');

        expect(alert).toHaveBeenCalledWith('알림 시간 목록이 바뀌어 저장하지 못했습니다. 목록을 확인한 뒤 다시 시도해주세요.');
        expect(storedLeadTimes()).toEqual([1]);
        expect(listLabels()).toEqual(['1분 전', '정각 (항상 알림)']);
    });

    it('수정·삭제 버튼의 이름에 몇 분 알림인지 넣는다', () => {
        expect(rowButton('edit', 5).title).toBe('5분 전 알림 수정');
        expect(rowButton('delete', 1).title).toBe('1분 전 알림 삭제');
    });

    it('삭제하면 목록에서 빠지고, 모두 지워도 정각은 남는다', () => {
        rowButton('delete', 5).click();
        expect(listLabels()).toEqual(['1분 전', '정각 (항상 알림)']);

        rowButton('delete', 1).click();
        expect(listLabels()).toEqual(['정각 (항상 알림)']);
        expect(storedLeadTimes()).toEqual([]);
    });

    it.each(['', '0', '61', '2.5', '-3', 'abc', '1e1'])('범위 밖이거나 숫자가 아닌 값 "%s"은 저장하지 않는다', (value) => {
        DOM.addLeadTimeButton.click();
        saveInModal(value);

        expect(alert).toHaveBeenCalledWith('알림 시간은 1~60 사이의 숫자(분)로 입력해주세요.');
        expect(DOM.leadTimeModal.style.display).toBe('flex');
        expect(storedLeadTimes()).toBeNull();
    });

    it('이미 있는 값은 추가·수정 모두 거부한다', () => {
        DOM.addLeadTimeButton.click();
        saveInModal('5');
        expect(alert).toHaveBeenLastCalledWith('5분 전 알림은 이미 있습니다.');

        DOM.cancelLeadTimeModalButton.click();
        rowButton('edit', 1).click();
        saveInModal('5');
        expect(alert).toHaveBeenLastCalledWith('5분 전 알림은 이미 있습니다.');
        expect(storedLeadTimes()).toBeNull();
    });

    it('5개가 차면 추가 모달을 열지 않는다', () => {
        DB.setSetting('alarmLeadTimes', [30, 20, 10, 5, 1]);

        DOM.addLeadTimeButton.click();

        expect(alert).toHaveBeenCalledWith('알림 시간은 최대 5개까지 추가할 수 있습니다.');
        expect(DOM.leadTimeModal.style.display).toBe('none');
    });

    it('기본값 버튼은 확인을 받은 뒤 5분·1분으로 되돌린다', () => {
        DB.setSetting('alarmLeadTimes', [30]);

        confirm.mockReturnValueOnce(false);
        DOM.resetLeadTimesButton.click();
        expect(storedLeadTimes()).toEqual([30]);

        DOM.resetLeadTimesButton.click();
        expect(storedLeadTimes()).toEqual([5, 1]);
        expect(listLabels()).toEqual(['5분 전', '1분 전', '정각 (항상 알림)']);
    });

    it('Enter로 저장하고, 취소·닫기는 저장하지 않는다', () => {
        DOM.addLeadTimeButton.click();
        DOM.leadTimeInput.value = '15';
        DOM.cancelLeadTimeModalButton.click();
        expect(DOM.leadTimeModal.style.display).toBe('none');
        expect(storedLeadTimes()).toBeNull();

        DOM.addLeadTimeButton.click();
        expect(DOM.leadTimeInput.value).toBe('');
        DOM.leadTimeInput.value = '15';
        DOM.leadTimeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(storedLeadTimes()).toEqual([15, 5, 1]);
    });

    it('알림이 켜져 있을 때만 바뀐 알림 시간을 워커에 다시 보낸다', () => {
        rowButton('delete', 5).click();
        expect(syncScheduleToWorker).not.toHaveBeenCalled();

        getIsAlarmRunning.mockReturnValue(true);
        DOM.addLeadTimeButton.click();
        saveInModal('20');
        expect(syncScheduleToWorker).toHaveBeenCalledTimes(1);
    });
});
