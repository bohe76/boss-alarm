// src/dom-elements.js

export function initDomElements() {
    return {
        // Global Layout Elements
        alarmToggleButton: document.getElementById('alarmToggleButton'),

        sidebar: document.getElementById('sidebar'),
        bottomNav: document.getElementById('bottom-nav'), // New for mobile
        sidebarBackdrop: document.getElementById('sidebar-backdrop'), // New for mobile
        moreMenuButton: document.getElementById('more-menu-button'), // New for mobile
        moreMenuCloseButton: document.getElementById('more-menu-close-button'), // New for mobile
        mainContentArea: document.getElementById('main-content-area'),
        footerVersion: document.getElementById('footer-version'), // New
        footerContactButton: document.getElementById('footer-contact-button'), // New

        // Sidebar Navigation Links
        navDashboard: document.getElementById('nav-dashboard'), // New
        navTimetable: document.getElementById('nav-timetable'), // New
        navCalculator: document.getElementById('nav-calculator'), // New
        navBossScheduler: document.getElementById('nav-boss-scheduler'), // New
        navSettings: document.getElementById('nav-settings'), // New
        navAlarmLog: document.getElementById('nav-alarm-log'), // New
        navVersionInfo: document.getElementById('nav-version-info'), // New
        navShare: document.getElementById('nav-share'), // New
        navHelp: document.getElementById('nav-help'), // New

        // Bottom Navigation Links
        bottomNavDashboard: document.getElementById('bottom-nav-dashboard'),
        bottomNavTimetable: document.getElementById('bottom-nav-timetable'),
        bottomNavCalculator: document.getElementById('bottom-nav-calculator'),
        bottomNavBossScheduler: document.getElementById('bottom-nav-boss-scheduler'),
        bottomNavShare: document.getElementById('bottom-nav-share'),

        // Screen Specific Elements (initially all are present in index.html)
        dashboardScreen: document.getElementById('dashboard-screen'),
        timetableScreen: document.getElementById('timetable-screen'),
        calculatorScreen: document.getElementById('calculator-screen'), // New
        bossSchedulerScreen: document.getElementById('boss-scheduler-screen'), // New
        settingsScreen: document.getElementById('settings-screen'),
        alarmLogScreen: document.getElementById('alarm-log-screen'),
        versionInfoScreen: document.getElementById('version-info-screen'),
        shareScreen: document.getElementById('share-screen'),
        helpScreen: document.getElementById('help-screen'),

        // Elements within Timetable Screen
        editTimetableButton: document.getElementById('editTimetableButton'), // New
        timetableNextBossFilterToggle: document.getElementById('timetableNextBossFilterToggle'), // New
        timetableDisplayModeToggle: document.getElementById('timetableDisplayModeToggle'), // New
        bossListCardsContainer: document.getElementById('bossListCardsContainer'), // New
        // Elements within Dashboard Screen
        pipToggleButton: document.getElementById('pip-toggle-button'),
        nextBossContent: document.getElementById('nextBossContent'),
        upcomingBossListContent: document.getElementById('upcomingBossListContent'), // New
        alarmStatusText: document.getElementById('alarmStatusText'),
        muteToggleButton: document.getElementById('muteToggleButton'), // New
        volumeSlider: document.getElementById('volumeSlider'), // New
        recentAlarmLogContent: document.getElementById('recentAlarmLogContent'),

        // Elements within Settings Screen
        fixedAlarmListDiv: document.getElementById('fixedAlarmList'),
        addFixedAlarmButton: document.getElementById('add-fixed-alarm-button'), // 메인 추가 버튼

        // Fixed Alarm Modal Elements
        fixedAlarmModal: document.getElementById('fixed-alarm-modal'),
        fixedAlarmModalTitle: document.getElementById('fixed-alarm-modal-title'),
        closeFixedAlarmModal: document.getElementById('close-fixed-alarm-modal'),
        cancelFixedAlarmModalButton: document.getElementById('cancel-fixed-alarm-modal-button'),
        saveFixedAlarmButton: document.getElementById('save-fixed-alarm-button'),
        fixedAlarmTimeInput: document.getElementById('fixed-alarm-time-input'),
        fixedAlarmNameInput: document.getElementById('fixed-alarm-name-input'),
        fixedAlarmModalDays: document.getElementById('fixed-alarm-modal-days'),

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

        // Elements within Crazy Calculator Screen
        zenCalculatorCard: document.getElementById('zenCalculatorCard'),
        crazyCalculatorCard: document.getElementById('crazyCalculatorCard'),
        crazyStopwatchDisplay: document.getElementById('crazyStopwatchDisplay'),
        crazyStartButton: document.getElementById('crazyStartButton'),
        crazyGwangButton: document.getElementById('crazyGwangButton'),
        crazyCaptureButton: document.getElementById('crazyCaptureButton'),
        crazyListButton: document.getElementById('crazyListButton'),
        crazyExpectedTimeDisplay: document.getElementById('crazyExpectedTimeDisplay'),
        crazyTempResults: document.getElementById('crazyTempResults'),
        crazySavedList: document.getElementById('crazySavedList'),
        clearCrazyRecordsButton: document.getElementById('clearCrazyRecordsButton'),

        // Elements within Boss Scheduler Screen
        gameSelect: document.getElementById('gameSelect'), // New
        bossInputsContainer: document.getElementById('bossInputsContainer'), // New
        clearAllRemainingTimesButton: document.getElementById('clearAllRemainingTimesButton'), // New
        moveToBossSettingsButton: document.getElementById('moveToBossSettingsButton'), // New
        tabSchedulerInput: document.getElementById('tab-scheduler-input'), // New
        tabSchedulerText: document.getElementById('tab-scheduler-text'), // New
        schedulerInputModeSection: document.getElementById('scheduler-input-mode-section'), // New
        schedulerTextModeSection: document.getElementById('scheduler-text-mode-section'), // New
        schedulerBossListInput: document.getElementById('schedulerBossListInput'), // New

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

        // Export Modal Elements
        exportTimetableButton: document.getElementById('exportTimetableButton'),
        exportModal: document.getElementById('export-modal'),
        closeExportModal: document.getElementById('close-export-modal'),
        exportDateOptions: document.getElementById('export-date-options'),
        exportContentOptions: document.getElementById('export-content-options'),
        exportFormatOptions: document.getElementById('export-format-options'),
        exportExecuteBtn: document.getElementById('export-execute-btn'),
        exportImageStyleSection: document.getElementById('export-image-style-section'),
        exportImageStyleOptions: document.getElementById('export-image-style-options'),

        // Version Update Modal Elements (v2.6)
        versionUpdateModal: document.getElementById('version-update-modal'),
        versionModalTitle: document.getElementById('version-modal-title'),
        closeVersionModal: document.getElementById('close-version-modal'),
        devMessageContent: document.getElementById('dev-message-content'),
        updateSummaryList: document.getElementById('update-summary-list'),
        viewReleaseNotesBtn: document.getElementById('view-release-notes-btn'),
        hideVersionModalBtn: document.getElementById('hide-version-modal-btn'),
    };
}
