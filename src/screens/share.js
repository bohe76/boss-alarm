// src/screens/share.js
import { getShortUrl } from '../api-service.js';
import { log } from '../logger.js';
import { trackEvent } from '../analytics.js';

export function initShareScreen(DOM) {
    (async () => {
        DOM.shareMessage.textContent = "공유 링크 생성 중입니다. 잠시만 기다려 주세요...";
        const currentBossListData = DOM.schedulerBossListInput.value;
        const encodedBossListData = encodeURIComponent(currentBossListData);
        const baseUrl = window.location.href.split('?')[0];
        const longUrl = `${baseUrl}?data=${encodedBossListData}`;
        const shortUrl = await getShortUrl(longUrl);
        await navigator.clipboard.writeText(shortUrl || longUrl);
        DOM.shareMessage.textContent = shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : `URL 단축 실패: ${longUrl} (원본 URL 복사됨)`;
        log(shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : "URL 단축 실패. 원본 URL이 클립보드에 복사되었습니다.", true);
        if (shortUrl) {
            trackEvent('Copy to Clipboard', { event_category: 'Interaction', event_label: '공유 링크 복사', success: true });
        } else {
            trackEvent('Copy to Clipboard', { event_category: 'Interaction', event_label: '공유 링크 복사 실패', success: false });
        }
    })();
}

export function getScreen() {
    return {
        id: 'share-screen',
        onTransition: initShareScreen
    };
}
