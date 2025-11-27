// src/screens/share.js
import { getShortUrl } from '../api-service.js';
import { LocalStorageManager } from '../data-managers.js';
import { log } from '../logger.js';

export function initShareScreen(DOM) {
    (async () => {
        DOM.shareMessage.textContent = "공유 링크 생성 중입니다. 잠시만 기다려 주세요...";
        const currentBossListData = DOM.bossListInput.value;
        const encodedBossListData = encodeURIComponent(currentBossListData);
        const fixedAlarmsData = LocalStorageManager.exportFixedAlarms();
        const encodedFixedAlarmsData = encodeURIComponent(fixedAlarmsData);
        const baseUrl = window.location.href.split('?')[0];
        const longUrl = `${baseUrl}?data=${encodedBossListData}&fixedData=${encodedFixedAlarmsData}`;
        const shortUrl = await getShortUrl(longUrl);
        await navigator.clipboard.writeText(shortUrl || longUrl);
        DOM.shareMessage.textContent = shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : `URL 단축 실패: ${longUrl} (원본 URL 복사됨)`;
        log(shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : "URL 단축 실패. 원본 URL이 클립보드에 복사되었습니다.", true);
    })();
}

export function getScreen() {
    return {
        id: 'share-screen',
        init: initShareScreen
    };
}