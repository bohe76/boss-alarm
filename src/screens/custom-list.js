import { showCustomListTab, renderCustomListManagementModalContent, showToast } from '../ui-renderer.js';
import { CustomListManager } from '../custom-list-manager.js';
import { EventBus } from '../event-bus.js';
import { trackEvent } from '../analytics.js';


export function initCustomListScreen(DOM) {
    // Open Modal
    if (DOM.manageCustomListsButton) {
        DOM.manageCustomListsButton.addEventListener('click', () => {
            showCustomListTab(DOM, 'add'); // Show '목록 추가' tab by default
            DOM.customBossListModal.style.display = 'flex';
            DOM.customListNameInput.focus();
            trackEvent('Open Modal', { event_category: 'Interaction', event_label: '커스텀 목록 관리 모달' });
        });
    }

    // Close Modal
    const closeModal = () => {
        if (DOM.customBossListModal) {
            DOM.customBossListModal.style.display = 'none';
            trackEvent('Close Modal', { event_category: 'Interaction', event_label: '커스텀 목록 관리 모달' });
        }
    };
    if (DOM.closeCustomListModal) {
        DOM.closeCustomListModal.addEventListener('click', closeModal);
    }
    if (DOM.customBossListModal) {
        DOM.customBossListModal.addEventListener('click', (event) => {
            if (event.target === DOM.customBossListModal) {
                closeModal();
            }
        });
    }

    // Tab switching
    if (DOM.tabAddCustomList) {
        DOM.tabAddCustomList.addEventListener('click', () => {
            showCustomListTab(DOM, 'add');
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 추가 탭' });
        });
    }
    if (DOM.tabManageCustomLists) {
        DOM.tabManageCustomLists.addEventListener('click', () => {
            showCustomListTab(DOM, 'manage');
            trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 관리 탭' });
        });
    }

    // Save/Update Button in Modal
    if (DOM.saveCustomListButton) {
        DOM.saveCustomListButton.addEventListener('click', async () => { // Make it async for confirm dialog
            const listName = DOM.customListNameInput.value.trim();
            const listContent = DOM.customListContentTextarea.value.trim();
            const editTarget = DOM.saveCustomListButton.dataset.editTarget;

            let result;
            if (editTarget) { // Updating an existing list or renaming
                if (editTarget !== listName) { // Renaming case
                    const renameValidation = CustomListManager.renameCustomList(editTarget, listName);
                    if (!renameValidation.success) {
                        alert(`${renameValidation.message}`);
                        return;
                    }
                    // If rename was successful, proceed to update content with the new name
                    result = CustomListManager.updateCustomList(listName, listContent);
                } else { // Just updating content, name is the same
                    result = CustomListManager.updateCustomList(listName, listContent);
                }
            } else { // Adding a new list
                // Check for name duplication before adding
                const existingLists = CustomListManager.getCustomLists();
                const isNamePredefinedOrCustom = existingLists.some(list => list.name === listName) || CustomListManager.isPredefinedGameName(listName);

                if (isNamePredefinedOrCustom) {
                    const confirmOverwrite = confirm(`'${listName}'은(는) 이미 존재하는 목록 또는 게임 이름입니다. 덮어쓰시겠습니까?`);
                    if (!confirmOverwrite) {
                        showToast(DOM, '목록 추가를 취소했습니다.');
                        trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 덮어쓰기 취소' });
                        return;
                    }
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 덮어쓰기 확인' });
                    // If confirmed to overwrite, treat as an update
                    result = CustomListManager.updateCustomList(listName, listContent);
                    if (!result.success && result.message === '수정할 목록을 찾을 수 없습니다.') {
                        // This might happen if trying to "overwrite" a predefined game name with updateCustomList.
                        // Re-attempt as add if it's not a custom list that can be updated.
                        result = CustomListManager.addCustomList(listName, listContent);
                    }
                } else {
                    result = CustomListManager.addCustomList(listName, listContent);
                }
            }

            if (result.success) {
                showToast(DOM, result.message);
                // Call renderCustomListManagementModalContent to update the "목록 관리" tab's display
                renderCustomListManagementModalContent(DOM);
                EventBus.emit('rerender-boss-scheduler'); // To update dropdown

                if (editTarget) { // 수정 작업이었을 경우
                    showCustomListTab(DOM, 'manage'); // '목록 관리' 탭으로 전환
                    // 입력 필드 및 버튼 상태 초기화
                    DOM.customListNameInput.value = '';
                    DOM.customListContentTextarea.value = '';
                    DOM.saveCustomListButton.textContent = '추가'; // '추가' 모드 기본 텍스트
                    delete DOM.saveCustomListButton.dataset.editTarget;
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 업데이트' });
                } else { // 추가 작업이었을 경우
                    closeModal(); // 모달 닫기
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 저장' });
                }
            } else {
                alert(`${result.message}`);
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 저장 실패', reason: result.message });
            }
        });
    }

    // Event Delegation for Management List (Edit, Rename, Delete)
    if (DOM.customListManagementContainer) {
        DOM.customListManagementContainer.addEventListener('click', async (event) => { // Make it async for prompt/confirm dialogs
            const button = event.target.closest('button');
            if (!button) return;

            const item = button.closest('.custom-list-manage-item');
            if (!item) return;

            const listName = item.dataset.listName;

            if (button.classList.contains('delete-custom-list-button')) {
                if (confirm(`'${listName}' 목록을 정말 삭제하시겠습니까?`)) {
                    // [기능 추가] 현재 선택된 리스트가 삭제되는 경우, 프리셋 첫 번째로 강제 전환
                    const { LocalStorageManager } = await import('../data-managers.js');
                    if (LocalStorageManager.get('lastSelectedGame') === listName) {
                        const { getGameNames } = await import('../boss-scheduler-data.js');
                        const defaultGame = getGameNames().find(g => !g.isCustom)?.id || 'odin';
                        LocalStorageManager.set('lastSelectedGame', defaultGame);
                    }

                    const result = CustomListManager.deleteCustomList(listName);
                    showToast(DOM, result.message);
                    if (result.success) {
                        renderCustomListManagementModalContent(DOM); // Re-render management list
                        EventBus.emit('rerender-boss-scheduler'); // To update dropdown & state
                        trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 삭제', listName: listName });
                    } else {
                        trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 삭제 실패', listName: listName, reason: result.message });
                    }
                } else {
                    trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 삭제 취소', listName: listName });
                }
            } else if (button.classList.contains('edit-custom-list-button')) {
                // Switch to the "목록 추가" tab for editing
                showCustomListTab(DOM, 'add');

                const content = CustomListManager.getCustomListContent(listName);
                DOM.customListNameInput.value = listName;
                DOM.customListContentTextarea.value = content || '';
                DOM.saveCustomListButton.textContent = '수정';
                DOM.saveCustomListButton.dataset.editTarget = listName;
                DOM.customListNameInput.focus(); // Focus on the name input for editing
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '커스텀 목록 편집', listName: listName });
            }
        });
    }
}

export function openCustomListModalForMigration(DOM, currentListId, content) {
    if (!DOM || !DOM.customBossListModal) return;

    // 1. 모달 열기 및 '추가' 탭 활성화
    showCustomListTab(DOM, 'add');
    DOM.customBossListModal.style.display = 'flex';

    // 2. 데이터 주입
    // 목록 이름 제안: 기존 리스트 이름 + "(수정본)"
    const suggestedName = `${currentListId}(수정본)`;
    DOM.customListNameInput.value = suggestedName;
    DOM.customListContentTextarea.value = content;

    // 3. 사용자 안내 및 포커스
    DOM.customListNameInput.focus();
    trackEvent('Open Modal Migration', {
        event_category: 'Interaction',
        event_label: '커스텀 목록 관리 모달(이관용)',
        from_list: currentListId
    });
}

export function getScreen() {
    return {
        id: 'custom-list-screen', // This screen doesn't have a direct navigation link
        init: initCustomListScreen
    };
}
