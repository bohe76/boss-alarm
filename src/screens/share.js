// src/screens/share.js
import { getShortUrl } from '../api-service.js';
import { log } from '../logger.js';
import { trackEvent } from '../analytics.js';
import { DB } from '../db.js';
import { encodeV3Data } from '../share-encoder.js';

export function initShareScreen(DOM) {
    (async () => {
        DOM.shareMessage.textContent = "공유 링크 생성 중입니다. 잠시만 기다려 주세요...";

        try {
            const gameId = DB.getSetting('lastSelectedGame');
            if (!gameId) throw new Error('선택된 보스 목록이 없습니다.');

            const schedules = DB.getSchedulesByGameId(gameId);
            const bossNameById = new Map(DB.getBossesByGameId(gameId).map(b => [b.id, b.name]));
            const serialized = schedules
                .map(s => ({
                    bossName: bossNameById.get(s.bossId),
                    scheduledDate: s.scheduledDate,
                    memo: s.memo || ''
                }))
                .filter(s => !!s.bossName); // FK 끊긴 항목은 제외

            const encoded = encodeV3Data({ gameId, schedules: serialized });
            const baseUrl = window.location.href.split('?')[0];
            const longUrl = `${baseUrl}?v3data=${encoded}`;

            const shortUrl = await getShortUrl(longUrl);
            await navigator.clipboard.writeText(shortUrl || longUrl);
            DOM.shareMessage.textContent = shortUrl
                ? "단축 URL이 클립보드에 복사되었습니다."
                : `URL 단축 실패: ${longUrl} (원본 URL 복사됨)`;
            log(shortUrl ? "단축 URL이 클립보드에 복사되었습니다." : "URL 단축 실패. 원본 URL이 클립보드에 복사되었습니다.", true);

            trackEvent('Copy to Clipboard', {
                event_category: 'Interaction',
                event_label: shortUrl ? '공유 링크 복사' : '공유 링크 복사 실패',
                success: !!shortUrl
            });
        } catch (e) {
            DOM.shareMessage.textContent = `공유 링크 생성 실패: ${e.message}`;
            log(`공유 링크 생성 실패: ${e.message}`, true);
        }
    })();
}

export function getScreen() {
    return {
        id: 'share-screen',
        onTransition: initShareScreen
    };
}
