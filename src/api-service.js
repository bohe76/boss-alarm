// src/api-service.js

export async function getShortUrl(longUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch('https://da.gd/s', {
            method: 'POST',
            body: new URLSearchParams({ url: longUrl, text: '1' }),
            headers: { Accept: 'text/plain' },
            credentials: 'omit',
            signal: controller.signal
        });
        if (response.status !== 200) throw new Error('API 응답 실패');

        const shortUrl = (await response.text()).trim();
        // Only accept the provider's HTTPS short links, never error text or HTML.
        if (!/^https:\/\/da\.gd\/[A-Za-z0-9_-]+$/.test(shortUrl)) {
            throw new Error('유효하지 않은 단축 URL');
        }
        return shortUrl;
    } catch (error) {
        console.error('URL 단축 실패:', error);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

// Helper function to load JSON content
export async function loadJsonContent(filePath) {
    try {
        const cacheBuster = Date.now(); // Or a version number if preferred
        const response = await fetch(`${filePath}?v=${cacheBuster}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json(); // Parse as JSON
        return json;
    } catch (error) {
        console.error(`Failed to load JSON from ${filePath}:`, error);
        return null; // Return null on failure
    }
}
