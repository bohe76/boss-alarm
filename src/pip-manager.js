import { BossDataManager, BOSS_THRESHOLDS } from './data-managers.js';

let pipWindow = null;
let isPipOpen = false;
let isExpanded = false; // PiP expansion state (Collapsed by default)

/**
 * Picture-in-Picture 창을 열거나 닫습니다.
 */
export async function togglePipWindow() {
    if (isPipOpen) {
        if (pipWindow) {
            pipWindow.close();
        }
        return;
    }

    try {
        isExpanded = false; // Reset to collapsed when opening

        // Initial height for collapsed mode (1 boss)
        const initialInnerH = 96;

        pipWindow = await documentPictureInPicture.requestWindow({
            width: 240,
            height: initialInnerH,
            preferInitialWindowPlacement: true,
        });

        isPipOpen = true;
        pipWindow.document.title = "보스 알리미";

        const response = await fetch('src/pip-content.html');
        const content = await response.text();
        pipWindow.document.body.innerHTML = content;

        // Trigger immediate update
        updatePipContent();

        // Toggle Expand/Collapse on click
        pipWindow.onclick = () => {
            isExpanded = !isExpanded;
            updatePipContent();
            adjustWindowHeight(); // DOM 실측 기반 리사이징
        };

        pipWindow.addEventListener('pagehide', () => {
            pipWindow = null;
            isPipOpen = false;
            isExpanded = false;
        });

    } catch (error) {
        console.error('PiP 창을 여는 데 실패했습니다:', error);
        pipWindow = null;
        isPipOpen = false;
    }
}

/**
 * 렌더링된 콘텐츠의 실제 높이를 측정하여 PIP 창 크기를 조절합니다.
 */
