import { showCustomListTab, renderCustomListManagementModalContent, showToast } from '../ui-renderer.js';
import { CustomListManager } from '../custom-list-manager.js';
import { EventBus } from '../event-bus.js';


export function initCustomListScreen(DOM) {
    // Open Modal
    if (DOM.manageCustomListsButton) {
        DOM.manageCustomListsButton.addEventListener('click', () => {
            showCustomListTab(DOM, 'add'); // Show '목록 추가' tab by default
            DOM.customBossListModal.style.display = 'flex';
            DOM.customListNameInput.focus();
        });
    }

    // Close Modal
    const closeModal = () => {
        if (DOM.customBossListModal) {
            DOM.customBossListModal.style.display = 'none';
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
        DOM.tabAddCustomList.addEventListener('click', () => showCustomListTab(DOM, 'add'));
    }
    if (DOM.tabManageCustomLists) {
        DOM.tabManageCustomLists.addEventListener('click', () => showCustomListTab(DOM, 'manage'));
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
                        return;
                    }
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
                } else { // 추가 작업이었을 경우
                    closeModal(); // 모달 닫기
                }
            } else {
                alert(`${result.message}`);
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
                    const result = CustomListManager.deleteCustomList(listName);
                    showToast(DOM, result.message);
                    if (result.success) {
                        renderCustomListManagementModalContent(DOM); // Re-render management list
                        EventBus.emit('rerender-boss-scheduler'); // To update dropdown
                    }
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
            }
        });
    }
}
