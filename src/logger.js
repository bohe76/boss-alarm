// src/logger.js

import { EventBus } from './event-bus.js'; // Import EventBus

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
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;
    const logEntryHTML = `<strong>[${formattedTime}]</strong> ${message}`;
    logs.push(logEntryHTML); // Store the HTML formatted log entry

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    if (isImportant) {
        entry.classList.add('important');
    }
    
    entry.innerHTML = logEntryHTML; // Use innerHTML to render the <strong> tag
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Emit event that logs have been updated
    EventBus.emit('log-updated');
}

export function getLogs() {
    return logs;
}
