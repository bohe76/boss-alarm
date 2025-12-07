// src/pip-manager.js
// Removed: import { formatSpawnTime } from './utils.js'; 

let pipWindow = null;
let isPipOpen = false;

/**
 * Picture-in-Picture 창을 열거나 닫습니다.
 */
export async function togglePipWindow() {
    if (isPipOpen) {
        if (pipWindow) {
            pipWindow.close();
        }
        // The 'pagehide' event will handle resetting the state
        return;
    }

    try {
        // 창 크기 옵션을 포함하여 PiP 창을 요청합니다.
        pipWindow = await documentPictureInPicture.requestWindow({
            width: 240,
            height: 100,
        });
        isPipOpen = true;

        // pip-content.html 파일의 내용을 가져옵니다.
        const response = await fetch('src/pip-content.html');
        const content = await response.text();

        // PiP 창에 HTML 콘텐츠를 삽입합니다.
        pipWindow.document.body.innerHTML = content;

        // 사용자가 PiP 창을 닫을 때 'pagehide' 이벤트가 발생합니다.
        pipWindow.addEventListener('pagehide', () => {
            pipWindow = null;
            isPipOpen = false;
        });

    } catch (error) {
        console.error('PiP 창을 여는 데 실패했습니다:', error);
        pipWindow = null;
        isPipOpen = false;
    }
}

/**
 * Picture-in-Picture 창의 내용을 업데이트합니다.
 * @param {object} nextBoss - 다음 보스 정보 객체
 * @param {number} minTimeDiff - 남은 시간 (밀리초)
 */
export function updatePipContent(nextBoss, minTimeDiff) {
    if (!isPipOpen || !pipWindow || !pipWindow.document) return;
    
    const nameElement = pipWindow.document.getElementById('pip-boss-name');
    const remainingTimeElement = pipWindow.document.getElementById('pip-remaining-time');

    if (nameElement && remainingTimeElement) {
        if (nextBoss && minTimeDiff > 0) {
            const totalSeconds = Math.max(0, Math.floor(minTimeDiff / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const pad = (num) => String(num).padStart(2, '0');
            
            let formattedRemainingTime;
            if (hours > 0) {
                formattedRemainingTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
            } else {
                formattedRemainingTime = `${pad(minutes)}:${pad(seconds)}`;
            }

            const isImminent = minTimeDiff < 5 * 60 * 1000;
            const isWarning = minTimeDiff < 10 * 60 * 1000;
            const isMedium = minTimeDiff < 60 * 60 * 1000;

            let remainingTimeClass = '';
            if (isImminent) {
                remainingTimeClass = 'imminent-remaining-time';
            } else if (isWarning) {
                remainingTimeClass = 'warning-priority';
            } else if (isMedium) {
                remainingTimeClass = 'medium-priority';
            } else {
                remainingTimeClass = 'default-grey';
            }

            nameElement.textContent = nextBoss.name;
            remainingTimeElement.textContent = formattedRemainingTime;
            remainingTimeElement.className = `remaining-time ${remainingTimeClass}`;

        } else {
            nameElement.textContent = '다음 보스 없음';
            remainingTimeElement.textContent = '--:--:--';
            remainingTimeElement.className = 'remaining-time'; // Reset to default
        }
    }
}

/**
 * Picture-in-Picture 창이 열려 있는지 확인합니다.
 * @returns {boolean}
 */
export function isPipWindowOpen() {
    return isPipOpen;
}