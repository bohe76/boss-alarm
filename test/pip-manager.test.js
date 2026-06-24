import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BossDataManager } from '../src/data-managers.js';
import { togglePipWindow } from '../src/pip-manager.js';

vi.mock('../src/data-managers.js', () => ({
    BOSS_THRESHOLDS: {
        IMMINENT: 5 * 60 * 1000,
        WARNING: 10 * 60 * 1000,
        MEDIUM: 60 * 60 * 1000
    },
    BossDataManager: {
        getUpcomingBosses: vi.fn()
    }
}));

describe('pip-manager', () => {
    let pipDocument;
    let pipWindow;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();

        pipDocument = document.implementation.createHTMLDocument('pip');
        pipWindow = {
            document: pipDocument,
            outerHeight: 120,
            innerHeight: 96,
            close: vi.fn(),
            resizeTo: vi.fn(),
            getComputedStyle: window.getComputedStyle.bind(window),
            addEventListener: vi.fn()
        };

        vi.stubGlobal('documentPictureInPicture', {
            requestWindow: vi.fn().mockResolvedValue(pipWindow)
        });

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue(`
                <div class="pip-container">
                    <div id="pip-main-boss">
                        <span id="pip-alert-icon"></span>
                        <span id="pip-boss-name"></span>
                        <span id="pip-remaining-time"></span>
                    </div>
                    <div id="pip-imminent-list"></div>
                </div>
            `)
        }));
    });

    it('renders expanded boss names as text, not markup', async () => {
        const now = Date.now();
        const maliciousName = '<img src=x onerror=alert(1)>';
        BossDataManager.getUpcomingBosses.mockReturnValue([
            {
                name: 'Next Boss',
                timestamp: now + 2 * 60 * 1000,
                time: '12:00'
            },
            {
                name: maliciousName,
                timestamp: now + 20 * 60 * 1000,
                time: '12:20'
            }
        ]);

        await togglePipWindow();
        pipWindow.onclick();

        const listElement = pipDocument.getElementById('pip-imminent-list');
        expect(listElement.querySelector('img')).toBeNull();
        expect(listElement.textContent).toContain(maliciousName);
    });
});
