import { loadJsonContent } from '../api-service.js';
import { renderHelpScreen } from '../ui-renderer.js'; // Import renderHelpScreen

export function initHelpScreen(DOM) {
    // Directly load feature guide content when opening help screen
    (async () => {
        const helpData = await loadJsonContent(`docs/feature_guide.json?v=${window.APP_VERSION}`);
        renderHelpScreen(DOM, helpData); // Call the centralized renderer
    })();
}

export function getScreen() {
    return {
        id: 'help-screen',
        onTransition: initHelpScreen
    };
}
