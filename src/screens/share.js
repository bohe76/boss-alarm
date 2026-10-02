// src/screens/share.js
import { getShortUrl } from '../api-service.js';
import { log } from '../logger.js';
import { trackEvent } from '../analytics.js';
import { DB } from '../db.js';
import { encodeV4Data } from '../share-encoder.js';
import { getSharedBossDefinitions } from '../share-custom-list.js';

let shareRequestId = 0;

export async function initShareScreen(DOM) {
    const requestId = ++shareRequestId;
    const isCurrent = () => requestId === shareRequestId && DOM.shareScreen.classList.contains('active');
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

        // 커스텀 목록이면 받는 쪽이 목록을 만들 수 있게 보스 정의(이름·젠 주기)를 함께 싣는다. 프리셋이면 null.
        const bosses = getSharedBossDefinitions(gameId);
        const encoded = encodeV4Data({ gameId, schedules: serialized, bosses });
        const baseUrl = window.location.href.split(/[?#]/)[0];
        const longUrl = `${baseUrl}#d=${encoded}`;

        const URL_LENGTH_WARN_THRESHOLD = 4000;
        const isLengthRisky = longUrl.length > URL_LENGTH_WARN_THRESHOLD;
        const shortUrl = await getShortUrl(longUrl);
        if (!isCurrent()) return;
        const shareUrl = shortUrl || longUrl;
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            if (!isCurrent()) return;
            DOM.shareMessage.textContent = '클립보드 복사 실패. 아래 링크를 직접 복사해 주세요: ';
            const link = document.createElement('a');
            link.href = shareUrl;
            link.textContent = shareUrl;
            DOM.shareMessage.append(link);
            log('클립보드 복사 실패. 공유 화면의 링크를 직접 복사해 주세요.', true);
            return;
        }
        if (!isCurrent()) return;

        let message;
        if (shortUrl) {
            message = "단축 URL이 클립보드에 복사되었습니다.";
        } else if (isLengthRisky) {
            message = `URL 단축 실패. 등록된 보스가 많아 일부 환경(메신저·인앱브라우저)에서 깨질 수 있습니다. 원본 URL이 복사되었습니다.`;
        } else {
            message = `URL 단축 실패: ${longUrl} (원본 URL 복사됨)`;
        }
        DOM.shareMessage.textContent = message;
        log(message, true);

        trackEvent('Copy to Clipboard', {
            event_category: 'Interaction',
            event_label: shortUrl ? '공유 링크 복사' : '공유 링크 복사 실패',
            success: !!shortUrl
        });
    } catch (e) {
        if (!isCurrent()) return;
        DOM.shareMessage.textContent = `공유 링크 생성 실패: ${e.message}`;
        log(`공유 링크 생성 실패: ${e.message}`, true);
    }
}

export function getScreen() {
    return {
        id: 'share-screen',
        onTransition: initShareScreen
    };
}
