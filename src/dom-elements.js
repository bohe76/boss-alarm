// src/dom-elements.js

export function initDomElements() {
    return {
        // Global Layout Elements
        alarmToggleButton: document.getElementById('alarmToggleButton'),

        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'), // New
        mainContentArea: document.getElementById('main-content-area'),

        // Sidebar Navigation Links
        navDashboard: document.getElementById('nav-dashboard'), // New
        navBossManagement: document.getElementById('nav-boss-management'), // New
        navZenCalculator: document.getElementById('nav-zen-calculator'), // New
        navBossScheduler: document.getElementById('nav-boss-scheduler'), // New
        navNotificationSettings: document.getElementById('nav-notification-settings'), // New
        navAlarmLog: document.getElementById('nav-alarm-log'), // New
        navVersionInfo: document.getElementById('nav-version-info'), // New
        navShare: document.getElementById('nav-share'), // New
        navHelp: document.getElementById('nav-help'), // New

        // Screen Specific Elements (initially all are present in index.html)
        dashboardScreen: document.getElementById('dashboard-screen'),
        bossManagementScreen: document.getElementById('boss-management-screen'),
        zenCalculatorScreen: document.getElementById('zen-calculator-screen'), // New
        bossSchedulerScreen: document.getElementById('boss-scheduler-screen'), // New
        notificationSettingsScreen: document.getElementById('notification-settings-screen'),
        alarmLogScreen: document.getElementById('alarm-log-screen'),
        versionInfoScreen: document.getElementById('version-info-screen'),
        shareScreen: document.getElementById('share-screen'),
        helpScreen: document.getElementById('help-screen'),

        // Elements within Boss Management Screen
        bossListInput: document.getElementById('bossListInput'),

        // Elements within Dashboard Screen
        nextBossDisplay: document.getElementById('nextBossDisplay'),
        upcomingBossList: document.getElementById('upcomingBossList'), // New
        alarmStatusSummary: document.getElementById('alarmStatusSummary'), // New
        alarmStatusText: document.getElementById('alarmStatusText'),
        recentAlarmLog: document.getElementById('recentAlarmLog'),

        // Elements within Notification Settings Screen
        fixedAlarmListDiv: document.getElementById('fixedAlarmList'),

        // Elements within Alarm Log Screen
        logContainer: document.getElementById('log-container'),
        logVisibilityToggle: document.getElementById('logVisibilityToggle'),

        // Elements within Version Info Screen
        versionHistoryContent: document.getElementById('versionHistoryContent'),

        // Elements within Version Info Screen
        versionHistoryContent: document.getElementById('versionHistoryContent'),

        // Elements within Share Screen
        shareMessage: document.getElementById('shareMessage'),

        // Elements within Help Screen
        featureGuideContent: document.getElementById('featureGuideContent'),

        // Elements within Zen Calculator Screen
        remainingTimeInput: document.getElementById('remainingTimeInput'), // New
        bossAppearanceTimeDisplay: document.getElementById('bossAppearanceTimeDisplay'), // New

        // Elements within Boss Scheduler Screen
        gameSelect: document.getElementById('gameSelect'), // New
        bossInputsContainer: document.getElementById('bossInputsContainer'), // New
        clearAllRemainingTimesButton: document.getElementById('clearAllRemainingTimesButton'), // New
        moveToBossSettingsButton: document.getElementById('moveToBossSettingsButton'), // New
    };
}
