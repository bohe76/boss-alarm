process.env.TZ = 'UTC';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomListManager } from '../src/custom-list-manager.js';
import { LocalStorageManager } from '../src/data-managers.js';


// Mock dependencies
vi.mock('../src/data-managers.js', () => ({
    LocalStorageManager: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));

vi.mock('../src/logger.js', () => ({
    log: vi.fn(),
}));

vi.mock('../src/boss-scheduler-data.js', () => ({
    getGameNames: vi.fn(() => [{ name: 'Predefined Game', isCustom: false }]),
}));


describe('CustomListManager', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the internal state of the manager by re-initializing with an empty array
        LocalStorageManager.get.mockReturnValue([]);
        CustomListManager.init();
    });

    it('should add a new custom list', () => {
        const result = CustomListManager.addCustomList('My List', 'Boss 1\nBoss 2');
        expect(result.success).toBe(true);
        expect(LocalStorageManager.set).toHaveBeenCalledOnce();
        
        const lists = CustomListManager.getCustomLists();
        expect(lists).toHaveLength(1);
        expect(lists[0].name).toBe('My List');
        expect(lists[0].bosses).toEqual(['Boss 1', 'Boss 2']);
    });

    it('should not add a list with a duplicate name', () => {
        CustomListManager.addCustomList('My List', 'Boss 1');
        const result = CustomListManager.addCustomList('My List', 'Boss 3');
        expect(result.success).toBe(false);
        expect(result.message).toBe('이미 존재하는 목록 또는 게임 이름입니다.');
        expect(LocalStorageManager.set).toHaveBeenCalledOnce(); // Only the first add should succeed
    });

    it('should not add a list with a predefined game name', () => {
        const result = CustomListManager.addCustomList('Predefined Game', 'Boss 1');
        expect(result.success).toBe(false);
        expect(result.message).toBe('이미 존재하는 목록 또는 게임 이름입니다.');
    });

    it('should not add a list with invalid content', () => {
        const result = CustomListManager.addCustomList('My List', '');
        expect(result.success).toBe(false);
        expect(result.message).toBe('보스 목록 내용이 비어 있습니다.');
    });

    it('should update an existing list', () => {
        CustomListManager.addCustomList('My List', 'Boss 1');
        const result = CustomListManager.updateCustomList('My List', 'New Boss 1\nNew Boss 2');
        expect(result.success).toBe(true);

        const lists = CustomListManager.getCustomLists();
        expect(lists[0].bosses).toEqual(['New Boss 1', 'New Boss 2']);
        expect(LocalStorageManager.set).toHaveBeenCalledTimes(2);
    });

    it('should delete a list', () => {
        CustomListManager.addCustomList('My List', 'Boss 1');
        const result = CustomListManager.deleteCustomList('My List');
        expect(result.success).toBe(true);
        expect(CustomListManager.getCustomLists()).toHaveLength(0);
        expect(LocalStorageManager.set).toHaveBeenCalledTimes(2);
    });
    
    it('should rename a list', () => {
        CustomListManager.addCustomList('Old Name', 'Boss 1');
        const result = CustomListManager.renameCustomList('Old Name', 'New Name');
        expect(result.success).toBe(true);

        const lists = CustomListManager.getCustomLists();
        expect(lists[0].name).toBe('New Name');
        expect(LocalStorageManager.set).toHaveBeenCalledTimes(2);
    });

    it('should not rename to a duplicate name', () => {
        CustomListManager.addCustomList('List 1', 'Boss 1');
        CustomListManager.addCustomList('List 2', 'Boss 2');
        const result = CustomListManager.renameCustomList('List 1', 'List 2');
        expect(result.success).toBe(false);
        expect(result.message).toBe('이미 존재하는 목록 또는 게임 이름입니다.');
    });

    it('should retrieve boss names for a custom list', () => {
        CustomListManager.addCustomList('My List', 'Boss A\nBoss B');
        const bossNames = CustomListManager.getBossNamesForCustomList('My List');
        expect(bossNames).toEqual(['Boss A', 'Boss B']);
    });



    it('should retrieve content for a custom list', () => {
        const content = 'Boss A\n\nBoss B';
        CustomListManager.addCustomList('My List', content);
        const retrievedContent = CustomListManager.getCustomListContent('My List');
        expect(retrievedContent).toBe('Boss A\nBoss B'); // Check if it's cleaned
    });

    it('should correctly identify a predefined game name', () => {
        expect(CustomListManager.isPredefinedGameName('Predefined Game')).toBe(true);
        expect(CustomListManager.isPredefinedGameName('Non Existent Game')).toBe(false);
    });
});
