import { renderVersionInfo } from '../ui-renderer.js';

export function initVersionInfoScreen(DOM) {
    renderVersionInfo(DOM);
}

export function getScreen() {
    return {
        id: 'version-info-screen',
        onTransition: initVersionInfoScreen
    };
}