function adjustWindowHeight() {
    if (!pipWindow || !pipWindow.document) return;

    // 브라우저 렌더링이 완료된 직후 측정하기 위해 약간의 지연이 필요할 수 있으나, 
    // 동기식 DOM 업데이트 직후이므로 바로 측정 가능.

    // 1. 컨테이너 실제 높이 측정
    const container = pipWindow.document.querySelector('.pip-container');
    if (!container) return;

    const contentHeight = container.offsetHeight;

    // 2. Body Padding (CSS 16px) 보정
    // getComputedStyle로 정확히 가져옴
    const bodyStyle = pipWindow.getComputedStyle(pipWindow.document.body);
    const paddingTop = parseFloat(bodyStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
    const totalBodyPadding = paddingTop + paddingBottom;

    // 3. 목표 내부 높이 (Content + Padding)
    const targetInnerHeight = contentHeight + totalBodyPadding;

    // 4. Chrome (Window Frame) 높이 계산 및 리사이징
    // 현재 창의 전체 높이 - 내부 높이 = 프레임 높이
    const chromeHeight = pipWindow.outerHeight - pipWindow.innerHeight;

    // 리사이징 실행
    pipWindow.resizeTo(240, targetInnerHeight + chromeHeight);
}

/**
 * Picture-in-Picture 창의 내용을 업데이트합니다.
 */
export function updatePipContent() {
    // Height recalculation logic included in content update for dynamic resizing? 
    // No, resizing is triggered by user interaction (toggle).
    // But data refresh might change list count? 
    // Currently, resizeTo is only called on toggle. If data count changes while open, window size might be stale.
    // However, for now request expects resize logic fix. 

    if (!isPipOpen || !pipWindow || !pipWindow.document) return;

    const nameElement = pipWindow.document.getElementById('pip-boss-name');
    const remainingTimeElement = pipWindow.document.getElementById('pip-remaining-time');
    const listElement = pipWindow.document.getElementById('pip-imminent-list');
    const mainContainer = pipWindow.document.getElementById('pip-main-boss');

    if (!nameElement || !remainingTimeElement || !listElement || !mainContainer) return;

    // Fetch fresh data
    const now = Date.now();
    const upcoming = BossDataManager.getUpcomingBosses(11);
    const nextBoss = upcoming[0] || null;
    const minTimeDiff = nextBoss ? nextBoss.timestamp - now : Infinity;

    if (nextBoss) {
        const pad = (num) => String(num).padStart(2, '0');
        const format = (diff) => {
            const totalSec = Math.max(0, Math.floor(diff / 1000));
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
        };

        nameElement.textContent = nextBoss.name;
        remainingTimeElement.textContent = format(minTimeDiff);

        // Dashboard Identical Color Logic
        let mainTimeColor = '#777';

        if (minTimeDiff < BOSS_THRESHOLDS.IMMINENT) {
            mainTimeColor = '#ea4335'; // Red
        } else if (minTimeDiff < BOSS_THRESHOLDS.WARNING) {
            mainTimeColor = '#FF8F00'; // Orange
        } else if (minTimeDiff < BOSS_THRESHOLDS.MEDIUM) {
            mainTimeColor = '#333'; // Black
        }

        nameElement.style.color = '#1E88E5'; // Next boss is always Blue
        remainingTimeElement.style.color = mainTimeColor;

        // Show icon/container only if next boss is imminent (< 5 min)
        // Regardless of expansion state
        if (minTimeDiff < BOSS_THRESHOLDS.IMMINENT) {
            mainContainer.classList.remove('no-list');
        } else {
            mainContainer.classList.add('no-list');
        }

        // Expanded List Logic
        let displayList = isExpanded ? upcoming.slice(1) : [];

        if (displayList.length > 0) {
            listElement.innerHTML = displayList.map(boss => {
                const diff = boss.timestamp - now;
                const isImminent = diff < BOSS_THRESHOLDS.IMMINENT;
                const isWarning = diff < BOSS_THRESHOLDS.WARNING;
                const isMedium = diff < BOSS_THRESHOLDS.MEDIUM;
                const isLongWait = diff >= 60 * 60 * 1000; // 1시간 이상 대기

                let nameClass = 'default-text';
                let timeClass = 'default-text';

                if (isImminent) {
                    nameClass = 'blue-text';
                    timeClass = ''; // Default Red (imminent-time)
                } else if (isWarning) {
                    nameClass = 'blue-text';
                    timeClass = 'warning-text';
                } else if (isMedium) {
                    nameClass = 'medium-text';
                    timeClass = 'medium-text';
                }

                // 1시간 이상 남은 경우 볼드체 해제 (font-weight: normal)
                // CSS 클래스(.imminent-name, .imminent-time)에 font-weight: bold가 있으므로 직접 override 필요
                const fontWeightStyle = isLongWait ? 'font-weight: normal;' : '';

                const timeParts = boss.time.split(':');
                const formattedSpawnTime = `[${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}]`;

                return `
                    <div class="imminent-item" style="${fontWeightStyle}">
                        <span class="imminent-spawn-time">${formattedSpawnTime}</span>
                        <span class="imminent-name ${nameClass}" style="${fontWeightStyle}">${boss.name}</span>
                        <span class="imminent-time ${timeClass}" style="${fontWeightStyle}">${format(diff)}</span>
                    </div>
                `;
            }).join('');
        } else {
            listElement.innerHTML = '';
        }
    } else {
        nameElement.textContent = '다음 보스 없음';
        remainingTimeElement.textContent = '--:--:--';
        remainingTimeElement.style.color = '#777';
        listElement.innerHTML = '';
        mainContainer.classList.add('no-list');
    }

    // Imminent Alert Icon Logic
    // Show alert icon if ANY OTHER boss in the list is imminent (< 5 min)
    const alertIcon = pipWindow.document.getElementById('pip-alert-icon');
    if (alertIcon) {
        const listAfterNextBoss = upcoming.slice(1);
        const hasAnyImminentInList = listAfterNextBoss.some(boss => (boss.timestamp - now) < BOSS_THRESHOLDS.IMMINENT);

        if (hasAnyImminentInList) {
            alertIcon.style.display = 'block';
        } else {
            alertIcon.style.display = 'none';
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
