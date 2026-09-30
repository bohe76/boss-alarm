import { getShortUrl } from '../src/api-service.js';

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

test('POST preserves the complete URL including fragment, Unicode and special characters', async () => {
    const url = 'https://example.org/?q=a&b=%25#d=보스+ /?&=%雪';
    fetch.mockResolvedValue({ status: 200, text: async () => 'https://da.gd/Ab_9-x\n' });
    expect(await getShortUrl(url)).toBe('https://da.gd/Ab_9-x');
    const [endpoint, options] = fetch.mock.calls[0];
    expect(endpoint).toBe('https://da.gd/s');
    expect(options).toMatchObject({ method: 'POST', credentials: 'omit', headers: { Accept: 'text/plain' } });
    expect(new URLSearchParams(options.body.toString()).get('url')).toBe(url);
    expect(options.body.get('text')).toBe('1');
    expect(options.signal.aborted).toBe(false);
});

test.each(['', 'error', '<html>error</html>', 'http://da.gd/abc', 'https://evil.test/abc',
    'https://da.gd.evil.test/abc', 'https://da.gd@evil.test/abc', 'https://da.gd/',
    'https://da.gd/a?url=bad', 'https://da.gd/a#bad', 'https://da.gd/a\nhttps://da.gd/b'])('rejects malformed response %j', async body => {
    fetch.mockResolvedValue({ status: 200, text: async () => body });
    expect(await getShortUrl('https://example.org/#d=abc')).toBeNull();
});

test.each([201, 204, 400, 429, 500])('falls back on HTTP %s', async status => {
    fetch.mockResolvedValue({ status, text: async () => 'https://da.gd/abc' });
    expect(await getShortUrl('https://example.org/')).toBeNull();
});

test('falls back on network and body read failures', async () => {
    fetch.mockRejectedValueOnce(new TypeError('network'));
    expect(await getShortUrl('https://example.org/')).toBeNull();
    fetch.mockResolvedValueOnce({ status: 200, text: async () => { throw new Error('read'); } });
    expect(await getShortUrl('https://example.org/')).toBeNull();
});

test.each([false, true])('aborts a stalled request or body (body=%s) after 10 seconds and clears timer', async body => {
    vi.useFakeTimers();
    fetch.mockImplementation((_url, { signal }) => {
        const pending = () => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
        return body ? Promise.resolve({ status: 200, text: pending }) : pending();
    });
    const result = getShortUrl('https://example.org/');
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toBeNull();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
});
