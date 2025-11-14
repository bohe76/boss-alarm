// src/logger.js

let logContainer = null;
const logs = []; // Array to store log entries

export function initLogger(containerElement) {
    logContainer = containerElement;
}

export function log(message, isImportant = false) {
    if (!logContainer) {
        console.error("Logger not initialized. Call initLogger(containerElement) first.");
        return;
    }

    const now = new Date();
    const logEntryText = `[${now.toLocaleTimeString()}] ${message}`;
    logs.push(logEntryText); // Store the log entry

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    if (isImportant) {
        entry.classList.add('important');
    }
    
    entry.textContent = logEntryText;
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

export function getLogs() {
    return logs;
}
