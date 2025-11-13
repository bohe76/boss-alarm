// src/event-handlers.js

import { parseBossList } from './boss-parser.js';
import { startAlarm, stopAlarm, getIsAlarmRunning } from './alarm-scheduler.js';
import { updateBossListTextarea, renderFixedAlarms, updateFixedAlarmVisuals } from './ui-renderer.js';
import { getShortUrl } from './api-service.js';
import { log, initLogger } from './logger.js';
import { BossDataManager, LocalStorageManager } from './data-managers.js';
import { initDomElements } from './dom-elements.js';
import { defaultBossList } from './default-boss-list.js'; // Import defaultBossList

const DOM = initDomElements(); // Initialize DOM elements once

// Helper function to load markdown content
async function loadMarkdownContent(filePath, targetElement) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const markdown = await response.text();
        // For now, just display as pre-formatted text.
        // A markdown parser library could be integrated here for richer rendering.
        targetElement.innerHTML = `<pre>${markdown}</pre>`;
    } catch (error) {
        console.error(`Failed to load markdown from ${filePath}:`, error);
        targetElement.innerHTML = `<p>콘텐츠를 불러오는 데 실패했습니다.</p>`;
    }
}

// Function to open the help modal
function openHelpModal() {
    DOM.helpModal.style.display = 'block';
    // Ensure feature guide is loaded and active by default when opening
    switchHelpTab('featureGuide');
}

// Function to close the help modal
function closeHelpModal() {
    DOM.helpModal.style.display = 'none';
}

// Function to switch between help tabs
function switchHelpTab(tabName) {
    // Deactivate all tab buttons and content
    DOM.featureGuideTabButton.classList.remove('active');
    DOM.versionHistoryTabButton.classList.remove('active');
    DOM.featureGuideContent.classList.remove('active');
    DOM.versionHistoryContent.classList.remove('active');

    // Activate the selected tab button and content
    if (tabName === 'featureGuide') {
        DOM.featureGuideTabButton.classList.add('active');
        DOM.featureGuideContent.classList.add('active');
        loadMarkdownContent('docs/feature_guide.md', DOM.featureGuideContent);
    } else if (tabName === 'versionHistory') {
        DOM.versionHistoryTabButton.classList.add('active');
        DOM.versionHistoryContent.classList.add('active');
        loadMarkdownContent('docs/version_history.md', DOM.versionHistoryContent);
    }
}


