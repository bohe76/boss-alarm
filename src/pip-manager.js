import { BossDataManager, BOSS_THRESHOLDS } from './data-managers.js';

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
        return;
    }

    try {
        const { imminentBosses } = BossDataManager.getBossStatusSummary();
        const n = imminentBosses.length;

        // 📐 [96px Baseline] Precision Math
        // Root is 96px. If 2+ bosses, add 37px for 2nd, then 29px for others.
        let initialInnerH = 96;
        if (n >= 2) {
            initialInnerH = 96 + 37 + (n - 2) * 29;
        }

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
        const status = BossDataManager.getBossStatusSummary();
        updatePipContent(status.nextBoss, status.minTimeDiff, status.imminentBosses);

        // ⚡ [96px Baseline] Instant Sync
        pipWindow.onclick = () => {
            const status = BossDataManager.getBossStatusSummary();
            const n = status.imminentBosses.length;
            let targetH = 96;
            if (n >= 2) {
                targetH = 96 + 37 + (n - 2) * 29;
            }

            const chromeHeight = pipWindow.outerHeight - pipWindow.innerHeight;
            pipWindow.resizeTo(240, targetH + chromeHeight);
        };

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
 */
export function updatePipContent(nextBoss, minTimeDiff, imminentBosses = []) {
    if (!isPipOpen || !pipWindow || !pipWindow.document) return;

    const nameElement = pipWindow.document.getElementById('pip-boss-name');
    const remainingTimeElement = pipWindow.document.getElementById('pip-remaining-time');
    const listElement = pipWindow.document.getElementById('pip-imminent-list');

    if (!nameElement || !remainingTimeElement || !listElement) return;

    let targetInnerHeight = 96;

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

        if (minTimeDiff < BOSS_THRESHOLDS.IMMINENT) {
            remainingTimeElement.style.color = '#ea4335';
        } else if (minTimeDiff < BOSS_THRESHOLDS.WARNING) {
            remainingTimeElement.style.color = '#FF8F00';
        } else {
            remainingTimeElement.style.color = '#777';
        }

        const imminentList = imminentBosses.filter(b => b.id !== nextBoss.id);
        const mainContainer = pipWindow.document.getElementById('pip-main-boss');

        if (imminentList.length > 0) {
            if (mainContainer) mainContainer.classList.remove('no-list');
            listElement.innerHTML = imminentList.map(boss => {
                const diff = boss.timestamp - Date.now();
                return `
                    <div class="imminent-item">
                        <span class="imminent-name">${boss.name}</span>
                        <span class="imminent-time">${format(diff)}</span>
                    </div>
                `;
            }).join('');

            // 📐 [96px Baseline] Precision Math
            // imminentList.length is (Total Bosses - 1)
            // If n=2 (imminentList=1): 96 + 37 + 0 = 133
            targetInnerHeight = 96 + 37 + (imminentList.length - 1) * 29;
        } else {
            if (mainContainer) mainContainer.classList.add('no-list');
            listElement.innerHTML = '';
            targetInnerHeight = 96;
        }
    } else {
        nameElement.textContent = '다음 보스 없음';
        remainingTimeElement.textContent = '--:--:--';
        remainingTimeElement.style.color = '#777';
        listElement.innerHTML = '';
        targetInnerHeight = 96;
    }

    // 💡 Single-Pulse Detection: Compare calculated target with physical innerHeight
    const syncBtn = pipWindow.document.getElementById('pip-sync-btn');
    if (syncBtn) {
        const currentInnerH = pipWindow.innerHeight;
        const needsSync = Math.abs(targetInnerHeight - currentInnerH) > 2;

        if (needsSync) {
            syncBtn.style.display = 'flex';
            syncBtn.classList.add('blinking');
        } else {
            syncBtn.style.display = 'none';
            syncBtn.classList.remove('blinking');
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
