import { loadJsonContent } from '../api-service.js';
import { renderHelpScreen, renderFaqScreen } from '../ui-renderer.js';

function handleTabSwitching(DOM) {
    const tabContainer = DOM.helpScreen.querySelector('.modal-tabs');
    const tabContents = DOM.helpScreen.querySelectorAll('.custom-list-tab-content');

    // Prevent adding listener multiple times
    if (tabContainer.dataset.listenerAttached) {
        return;
    }
    tabContainer.dataset.listenerAttached = 'true';

    tabContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('tab-button')) {
            const tabId = event.target.dataset.tab;

            // Deactivate all tabs and content
            tabContainer.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });
            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            // Activate the clicked tab and content
            event.target.classList.add('active');
            DOM.helpScreen.querySelector(`#${tabId}`).classList.add('active');
        }
    });
}


function onHelpScreenTransition(DOM) {
    // Load both guides at the same time
    (async () => {
        try {
            const [helpData, faqData] = await Promise.all([
                loadJsonContent(`data/feature_guide.json?v=${window.APP_VERSION}`),
                loadJsonContent(`data/faq_guide.json?v=${window.APP_VERSION}`)
            ]);
            
            renderHelpScreen(DOM, helpData);
            renderFaqScreen(DOM, faqData); 
        } catch (error) {
            console.error("Failed to load help content:", error);
            // Optionally, render an error message to the user
        }
    })();
}

export function getScreen() {
    return {
        id: 'help-screen',
        init: (DOM) => {
            handleTabSwitching(DOM);
        },
        onTransition: onHelpScreenTransition
    };
}
