import { renderVersionInfo } from '../ui-renderer.js';
import { loadJsonContent } from '../api-service.js'; // Import loadJsonContent

export function initVersionInfoScreen(DOM) {
    (async () => {
        const versionData = await loadJsonContent(`docs/version_history.json?v=${window.APP_VERSION}`);
        renderVersionInfo(DOM, versionData);
    })();
}

export function getScreen() {
    return {
        id: 'version-info-screen',
        onTransition: initVersionInfoScreen
    };
}