// Function to initialize all event handlers
function initEventHandlers() {
    // --- 7. '알림 시작/중지' 토글 버튼 이벤트 ---
    DOM.startButton.addEventListener('click', () => {
        if (!getIsAlarmRunning()) {
            DOM.startButton.textContent = "알림 중지 (실행 중)";
            DOM.startButton.classList.add('running');
            
            parseBossList(DOM.bossListInput);
            const fixedAlarmListDivElement = DOM.fixedAlarmListDiv;
            renderFixedAlarms(fixedAlarmListDivElement);

            startAlarm();
        } else {
            DOM.startButton.textContent = "알림 시작";
            DOM.startButton.classList.remove('running');
            
            stopAlarm();
        }
    });

    // --- 7.1. 고정 알림 전체 ON/OFF 토글 버튼 이벤트 ---
    DOM.globalFixedAlarmToggle.addEventListener('change', (event) => {
        const currentStates = LocalStorageManager.getFixedAlarmStates();
        currentStates.global = event.target.checked;
        LocalStorageManager.setFixedAlarmStates(currentStates);
        updateFixedAlarmVisuals();
    });

    // --- 7.2. 알림 로그 가시성 토글 이벤트 ---
    DOM.logVisibilityToggle.addEventListener('change', (event) => {
        LocalStorageManager.setLogVisibilityState(event.target.checked);
        if (LocalStorageManager.getLogVisibilityState()) {
            DOM.logContainer.classList.remove('hidden');
        } else {
            DOM.logContainer.classList.add('hidden');
        }
    });

    // --- 9. '공유 링크 생성' 버튼 이벤트 ---
    DOM.shareButton.addEventListener('click', async () => {
        DOM.shareButton.disabled = true;
        DOM.shareButton.textContent = "단축 URL 생성 중...";
        DOM.shareLinkInput.value = "잠시만 기다려주세요...";

        const currentData = DOM.bossListInput.value;
        const encodedData = encodeURIComponent(currentData);
        const baseUrl = window.location.href.split('?')[0];
        const longUrl = `${baseUrl}?data=${encodedData}`;

        const shortUrl = await getShortUrl(longUrl);

        if (shortUrl) {
            DOM.shareLinkInput.value = shortUrl;
            log("단축 URL이 생성되었습니다. '복사' 버튼을 눌러주세요.", true);
        } else {
            DOM.shareLinkInput.value = longUrl;
            log("URL 단축 실패. 대신 원본 URL을 생성합니다.", true);
        }

        DOM.shareButton.disabled = false;
        DOM.shareButton.textContent = "공유 링크 생성 (Short URL)";
    });

    // --- 10. '복사' 버튼 이벤트 ---
    DOM.copyButton.addEventListener('click', () => {
        const urlToCopy = DOM.shareLinkInput.value;
        
        if (urlToCopy && urlToCopy !== "목록 수정 후 버튼을 누르세요" && urlToCopy !== "잠시만 기다려주세요...") {
            navigator.clipboard.writeText(urlToCopy).then(() => {
                log("링크가 클립보드에 복사되었습니다.", true);
                const originalText = DOM.copyButton.textContent;
                DOM.copyButton.textContent = '복사됨!';
                setTimeout(() => {
                    DOM.copyButton.textContent = originalText;
                }, 1500);
            }).catch(err => {
                log("복사에 실패했습니다. 수동으로 복사해주세요.", true);
                console.error('클립보드 복사 실패:', err);
            });
        } else {
            log("복사할 링크가 없습니다. 먼저 링크를 생성해주세요.", false);
        }
    });

    // --- Help Modal Event Listeners ---
    DOM.helpButton.addEventListener('click', openHelpModal);
    DOM.closeButton.addEventListener('click', closeHelpModal);
    window.addEventListener('click', (event) => {
        if (event.target === DOM.helpModal) {
            closeHelpModal();
        }
    });
    DOM.featureGuideTabButton.addEventListener('click', () => switchHelpTab('featureGuide'));
    DOM.versionHistoryTabButton.addEventListener('click', () => switchHelpTab('versionHistory'));
}

// Function to initialize the application
export function initApp() {
    // Initialize logger with the log container
    initLogger(DOM.logContainer);

    // 현재 페이지의 URL 파라미터(물음표 뒤)를 가져옴
    const params = new URLSearchParams(window.location.search);
    
    // 'data'라는 이름의 파라미터가 있는지 확인
    if (params.has('data')) {
        // 'data' 값을 가져와서 '압축 해제' (디코딩)
        const decodedData = decodeURIComponent(params.get('data'));
        
        // 텍스트 상자(textarea)의 내용을 URL에서 가져온 데이터로 채움
        DOM.bossListInput.value = decodedData;
        
        log("URL에서 보스 목록을 성공적으로 불러왔습니다.");
    } else {
        // URL에 data가 없으면
        DOM.bossListInput.value = defaultBossList;
        log("기본 보스 목록을 불러왔습니다. (URL 데이터 없음)");
    }

    // 페이지 로드 시 보스 목록을 파싱하고 지난 보스를 제거
    parseBossList(DOM.bossListInput);

    // 고정 알림 상태 로드 및 렌더링
    LocalStorageManager.init();
    DOM.globalFixedAlarmToggle.checked = LocalStorageManager.getFixedAlarmStates().global;
    
    // fixedAlarmListDiv를 여기서 다시 가져와서 renderFixedAlarms에 전달
    const fixedAlarmListDivElement = DOM.fixedAlarmListDiv;
    renderFixedAlarms(fixedAlarmListDivElement);
    // 알림 로그 가시성 상태 로드 및 적용
    DOM.logVisibilityToggle.checked = LocalStorageManager.getLogVisibilityState();
    if (LocalStorageManager.getLogVisibilityState()) {
        DOM.logContainer.classList.remove('hidden');
    } else {
        DOM.logContainer.classList.add('hidden');
    }

    // Initialize all event handlers
    initEventHandlers();
}