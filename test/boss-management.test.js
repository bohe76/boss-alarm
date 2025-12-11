import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initBossManagementScreen } from '../src/screens/boss-management.js';
import { LocalStorageManager, BossDataManager } from '../src/data-managers.js';
import { updateBossManagementUI, updateBossListTextarea } from '../src/ui-renderer.js';
import { parseBossList } from '../src/boss-parser.js';
import { trackEvent } from '../src/analytics.js';
import { log } from '../src/logger.js';

// Mock dependencies
vi.mock('../src/data-managers.js', () => ({
    LocalStorageManager: {
        get: vi.fn(),
        set: vi.fn(),
        init: vi.fn(),
    },
    BossDataManager: {
        getBossSchedule: vi.fn(),
        setBossSchedule: vi.fn(),
        subscribe: vi.fn(),
        getNextBossInfo: vi.fn(),
        getUpcomingBosses: vi.fn(),
    },
}));
vi.mock('../src/ui-renderer.js', () => ({
    updateBossManagementUI: vi.fn(),
    updateBossListTextarea: vi.fn(),
    renderBossListTableView: vi.fn(),
}));
vi.mock('../src/boss-parser.js', () => ({
    parseBossList: vi.fn(),
}));
vi.mock('../src/analytics.js', () => ({
    trackEvent: vi.fn(),
}));
vi.mock('../src/logger.js', () => ({
    log: vi.fn(),
}));

