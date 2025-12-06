// src/dom-elements.js

export function initDomElements() {
    return {
        // Global Layout Elements
        alarmToggleButton: document.getElementById('alarmToggleButton'),

        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'), // New
        bottomNav: document.getElementById('bottom-nav'), // New for mobile
        sidebarBackdrop: document.getElementById('sidebar-backdrop'), // New for mobile
        moreMenuButton: document.getElementById('more-menu-button'), // New for mobile
        moreMenuCloseButton: document.getElementById('more-menu-close-button'), // New for mobile
        mainContentArea: document.getElementById('main-content-area'),
        footerVersion: document.getElementById('footer-version'), // New

        // Sidebar Navigation Links
        navDashboard: document.getElementById('nav-dashboard'), // New
        navBossManagement: document.getElementById('nav-boss-management'), // New
        navCalculator: document.getElementById('nav-calculator'), // New
        navBossScheduler: document.getElementById('nav-boss-scheduler'), // New
        navSettings: document.getElementById('nav-settings'), // New
        navAlarmLog: document.getElementById('nav-alarm-log'), // New
        navVersionInfo: document.getElementById('nav-version-info'), // New
        navShare: document.getElementById('nav-share'), // New
        navHelp: document.getElementById('nav-help'), // New

        // Bottom Navigation Links
        bottomNavDashboard: document.getElementById('bottom-nav-dashboard'),
        bottomNavBossManagement: document.getElementById('bottom-nav-boss-management'),
        bottomNavCalculator: document.getElementById('bottom-nav-calculator'),
        bottomNavShare: document.getElementById('bottom-nav-share'),

        // Screen Specific Elements (initially all are present in index.html)
        dashboardScreen: document.getElementById('dashboard-screen'),
        bossManagementScreen: document.getElementById('boss-management-screen'),
        calculatorScreen: document.getElementById('calculator-screen'), // New
        bossSchedulerScreen: document.getElementById('boss-scheduler-screen'), // New
        settingsScreen: document.getElementById('settings-screen'),
        alarmLogScreen: document.getElementById('alarm-log-screen'),
        versionInfoScreen: document.getElementById('version-info-screen'),
        shareScreen: document.getElementById('share-screen'),
        helpScreen: document.getElementById('help-screen'),

        // Elements within Boss Management Screen
        bossListInput: document.getElementById('bossListInput'),
        sortBossListButton: document.getElementById('sortBossListButton'), // New

        // Elements within Dashboard Screen
        nextBossContent: document.getElementById('nextBossContent'),
        upcomingBossListContent: document.getElementById('upcomingBossListContent'), // New
        alarmStatusText: document.getElementById('alarmStatusText'),
        muteToggleButton: document.getElementById('muteToggleButton'), // New
        recentAlarmLogContent: document.getElementById('recentAlarmLogContent'),

        // Elements within Notification Settings Screen
        fixedAlarmListDiv: document.getElementById('fixedAlarmList'),

        // Elements within Alarm Log Screen
        alarmLogCard: document.getElementById('alarmLogCard'), // New
        viewMoreLogsButton: document.getElementById('viewMoreLogsButton'), // New
        logContainer: document.getElementById('log-container'), // Retained

        // Elements within Version Info Screen
        versionHistoryContent: document.getElementById('versionHistoryContent'),

        // Elements within Share Screen
        shareMessage: document.getElementById('shareMessage'),

        // Elements within Help Screen
        featureGuideContent: document.getElementById('featureGuideContent'),

        // Elements within Zen Calculator Screen
        remainingTimeInput: document.getElementById('remainingTimeInput'), // New
        bossAppearanceTimeDisplay: document.getElementById('bossAppearanceTimeDisplay'), // New
        bossSelectionLabel: document.getElementById('bossSelectionLabel'), // New
        bossSelectionDropdown: document.getElementById('bossSelectionDropdown'), // New
        updateBossTimeButton: document.getElementById('updateBossTimeButton'), // New
        toastContainer: document.getElementById('toastContainer'), // New

        // Elements within Light Calculator Screen
        zenCalculatorCard: document.getElementById('zenCalculatorCard'),
        lightCalculatorCard: document.getElementById('lightCalculatorCard'),
        lightStopwatchDisplay: document.getElementById('lightStopwatchDisplay'),
        lightStartButton: document.getElementById('lightStartButton'),
        lightGwangButton: document.getElementById('lightGwangButton'),
        lightCaptureButton: document.getElementById('lightCaptureButton'),
        lightListButton: document.getElementById('lightListButton'),
        lightExpectedTimeDisplay: document.getElementById('lightExpectedTimeDisplay'),
        lightTempResults: document.getElementById('lightTempResults'),
        lightSavedList: document.getElementById('lightSavedList'),
        clearLightRecordsButton: document.getElementById('clearLightRecordsButton'),

        // Elements within Boss Scheduler Screen
        gameSelect: document.getElementById('gameSelect'), // New
        bossInputsContainer: document.getElementById('bossInputsContainer'), // New
        clearAllRemainingTimesButton: document.getElementById('clearAllRemainingTimesButton'), // New
        moveToBossSettingsButton: document.getElementById('moveToBossSettingsButton'), // New

        // Custom Boss List Feature Elements
        manageCustomListsButton: document.getElementById('manage-custom-lists-button'),
        customBossListModal: document.getElementById('custom-boss-list-modal'),
        closeCustomListModal: document.getElementById('close-custom-list-modal'),
        customListNameInput: document.getElementById('custom-list-name-input'),
        customListContentTextarea: document.getElementById('custom-list-content-textarea'),
        saveCustomListButton: document.getElementById('save-custom-list-button'),
        customListManagementContainer: document.getElementById('custom-list-management-container'),
        // New: Custom Boss List Tab Elements
        modalTabs: document.querySelector('.modal-tabs'),
        tabAddCustomList: document.getElementById('tab-add-custom-list'),
        tabManageCustomLists: document.getElementById('tab-manage-custom-lists'),
        customListAddSection: document.getElementById('custom-list-add-section'),
        customListManageSection: document.getElementById('custom-list-manage-section'),
    };
}
