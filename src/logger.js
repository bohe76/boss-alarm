// src/logger.js

let logContainer = null;

export function initLogger(containerElement) {
    logContainer = containerElement;
}

export function log(message, isImportant = false) {
    if (!logContainer) {
        console.error("Logger not initialized. Call initLogger(containerElement) first.");
        return;
    }

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    if (isImportant) {
        entry.classList.add('important');
    }
    
    const now = new Date();
    entry.textContent = `[${now.toLocaleTimeString()}] ${message}`;
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}
