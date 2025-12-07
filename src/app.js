// src/app.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { renderFixedAlarms, renderAlarmStatusSummary, renderDashboard, updateBossListTextarea } from './ui-renderer.js';
import { log } from './logger.js';
import { LocalStorageManager, BossDataManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import * as DefaultBossList from './default-boss-list.js';
import { formatMonthDay } from './utils.js';
import { EventBus } from './event-bus.js';
import { getRoute, registerRoute } from './router.js';
import { initializeCoreServices } from './services.js';
import { initGlobalEventListeners } from './global-event-listeners.js';
import { togglePipWindow } from './pip-manager.js';

// Screen Modules
// ... (rest of screen module imports)

// ... (rest of the file until initApp)

export async function initApp() {
    window.isBossListDirty = false; // Initialize dirty flag
    document.body.classList.add('loading'); // Activate skeleton UI
    const DOM = initDomElements();
    const globalTooltip = document.getElementById('global-tooltip');

    if (DOM.footerVersion) DOM.footerVersion.textContent = window.APP_VERSION;

    // Check for Document PiP API support
    if ('documentPictureInPicture' in window) {
        if (DOM.pipToggleButton) {
            DOM.pipToggleButton.style.display = 'block';
        }
    }

    await initializeCoreServices(DOM);
    registerAllRoutes();
    
    // Initialize Custom List Modal functionality explicitly as it's not a route
    const customListScreen = getCustomListScreen();
    if (customListScreen && customListScreen.init) {
        customListScreen.init(DOM);
    }

    loadInitialData(DOM);
    
    
    renderFixedAlarms(DOM);
            
    const isAlarmRunningInitially = getIsAlarmRunning();
    if (isAlarmRunningInitially) {
        DOM.alarmToggleButton.classList.add('alarm-on');
        DOM.alarmToggleButton.classList.remove('alarm-off');
        startAlarm(DOM);
    } else {
        DOM.alarmToggleButton.classList.add('alarm-off');
        DOM.alarmToggleButton.classList.remove('alarm-on');
    }
    renderAlarmStatusSummary(DOM);

    if (LocalStorageManager.getSidebarExpandedState()) {
        DOM.sidebar.classList.add('expanded');
    } else {
        DOM.sidebar.classList.remove('expanded');
    }

    showScreen(DOM, 'dashboard-screen');
    DOM.navDashboard.classList.add('active');

    EventBus.on('navigate', (screenId) => showScreen(DOM, screenId));
    initGlobalEventListeners(DOM);
    initEventHandlers(DOM, globalTooltip);
    
    const handleResize = () => {
        const isMobileView = window.innerWidth <= 768;
        document.body.classList.toggle('is-mobile-view', isMobileView);
        if (isMobileView && DOM.sidebar.classList.contains('more-menu-open')) {
            DOM.sidebar.classList.remove('expanded');
        }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);
    handleResize();
    document.body.classList.remove('loading'); // Deactivate skeleton UI and show real content
    document.getElementById('dashboard-real-content').classList.remove('hidden');
}
