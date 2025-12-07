// src/pip-manager.js

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
            width: 250,
            height: 150,
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
    // 이 함수는 2.1 단계에서 구현됩니다.
    if (!isPipOpen || !pipWindow) return;
    
    const nameElement = pipWindow.document.getElementById('pip-boss-name');
    const timeElement = pipWindow.document.getElementById('pip-remaining-time');

    if (nameElement && timeElement) {
        // 콘텐츠 업데이트 로직 (2.1단계에서 구체화)
    }
}

/**
 * Picture-in-Picture 창이 열려 있는지 확인합니다.
 * @returns {boolean}
 */
export function isPipWindowOpen() {
    return isPipOpen;
}
