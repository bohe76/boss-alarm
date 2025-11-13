// src/speech.js

let speechQueue = [];
let isSpeaking = false;

function processQueue() {
    if (speechQueue.length > 0 && !isSpeaking) {
        isSpeaking = true;
        const utterance = speechQueue.shift(); // Get the first item from the queue
        utterance.onend = () => {
            isSpeaking = false;
            processQueue(); // Process the next item when current one ends
        };
        window.speechSynthesis.speak(utterance);
    }
}

export function speak(text) {
    if (!window.speechSynthesis) {
        console.warn("이 브라우저는 음성 합성을 지원하지 않습니다.");
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    
    speechQueue.push(utterance); // Add to queue
    processQueue(); // Try to process
}