describe('Boss Management Screen', () => {
    let DOM;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Setup a basic DOM structure for testing
        document.body.innerHTML = `
            <section id="boss-management-screen" class="screen">
                <h2>보스 설정</h2>
                <div class="boss-management-controls">
                    <div class="toggle-buttons-wrapper">
                        <button id="nextBossToggleButton" class="button toggle-button active">다음 보스</button>
                        <button id="viewEditModeToggleButton" class="button primary-button toggle-button">뷰/편집</button>
                    </div>
                </div>
                <div id="bossListTableContainer" class="card-size-list" style="display: none;"></div>
                <div class="card-size-list">
                    <p id="boss-management-instruction" class="boss-management-instruction"></p>
                    <textarea id="bossListInput"></textarea>
                    <div class="boss-list-actions">
                        <button id="sortBossListButton" class="button primary-button">보스 설정 저장</button>
                    </div>
                </div>
            </section>
        `;

        DOM = {
            bossManagementScreen: document.getElementById('boss-management-screen'),
            nextBossToggleButton: document.getElementById('nextBossToggleButton'),
            viewEditModeToggleButton: document.getElementById('viewEditModeToggleButton'),
            bossListTableContainer: document.getElementById('bossListTableContainer'),
            bossManagementInstruction: document.getElementById('boss-management-instruction'),
            bossListInput: document.getElementById('bossListInput'),
            sortBossListButton: document.getElementById('sortBossListButton'),
        };

        // Mock LocalStorageManager default behavior
        LocalStorageManager.get.mockImplementation((key) => {
            if (key === 'bossManagementMode') return null; // Default to null for initial load
            if (key === 'bossManagementNextBossFilter') return null; // Default to null for initial load
            return undefined;
        });
        LocalStorageManager.set.mockImplementation(() => {});

        // Mock parseBossList for save tests
        parseBossList.mockReturnValue({ success: true, mergedSchedule: [] });

        // Mock window.alert and console.warn
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    // Test case: Initial mode load (default to view)
    it('should initialize to view mode if no mode is saved in localStorage', () => {
        initBossManagementScreen(DOM);
        expect(LocalStorageManager.get).toHaveBeenCalledWith('bossManagementMode');
        expect(LocalStorageManager.set).toHaveBeenCalledWith('bossManagementNextBossFilter', true); // Default to ON
        expect(DOM.nextBossToggleButton.classList.contains('active')).toBe(true);
        expect(updateBossManagementUI).toHaveBeenCalledWith(DOM, 'view');
    });

    // Test case: Initial mode load (edit mode saved)
    it('should load saved mode from localStorage', () => {
        LocalStorageManager.get.mockImplementation((key) => {
            if (key === 'bossManagementMode') return 'edit';
            if (key === 'bossManagementNextBossFilter') return false;
            return undefined;
        });
        initBossManagementScreen(DOM);
        expect(LocalStorageManager.get).toHaveBeenCalledWith('bossManagementMode');
        expect(LocalStorageManager.get).toHaveBeenCalledWith('bossManagementNextBossFilter');
        expect(DOM.nextBossToggleButton.classList.contains('active')).toBe(false);
        expect(updateBossManagementUI).toHaveBeenCalledWith(DOM, 'edit');
    });

    // Test case: Toggle view/edit mode
    it('should toggle between view and edit mode on button click and save to localStorage', () => {
        // Start in view mode
        LocalStorageManager.get.mockImplementation((key) => key === 'bossManagementMode' ? 'view' : undefined);
        initBossManagementScreen(DOM);
        expect(updateBossManagementUI).toHaveBeenCalledWith(DOM, 'view');
        vi.clearAllMocks(); // Clear calls for initial setup

        // Click to switch to edit mode
        DOM.viewEditModeToggleButton.click();
        expect(LocalStorageManager.set).toHaveBeenCalledWith('bossManagementMode', 'edit');
        expect(updateBossManagementUI).toHaveBeenCalledWith(DOM, 'edit');
        expect(trackEvent).toHaveBeenCalledWith('Click Button', { event_category: 'Interaction', event_label: '보스 설정 편집 모드 전환' });
        vi.clearAllMocks();

        // Click to switch back to view mode
        LocalStorageManager.get.mockImplementation((key) => key === 'bossManagementMode' ? 'edit' : undefined); // Simulate localStorage update
        DOM.viewEditModeToggleButton.click();
        expect(LocalStorageManager.set).toHaveBeenCalledWith('bossManagementMode', 'view');
        expect(updateBossManagementUI).toHaveBeenCalledWith(DOM, 'view');
        expect(trackEvent).toHaveBeenCalledWith('Click Button', { event_category: 'Interaction', event_label: '보스 설정 뷰 모드 전환' });
    });

    // Test case: Toggle "Next Boss" filter
    it('should toggle "Next Boss" filter and save to localStorage when clicked', () => {
        // Start with filter ON
        LocalStorageManager.get.mockImplementation((key) => {
            if (key === 'bossManagementMode') return 'view';
            if (key === 'bossManagementNextBossFilter') return true;
            return undefined;
        });
        initBossManagementScreen(DOM);
        expect(DOM.nextBossToggleButton.classList.contains('active')).toBe(true);
        vi.clearAllMocks();

        // Click to turn filter OFF
        DOM.nextBossToggleButton.click();
        expect(LocalStorageManager.set).toHaveBeenCalledWith('bossManagementNextBossFilter', false);
        expect(DOM.nextBossToggleButton.classList.contains('active')).toBe(false);
        expect(updateBossManagementUI).toHaveBeenCalled(); // Should trigger UI update
        expect(trackEvent).toHaveBeenCalledWith('Click Button', { event_category: 'Interaction', event_label: '보스 설정 다음 보스 필터 비활성화' });
        vi.clearAllMocks();

        // Click to turn filter ON
        LocalStorageManager.get.mockImplementation((key) => {
            if (key === 'bossManagementMode') return 'view';
            if (key === 'bossManagementNextBossFilter') return false;
            return undefined;
        });
        DOM.nextBossToggleButton.click();
        expect(LocalStorageManager.set).toHaveBeenCalledWith('bossManagementNextBossFilter', true);
        expect(DOM.nextBossToggleButton.classList.contains('active')).toBe(true);
        expect(updateBossManagementUI).toHaveBeenCalled(); // Should trigger UI update
        expect(trackEvent).toHaveBeenCalledWith('Click Button', { event_category: 'Interaction', event_label: '보스 설정 다음 보스 필터 활성화' });
    });

    // Test case: Save button only works in edit mode
    it('should execute save logic only in edit mode', () => {
        // Simulate view mode
        LocalStorageManager.get.mockImplementation((key) => key === 'bossManagementMode' ? 'view' : undefined);
        initBossManagementScreen(DOM);
        vi.clearAllMocks();

        DOM.sortBossListButton.click();
        expect(window.alert).not.toHaveBeenCalled(); // No alert from parseBossList failure
        expect(parseBossList).not.toHaveBeenCalled();
        expect(BossDataManager.setBossSchedule).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith('Attempted to save in view mode. Operation blocked.');

        vi.clearAllMocks();

        // Simulate edit mode
        LocalStorageManager.get.mockImplementation((key) => key === 'bossManagementMode' ? 'edit' : undefined);
        // Need to re-init or simulate mode change
        DOM.viewEditModeToggleButton.click(); // Switch to edit mode
        vi.clearAllMocks(); // Clear calls from toggle

        DOM.sortBossListButton.click();
        expect(parseBossList).toHaveBeenCalledWith(DOM.bossListInput);
        expect(BossDataManager.setBossSchedule).toHaveBeenCalled();
        expect(updateBossListTextarea).toHaveBeenCalledWith(DOM); // Added assertion
        expect(log).toHaveBeenCalledWith("보스 설정이 저장되었습니다.", true);
        expect(window.alert).toHaveBeenCalledWith("저장되었습니다.");
        expect(trackEvent).toHaveBeenCalledWith('Click Button', { event_category: 'Interaction', event_label: '보스 설정 저장' });
    });

    // Test case: Dirty flag update
    it('should set window.isBossListDirty to true on textarea input', () => {
        window.isBossListDirty = false;
        initBossManagementScreen(DOM);
        DOM.bossListInput.value = 'some new text';
        DOM.bossListInput.dispatchEvent(new Event('input'));
        expect(window.isBossListDirty).toBe(true);
    });

    // Test case: Dirty flag reset on save
    it('should reset window.isBossListDirty to false after successful save', () => {
        LocalStorageManager.get.mockImplementation((key) => key === 'bossManagementMode' ? 'edit' : undefined);
        initBossManagementScreen(DOM);
        window.isBossListDirty = true;
        DOM.sortBossListButton.click();
        expect(window.isBossListDirty).toBe(false);
    });
});
