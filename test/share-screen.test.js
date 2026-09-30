import { initShareScreen } from '../src/screens/share.js';
import { getShortUrl } from '../src/api-service.js';
import { DB } from '../src/db.js';
import { decodeShareData } from '../src/share-encoder.js';

vi.mock('../src/api-service.js', () => ({ getShortUrl: vi.fn() }));
vi.mock('../src/logger.js', () => ({ log: vi.fn() }));
vi.mock('../src/analytics.js', () => ({ trackEvent: vi.fn() }));
vi.mock('../src/db.js', () => ({ DB: { getSetting: vi.fn(), getSchedulesByGameId: vi.fn(), getBossesByGameId: vi.fn() } }));
let DOM;
let writeText;
beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<section class="active"><p></p></section>';
    DOM = { shareScreen: document.querySelector('section'), shareMessage: document.querySelector('p') };
    writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    DB.getSetting.mockReturnValue('test-game');
    DB.getBossesByGameId.mockReturnValue([{ id: 'boss', name: '테스트 보스' }]);
    DB.getSchedulesByGameId.mockReturnValue([
        { bossId: 'boss', scheduledDate: '2026-09-30T18:00:00.000Z', memo: '한글 & + % # 雪' },
        { bossId: 'missing', scheduledDate: '2026-09-30T18:00:00.000Z' }
    ]);
    getShortUrl.mockResolvedValue('https://da.gd/test');
});
afterEach(() => vi.unstubAllGlobals());

test('copies short URL and preserves v4 schedule contents, excluding unknown bosses', async () => {
    await initShareScreen(DOM);
    expect(writeText).toHaveBeenCalledWith('https://da.gd/test');
    const url = new URL(getShortUrl.mock.calls[0][0]);
    expect(url.search).toBe('');
    const decoded = decodeShareData(url.hash.slice(3));
    expect(decoded.gameId).toBe('test-game');
    expect(decoded.schedules).toEqual([{ bossName: '테스트 보스', scheduledDate: '2026-09-30T18:00:00.000Z', memo: '한글 & + % # 雪' }]);
    expect(DOM.shareMessage.textContent).toContain('단축 URL이 클립보드에 복사');
});

test.each([false, true])('copies original URL on shortening failure (long=%s)', async long => {
    getShortUrl.mockResolvedValue(null);
    if (long) DB.getSchedulesByGameId.mockReturnValue([{ bossId: 'boss', scheduledDate: '2026-09-30T18:00:00.000Z', memo: 'x'.repeat(5000) }]);
    await initShareScreen(DOM);
    expect(writeText).toHaveBeenCalledWith(getShortUrl.mock.calls[0][0]);
    expect(DOM.shareMessage.textContent).toContain(long ? '일부 환경' : '원본 URL 복사됨');
});

test.each(['https://da.gd/test', null])('exposes usable link if clipboard fails (%s)', async short => {
    getShortUrl.mockResolvedValue(short);
    writeText.mockRejectedValue(new Error('denied'));
    await initShareScreen(DOM);
    const link = DOM.shareMessage.querySelector('a');
    expect(link.href).toBe(short || getShortUrl.mock.calls[0][0]);
    expect(link.textContent).toBe(link.href);
    expect(DOM.shareMessage.textContent).toContain('직접 복사');
});

test('ignores out-of-order responses after repeated share entry', async () => {
    let resolveFirst;
    getShortUrl.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const first = initShareScreen(DOM);
    await initShareScreen(DOM);
    resolveFirst('https://da.gd/stale');
    await first;
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('https://da.gd/test');
});

test('does not copy after navigation away', async () => {
    let resolve;
    getShortUrl.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = initShareScreen(DOM);
    DOM.shareScreen.classList.remove('active');
    resolve('https://da.gd/stale');
    await pending;
    expect(writeText).not.toHaveBeenCalled();
});

test('late clipboard failure cannot overwrite a newer result', async () => {
    let reject;
    writeText.mockImplementationOnce(() => new Promise((_done, fail) => { reject = fail; }));
    const first = initShareScreen(DOM);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await initShareScreen(DOM);
    reject(new Error('denied'));
    await first;
    expect(DOM.shareMessage.textContent).toContain('단축 URL이 클립보드에 복사');
});
