// src/services.js
import { initLogger } from './logger.js';
import { loadBossLists } from './boss-scheduler-data.js';
import { LocalStorageManager } from './data-managers.js';
import { CustomListManager } from './custom-list-manager.js';

/**
 * Initializes core application services like logger, data managers, and loads initial data.
 * @param {object} DOM - The DOM elements object from initDomElements.
 */
export async function initializeCoreServices(DOM) {
    // Initialize the logger first as other modules may use it.
    initLogger(DOM.logContainer);

    // Initialize data managers that load from localStorage.
    LocalStorageManager.init();
    CustomListManager.init();

    // Load boss data from the server.
    await loadBossLists();
}
