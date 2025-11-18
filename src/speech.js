// src/speech.js

import { LocalStorageManager } from './data-managers.js';

let speechQueue = [];
let isSpeaking = false;

function processQueue() {
    if (speechQueue.length > 0 && !isSpeaking) {
        isSpeaking = true;
        const utterance = speechQueue.shift(); // Get the first item from the queue

        // Watchdog timer in case onend fails to fire
        const watchdog = setTimeout(() => {
            console.warn("Speech synthesis 'onend' event failed to fire. Forcing queue reset.");
            isSpeaking = false;
            processQueue();
        }, 10000); // 10-second timeout

        utterance.onend = () => {
            clearTimeout(watchdog); // Clear the watchdog if onend fires correctly
            isSpeaking = false;
            processQueue(); // Process the next item when current one ends
        };
        window.speechSynthesis.speak(utterance);
    }
}

export function speak(text) {
    if (LocalStorageManager.getMuteState()) {
        return; // Do not queue or speak if muted
    }

    if (!window.speechSynthesis) {
        console.warn("이 브라우저는 음성 합성을 지원하지 않습니다.");
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    
    speechQueue.push(utterance); // Add to queue
    processQueue(); // Try to process
}
